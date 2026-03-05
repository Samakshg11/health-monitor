import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getLatestReading, getReadings, getFitnessToday, submitReading } from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const sessionModes = {
  balanced: { label: 'Balanced', hr: [112, 132], cadence: [150, 168], pace: [5.5, 6.5], steps: [120, 200] },
  push: { label: 'Push', hr: [138, 168], cadence: [170, 188], pace: [4.2, 5.3], steps: [190, 290] },
  recovery: { label: 'Recovery', hr: [95, 118], cadence: [138, 156], pace: [6.7, 7.8], steps: [90, 150] },
};

const rand = (min, max) => Math.random() * (max - min) + min;

const MetricCard = ({ icon, label, value, unit, status }) => (
  <div className={`metric-card status-${status || 'normal'}`}>
    <div className="metric-header">
      <div className="metric-icon">{icon}</div>
      <span className="metric-status">{status || 'normal'}</span>
    </div>
    <div className="metric-value">{value ?? '—'}</div>
    <div className="metric-unit">{unit}</div>
    <div className="metric-label">{label}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { latestReading: socketReading, liveAlerts } = useSocket();
  const [latest, setLatest] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [fitnessSummary, setFitnessSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMode, setSessionMode] = useState('balanced');
  const [liveSessionEnabled, setLiveSessionEnabled] = useState(false);

  const loadFitnessSummary = useCallback(async () => {
    try {
      const { data } = await getFitnessToday();
      setFitnessSummary(data.summary);
    } catch (e) {}
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [latestRes, readingsRes] = await Promise.all([
        getLatestReading(),
        getReadings({ limit: 20 }),
      ]);
      setLatest(latestRes.data.reading);
      const readings = readingsRes.data.readings.reverse();
      setChartData(
        readings.map((r) => ({
          time: format(new Date(r.recordedAt), 'MM/dd HH:mm'),
          heartRate: r.heartRate && r.heartRate.value,
          spo2: r.spo2 && r.spo2.value,
          temperature: r.temperature && r.temperature.value,
          steps: r.steps && r.steps.value,
        }))
      );
      await loadFitnessSummary();
    } catch (e) {}
    setLoading(false);
  }, [loadFitnessSummary]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (socketReading) {
      setLatest(socketReading);
      setChartData((prev) => {
        const point = {
          time: format(new Date(socketReading.recordedAt), 'MM/dd HH:mm'),
          heartRate: socketReading.heartRate && socketReading.heartRate.value,
          spo2: socketReading.spo2 && socketReading.spo2.value,
          temperature: socketReading.temperature && socketReading.temperature.value,
          steps: socketReading.steps && socketReading.steps.value,
        };
        return [...prev.slice(-19), point];
      });
      loadFitnessSummary();
    }
  }, [socketReading, loadFitnessSummary]);

  const pushLiveReading = useCallback(async () => {
    const mode = sessionModes[sessionMode];
    const payload = {
      heartRate: { value: Math.round(rand(mode.hr[0], mode.hr[1])) },
      bloodPressure: {
        systolic: Math.round(rand(112, 146)),
        diastolic: Math.round(rand(72, 96)),
      },
      spo2: { value: Math.round(rand(94, 99)) },
      temperature: { value: Number(rand(36.1, 37.8).toFixed(1)) },
      steps: { value: Math.round(rand(mode.steps[0], mode.steps[1])) },
      calories: { value: Math.round(rand(14, 40)) },
      distance: { value: Number(rand(0.15, 0.45).toFixed(2)) },
      cadence: { value: Math.round(rand(mode.cadence[0], mode.cadence[1])) },
      activeMinutes: { value: 1 },
      hydration: { value: Math.round(rand(55, 95)) },
      sleepScore: { value: Math.round(rand(58, 92)) },
      workoutMode: sessionMode,
      notes: `Live ${mode.label} tracker event`,
    };

    try {
      const { data } = await submitReading(payload);
      setLatest(data.reading);
      await loadFitnessSummary();
    } catch (err) {
      setLiveSessionEnabled(false);
      toast.error('Live session stopped: unable to save reading.');
    }
  }, [loadFitnessSummary, sessionMode]);

  useEffect(() => {
    if (!liveSessionEnabled) return undefined;
    const id = setInterval(() => {
      pushLiveReading();
    }, 6000);
    return () => clearInterval(id);
  }, [liveSessionEnabled, pushLiveReading]);

  const hr = latest && latest.heartRate;
  const bp = latest && latest.bloodPressure;
  const spo2 = latest && latest.spo2;
  const temp = latest && latest.temperature;
  const steps = latest && latest.steps;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  if (loading) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Good {greeting}, {user && user.name && user.name.split(' ')[0]} 👋</h1>
            <p>Here's your health overview · {format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="live-badge"><span className="live-dot" /> Live</span>
            <Link to="/log" className="btn btn-primary btn-sm" style={{ width: 'auto' }}>+ Log Reading</Link>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Real-Time Fitness Session</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{liveSessionEnabled ? 'Session Active' : 'Session Stopped'}</div>
            </div>
            <button
              type="button"
              className={`btn ${liveSessionEnabled ? 'btn-secondary' : 'btn-primary'} btn-sm`}
              onClick={() => setLiveSessionEnabled((prev) => !prev)}
              style={{ width: 'auto' }}
            >
              {liveSessionEnabled ? 'Stop Live Session' : 'Start Live Session'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {Object.entries(sessionModes).map(([key, mode]) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${sessionMode === key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSessionMode(key)}
                style={{ width: 'auto' }}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-value">{fitnessSummary ? fitnessSummary.totals.steps.toLocaleString() : '—'}</div>
              <div className="stat-label">Steps Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{fitnessSummary ? fitnessSummary.totals.calories : '—'}</div>
              <div className="stat-label">Calories Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{fitnessSummary ? fitnessSummary.totals.distance : '—'}</div>
              <div className="stat-label">Distance (km)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{fitnessSummary ? fitnessSummary.totals.activeMinutes : '—'}</div>
              <div className="stat-label">Active Minutes</div>
            </div>
          </div>

          {fitnessSummary && (
            <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Goal progress: {fitnessSummary.progress.steps}% steps · {fitnessSummary.progress.activeMinutes}% active minutes · {fitnessSummary.progress.hydration}% hydration
            </div>
          )}
        </div>

        {liveAlerts.length > 0 && (
          <div style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.3)', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🚨</span>
            <span style={{ fontSize: '0.85rem' }}>
              <strong style={{ color: 'var(--accent-red)' }}>{liveAlerts.length} new alert{liveAlerts.length > 1 ? 's' : ''}</strong>
              {' — '}{liveAlerts[0].message}
            </span>
            <Link to="/alerts" style={{ marginLeft: 'auto', color: 'var(--accent-red)', fontSize: '0.8rem' }}>View all →</Link>
          </div>
        )}

        {latest ? (
          <div className="metrics-grid">
            <MetricCard icon="❤️" label="Heart Rate" value={hr && hr.value} unit="BPM" status={hr && hr.status} />
            <MetricCard icon="🫀" label="Blood Pressure" value={bp && bp.systolic ? (bp.systolic + '/' + bp.diastolic) : null} unit="mmHg" status={bp && bp.status} />
            <MetricCard icon="🫁" label="SpO₂" value={spo2 && spo2.value} unit="%" status={spo2 && spo2.status} />
            <MetricCard icon="🌡️" label="Temperature" value={temp && temp.value} unit="°C" status={temp && temp.status} />
            <MetricCard icon="👣" label="Steps" value={steps && steps.value && steps.value.toLocaleString()} unit="steps" status="normal" />
            <div className="metric-card">
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Last Updated</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600 }}>{format(new Date(latest.recordedAt), 'HH:mm')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{format(new Date(latest.recordedAt), 'MMM d, yyyy')}</div>
              {latest.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 8, fontStyle: 'italic' }}>"{latest.notes}"</div>}
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No readings yet</h3>
              <p style={{ marginBottom: 16, fontSize: '0.85rem' }}>Start by logging your first health reading</p>
              <Link to="/log" className="btn btn-primary" style={{ width: 'auto', display: 'inline-block', padding: '12px 24px' }}>Log First Reading</Link>
            </div>
          </div>
        )}

        {chartData.length > 1 && (
          <div className="charts-grid">
            <div className="chart-card">
              <h3>❤️ Heart Rate Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: '#555570', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#555570', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="heartRate" name="BPM" stroke="#e63946" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3>🫁 SpO₂ Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: '#555570', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#555570', fontSize: 10 }} domain={[85, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="spo2" name="%" stroke="#4ecdc4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3>🌡️ Temperature Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: '#555570', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#555570', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="temperature" name="°C" stroke="#f39c12" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3>👣 Steps Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: '#555570', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#555570', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="steps" name="steps" stroke="#9b59b6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
