import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getLatestReading, getReadings, getFitnessToday, getBillingCurrent } from '../utils/api';
import { ProgressRing, TrackerIcon } from '../components/TrackerUI';

const toneForStatus = (status) => {
  if (status === 'critical') return { label: 'Attention', color: 'var(--accent-red)' };
  if (status === 'warning') return { label: 'Elevated', color: 'var(--accent-yellow)' };
  return { label: 'Stable', color: 'var(--accent-green)' };
};

const metricCards = (latest) => {
  if (!latest) return [];

  const heartRate = latest.heartRate;
  const spo2 = latest.spo2;
  const temp = latest.temperature;
  const stress = latest.stressLevel;
  const bloodPressure = latest.bloodPressure;
  const sleepHours = latest.sleepHours;

  return [
    {
      key: 'heart-rate',
      icon: 'heart',
      label: 'Heart rate',
      value: heartRate?.value ?? '—',
      unit: 'BPM',
      trend: toneForStatus(heartRate?.status).label,
      status: heartRate?.status,
      confidence: latest.confidence?.heartRate,
    },
    {
      key: 'oxygen',
      icon: 'oxygen',
      label: 'Blood oxygen',
      value: spo2?.value ?? '—',
      unit: '%',
      trend: toneForStatus(spo2?.status).label,
      status: spo2?.status,
      confidence: latest.confidence?.spo2,
    },
    {
      key: 'temp',
      icon: 'temperature',
      label: 'Skin temp',
      value: temp?.value ?? '—',
      unit: '°C',
      trend: toneForStatus(temp?.status).label,
      status: temp?.status,
      confidence: latest.confidence?.temperature,
    },
    {
      key: 'stress',
      icon: 'stress',
      label: 'Stress load',
      value: stress?.value ?? '—',
      unit: '%',
      trend: toneForStatus(stress?.status).label,
      status: stress?.status,
      confidence: latest.confidence?.stressLevel,
    },
    {
      key: 'bp',
      icon: 'pressure',
      label: 'Blood pressure',
      value: bloodPressure?.systolic ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : '—',
      unit: 'mmHg',
      trend: toneForStatus(bloodPressure?.status).label,
      status: bloodPressure?.status,
      confidence: latest.confidence?.bloodPressure,
    },
    {
      key: 'sleep',
      icon: 'sleep',
      label: 'Sleep duration',
      value: sleepHours?.value ?? '—',
      unit: 'hrs',
      trend: 'Last night',
      status: 'normal',
      confidence: latest.confidence?.sleepHours,
    },
  ];
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tracker-tooltip">
      <p>{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} style={{ color: item.color }}>
          {item.name}: <strong>{item.value ?? '—'}</strong>
        </div>
      ))}
    </div>
  );
};

const getMetricPresentation = ({ metricKey, metric, fallbackUnit, sourceMode, sourceDetails }) => {
  const confidence = metricKey === 'bp'
    ? metric?.confidence ?? sourceDetails?.overallConfidence
    : metric?.confidence;
  const manualRequired =
    sourceMode === 'phone_only' &&
    sourceDetails?.supportedMetrics?.vitals === 'manual check-in required' &&
    ['heart', 'oxygen', 'temp', 'stress', 'bp'].includes(metricKey);

  if (manualRequired) {
    return { value: 'Check in', unit: 'manual', trend: 'No direct source' };
  }

  const lowConfidenceThreshold = { heart: 52, oxygen: 55, temp: 55, stress: 48, bp: 55 };
  const isPhoneOnlyLowConfidence =
    sourceMode === 'phone_only' &&
    typeof confidence === 'number' &&
    confidence < (lowConfidenceThreshold[metricKey] || 50);

  if (metricKey === 'bp') {
    const value = metric?.value;
    return isPhoneOnlyLowConfidence
      ? { value: 'Estimated', unit: 'trend only', trend: 'Low confidence' }
      : { value: value || '—', unit: fallbackUnit, trend: metric?.trend };
  }

  return isPhoneOnlyLowConfidence
    ? { value: 'Estimated', unit: 'trend only', trend: 'Low confidence' }
    : { value: metric?.value ?? '—', unit: fallbackUnit, trend: metric?.trend };
};

