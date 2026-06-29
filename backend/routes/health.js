const express = require('express');
const HealthReading = require('../models/HealthReading');
const Alert = require('../models/Alert');
const pool = require('../db/postgres');
const Profile = require('../models/Profile');
const { protect } = require('../middleware/auth');
const { getPlan } = require('../config/plans');
const {
  metricConfidence,
  shouldSoftenEstimatedAlert,
  normalizeIncomingReading,
} = require('../utils/healthPipeline');
const { mapHealthConnectPayload } = require('../utils/healthConnectAdapter');
const { summarizeMovementMetric } = require('../utils/movementAggregation');
const { parseBoundedInteger, parseDaysWindow } = require('../utils/queryParams');
const { DEFAULT_DAILY_GOALS, normalizeDailyGoals } = require('../utils/dailyGoals');
const {
  generateHealthReadingAI,
  generateAICoachResponse,
  generateSleepAnalysis,
  generateMedicalReportMarkdown
} = require('../utils/aiSimulator');

const router = express.Router();

// Helper: generate alerts from a reading
const generateAlerts = async (reading, userId, io) => {
  const alerts = [];

  const checks = [
    {
      key: 'heartRate',
      value: reading.heartRate?.value,
      status: reading.heartRate?.status,
      label: 'Heart Rate',
      unit: 'BPM',
    },
    {
      key: 'spo2',
      value: reading.spo2?.value,
      status: reading.spo2?.status,
      label: 'SpO2',
      unit: '%',
    },
    {
      key: 'temperature',
      value: reading.temperature?.value,
      status: reading.temperature?.status,
      label: 'Temperature',
      unit: '°C',
    },
    {
      key: 'bloodPressure',
      value: reading.bloodPressure?.systolic
        ? `${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic}`
        : undefined,
      status: reading.bloodPressure?.status,
      label: 'Blood Pressure',
      unit: 'mmHg',
    },
    {
      key: 'hydration',
      value: reading.hydration?.value,
      status: reading.hydration?.status,
      label: 'Hydration',
      unit: '%',
    },
    {
      key: 'sleepScore',
      value: reading.sleepScore?.value,
      status: reading.sleepScore?.status,
      label: 'Sleep Score',
      unit: '%',
    },
    {
      key: 'stressLevel',
      value: reading.stressLevel?.value,
      status: reading.stressLevel?.status,
      label: 'Stress Level',
      unit: '%',
    },
  ];

  for (const check of checks) {
    if (check.value !== undefined && check.status && check.status !== 'normal') {
      const confidence = metricConfidence(reading, check.key);
      if (shouldSoftenEstimatedAlert(reading, check.key) && confidence < 40) {
        continue;
      }

      const messages = {
        heartRate: {
          warning: `Heart rate ${check.value} BPM is outside normal range (60-100 BPM)`,
          critical: `CRITICAL: Heart rate ${check.value} BPM requires immediate attention!`,
        },
        spo2: {
          warning: `SpO2 at ${check.value}% is below normal (95%+)`,
          critical: `CRITICAL: SpO2 at ${check.value}% is dangerously low!`,
        },
        temperature: {
          warning: `Temperature ${check.value}°C is outside normal range (36.1–37.2°C)`,
          critical: `CRITICAL: Temperature ${check.value}°C requires immediate attention!`,
        },
        bloodPressure: {
          warning: `Blood pressure ${check.value} mmHg is elevated`,
          critical: `CRITICAL: Blood pressure ${check.value} mmHg is dangerously high!`,
        },
        hydration: {
          warning: `Hydration at ${check.value}% is below your healthy target range`,
          critical: `CRITICAL: Hydration at ${check.value}% requires immediate rehydration`,
        },
        sleepScore: {
          warning: `Sleep score ${check.value}% indicates reduced recovery`,
          critical: `CRITICAL: Sleep score ${check.value}% indicates severe recovery debt`,
        },
        stressLevel: {
          warning: `Stress level ${check.value}% is elevated and should be monitored`,
          critical: `CRITICAL: Stress level ${check.value}% is high and needs immediate intervention`,
        },
      };

      const adjustedSeverity =
        shouldSoftenEstimatedAlert(reading, check.key) && check.status === 'critical' && confidence < 70
          ? 'warning'
          : check.status;

      const note =
        shouldSoftenEstimatedAlert(reading, check.key) && confidence < 70
          ? ' (estimated signal, low confidence)'
          : '';

      const alert = await Alert.create({
        user: userId,
        type: check.key,
        severity: adjustedSeverity,
        message:
          `${messages[check.key]?.[adjustedSeverity] || `${check.label} is ${adjustedSeverity}`}${note}`,
        value: `${check.value} ${check.unit}`,
        readingId: reading._id,
      });

      alerts.push(alert);

      // Emit real-time alert via socket
      if (io) {
        io.to(userId.toString()).emit('new_alert', alert);
      }
    }
  }

  return alerts;
};

