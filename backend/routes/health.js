const express = require('express');
const HealthReading = require('../models/HealthReading');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

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
  ];

  for (const check of checks) {
    if (check.value !== undefined && check.status && check.status !== 'normal') {
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
      };

      const alert = await Alert.create({
        user: userId,
        type: check.key,
        severity: check.status,
        message: messages[check.key]?.[check.status] || `${check.label} is ${check.status}`,
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
    const { heartRate, bloodPressure, spo2, temperature, steps, notes } = req.body;

    const reading = await HealthReading.create({
      user: req.user._id,
      heartRate,
      bloodPressure,
      spo2,
      temperature,
      steps,
      notes,
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

// @GET /api/health/readings - Get all readings for user
router.get('/readings', protect, async (req, res) => {
  try {
    const { limit = 50, page = 1, startDate, endDate } = req.query;

    const query = { user: req.user._id };
    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) query.recordedAt.$gte = new Date(startDate);
      if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    const readings = await HealthReading.find(query)
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await HealthReading.countDocuments(query);

    res.json({
      success: true,
      readings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
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
    const { days = 7 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

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
    const stepsVals = readings.filter((r) => r.steps?.value).map((r) => r.steps.value);

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
        total: stepsVals.reduce((a, b) => a + b, 0),
        avg: avg(stepsVals),
        max: max(stepsVals),
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

module.exports = router;
