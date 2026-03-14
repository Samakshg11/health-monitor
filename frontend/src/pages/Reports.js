import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { downloadCsv } from '../utils/export';

const reportLens = {
  fitness: {
    title: 'Performance summary',
    detail: 'Use reports to judge momentum through steps, calories, active minutes, and whether effort is staying repeatable.',
    primaryStatLabels: ['Avg BPM', 'Total Steps', 'Total Calories', 'Active Mins'],
  },
  wellness: {
    title: 'Habit consistency summary',
    detail: 'Read this report as a weekly check on steady routines, balanced output, and whether health patterns are staying sustainable.',
    primaryStatLabels: ['Avg BPM', 'Distance (km)', 'Active Mins', 'Readings'],
  },
  recovery: {
    title: 'Recovery summary',
    detail: 'Focus more on whether workload is staying in balance with sleep, stress, and day-to-day rebuilding capacity.',
    primaryStatLabels: ['Avg BPM', 'Min BPM', 'Active Mins', 'Distance (km)'],
  },
  'clinical-awareness': {
    title: 'Signal review summary',
    detail: 'Prioritize trend direction and repeated changes over exact single-point values, especially when some metrics are phone-derived.',
    primaryStatLabels: ['Avg BPM', 'Min BPM', 'Max BPM', 'Readings'],
  },
};

const trackingModeLabels = {
  phone_only: 'Phone-only tracking',
  future_band: 'Future wearable path',
  both: 'Phone now + wearable later',
};