// @POST /api/health/reading - Submit new health reading
router.post('/reading', protect, async (req, res) => {
  try {
    const user = await Profile.findOne({ userId: req.user.id }).select('subscription');
    const activePlan = getPlan(user?.subscription?.plan || 'starter');
    const monthlyLimit = activePlan.limits.readingsPerMonth;
    if (monthlyLimit !== null) {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const usage = await HealthReading.countDocuments({
        user: req.user._id,
        recordedAt: { $gte: start },
      });
      if (usage >= monthlyLimit) {
        return res.status(402).json({
          success: false,
          message: `Monthly reading limit reached for ${activePlan.label}. Upgrade to continue.`,
          code: 'PLAN_LIMIT_REACHED',
          usage: { used: usage, limit: monthlyLimit },
        });
      }
    }

    const normalized = normalizeIncomingReading(req.body);

    const reading = await HealthReading.create({
      user: req.user._id,
      ...normalized,
    });

    // Generate alerts based on reading
    const io = req.app.get('io');
    const alerts = await generateAlerts(reading, req.user._id, io);

    // Emit new reading to user's socket room
    if (io) {
      io.to(req.user._id.toString()).emit('new_reading', reading);
    }

    res.status(201).json({ success: true, reading, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/health/import/health-connect - Adapter-ready Health Connect ingestion
router.post('/import/health-connect', protect, async (req, res) => {
  try {
    const user = await Profile.findOne({ userId: req.user.id }).select('subscription');
    const activePlan = getPlan(user?.subscription?.plan || 'starter');
    const monthlyLimit = activePlan.limits.readingsPerMonth;
    if (monthlyLimit !== null) {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const usage = await HealthReading.countDocuments({
        user: req.user._id,
        recordedAt: { $gte: start },
      });
      if (usage >= monthlyLimit) {
        return res.status(402).json({
          success: false,
          message: `Monthly reading limit reached for ${activePlan.label}. Upgrade to continue.`,
          code: 'PLAN_LIMIT_REACHED',
          usage: { used: usage, limit: monthlyLimit },
        });
      }
    }

    const adaptedPayload = mapHealthConnectPayload(req.body);
    const normalized = normalizeIncomingReading(adaptedPayload);

    const reading = await HealthReading.create({
      user: req.user._id,
      ...normalized,
    });

    const io = req.app.get('io');
    const alerts = await generateAlerts(reading, req.user._id, io);

    if (io) {
      io.to(req.user._id.toString()).emit('new_reading', reading);
    }

    res.status(201).json({ success: true, reading, alerts, importedVia: 'health_connect_adapter' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/health/readings - Get all readings for user
router.get('/readings', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const limit = parseBoundedInteger(req.query.limit, { fallback: 50, min: 1, max: 100 });
    const page = parseBoundedInteger(req.query.page, { fallback: 1, min: 1, max: 10000 });

    const query = { user: req.user._id };
    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) query.recordedAt.$gte = new Date(startDate);
      if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    const readings = await HealthReading.find(query)
      .sort({ recordedAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await HealthReading.countDocuments(query);

    res.json({
      success: true,
      readings,
      pagination: { page, limit, total },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/health/latest - Get latest reading
router.get('/latest', protect, async (req, res) => {
  try {
    const reading = await HealthReading.findOne({ user: req.user._id }).sort({ recordedAt: -1 });
    res.json({ success: true, reading });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/health/stats - Get aggregated stats for reports
router.get('/stats', protect, async (req, res) => {
  try {
    const days = parseDaysWindow(req.query.days, { fallback: 7, min: 1, max: 90 });
    const since = new Date();
    since.setDate(since.getDate() - days);

    const readings = await HealthReading.find({
      user: req.user._id,
      recordedAt: { $gte: since },
    }).sort({ recordedAt: 1 });

    if (!readings.length) {
      return res.json({ success: true, stats: null, readings: [] });
    }

    // Calculate averages
    const hrVals = readings.filter((r) => r.heartRate?.value).map((r) => r.heartRate.value);
    const spo2Vals = readings.filter((r) => r.spo2?.value).map((r) => r.spo2.value);
    const tempVals = readings.filter((r) => r.temperature?.value).map((r) => r.temperature.value);
    const stepsSummary = summarizeMovementMetric(readings, 'steps');
    const caloriesSummary = summarizeMovementMetric(readings, 'calories');
    const distanceSummary = summarizeMovementMetric(readings, 'distance', { precision: 2 });
    const activeMinutesSummary = summarizeMovementMetric(readings, 'activeMinutes');

    const avg = (arr) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null);
    const max = (arr) => (arr.length ? Math.max(...arr) : null);
    const min = (arr) => (arr.length ? Math.min(...arr) : null);

    const stats = {
      heartRate: { avg: avg(hrVals), max: max(hrVals), min: min(hrVals), count: hrVals.length },
      spo2: { avg: avg(spo2Vals), max: max(spo2Vals), min: min(spo2Vals), count: spo2Vals.length },
      temperature: {
        avg: avg(tempVals),
        max: max(tempVals),
        min: min(tempVals),
        count: tempVals.length,
      },
      steps: {
        total: stepsSummary.total,
        avg: stepsSummary.avg,
        max: stepsSummary.max,
      },
      calories: {
        total: caloriesSummary.total,
        avg: caloriesSummary.avg,
        max: caloriesSummary.max,
      },
      distance: {
        total: distanceSummary.total,
        avg: distanceSummary.avg,
        max: distanceSummary.max,
      },
      activeMinutes: {
        total: activeMinutesSummary.total,
        avg: activeMinutesSummary.avg,
        max: activeMinutesSummary.max,
      },
      totalReadings: readings.length,
    };

    res.json({ success: true, stats, readings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @DELETE /api/health/reading/:id
router.delete('/reading/:id', protect, async (req, res) => {
  try {
    const reading = await HealthReading.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!reading) return res.status(404).json({ success: false, message: 'Reading not found' });
    res.json({ success: true, message: 'Reading deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/health/fitness/today - Get today's fitness summary
router.get('/fitness/today', protect, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [readings, latest, user] = await Promise.all([
      HealthReading.find({
        user: req.user._id,
        recordedAt: { $gte: start },
      }).sort({ recordedAt: 1 }),
      HealthReading.findOne({ user: req.user._id }).sort({ recordedAt: -1 }),
      Profile.findOne({ userId: req.user.id }).select('dailyGoals'),
    ]);

    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr) => (arr.length ? Number((sum(arr) / arr.length).toFixed(1)) : null);

    const stepsSummary = summarizeMovementMetric(readings, 'steps');
    const caloriesSummary = summarizeMovementMetric(readings, 'calories');
    const distanceSummary = summarizeMovementMetric(readings, 'distance', { precision: 2 });
    const activeMinutesSummary = summarizeMovementMetric(readings, 'activeMinutes');
    const heartRate = readings.filter((r) => r.heartRate?.value).map((r) => r.heartRate.value);
    const cadence = readings.filter((r) => r.cadence?.value).map((r) => r.cadence.value);

    const goals = user?.dailyGoals || DEFAULT_DAILY_GOALS;

    const totals = {
      steps: stepsSummary.total,
      calories: caloriesSummary.total,
      distance: distanceSummary.total,
      activeMinutes: activeMinutesSummary.total,
    };

    const progress = {
      steps: goals.steps ? Math.min(100, Math.round((totals.steps / goals.steps) * 100)) : 0,
      activeMinutes: goals.activeMinutes
        ? Math.min(100, Math.round((totals.activeMinutes / goals.activeMinutes) * 100))
        : 0,
      hydration: latest?.hydration?.value || 0,
    };

    const summary = {
      totals,
      averages: {
        heartRate: avg(heartRate),
        cadence: avg(cadence),
      },
      latest: latest
        ? {
          hydration: latest.hydration?.value ?? null,
          sleepScore: latest.sleepScore?.value ?? null,
          sleepHours: latest.sleepHours?.value ?? null,
          stressLevel: latest.stressLevel?.value ?? null,
          workoutMode: latest.workoutMode || 'balanced',
          heartRate: latest.heartRate?.value ?? null,
          updatedAt: latest.recordedAt,
        }
        : null,
      progress,
      goals,
      readingsCount: readings.length,
    };

    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/health/goals - Get user fitness goals
router.get('/goals', protect, async (req, res) => {
  try {
    const user = await Profile.findOne({ userId: req.user.id }).select('dailyGoals');
    res.json({
      success: true,
      goals: user?.dailyGoals || DEFAULT_DAILY_GOALS,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/health/goals - Update user fitness goals
router.put('/goals', protect, async (req, res) => {
  try {
    const nextGoals = normalizeDailyGoals(req.body);
    const user = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { dailyGoals: nextGoals },
      { new: true, runValidators: true, upsert: true }
    ).select('dailyGoals');
    res.json({ success: true, goals: user.dailyGoals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/health/insights - Real-world actionable insights and recommendations
router.get('/insights', protect, async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 14, 3), 60);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const readings = await HealthReading.find({
      user: req.user._id,
      recordedAt: { $gte: since },
    }).sort({ recordedAt: 1 });

    if (!readings.length) {
      return res.json({
        success: true,
        insights: {
          score: 0,
          status: 'insufficient-data',
          riskLevel: 'unknown',
          summary: `No readings available in the last ${days} days.`,
          recommendations: ['Keep the tracker stream running for at least 7 days to unlock stable insights.'],
          metrics: null,
        },
      });
    }

    const values = {
      heartRate: readings.map((r) => r.heartRate?.value).filter((v) => typeof v === 'number'),
      spo2: readings.map((r) => r.spo2?.value).filter((v) => typeof v === 'number'),
      steps: readings.map((r) => r.steps?.value || 0),
      hydration: readings.map((r) => r.hydration?.value).filter((v) => typeof v === 'number'),
      sleep: readings.map((r) => r.sleepScore?.value).filter((v) => typeof v === 'number'),
      sleepHours: readings.map((r) => r.sleepHours?.value).filter((v) => typeof v === 'number'),
      stress: readings.map((r) => r.stressLevel?.value).filter((v) => typeof v === 'number'),
    };

    const avg = (arr) =>
      arr.length ? Number((arr.reduce((acc, n) => acc + n, 0) / arr.length).toFixed(1)) : null;
    const latest = readings[readings.length - 1];

    const abnormalities = {
      hr: readings.filter((r) => r.heartRate?.status && r.heartRate.status !== 'normal').length,
      spo2: readings.filter((r) => r.spo2?.status && r.spo2.status !== 'normal').length,
      hydration: readings.filter((r) => r.hydration?.status && r.hydration.status !== 'normal').length,
      sleep: readings.filter((r) => r.sleepScore?.status && r.sleepScore.status !== 'normal').length,
      stress: readings.filter((r) => r.stressLevel?.status && r.stressLevel.status !== 'normal').length,
    };

    const consistency = Math.min(100, Math.round((readings.length / days) * 100));
    const avgSteps = avg(values.steps) || 0;
    const avgHydration = avg(values.hydration) || 0;
    const avgSleep = avg(values.sleep) || 0;
    const avgSleepHours = avg(values.sleepHours) || 0;
    const avgStress = avg(values.stress) || 0;
    const avgHr = avg(values.heartRate) || 0;
    const avgSpo2 = avg(values.spo2) || 0;

    let score = 100;
    score -= (abnormalities.hr + abnormalities.spo2 + abnormalities.hydration + abnormalities.sleep + abnormalities.stress) * 4;
    score -= consistency < 65 ? 12 : 0;
    score -= avgSteps < 4000 ? 10 : avgSteps < 7000 ? 5 : 0;
    score -= avgHydration < 60 ? 8 : avgHydration < 70 ? 4 : 0;
    score -= avgSleep < 65 ? 8 : avgSleep < 75 ? 4 : 0;
    score -= avgSleepHours && avgSleepHours < 6 ? 8 : avgSleepHours < 7 ? 3 : 0;
    score -= avgStress > 70 ? 9 : avgStress > 55 ? 4 : 0;
    score = Math.max(12, Math.min(100, Math.round(score)));

    const riskLevel = score >= 80 ? 'low' : score >= 60 ? 'moderate' : 'high';
    const recommendations = [];

    if (consistency < 65) recommendations.push('Tracker consistency is low; keep the app connected to improve trend reliability.');
    if (abnormalities.hr >= 2) recommendations.push('Review heart-rate spikes and add recovery sessions this week.');
    if (avgSpo2 && avgSpo2 < 95) recommendations.push('Persistent low SpO₂ detected; seek clinical assessment if symptoms continue.');
    if (avgSteps < 7000) recommendations.push('Set a gradual activity target: +1,000 daily steps over current average.');
    if (avgHydration < 70) recommendations.push('Hydration is low; schedule timed water reminders every 2-3 hours.');
    if (avgSleep < 75) recommendations.push('Sleep recovery is below target; prioritize 7-8h sleep and consistent bed timing.');
    if (avgSleepHours && avgSleepHours < 7) recommendations.push('Average sleep duration is low; aim for a consistent 7-8 hour sleep window.');
    if (avgStress > 55) recommendations.push('Stress trend is elevated; include breathing sessions and lighter recovery blocks.');
    if (!recommendations.length) recommendations.push('Current trends look stable. Maintain routine and keep monitoring.');

    const insights = {
      score,
      status: score >= 80 ? 'stable' : score >= 60 ? 'watch' : 'needs-attention',
      riskLevel,
      summary:
        riskLevel === 'low'
          ? 'Vitals and activity trends are stable with good adherence.'
          : riskLevel === 'moderate'
            ? 'Some signals need closer monitoring to prevent deterioration.'
            : 'Multiple risk signals detected; prioritize intervention and follow-up.',
      recommendations,
      metrics: {
        daysReviewed: days,
        readingsCount: readings.length,
        consistency,
        averages: {
          heartRate: avgHr || null,
          spo2: avgSpo2 || null,
          steps: avgSteps || null,
          hydration: avgHydration || null,
          sleepScore: avgSleep || null,
          sleepHours: avgSleepHours || null,
          stressLevel: avgStress || null,
        },
        latest: {
          recordedAt: latest.recordedAt,
          heartRate: latest.heartRate?.value ?? null,
          spo2: latest.spo2?.value ?? null,
          hydration: latest.hydration?.value ?? null,
          sleepScore: latest.sleepScore?.value ?? null,
          sleepHours: latest.sleepHours?.value ?? null,
          stressLevel: latest.stressLevel?.value ?? null,
          workoutMode: latest.workoutMode || 'balanced',
        },
        abnormalities,
      },
    };

    res.json({ success: true, insights });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/health/generate-ai - Generate a reading using AI simulation
router.post('/generate-ai', protect, async (req, res) => {
  try {
    const latest = await HealthReading.findOne({ user: req.user._id }).sort({ recordedAt: -1 });
    const user = await Profile.findOne({ userId: req.user.id }).select('dailyGoals');

    const context = {
      lastReading: latest || { heartRate: { value: 72 }, spo2: { value: 98 }, temperature: { value: 36.6 } },
      activity: req.body.activity || 'normal',
      goals: user?.dailyGoals || { steps: 10000, activeMinutes: 60 }
    };

    const aiOutput = await generateHealthReadingAI(context);

    // Map AI output to model format
    const readingPayload = {
      heartRate: { value: aiOutput.heartRate?.value ?? aiOutput.heartRate },
      bloodPressure: {
        systolic: aiOutput.bloodPressure?.systolic ?? aiOutput.systolic,
        diastolic: aiOutput.bloodPressure?.diastolic ?? aiOutput.diastolic
      },
      spo2: { value: aiOutput.spo2?.value ?? aiOutput.spo2 },
      temperature: { value: aiOutput.temperature?.value ?? aiOutput.temperature },
      steps: { value: aiOutput.steps?.value ?? aiOutput.steps ?? 0 },
      hydration: { value: aiOutput.hydration?.value ?? aiOutput.hydration },
      sleepScore: { value: aiOutput.sleepScore?.value ?? aiOutput.sleepScore },
      stressLevel: { value: aiOutput.stressLevel?.value ?? aiOutput.stressLevel },
      source: 'device', // Mark as device for "AI Sensor" simulation
      sourceDetails: {
        mode: 'band_plus_phone',
        label: 'AI Virtual Sensor',
        primarySource: 'AI-Generated Health Model',
        confidenceTier: 'high'
      },
      notes: aiOutput.notes || 'AI generated health snapshot'
    };

    const normalized = normalizeIncomingReading(readingPayload);

    const reading = await HealthReading.create({
      user: req.user._id,
      ...normalized
    });

    const io = req.app.get('io');
    const alerts = await generateAlerts(reading, req.user._id, io);

    if (io) {
      io.to(req.user._id.toString()).emit('new_reading', reading);
    }

    res.status(201).json({ success: true, reading, alerts, method: 'ai_simulation' });
  } catch (err) {
    console.error('❌ AI Route Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/health/ai-coach - Chat with AI Health Coach
router.post('/ai-coach', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    // Fetch history for context
    const readings = await HealthReading.find({ user: req.user._id }).sort({ recordedAt: -1 }).limit(10);
    const { rows } = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const userRow = rows[0];
    const userProfile = await Profile.findOne({ userId: req.user.id }).select('dailyGoals onboarding');

    const profile = {
      name: userRow?.name || 'User',
      goals: userProfile?.dailyGoals || { steps: 10000, activeMinutes: 60, hydration: 100 },
      onboarding: userProfile?.onboarding || { completed: false }
    };

    const response = await generateAICoachResponse(message, readings, profile);
    res.json({ success: true, response });
  } catch (err) {
    console.error('❌ AI Coach Route Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/health/sleep-lab - Deep AI Sleep Analysis
router.get('/sleep-lab', protect, async (req, res) => {
  try {
    const sleepReadings = await HealthReading.find({
      user: req.user._id,
      $or: [{ sleepScore: { $exists: true } }, { sleepHours: { $exists: true } }]
    }).sort({ recordedAt: -1 }).limit(14);

    const analysis = await generateSleepAnalysis(sleepReadings);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/health/medical-report - Generate a Clinical AI Summary
router.get('/medical-report', protect, async (req, res) => {
  try {
    const latestData = await HealthReading.find({ user: req.user._id }).sort({ recordedAt: -1 }).limit(30);
    const { rows } = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const userRow = rows[0];

    const reportText = await generateMedicalReportMarkdown(userRow?.name || 'User', latestData);
    res.json({ success: true, report: reportText });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports = router;
