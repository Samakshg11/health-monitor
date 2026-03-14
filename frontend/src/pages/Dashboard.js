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
    },
    {
      key: 'oxygen',
      icon: 'oxygen',
      label: 'Blood oxygen',
      value: spo2?.value ?? '—',
      unit: '%',
      trend: toneForStatus(spo2?.status).label,
      status: spo2?.status,
    },
    {
      key: 'temp',
      icon: 'temperature',
      label: 'Skin temp',
      value: temp?.value ?? '—',
      unit: '°C',
      trend: toneForStatus(temp?.status).label,
      status: temp?.status,
    },
    {
      key: 'stress',
      icon: 'stress',
      label: 'Stress load',
      value: stress?.value ?? '—',
      unit: '%',
      trend: toneForStatus(stress?.status).label,
      status: stress?.status,
    },
    {
      key: 'bp',
      icon: 'pressure',
      label: 'Blood pressure',
      value: bloodPressure?.systolic ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : '—',
      unit: 'mmHg',
      trend: toneForStatus(bloodPressure?.status).label,
      status: bloodPressure?.status,
    },
    {
      key: 'sleep',
      icon: 'sleep',
      label: 'Sleep duration',
      value: sleepHours?.value ?? '—',
      unit: 'hrs',
      trend: 'Last night',
      status: 'normal',
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

const Dashboard = () => {
  const { user } = useAuth();
  const { latestReading: socketReading, liveAlerts } = useSocket();
  const [latest, setLatest] = useState(null);
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

      const readings = readingsRes.data.readings.reverse();
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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const totals = fitnessSummary?.totals;
  const progress = fitnessSummary?.progress;
  const stepGoalProgress = progress?.steps ?? 0;
  const activeGoalProgress = progress?.activeMinutes ?? 0;
  const hydrationGoalProgress = progress?.hydration ?? 0;
  const recoveryScore = latest?.sleepScore?.value ?? 72;
  const sourceDetails = latest?.sourceDetails;
  const sourceMode = sourceDetails?.mode || (latest?.source === 'device' ? 'band_plus_phone' : 'phone_only');
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((100 - (latest?.stressLevel?.value ?? 35)) * 0.35) +
        ((latest?.sleepScore?.value ?? 75) * 0.4) +
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
      value: latest?.sleepHours?.value || '—',
      unit: 'hrs',
      detail: `${recoveryScore}% sleep score`,
      icon: 'sleep',
    },
  ];

  const statusTone = toneForStatus(latest?.heartRate?.status);
  const sourceHeadline = sourceMode === 'band_plus_phone' ? 'Band-connected tracking' : 'Phone-only tracking';
  const sourceSummary = sourceMode === 'band_plus_phone'
    ? `${sourceDetails?.primarySource || 'Band sensors'} feed vitals, while ${sourceDetails?.movementSource || 'phone GPS'} helps refine activity.`
    : `${sourceDetails?.movementSource || 'Phone motion and GPS'} power movement, while vitals are estimated from activity and recent patterns.`;

  return (
    <div>
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">Daily summary</span>
          <h1>{greeting}, {firstName}</h1>
          <p>{format(new Date(), 'EEEE, MMMM d')} · Everything from your band and current session in one place.</p>
        </div>
        <div className="tracker-header-actions">
          <span className="live-badge"><span className="live-dot" /> Syncing live</span>
          <span className="tracker-sync-pill"><TrackerIcon name="clock" size={14} /> Updated {updateLabel}</span>
        </div>
      </div>

      <div className="page-content tracker-dashboard">
        <section className="tracker-hero">
          <div className="tracker-hero-main card">
            <div className="tracker-hero-copy">
              <span className="eyebrow">Readiness</span>
              <h2>{readinessScore >= 75 ? 'Ready to push' : readinessScore >= 55 ? 'Solid training day' : 'Take a lighter approach'}</h2>
              <p>
                Recovery is {recoveryScore}% and your current load is {latest?.stressLevel?.value ?? '—'}%.
                {' '}Mode is set to <strong style={{ textTransform: 'capitalize' }}>{currentMode}</strong>.
              </p>
              <div className="tracker-hero-badges">
                <span className="tracker-pill"><TrackerIcon name="device" size={14} /> {sourceHeadline}</span>
                <span className="tracker-pill"><TrackerIcon name="heart" size={14} /> {latest?.heartRate?.value ?? '—'} BPM</span>
                <span className="tracker-pill"><TrackerIcon name="oxygen" size={14} /> {latest?.spo2?.value ?? '—'}% SpO2</span>
                <span className="tracker-pill"><TrackerIcon name="temperature" size={14} /> {latest?.temperature?.value ?? '—'}°C</span>
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
          </div>

          <div className="card tracker-trend-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Confidence</span>
                <h3>{latest?.confidence?.overall ?? '—'}% overall</h3>
              </div>
            </div>
            <div className="tracker-summary-rows">
              <div className="tracker-summary-row">
                <span><TrackerIcon name="activity" size={16} /> Movement</span>
                <strong>{latest?.confidence?.steps ?? '—'}%</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="heart" size={16} /> Vitals</span>
                <strong>{latest?.confidence?.heartRate ?? '—'}%</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="sleep" size={16} /> Recovery</span>
                <strong>{latest?.confidence?.sleepScore ?? '—'}%</strong>
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
                <strong>{latest?.sleepHours?.value || '—'} hrs</strong>
              </div>
              <div className="tracker-summary-row">
                <span><TrackerIcon name="stress" size={16} /> Stress</span>
                <strong>{latest?.stressLevel?.value || '—'}%</strong>
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
            {metricCards(latest).map((metric) => (
              <article key={metric.key} className={`tracker-vital-card status-${metric.status || 'normal'}`}>
                <div className="tracker-vital-top">
                  <div className="tracker-vital-icon"><TrackerIcon name={metric.icon} size={18} /></div>
                  <span>{metric.trend}</span>
                </div>
                <strong>{metric.value} <small>{metric.unit}</small></strong>
                <p>{metric.label}</p>
              </article>
            ))}
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
