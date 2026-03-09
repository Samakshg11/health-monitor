import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getLatestReading, getReadings, getFitnessToday, getBillingCurrent } from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

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
  const [billingSummary, setBillingSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFitnessSummary = useCallback(async () => {
    try {
      const { data } = await getFitnessToday();
      setFitnessSummary(data.summary);
    } catch (e) {}
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

  const hr = latest && latest.heartRate;
  const bp = latest && latest.bloodPressure;
  const spo2 = latest && latest.spo2;
  const temp = latest && latest.temperature;
  const steps = latest && latest.steps;
  const sleep = latest && latest.sleepScore;
  const sleepHours = latest && latest.sleepHours;
  const stress = latest && latest.stressLevel;
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
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Real-Time Fitness Session</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Auto Tracker Stream Active</div>
              <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Entries sync automatically every few seconds while you are logged in.
              </div>
            </div>
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

        {billingSummary && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Subscription</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', textTransform: 'capitalize' }}>
                  {billingSummary.subscription?.plan || 'starter'} plan
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Status: {billingSummary.subscription?.status || 'active'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Readings Usage</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                  {billingSummary.usage?.readings?.used || 0}
                  {billingSummary.usage?.readings?.limit === null
                    ? ' / Unlimited'
                    : ` / ${billingSummary.usage?.readings?.limit || 0}`}
                </div>
                <Link to="/billing" style={{ color: 'var(--accent-red)', fontSize: '0.82rem' }}>Manage plan →</Link>
              </div>
            </div>
          </div>
        )}

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
            <MetricCard icon="😴" label="Sleep Score" value={sleep && sleep.value} unit="%" status={sleep && sleep.status} />
            <MetricCard icon="🛌" label="Sleep Duration" value={sleepHours && sleepHours.value} unit="hrs" status="normal" />
            <MetricCard icon="🧠" label="Stress Level" value={stress && stress.value} unit="%" status={stress && stress.status} />
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
              <h3>Starting tracker stream...</h3>
              <p style={{ marginBottom: 16, fontSize: '0.85rem' }}>Your first automatic reading will appear shortly.</p>
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
