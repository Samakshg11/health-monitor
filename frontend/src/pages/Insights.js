import React, { useEffect, useState } from 'react';
import { getInsights } from '../utils/api';

const statusColor = {
  stable: '#2ecc71',
  watch: '#f39c12',
  'needs-attention': '#e63946',
  'insufficient-data': '#8888aa',
};

const Insights = () => {
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await getInsights(days);
        setInsights(data.insights);
      } catch {
        setInsights(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  if (loading) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading insights...</div>;
  if (!insights) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Unable to load insights.</div>;

  const averages = insights.metrics?.averages || {};

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Actionable Insights</h1>
            <p>AI-style operational intelligence from your tracked health data.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[7, 14, 30].map((d) => (
              <button key={d} type="button" className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto' }} onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Health Score</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: statusColor[insights.status] || '#fff' }}>{insights.score}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Risk Level</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', textTransform: 'capitalize', color: statusColor[insights.status] || '#fff' }}>{insights.riskLevel}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Consistency</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{insights.metrics?.consistency ?? 0}%</div>
            </div>
          </div>
          <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{insights.summary}</p>
        </div>

        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-value">{averages.heartRate ?? '—'}</div>
            <div className="stat-label">Avg Heart Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{averages.spo2 ?? '—'}</div>
            <div className="stat-label">Avg SpO₂</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{averages.steps ?? '—'}</div>
            <div className="stat-label">Avg Steps</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{averages.hydration ?? '—'}</div>
            <div className="stat-label">Avg Hydration</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{averages.sleepScore ?? '—'}</div>
            <div className="stat-label">Avg Sleep Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{averages.sleepHours ?? '—'}</div>
            <div className="stat-label">Avg Sleep Hours</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{averages.stressLevel ?? '—'}</div>
            <div className="stat-label">Avg Stress Level</div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Recommended Next Actions</h3>
          <ul style={{ marginLeft: 18, color: 'var(--text-secondary)', display: 'grid', gap: 8 }}>
            {(insights.recommendations || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Insights;