const Reports = () => {
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [sourceMix, setSourceMix] = useState({ phone: 0, manual: 0, preview: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await getStats(days);
        setStats(data.stats);
        const readings = data.readings || [];
        setSourceMix({
          phone: readings.filter((r) => r.source === 'estimated').length,
          manual: readings.filter((r) => r.source === 'manual').length,
          preview: readings.filter((r) => r.source === 'device').length,
        });
        setChartData(readings.map((r) => ({
          time: format(new Date(r.recordedAt), 'MM/dd'),
          heartRate: r.heartRate && r.heartRate.value,
          spo2: r.spo2 && r.spo2.value,
          temperature: r.temperature && r.temperature.value,
          steps: r.steps && r.steps.value,
          calories: r.calories && r.calories.value,
          distance: r.distance && r.distance.value,
          activeMinutes: r.activeMinutes && r.activeMinutes.value,
        })));
      } catch (e) {}
      setLoading(false);
    };
    load();
  }, [days]);

  const StatBox = ({ label, value, sub }) => (
    <div className="stat-card">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const exportReport = () => {
    if (!chartData.length) return;
    const rows = [
      ['Date', 'Heart Rate', 'SpO2', 'Temperature', 'Steps', 'Calories', 'Distance Km', 'Active Minutes'],
      ...chartData.map((row) => [
        row.time,
        row.heartRate ?? '',
        row.spo2 ?? '',
        row.temperature ?? '',
        row.steps ?? '',
        row.calories ?? '',
        row.distance ?? '',
        row.activeMinutes ?? '',
      ]),
    ];
    downloadCsv(`vitalwatch-report-${days}d.csv`, rows);
  };

  const onboarding = user?.onboarding || {};
  const lens = reportLens[onboarding.trackingGoal] || reportLens.fitness;
  const modeLabel = trackingModeLabels[onboarding.preferredTrackingMode] || trackingModeLabels.phone_only;
  const emphasis = onboarding.trackingGoal === 'recovery'
    ? 'Read effort alongside recovery instead of optimizing output in isolation.'
    : onboarding.trackingGoal === 'clinical-awareness'
      ? 'Treat repeated changes as stronger than isolated outliers.'
      : onboarding.trackingGoal === 'wellness'
        ? 'Consistency matters more than chasing a perfect day.'
        : 'Use these reports to protect consistency and training momentum.';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Health Reports</h1>
            <p>Setup-aware trends shaped by your goal, tracking mode, and source confidence.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto' }}>
                {d}d
              </button>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={exportReport} disabled={!chartData.length}>
              Export CSV
            </button>
          </div>
        </div>
      </div>
      <div className="page-content">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading report...</p>
        ) : !stats ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">📊</div><h3>Not enough data</h3><p>Log more readings to see reports</p></div></div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Report lens</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{lens.title}</div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 8 }}>{lens.detail}</p>
                </div>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Tracking mode</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{modeLabel}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: 6 }}>
                    {onboarding.experienceLevel || 'beginner'} level summary
                  </div>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: 14, lineHeight: 1.7 }}>{emphasis}</p>
              {onboarding.preferredTrackingMode === 'phone_only' && (
                <p style={{ color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.7 }}>
                  In phone-only mode, movement trends deserve more trust than exact body-vital precision. Use this report to confirm direction, and use manual check-ins when you want explicit vitals in the timeline.
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <span className="tracker-pill">Phone sync {sourceMix.phone}</span>
                <span className="tracker-pill">Manual check-ins {sourceMix.manual}</span>
                <span className="tracker-pill">Preview band {sourceMix.preview}</span>
              </div>
              {onboarding.preferredTrackingMode === 'phone_only' && (
                <Link to="/log" className="btn btn-secondary btn-sm" style={{ width: 'auto', marginTop: 12 }}>
                  Add manual vitals
                </Link>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 14, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>❤️ Heart Rate — Last {days} days</h3>
              <div className="stats-grid">
                <StatBox label="Avg BPM" value={stats.heartRate && stats.heartRate.avg} sub={lens.primaryStatLabels.includes('Avg BPM') ? 'Primary for your setup' : null} />
                <StatBox label="Min BPM" value={stats.heartRate && stats.heartRate.min} sub={lens.primaryStatLabels.includes('Min BPM') ? 'Primary for your setup' : null} />
                <StatBox label="Max BPM" value={stats.heartRate && stats.heartRate.max} sub={lens.primaryStatLabels.includes('Max BPM') ? 'Primary for your setup' : null} />
                <StatBox label="Readings" value={stats.heartRate && stats.heartRate.count} sub={lens.primaryStatLabels.includes('Readings') ? 'Primary for your setup' : null} />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 14, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>👟 Fitness Summary — Last {days} days</h3>
              <div className="stats-grid">
                <StatBox label="Total Steps" value={stats.steps && stats.steps.total && stats.steps.total.toLocaleString()} sub={lens.primaryStatLabels.includes('Total Steps') ? 'Primary for your setup' : null} />
                <StatBox label="Total Calories" value={stats.calories && stats.calories.total} sub={lens.primaryStatLabels.includes('Total Calories') ? 'Primary for your setup' : null} />
                <StatBox label="Distance (km)" value={stats.distance && stats.distance.total} sub={lens.primaryStatLabels.includes('Distance (km)') ? 'Primary for your setup' : null} />
                <StatBox label="Active Mins" value={stats.activeMinutes && stats.activeMinutes.total} sub={lens.primaryStatLabels.includes('Active Mins') ? 'Primary for your setup' : null} />
              </div>
            </div>

            {chartData.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                <div className="chart-card">
                  <h3>Heart Rate & SpO₂ Over Time</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e63946" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" tick={{ fill: '#555570', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#555570', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Legend />
                      <Area type="monotone" dataKey="heartRate" name="Heart Rate (BPM)" stroke="#e63946" fill="url(#hrGrad)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="spo2" name="SpO₂ (%)" stroke="#4ecdc4" fill="url(#spo2Grad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3>Activity Volume (Steps / Calories / Active Mins)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" tick={{ fill: '#555570', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#555570', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="steps" name="Steps" fill="#9b59b6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="calories" name="Calories" fill="#e63946" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="activeMinutes" name="Active Minutes" fill="#4ecdc4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
