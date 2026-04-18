import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { getLatestReading, getReadings, getFitnessToday, getBillingCurrent, generateAIReading, askAICoach, getSleepAnalysis, getMedicalReport } from '../utils/api';
import { ProgressRing, TrackerIcon } from '../components/TrackerUI';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AICoach = ({ history, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi ${user?.name?.split(' ')[0] || ''}, I'm your VitalWatch AI Coach. Ready for a pulse check?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const { data } = await askAICoach(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm having a connection issue. Can you check your API key?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!user) return;
    setLoadingReport(true);
    toast.loading('Synthesizing clinical data...', { id: 'report-gen' });
    
    try {
      const { data } = await getMedicalReport();
      const doc = new jsPDF();
      
      // Add Title
      doc.setFontSize(22);
      doc.setTextColor(230, 57, 70);
      doc.text('VitalWatch Clinical Snapshot', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Patient: ${user.name}`, 14, 35);
      
      // Add Content
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(data.report.replace(/#/g, ''), 180);
      doc.text(splitText, 14, 50);
      
      // Add History Table
      const tableData = history.slice(0, 10).map(r => [
        format(new Date(r.recordedAt), 'MMM dd, HH:mm'),
        `${r.heartRate?.value || '--'} BPM`,
        `${r.bloodPressure?.systolic || '--'}/${r.bloodPressure?.diastolic || '--'}`,
        `${r.spo2?.value || '--'}%`,
        `${r.temperature?.value || '--'}C`
      ]);
      
      autoTable(doc, {
        startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 200,
        head: [['Time', 'HR', 'BP', 'SpO2', 'Temp']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [230, 57, 70] },
      });
      
      doc.save(`${user.name.replace(/ /g, '_')}_Health_Report.pdf`);
      toast.success('Medical Report ready for download', { id: 'report-gen' });
    } catch (err) {
      toast.error('Could not generate the clinical report.', { id: 'report-gen' });
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className={`ai-coach-wrapper ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button className="ai-coach-trigger" onClick={() => setIsOpen(true)}>
          <TrackerIcon name="device" size={24} />
          <span>Coach pulse</span>
        </button>
      )}

      {isOpen && (
        <div className="ai-coach-card card">
          <div className="ai-coach-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--accent-blue)' }}>AI Life Coach</span>
              <h3>VitalWatch Intelligence</h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
               <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.6rem' }} onClick={handleGenerateReport} disabled={loadingReport}>
                {loadingReport ? '...' : 'PDF Report'}
              </button>
              <button className="btn-close" onClick={() => setIsOpen(false)}>×</button>
            </div>
          </div>

          <div className="ai-coach-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                <div className="ai-msg-bubble">{m.text}</div>
              </div>
            ))}
            {isTyping && <div className="ai-msg assistant typing"><div className="ai-msg-bubble">Analysis in progress...</div></div>}
          </div>

          <form className="ai-coach-input" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Ask about your vitals..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
            />
            <button type="submit" disabled={isTyping}>→</button>
          </form>
        </div>
      )}
    </div>
  );
};

const toneForStatus = (status) => {
  if (status === 'critical') return { label: 'Attention', color: 'var(--accent-red)' };
  if (status === 'warning') return { label: 'Elevated', color: 'var(--accent-yellow)' };
  return { label: 'Stable', color: 'var(--accent-green)' };
};