const goalCopy = {
  fitness: {
    headline: 'Build consistent activity',
    detail: 'Movement, active minutes, and session readiness should lead your day.',
  },
  wellness: {
    headline: 'Keep daily habits steady',
    detail: 'Use this view to stay consistent with sleep, hydration, and balanced effort.',
  },
  recovery: {
    headline: 'Protect recovery quality',
    detail: 'Sleep, stress, and readiness deserve more attention than hard-output chasing.',
  },
  'clinical-awareness': {
    headline: 'Track changes carefully',
    detail: 'Use trends and source confidence to notice changes early without overreacting to weak signals.',
  },
};

const experienceCopy = {
  beginner: 'Keep the dashboard simple and directional.',
  regular: 'Focus on consistency and week-over-week movement.',
  advanced: 'Use the full mix of readiness, stress, and session quality signals.',
};

const confidenceTierCopy = {
  high: 'High confidence',
  medium: 'Moderate confidence',
  low: 'Directional confidence',
};

const hasDirectBodySignals = (reading) => Boolean(
  reading?.heartRate?.value ||
  reading?.bloodPressure?.systolic ||
  reading?.spo2?.value ||
  reading?.temperature?.value ||
  reading?.sleepHours?.value ||
  reading?.sleepScore?.value ||
  reading?.stressLevel?.value
);

