import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { TrackerIcon } from '../components/TrackerUI';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { downloadCsv } from '../utils/export';

const reportLens = {
  fitness: {
    title: 'Performance summary',
    detail: 'Use trends to judge momentum through steps, calories, active minutes, and whether effort is staying repeatable.',
    primaryStatLabels: ['Avg BPM', 'Total Steps', 'Total Calories', 'Active Mins'],
  },
  wellness: {
    title: 'Habit consistency summary',
    detail: 'Read this view as a weekly check on steady routines, balanced output, and whether health patterns are staying sustainable.',
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
  const [sourceMix, setSourceMix] = useState({ phone: 0, manual: 0, healthConnect: 0, preview: 0 });
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
          healthConnect: readings.filter((r) => r.source === 'health_connect').length,
          preview: readings.filter((r) => r.source === 'device').length,
        });
        setChartData(readings.map((r) => ({
          time: format(new Date(r.recordedAt), 'MM/dd'),
          heartRate: r.heartRate?.value,
          spo2: r.spo2?.value,
          temperature: r.temperature?.value,
          steps: r.steps?.value,
          calories: r.calories?.value,
          distance: r.distance?.value,
          activeMinutes: r.activeMinutes?.value,
        })));
      } catch {
        setStats(null);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  const StatBox = ({ label, value, sub }) => (
    <div className="stat-card reports-stat-card">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="reports-stat-sub">{sub}</div>}
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
        : 'Use these trends to protect consistency and training momentum.';
  const connectedSources = sourceMix.manual + sourceMix.healthConnect + sourceMix.preview;
  const primarySourceLabel = sourceMix.healthConnect > 0
    ? 'Health Connect-led'
    : sourceMix.preview > 0
      ? 'Preview-band mix'
      : sourceMix.manual > 0
        ? 'Phone + check-ins'
        : 'Phone-first only';

  return (
    <div>
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">Trends</span>
          <h1>Source-aware trends</h1>
          <p>Cleaner weekly patterns for movement, vitals, and recovery without mixing every source into one fake device feed.</p>
        </div>
        <div className="tracker-header-actions">
          <span className="tracker-sync-pill"><TrackerIcon name="trends" size={14} /> {primarySourceLabel}</span>
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

      <div className="page-content tracker-dashboard">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading report...</p>
        ) : !stats ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">📊</div><h3>Not enough data</h3><p>Log more readings to see reports</p></div></div>
        ) : (
          <>
            <section className="reports-hero">
              <div className="card reports-hero-main">
                <div>
                  <div className="eyebrow">Report lens</div>
                  <h2>{lens.title}</h2>
                  <p>{lens.detail}</p>
                  <div className="reports-pill-row">
                    <span className="tracker-pill"><TrackerIcon name="profile" size={14} /> {onboarding.experienceLevel || 'beginner'} level</span>
                    <span className="tracker-pill"><TrackerIcon name="device" size={14} /> {modeLabel}</span>
                    <span className="tracker-pill"><TrackerIcon name="activity" size={14} /> {connectedSources} connected or manual sources</span>
                  </div>
                </div>
                <div className="reports-hero-side">
                  <div className="reports-score-tile">
                    <span className="eyebrow">Window</span>
                    <strong>{days} days</strong>
                    <small>{stats.totalReadings || chartData.length} snapshots</small>
                  </div>
                  <div className="reports-score-tile reports-score-tile-accent">
                    <span className="eyebrow">Interpretation</span>
                    <strong>{primarySourceLabel}</strong>
                    <small>{emphasis}</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="reports-source-grid">
              <div className="card reports-source-card">
                <div className="reports-source-icon"><TrackerIcon name="activity" size={18} /></div>
                <span className="eyebrow">Phone sync</span>
                <strong>{sourceMix.phone}</strong>
                <p>Movement-led snapshots from free phone tracking.</p>
              </div>
              <div className="card reports-source-card">
                <div className="reports-source-icon"><TrackerIcon name="heart" size={18} /></div>
                <span className="eyebrow">Manual check-ins</span>
                <strong>{sourceMix.manual}</strong>
                <p>Explicit vitals and wellness entries logged by the user.</p>
              </div>
              <div className="card reports-source-card">
                <div className="reports-source-icon"><TrackerIcon name="sync" size={18} /></div>
                <span className="eyebrow">Health Connect</span>
                <strong>{sourceMix.healthConnect}</strong>
                <p>Connected-source records flowing through the free Android adapter path.</p>
              </div>
              <div className="card reports-source-card">
                <div className="reports-source-icon"><TrackerIcon name="device" size={18} /></div>
                <span className="eyebrow">Preview band</span>
                <strong>{sourceMix.preview}</strong>
                <p>Future hardware-preview readings for richer sensor-backed demos.</p>
              </div>
            </section>

            {onboarding.preferredTrackingMode === 'phone_only' && (
              <section className="card reports-callout">
                <div>
                  <div className="eyebrow">Phone-first note</div>
                  <h3>Movement trends are stronger than passive body vitals</h3>
                  <p>Use this page to judge direction and consistency. If you want explicit vitals to appear in these trends, add manual check-ins or import a connected source.</p>
                </div>
                <div className="reports-callout-actions">
                  <Link to="/log" className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>
                    Add manual vitals
                  </Link>
                  <Link to="/wearable" className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>
                    Open device sources
                  </Link>
                </div>
              </section>
            )}

            <section className="reports-section">
              <div className="reports-section-head">
                <div>
                  <span className="eyebrow">Vitals</span>
                  <h3>Heart and oxygen summary</h3>
                </div>
              </div>
              <div className="stats-grid reports-stats-grid">
                <StatBox label="Avg BPM" value={stats.heartRate?.avg} sub={lens.primaryStatLabels.includes('Avg BPM') ? 'Primary for your setup' : 'Source-aware average'} />
                <StatBox label="Min BPM" value={stats.heartRate?.min} sub={lens.primaryStatLabels.includes('Min BPM') ? 'Primary for your setup' : null} />
                <StatBox label="Max BPM" value={stats.heartRate?.max} sub={lens.primaryStatLabels.includes('Max BPM') ? 'Primary for your setup' : null} />
                <StatBox label="Readings" value={stats.heartRate?.count} sub={lens.primaryStatLabels.includes('Readings') ? 'Primary for your setup' : 'Vitals snapshots'} />
              </div>
            </section>

            <section className="reports-section">
              <div className="reports-section-head">
                <div>
                  <span className="eyebrow">Movement</span>
                  <h3>Activity volume summary</h3>
                </div>
              </div>
              <div className="stats-grid reports-stats-grid">
                <StatBox label="Total Steps" value={stats.steps?.total && stats.steps.total.toLocaleString()} sub={lens.primaryStatLabels.includes('Total Steps') ? 'Primary for your setup' : 'Phone-first strong signal'} />
                <StatBox label="Total Calories" value={stats.calories?.total} sub={lens.primaryStatLabels.includes('Total Calories') ? 'Primary for your setup' : null} />
                <StatBox label="Distance (km)" value={stats.distance?.total} sub={lens.primaryStatLabels.includes('Distance (km)') ? 'Primary for your setup' : null} />
                <StatBox label="Active Mins" value={stats.activeMinutes?.total} sub={lens.primaryStatLabels.includes('Active Mins') ? 'Primary for your setup' : null} />
              </div>
            </section>

            {chartData.length > 1 && (
              <section className="reports-chart-grid">
                <div className="chart-card reports-chart-card">
                  <div className="reports-chart-head">
                    <div>
                      <span className="eyebrow">Connected vitals</span>
                      <h3>Heart rate and SpO₂</h3>
                    </div>
                    <small>Manual, Health Connect, or preview-band sources appear here when available.</small>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e63946" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.18} />
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
                <div className="chart-card reports-chart-card">
                  <div className="reports-chart-head">
                    <div>
                      <span className="eyebrow">Movement</span>
                      <h3>Steps, calories, and active minutes</h3>
                    </div>
                    <small>Best viewed as direction and weekly consistency.</small>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" tick={{ fill: '#555570', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#555570', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="steps" name="Steps" fill="#9b59b6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="calories" name="Calories" fill="#e63946" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="activeMinutes" name="Active Minutes" fill="#4ecdc4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