const metricCards = (latest, fallbackReading = null) => {
  if (!latest && !fallbackReading) return [];

  const primary = latest || fallbackReading;
  const fallback = fallbackReading || latest || {};
  const heartRate = primary?.heartRate || fallback?.heartRate;
  const spo2 = primary?.spo2 || fallback?.spo2;
  const temp = primary?.temperature || fallback?.temperature;
  const stress = primary?.stressLevel || fallback?.stressLevel;
  const bloodPressure = primary?.bloodPressure || fallback?.bloodPressure;
  const sleepHours = primary?.sleepHours || fallback?.sleepHours;
  const sleepScore = primary?.sleepScore || fallback?.sleepScore;

  return [
    {
      key: 'heart-rate',
      icon: 'heart',
      iconClass: 'heartbeat-icon',
      label: 'Heart rate',
      value: heartRate?.value ?? '—',
      unit: 'BPM',
      trend: toneForStatus(heartRate?.status).label,
      status: heartRate?.status,
      confidence: primary?.confidence?.heartRate,
    },
    {
      key: 'oxygen',
      icon: 'oxygen',
      label: 'Blood oxygen',
      value: spo2?.value ?? '—',
      unit: '%',
      trend: toneForStatus(spo2?.status).label,
      status: spo2?.status,
      confidence: primary?.confidence?.spo2,
    },
    {
      key: 'temp',
      icon: 'temperature',
      label: 'Skin temp',
      value: temp?.value ?? '—',
      unit: '°C',
      trend: toneForStatus(temp?.status).label,
      status: temp?.status,
      confidence: primary?.confidence?.temperature,
    },
    {
      key: 'stress',
      icon: 'stress',
      label: 'Stress load',
      value: stress?.value ?? '—',
      unit: '%',
      trend: toneForStatus(stress?.status).label,
      status: stress?.status,
      confidence: primary?.confidence?.stressLevel ?? fallback?.confidence?.stressLevel,
    },
    {
      key: 'bp',
      icon: 'pressure',
      label: 'Blood pressure',
      value: bloodPressure?.systolic ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : '—',
      unit: 'mmHg',
      trend: toneForStatus(bloodPressure?.status).label,
      status: bloodPressure?.status,
      confidence: primary?.confidence?.bloodPressure,
    },
    {
      key: 'sleep',
      icon: 'sleep',
      label: sleepHours?.value !== undefined ? 'Sleep duration' : 'Sleep quality',
      value: sleepHours?.value ?? sleepScore?.value ?? '—',
      unit: sleepHours?.value !== undefined ? 'hrs' : '%',
      trend: sleepHours?.value !== undefined ? 'Last night' : 'Recovery',
      status: sleepScore?.status || 'normal',
      confidence: primary?.confidence?.sleepHours ?? primary?.confidence?.sleepScore ?? fallback?.confidence?.sleepHours ?? fallback?.confidence?.sleepScore,
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

const hasMovementSignals = (reading) => Boolean(
  reading?.steps?.value !== undefined ||
  reading?.distance?.value !== undefined ||
  reading?.activeMinutes?.value !== undefined ||
  reading?.calories?.value !== undefined ||
  reading?.cadence?.value !== undefined
);

const buildCompositeBodyReading = (readings = []) => {
  const ordered = readings.filter(Boolean);
  const baseReading = ordered.find(hasDirectBodySignals);
  if (!baseReading) return null;

  const metricKeys = [
    'heartRate',
    'bloodPressure',
    'spo2',
    'temperature',
    'sleepScore',
    'sleepHours',
    'stressLevel',
    'hydration',
  ];

  const composite = {
    ...baseReading,
    confidence: { ...(baseReading.confidence || {}) },
  };

  for (const key of metricKeys) {
    const provider = ordered.find((reading) => {
      if (key === 'bloodPressure') {
        return Boolean(reading?.bloodPressure?.systolic);
      }
      return reading?.[key]?.value !== undefined && reading?.[key]?.value !== null;
    });

    if (provider) {
      composite[key] = provider[key];
      if (provider.confidence?.[key] !== undefined) {
        composite.confidence[key] = provider.confidence[key];
      }
    }
  }

  if (composite.confidence.overall === undefined) {
    composite.confidence.overall = baseReading.confidence?.overall;
  }

  const hasMovement =
    composite.steps?.value !== undefined ||
    composite.distance?.value !== undefined ||
    composite.activeMinutes?.value !== undefined ||
    composite.calories?.value !== undefined ||
    composite.cadence?.value !== undefined;
  const hasVitals =
    composite.heartRate?.value !== undefined ||
    composite.bloodPressure?.systolic !== undefined ||
    composite.spo2?.value !== undefined ||
    composite.temperature?.value !== undefined;
  const hasRecovery =
    composite.sleepScore?.value !== undefined ||
    composite.sleepHours?.value !== undefined ||
    composite.stressLevel?.value !== undefined ||
    composite.hydration?.value !== undefined;

  composite.sourceDetails = {
    ...(baseReading.sourceDetails || {}),
    supportedMetrics: {
      movement: hasMovement ? 'manual summary' : 'no activity logged',
      vitals: hasVitals ? 'manual measurement' : 'not entered',
      recovery: hasRecovery ? 'manual summary' : 'not entered',
    },
  };

  const confidenceValues = [
    composite.confidence.heartRate,
    composite.confidence.bloodPressure,
    composite.confidence.spo2,
    composite.confidence.temperature,
    composite.confidence.sleepScore,
    composite.confidence.sleepHours,
    composite.confidence.stressLevel,
    composite.confidence.steps,
    composite.confidence.distance,
    composite.confidence.activeMinutes,
  ].filter((value) => typeof value === 'number');

  if (confidenceValues.length) {
    composite.confidence.overall = Math.round(
      confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    );
  }

  return composite;
};

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tracking, enableTracking, verification, wearable } = useAuth();
  const { latestReading: socketReading, liveAlerts } = useSocket();
  const [latest, setLatest] = useState(null);
  const [recentReadings, setRecentReadings] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [fitnessSummary, setFitnessSummary] = useState(null);
  const [billingSummary, setBillingSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiActivity, setAiActivity] = useState('sitting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sleepAnalysis, setSleepAnalysis] = useState(null);
  const freshReading = location.state?.freshReading || null;
  const bodyReading = useMemo(
    () => buildCompositeBodyReading([latest, ...recentReadings]),
    [latest, recentReadings]
  );
  const movementReading = useMemo(
    () => [latest, ...recentReadings].find(hasMovementSignals) || null,
    [latest, recentReadings]
  );

  const loadFitnessSummary = useCallback(async () => {
    try {
      const { data } = await getFitnessToday();
      setFitnessSummary(data.summary);
    } catch {}
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [latestRes, readingsRes, billingRes, sleepRes, fitnessRes] = await Promise.all([
        getLatestReading(),
        getReadings({ limit: 20 }),
        getBillingCurrent(),
        getSleepAnalysis(),
        getFitnessToday(),
      ]);

      setLatest(latestRes.data.reading);
      setBillingSummary(billingRes.data);
      setSleepAnalysis(sleepRes.data.analysis);
      setFitnessSummary(fitnessRes.data.summary);

      const recentReadings = readingsRes.data.readings || [];
      setRecentReadings(recentReadings);

      const readings = [...recentReadings].reverse();
      setChartData(
        readings.map((reading) => ({
          time: format(new Date(reading.recordedAt), 'HH:mm'),
          heartRate: reading.heartRate?.value,
          spo2: reading.spo2?.value,
          temperature: reading.temperature?.value,
          steps: reading.steps?.value,
        }))
      );
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!freshReading) return;

    setLatest((prev) => {
      if (!prev) return freshReading;
      return new Date(freshReading.recordedAt || 0) >= new Date(prev.recordedAt || 0) ? freshReading : prev;
    });
    setRecentReadings((prev) => [freshReading, ...prev.filter((reading) => reading?._id !== freshReading?._id)].slice(0, 20));

    navigate(location.pathname, { replace: true, state: {} });
  }, [freshReading, location.pathname, navigate]);

  useEffect(() => {
    if (!socketReading) return;
    setLatest(socketReading);
    setRecentReadings((prev) => [socketReading, ...prev].slice(0, 20));
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

  useEffect(() => {
    if (!isAiMode) return undefined;

    const tick = async () => {
      if (isGenerating) return;
      setIsGenerating(true);
      try {
        await generateAIReading(aiActivity);
        // Socket will update the dashboard automatically
      } catch (err) {
        console.error('AI Generation failed', err);
        toast.error('AI Link stabilizing... Retrying in 60s.');
      } finally {
        setIsGenerating(false);
      }
    };

    const id = setInterval(tick, 60000); // Generate every 60s to ensure Coach has maximum quota priority
    tick(); // Initial call
    return () => clearInterval(id);
  }, [isAiMode, aiActivity, isGenerating]);

  if (loading) {
    return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Loading tracker...</div>;
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const onboarding = user?.onboarding || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const totals = fitnessSummary?.totals;
  const progress = fitnessSummary?.progress;
  const stepGoalProgress = progress?.steps ?? 0;
  const activeGoalProgress = progress?.activeMinutes ?? 0;
  const hydrationGoalProgress = progress?.hydration ?? 0;
  const recoveryScore = bodyReading?.sleepScore?.value ?? latest?.sleepScore?.value ?? 72;
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

  const statusTone = toneForStatus(bodyReading?.heartRate?.status ?? latest?.heartRate?.status);
  const flowMode = movementReading?.source === 'health_connect'
    ? 'health_connect'
    : movementReading?.source === 'device'
      ? 'band_plus_phone'
      : movementReading && bodyReading
        ? 'phone_plus_manual'
        : bodySourceMode === 'manual_entry'
          ? 'manual_entry'
          : sourceMode;
  const sourceHeadline = flowMode === 'band_plus_phone'
    ? 'Future band preview flow'
    : flowMode === 'health_connect'
      ? 'Health Connect flow'
      : flowMode === 'phone_plus_manual'
        ? 'Phone tracking + manual check-ins'
        : flowMode === 'manual_entry'
          ? 'Manual check-in'
          : 'Phone-only tracking';
  const sourceSummary = flowMode === 'band_plus_phone'
    ? `${movementReading?.sourceDetails?.primarySource || 'Band-preview sensors'} feed vitals, while ${movementReading?.sourceDetails?.movementSource || 'phone GPS'} helps refine activity.`
    : flowMode === 'health_connect'
      ? `${movementReading?.sourceDetails?.primarySource || 'Health Connect'} provides platform-backed movement and connected wellness data through the backend adapter path.`
      : flowMode === 'phone_plus_manual'
        ? `${movementReading?.sourceDetails?.movementSource || 'Phone motion and GPS'} keep movement live, while manual check-ins update body vitals and recovery whenever you log them.`
        : flowMode === 'manual_entry'
          ? `${bodySourceDetails?.primarySource || 'Manual check-ins'} are currently driving this view. Start phone tracking if you want movement to update live through the day.`
          : `${movementReading?.sourceDetails?.movementSource || 'Phone motion and GPS'} keep movement live, while stronger body signals come from manual check-ins or a connected source.`;
  const selectedGoal = goalCopy[onboarding.trackingGoal] || goalCopy.fitness;
  const confidenceTier = sourceDetails?.confidenceTier || (latest?.confidence?.overall >= 78 ? 'high' : latest?.confidence?.overall >= 56 ? 'medium' : 'low');
  const bodyConfidenceTier = bodySourceDetails?.confidenceTier || (bodyReading?.confidence?.overall >= 78 ? 'high' : bodyReading?.confidence?.overall >= 56 ? 'medium' : 'low');
  const supportedMetrics = sourceDetails?.supportedMetrics || {};
  const bodySupportedMetrics = bodySourceDetails?.supportedMetrics || {};
  const movementSupportedMetrics = movementReading?.sourceDetails?.supportedMetrics || {};
  const movementConfidence = movementReading?.confidence?.steps ?? movementReading?.confidence?.distance ?? movementReading?.confidence?.activeMinutes ?? movementReading?.confidence?.overall;
  const flowContributors = Array.from(new Set([
    ...(movementReading?.sourceDetails?.contributors || []),
    ...(bodyReading?.sourceDetails?.contributors || []),
  ]));
  const sourceStrengthSummary = [
    `Movement ${movementSupportedMetrics.movement || supportedMetrics.movement || 'stronger'}`,
    `Vitals ${bodySupportedMetrics.vitals || supportedMetrics.vitals || 'estimated'}`,
    `Recovery ${bodySupportedMetrics.recovery || supportedMetrics.recovery || 'trend-based'}`,
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
          <span className="eyebrow">VitalWatch Dashboard</span>
          <h1>{greeting}, {firstName}</h1>
          <p>{format(new Date(), 'EEEE, MMMM d')} · Personal health companion</p>
        </div>
        <div className="tracker-header-actions">
           <span className="tracker-sync-pill" style={{ marginRight: 16, fontSize: '0.75rem', opacity: 0.7 }}>
             Updated {updateLabel}
          </span>
          <span className="live-badge"><span className="live-dot" /> Syncing live</span>
        </div>
      </div>

      <div className="page-content tracker-dashboard">
        {/* Intelligence Hero */}
        <section className="card intelligence-hero">
            <div className="intelligence-content">
                <span className="eyebrow" style={{ color: 'var(--accent-purple)' }}>Daily Insight</span>
                <h2>{sleepAnalysis?.summary ? "Your Analysis is Ready" : "Calibrating AI..."}</h2>
                <p className="intelligence-text">
                    {sleepAnalysis?.summary || "Welcome back, we're currently analyzing your latest sync data and heart rate variability to prepare your daily briefing."}
                </p>
                {sleepAnalysis?.recommendations && (
                    <div className="intelligence-actions">
                        {sleepAnalysis.recommendations.slice(0, 2).map((rec, i) => (
                            <span key={i} className="intelligence-pill">{rec}</span>
                        ))}
                    </div>
                )}
            </div>
            <div className="intelligence-visual">
                <div className="readiness-gauge">
                    <ProgressRing value={readinessScore} color="var(--accent-purple)" label="Readiness" />
                </div>
            </div>
        </section>

        <section className={`card tracker-control-card ai-active`} style={{ border: '1px solid var(--accent-blue)', marginBottom: 24, background: 'rgba(52, 152, 219, 0.05)' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--accent-blue)' }}>Intelligence Engine Control</span>
              <h3>{isAiMode ? `Currently Simulating: ${aiActivity}` : 'AI Data Link Idle'}</h3>
              <p className="tracker-flow-summary">
                {isAiMode 
                  ? "Your biometric pulse is being driven by the Gemma-3 Performance Engine based on your selected activity state."
                  : "Connect the AI Stream to simulate real-time biometric data patterns for your currently selected lifestyle context."}
              </p>
            </div>
            <div className="tracker-control-actions" style={{ gap: 12 }}>
                <select 
                  className="btn btn-secondary btn-sm" 
                  value={aiActivity} 
                  onChange={(e) => setAiActivity(e.target.value)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: 'auto' }}
                >
                  <option value="sitting">🧘 Sitting</option>
                  <option value="walking">🚶 Walking</option>
                  <option value="running">🏃 Running</option>
                  <option value="sleeping">😴 Sleeping</option>
                  <option value="recovering">🔋 Recovering</option>
                </select>
              <button 
                type="button" 
                className={`btn ${isAiMode ? 'btn-secondary' : 'btn-primary'} btn-sm`} 
                style={{ width: 'auto', minWidth: '140px' }} 
                onClick={() => {
                  setIsAiMode(!isAiMode);
                  if (!isAiMode) toast.success('AI Health Stream synchronized');
                }}
              >
                {isAiMode ? 'Disconnect Link' : 'Synchronize AI Link'}
              </button>
            </div>
          </section>

        {/* Essential Vitals Grid */}
        {/* Predictive AI Timeline */}
        <section className="card predictive-timeline-card">
          <div className="timeline-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--accent-green)' }}>Prediction Engine</span>
              <h3>Forecasted Energy Path</h3>
            </div>
            <span className="tracker-pill" style={{ background: 'rgba(52, 152, 219, 0.1)', color: 'var(--accent-blue)' }}>Live Bio-Sync</span>
          </div>
          <div className="timeline-row">
            {(latest?.forecast?.length ? latest.forecast : [
              { time: '2h', energy: 'stable', label: 'Baseline', action: 'Maintain current activity' },
              { time: '4h', energy: 'dip', label: 'Energy Dip', action: 'Rest recommended' },
              { time: '6h', energy: 'stable', label: 'Recovery', action: 'Light movement' },
              { time: '8h', energy: 'high', label: 'Peak State', action: 'Optimal for deep work' }
            ]).map((node, i) => (
              <div key={i} className={`timeline-node energy-${node.energy}`}>
                <span className="node-time">{node.time}</span>
                <div className="node-dot"></div>
                <span className="node-label">{node.label}</span>
                <div className="node-tooltip">
                   <strong>Tip:</strong> {node.action}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="vitals-primary-grid">
            {metricCards(bodyReading, latest).slice(0, 3).map((metric) => {
                const rendered = getMetricPresentation({
                    metricKey: metric.key === 'heart-rate' ? 'heart' : metric.key,
                    metric,
                    fallbackUnit: metric.unit,
                    sourceMode: bodySourceMode,
                    sourceDetails: { ...bodySourceDetails, overallConfidence: bodyReading?.confidence?.overall },
                });
                return (
                    <article key={metric.key} className={`card vital-mini-card status-${metric.status || 'normal'}`}>
                        <div className="vital-header">
                            <TrackerIcon name={metric.icon} size={16} className={metric.iconClass} />
                            <span>{metric.label}</span>
                        </div>
                        <div className="vital-body">
                            <strong>{rendered.value}</strong>
                            <small>{rendered.unit}</small>
                        </div>
                        <div className="vital-footer">
                            <span style={{ color: toneForStatus(metric.status).color }}>{rendered.trend}</span>
                        </div>
                    </article>
                );
            })}
        </section>

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
                Recovery is {recoveryScore}% and your current load is {bodyReading?.stressLevel?.value ?? latest?.stressLevel?.value ?? '—'}%.
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
                    <span className="tracker-pill"><TrackerIcon name="heart" size={14} /> {bodyReading?.heartRate?.value ?? latest?.heartRate?.value ?? '—'} BPM</span>
                    <span className="tracker-pill"><TrackerIcon name="oxygen" size={14} /> {bodyReading?.spo2?.value ?? latest?.spo2?.value ?? '—'}% SpO2</span>
                    <span className="tracker-pill"><TrackerIcon name="temperature" size={14} /> {bodyReading?.temperature?.value ?? latest?.temperature?.value ?? '—'}°C</span>
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
              {(flowContributors.length ? flowContributors : ['history-model']).map((item) => (
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
                <h3>{movementConfidence ?? bodyReading?.confidence?.overall ?? latest?.confidence?.overall ?? '—'}% overall</h3>
              </div>
              <span className="tracker-pill">{confidenceTierCopy[confidenceTier] || confidenceTierCopy[bodyConfidenceTier] || 'Moderate confidence'}</span>
            </div>
            <div className="tracker-summary-rows">
              <div className="tracker-summary-row">
                <span><TrackerIcon name="activity" size={16} /> Movement</span>
                <strong>{movementConfidence ?? '—'}% · {movementSupportedMetrics.movement || supportedMetrics.movement || 'stronger'}</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="heart" size={16} /> Vitals</span>
                <strong>{bodyReading?.confidence?.heartRate ?? bodyReading?.confidence?.overall ?? latest?.confidence?.heartRate ?? latest?.confidence?.overall ?? '—'}% · {bodySupportedMetrics.vitals || 'estimated'}</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="sleep" size={16} /> Recovery</span>
                <strong>{bodyReading?.confidence?.sleepScore ?? bodyReading?.confidence?.sleepHours ?? bodyReading?.confidence?.stressLevel ?? bodyReading?.confidence?.overall ?? latest?.confidence?.sleepScore ?? latest?.confidence?.stressLevel ?? latest?.confidence?.overall ?? '—'}% · {bodySupportedMetrics.recovery || 'trend-based'}</strong>
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
                <strong>{bodyReading?.sleepHours?.value ?? latest?.sleepHours?.value ?? bodyReading?.sleepScore?.value ?? latest?.sleepScore?.value ?? '—'} {bodyReading?.sleepHours?.value !== undefined || latest?.sleepHours?.value !== undefined ? 'hrs' : '%'}</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="stress" size={16} /> Stress</span>
                <strong>{bodyReading?.stressLevel?.value ?? latest?.stressLevel?.value ?? '—'}%</strong>
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
            {metricCards(bodyReading, latest).map((metric) => {
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

        {sleepAnalysis && (
          <section className="card tracker-sleep-lab" style={{ background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.1), transparent)' }}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow" style={{ color: 'var(--accent-purple)' }}>AI Sleep Lab</span>
                <h3>Sleep efficiency & recovery quality</h3>
              </div>
              <span className="tracker-pill" style={{ color: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}>{sleepAnalysis.efficiencyScore || '--'}% Quality</span>
            </div>
            <p className="tracker-flow-summary" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
              {sleepAnalysis.summary}
            </p>
            <div className="tracker-sleep-recommendations">
              {(sleepAnalysis.recommendations || []).map((rec, i) => (
                <div key={i} className="tracker-sleep-rec">
                   <TrackerIcon name="activity" size={14} color="var(--accent-purple)" />
                   <span>{rec}</span>
                </div>
              ))}
            </div>
          </section>
        )}

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
      <AICoach user={user} history={recentReadings} />
    </div>
  );
};

export default Dashboard;
