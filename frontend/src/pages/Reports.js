import React, { useState, useEffect } from 'react';
import { getStats } from '../utils/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { downloadCsv } from '../utils/export';

const Reports = () => {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await getStats(days);
        setStats(data.stats);
        const readings = data.readings || [];
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

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Health Reports</h1>
            <p>Vitals + fitness analytics over time</p>
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
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 14, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>❤️ Heart Rate — Last {days} days</h3>
              <div className="stats-grid">
                <StatBox label="Avg BPM" value={stats.heartRate && stats.heartRate.avg} />
                <StatBox label="Min BPM" value={stats.heartRate && stats.heartRate.min} />
                <StatBox label="Max BPM" value={stats.heartRate && stats.heartRate.max} />
                <StatBox label="Readings" value={stats.heartRate && stats.heartRate.count} />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 14, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>👟 Fitness Summary — Last {days} days</h3>
              <div className="stats-grid">
                <StatBox label="Total Steps" value={stats.steps && stats.steps.total && stats.steps.total.toLocaleString()} />
                <StatBox label="Total Calories" value={stats.calories && stats.calories.total} />
                <StatBox label="Distance (km)" value={stats.distance && stats.distance.total} />
                <StatBox label="Active Mins" value={stats.activeMinutes && stats.activeMinutes.total} />
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