const Dashboard = () => {
  const { user, tracking, enableTracking } = useAuth();
  const { latestReading: socketReading, liveAlerts } = useSocket();
  const [latest, setLatest] = useState(null);
  const [latestBodyReading, setLatestBodyReading] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [fitnessSummary, setFitnessSummary] = useState(null);
  const [billingSummary, setBillingSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFitnessSummary = useCallback(async () => {
    try {
      const { data } = await getFitnessToday();
      setFitnessSummary(data.summary);
    } catch {}
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [latestRes, readingsRes, billingRes] = await Promise.all([
        getLatestReading(),
        getReadings({ limit: 20 }),
        getBillingCurrent(),
      ]);

      setLatest(latestRes.data.reading);
      setBillingSummary(billingRes.data);
      const recentReadings = readingsRes.data.readings || [];
      const directBodyReading = [latestRes.data.reading, ...recentReadings].find(hasDirectBodySignals) || null;
      setLatestBodyReading(directBodyReading);

      const readings = recentReadings.reverse();
      setChartData(
        readings.map((reading) => ({
          time: format(new Date(reading.recordedAt), 'HH:mm'),
          heartRate: reading.heartRate?.value,
          spo2: reading.spo2?.value,
          temperature: reading.temperature?.value,
          steps: reading.steps?.value,
        }))
      );

      await loadFitnessSummary();
    } catch {}
    setLoading(false);
  }, [loadFitnessSummary]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!socketReading) return;
    setLatest(socketReading);
    if (hasDirectBodySignals(socketReading)) {
      setLatestBodyReading(socketReading);
    }
    setChartData((prev) => {
      const point = {
        time: format(new Date(socketReading.recordedAt), 'HH:mm'),
        heartRate: socketReading.heartRate?.value,
        spo2: socketReading.spo2?.value,
        temperature: socketReading.temperature?.value,
        steps: socketReading.steps?.value,
      };
      return [...prev.slice(-19), point];
    });
    loadFitnessSummary();
  }, [socketReading, loadFitnessSummary]);

  if (loading) {
    return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Loading tracker...</div>;
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const onboarding = user?.onboarding || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const totals = fitnessSummary?.totals;
  const progress = fitnessSummary?.progress;
  const bodyReading = latestBodyReading || latest;
  const stepGoalProgress = progress?.steps ?? 0;
  const activeGoalProgress = progress?.activeMinutes ?? 0;
  const hydrationGoalProgress = progress?.hydration ?? 0;
  const recoveryScore = bodyReading?.sleepScore?.value ?? 72;
  const sourceDetails = latest?.sourceDetails;
  const sourceMode = sourceDetails?.mode || (latest?.source === 'device' ? 'band_plus_phone' : latest?.source === 'health_connect' ? 'health_connect' : 'phone_only');
  const bodySourceDetails = bodyReading?.sourceDetails;
  const bodySourceMode = bodySourceDetails?.mode || (bodyReading?.source === 'device' ? 'band_plus_phone' : bodyReading?.source === 'health_connect' ? 'health_connect' : bodyReading?.source === 'manual' ? 'manual_entry' : 'phone_only');
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((100 - (bodyReading?.stressLevel?.value ?? 35)) * 0.35) +
        ((bodyReading?.sleepScore?.value ?? 75) * 0.4) +
        ((progress?.activeMinutes ?? 45) * 0.25)
      )
    )
  );
  const currentMode = latest?.workoutMode || 'balanced';
  const updateLabel = latest?.recordedAt ? formatDistanceToNow(new Date(latest.recordedAt), { addSuffix: true }) : 'Waiting for sync';
  const billingUsageLabel = billingSummary?.usage?.readings?.limit === null
    ? `${billingSummary?.usage?.readings?.used || 0} used`
    : `${billingSummary?.usage?.readings?.used || 0}/${billingSummary?.usage?.readings?.limit || 0} used`;

  const highlights = [
    {
      title: 'Move',
      value: totals?.steps?.toLocaleString() || '—',
      unit: 'steps',
      detail: `${totals?.distance || '—'} km distance`,
      icon: 'steps',
    },
    {
      title: 'Burn',
      value: totals?.calories || '—',
      unit: 'kcal',
      detail: `${totals?.activeMinutes || 0} active min`,
      icon: 'calories',
    },
    {
      title: 'Recover',
      value: bodyReading?.sleepHours?.value || '—',
      unit: 'hrs',
      detail: `${recoveryScore}% sleep score`,
      icon: 'sleep',
    },
  ];

  const statusTone = toneForStatus(latest?.heartRate?.status);
  const sourceHeadline = sourceMode === 'band_plus_phone'
    ? 'Future band preview flow'
    : sourceMode === 'health_connect'
      ? 'Health Connect flow'
      : 'Phone-only tracking';
  const sourceSummary = sourceMode === 'band_plus_phone'
    ? `${sourceDetails?.primarySource || 'Band-preview sensors'} feed vitals, while ${sourceDetails?.movementSource || 'phone GPS'} helps refine activity.`
    : sourceMode === 'health_connect'
      ? `${sourceDetails?.primarySource || 'Health Connect'} provides platform-backed movement and connected wellness data through the backend adapter path.`
      : `${sourceDetails?.movementSource || 'Phone motion and GPS'} power movement, while body vitals should come from manual check-ins until a stronger device source is connected.`;
  const selectedGoal = goalCopy[onboarding.trackingGoal] || goalCopy.fitness;
  const selectedExperience = experienceCopy[onboarding.experienceLevel] || experienceCopy.beginner;
  const confidenceTier = sourceDetails?.confidenceTier || (latest?.confidence?.overall >= 78 ? 'high' : latest?.confidence?.overall >= 56 ? 'medium' : 'low');
  const bodyConfidenceTier = bodySourceDetails?.confidenceTier || (bodyReading?.confidence?.overall >= 78 ? 'high' : bodyReading?.confidence?.overall >= 56 ? 'medium' : 'low');
  const supportedMetrics = sourceDetails?.supportedMetrics || {};
  const bodySupportedMetrics = bodySourceDetails?.supportedMetrics || {};
  const sourceStrengthSummary = [
    `Movement ${supportedMetrics.movement || 'stronger'}`,
    `Vitals ${supportedMetrics.vitals || 'estimated'}`,
    `Recovery ${supportedMetrics.recovery || 'trend-based'}`,
  ];
  const showFirstRunState = tracking.ready && !tracking.enabled && !latest;
  const showWaitingForFirstSync = tracking.ready && tracking.enabled && !latest;

  if (showFirstRunState) {
    return (
      <div>
        <div className="page-header tracker-header">
          <div>
            <span className="eyebrow">Daily summary</span>
            <h1>{greeting}, {firstName}</h1>
            <p>{format(new Date(), 'EEEE, MMMM d')} · Start one source path and the dashboard will begin filling with real activity or check-in data.</p>
          </div>
        </div>

        <div className="page-content tracker-dashboard">
          <section className="card tracker-start-card">
            <div className="tracker-start-copy">
              <span className="eyebrow">Start tracking</span>
              <h2>No data yet</h2>
              <p>
                New accounts begin empty on purpose. Start phone activity tracking, add a manual check-in, or connect the free Health Connect path.
              </p>
              <div className="tracker-start-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ width: 'auto' }}
                  onClick={() => enableTracking()}
                >
                  Start phone tracking
                </button>
                <Link to="/log" className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>
                  Add first check-in
                </Link>
                <Link to="/wearable" className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>
                  Open device sources
                </Link>
              </div>
            </div>
            <div className="tracker-start-grid">
              <article className="tracker-start-tile">
                <span className="eyebrow">Phone sync</span>
                <strong>Movement first</strong>
                <p>Steps, distance, and active minutes start after you explicitly enable tracking.</p>
              </article>
              <article className="tracker-start-tile">
                <span className="eyebrow">Manual check-in</span>
                <strong>User-entered vitals</strong>
                <p>Heart rate, SpO2, temperature, BP, sleep, and hydration stay under your control.</p>
              </article>
              <article className="tracker-start-tile">
                <span className="eyebrow">Health Connect</span>
                <strong>Free connected path</strong>
                <p>Import connected-source activity through the free Android-friendly adapter flow.</p>
              </article>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (showWaitingForFirstSync) {
    return (
      <div>
        <div className="page-header tracker-header">
          <div>
            <span className="eyebrow">Daily summary</span>
            <h1>{greeting}, {firstName}</h1>
            <p>{format(new Date(), 'EEEE, MMMM d')} · Tracking is on. We&apos;re waiting for your first activity snapshot or check-in.</p>
          </div>
          <div className="tracker-header-actions">
            <span className="live-badge"><span className="live-dot" /> Starting sync</span>
          </div>
        </div>

        <div className="page-content tracker-dashboard">
          <section className="card tracker-start-card tracker-start-card-waiting">
            <div className="tracker-start-copy">
              <span className="eyebrow">Sync in progress</span>
              <h2>Waiting for first snapshot</h2>
              <p>
                Phone tracking is enabled. Move with your phone, add a manual check-in, or import a connected source and the dashboard will update.
              </p>
              <div className="tracker-start-actions">
                <Link to="/log" className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>
                  Add manual check-in
                </Link>
                <Link to="/wearable" className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>
                  Import connected source
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">Daily summary</span>
          <h1>{greeting}, {firstName}</h1>
          <p>{format(new Date(), 'EEEE, MMMM d')} · {selectedGoal.headline}. {selectedExperience}</p>
        </div>
        <div className="tracker-header-actions">
          <span className="live-badge"><span className="live-dot" /> Syncing live</span>
          <span className="tracker-sync-pill"><TrackerIcon name="clock" size={14} /> Updated {updateLabel}</span>
        </div>
      </div>

      <div className="page-content tracker-dashboard">
        {user?.onboarding?.completed !== true && (
          <section className="card tracker-onboarding-banner">
            <div>
              <span className="eyebrow">Setup</span>
              <h3>Finish your tracking preferences</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Tell VitalWatch whether you are optimizing for fitness, wellness, recovery, or future wearable use.
                We use that to explain your data path more clearly.
              </p>
            </div>
            <Link to="/profile" className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Complete setup</Link>
          </section>
        )}

        <section className="tracker-hero">
          <div className="tracker-hero-main card">
            <div className="tracker-hero-copy">
              <span className="eyebrow">Readiness</span>
              <h2>{readinessScore >= 75 ? 'Ready to push' : readinessScore >= 55 ? 'Solid training day' : 'Take a lighter approach'}</h2>
              <p>
                Recovery is {recoveryScore}% and your current load is {bodyReading?.stressLevel?.value ?? '—'}%.
                {' '}Mode is set to <strong style={{ textTransform: 'capitalize' }}>{currentMode}</strong>.
              </p>
              <div className="tracker-hero-badges">
                <span className="tracker-pill"><TrackerIcon name="device" size={14} /> {sourceHeadline}</span>
                <span className="tracker-pill"><TrackerIcon name="signal" size={14} /> {confidenceTierCopy[bodyConfidenceTier] || 'Moderate confidence'}</span>
                {bodySourceMode === 'phone_only' && bodySupportedMetrics.vitals === 'manual check-in required' ? (
                  <Link to="/log" className="tracker-pill" style={{ textDecoration: 'none' }}>
                    <TrackerIcon name="heart" size={14} /> Add manual vitals
                  </Link>
                ) : (
                  <>
                    <span className="tracker-pill"><TrackerIcon name="heart" size={14} /> {bodyReading?.heartRate?.value ?? '—'} BPM</span>
                    <span className="tracker-pill"><TrackerIcon name="oxygen" size={14} /> {bodyReading?.spo2?.value ?? '—'}% SpO2</span>
                    <span className="tracker-pill"><TrackerIcon name="temperature" size={14} /> {bodyReading?.temperature?.value ?? '—'}°C</span>
                  </>
                )}
              </div>
            </div>

            <div className="tracker-hero-side">
              <ProgressRing value={readinessScore} color="var(--accent-red)" label="Readiness" sublabel="today" />
              <div className="tracker-hero-note">
                <span style={{ color: statusTone.color }}>{statusTone.label}</span>
                <small>Heart rate status right now</small>
              </div>
            </div>
          </div>

          <div className="tracker-hero-stack">
            <div className="card tracker-stack-card">
              <div className="stack-card-top">
                <span className="eyebrow">Plan</span>
                <Link to="/billing">Manage</Link>
              </div>
              <strong>{billingSummary?.subscription?.plan || 'starter'} plan</strong>
              <small>{billingUsageLabel}</small>
            </div>
            <div className="card tracker-stack-card">
              <div className="stack-card-top">
                <span className="eyebrow">Alerts</span>
                <Link to="/alerts">Open</Link>
              </div>
              <strong>{liveAlerts.length > 0 ? `${liveAlerts.length} live` : 'All clear'}</strong>
              <small>{liveAlerts[0]?.message || 'No recent abnormal readings'}</small>
            </div>
          </div>
        </section>

        <section className="tracker-snapshot-grid">
          <div className="card tracker-trend-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Tracking flow</span>
                <h3>{sourceHeadline}</h3>
              </div>
            </div>
            <p className="tracker-flow-summary">{sourceSummary}</p>
            <div className="tracker-flow-steps">
              {(sourceDetails?.contributors || ['history-model']).map((item) => (
                <span key={item}>{item.replace(/-/g, ' ')}</span>
              ))}
            </div>
            <div className="tracker-flow-steps" style={{ marginTop: 12 }}>
              {sourceStrengthSummary.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="card tracker-trend-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Confidence</span>
                <h3>{latest?.confidence?.overall ?? '—'}% overall</h3>
              </div>
              <span className="tracker-pill">{confidenceTierCopy[confidenceTier] || 'Moderate confidence'}</span>
            </div>
            <div className="tracker-summary-rows">
              <div className="tracker-summary-row">
                <span><TrackerIcon name="activity" size={16} /> Movement</span>
                <strong>{latest?.confidence?.steps ?? '—'}% · {supportedMetrics.movement || 'stronger'}</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="heart" size={16} /> Vitals</span>
                <strong>{bodyReading?.confidence?.heartRate ?? bodyReading?.confidence?.overall ?? '—'}% · {bodySupportedMetrics.vitals || 'estimated'}</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="sleep" size={16} /> Recovery</span>
                <strong>{bodyReading?.confidence?.sleepScore ?? bodyReading?.confidence?.overall ?? '—'}% · {bodySupportedMetrics.recovery || 'trend-based'}</strong>
              </div>
            </div>
          </div>
        </section>

        {sourceMode === 'health_connect' && (
          <section className="card tracker-onboarding-banner">
            <div>
              <span className="eyebrow">Connected source</span>
              <h3>Health Connect is driving the latest reading</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                The current snapshot came through the free Android adapter path, so movement and supported vitals are being treated as connected-source data instead of phone-only estimation.
              </p>
            </div>
            <Link to="/wearable" className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>Review source path</Link>
          </section>
        )}

        <section className="tracker-snapshot-grid">
          <div className="card tracker-trend-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Your setup</span>
                <h3>{selectedGoal.headline}</h3>
              </div>
              <Link to="/profile">Adjust</Link>
            </div>
            <p className="tracker-flow-summary">{selectedGoal.detail}</p>
            <div className="tracker-flow-steps">
              <span>{onboarding.preferredTrackingMode === 'future_band' ? 'Future wearable path' : onboarding.preferredTrackingMode === 'both' ? 'Dual path' : 'Phone first'}</span>
              <span>{onboarding.experienceLevel || 'beginner'}</span>
              <span>{onboarding.trackingGoal || 'fitness'}</span>
            </div>
          </div>

          <div className="card tracker-trend-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Today&apos;s emphasis</span>
                <h3>{onboarding.trackingGoal === 'recovery' ? 'Recover well' : onboarding.trackingGoal === 'clinical-awareness' ? 'Watch signal quality' : 'Stay consistent'}</h3>
              </div>
            </div>
            <div className="tracker-summary-rows">
              <div className="tracker-summary-row">
                <span><TrackerIcon name="steps" size={16} /> Activity target</span>
                <strong>{onboarding.trackingGoal === 'fitness' ? `${stepGoalProgress}%` : `${totals?.activeMinutes || 0} min`}</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="sleep" size={16} /> Recovery focus</span>
                <strong>{recoveryScore}%</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="device" size={16} /> Source mode</span>
                <strong>{sourceHeadline}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="tracker-goals">
          <div className="card tracker-rings-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Goals</span>
                <h3>Close your rings</h3>
              </div>
              <Link to="/profile">Adjust goals</Link>
            </div>
            <div className="tracker-rings-grid">
              <div className="tracker-ring-card">
                <ProgressRing value={stepGoalProgress} color="var(--accent-red)" label="Steps" sublabel={`${totals?.steps?.toLocaleString() || 0}`} compact />
              </div>
              <div className="tracker-ring-card">
                <ProgressRing value={activeGoalProgress} color="var(--accent-blue)" label="Active" sublabel={`${totals?.activeMinutes || 0} min`} compact />
              </div>
              <div className="tracker-ring-card">
                <ProgressRing value={hydrationGoalProgress} color="var(--accent-green)" label="Hydration" sublabel={`${hydrationGoalProgress}%`} compact />
              </div>
            </div>
          </div>

          <div className="tracker-highlight-grid">
            {highlights.map((item) => (
              <article key={item.title} className="card tracker-highlight-card">
                <div className="tracker-highlight-icon"><TrackerIcon name={item.icon} size={18} /></div>
                <span className="eyebrow">{item.title}</span>
                <strong>{item.value} <small>{item.unit}</small></strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="tracker-snapshot-grid">
          <div className="card tracker-trend-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Movement</span>
                <h3>Today at a glance</h3>
              </div>
            </div>
            <div className="tracker-summary-rows">
              <div className="tracker-summary-row">
                <span><TrackerIcon name="distance" size={16} /> Distance</span>
                <strong>{totals?.distance || '—'} km</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="calories" size={16} /> Calories</span>
                <strong>{totals?.calories || '—'} kcal</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="sleep" size={16} /> Sleep</span>
                <strong>{bodyReading?.sleepHours?.value || '—'} hrs</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="stress" size={16} /> Stress</span>
                <strong>{bodyReading?.stressLevel?.value || '—'}%</strong>
              </div>
            </div>
          </div>

          <div className="card tracker-mini-chart-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Steps</span>
                <h3>Recent cadence</h3>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="stepsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e63946" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" tick={{ fill: '#71718f', fontSize: 10 }} />
                <YAxis tick={{ fill: '#71718f', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="steps" name="steps" stroke="#e63946" fill="url(#stepsFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="tracker-vitals-section">
          <div className="panel-heading panel-heading-inline">
            <div>
              <span className="eyebrow">Vitals</span>
              <h3>Live body signals</h3>
            </div>
          </div>
          <div className="tracker-vitals-grid">
            {metricCards(bodyReading).map((metric) => {
              const rendered = getMetricPresentation({
                metricKey: metric.key === 'heart-rate' ? 'heart' : metric.key,
                metric,
                fallbackUnit: metric.unit,
                sourceMode: bodySourceMode,
                sourceDetails: { ...bodySourceDetails, overallConfidence: bodyReading?.confidence?.overall },
              });

              return (
              <article key={metric.key} className={`tracker-vital-card status-${metric.status || 'normal'}`}>
                <div className="tracker-vital-top">
                  <div className="tracker-vital-icon"><TrackerIcon name={metric.icon} size={18} /></div>
                  <span>{rendered.trend}</span>
                </div>
                <strong>{rendered.value} <small>{rendered.unit}</small></strong>
                <p>{metric.label}</p>
              </article>
            );
            })}
          </div>
        </section>

        {chartData.length > 1 && (
          <section className="charts-grid tracker-chart-grid">
            <div className="chart-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Heart</span>
                  <h3>Heart rate</h3>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: '#71718f', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#71718f', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="heartRate" name="BPM" stroke="#e63946" strokeWidth={2.4} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Recovery</span>
                  <h3>Oxygen and temperature</h3>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: '#71718f', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#71718f', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="spo2" name="SpO2" stroke="#4ecdc4" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="temperature" name="Temp" stroke="#f39c12" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
