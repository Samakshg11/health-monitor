import React, { useEffect, useState } from 'react';
import { getInsights } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { TrackerIcon } from '../components/TrackerUI';

const statusColor = {
  stable: '#2ecc71',
  watch: '#f39c12',
  'needs-attention': '#e63946',
  'insufficient-data': '#8888aa',
};

const goalLens = {
  fitness: {
    title: 'Fitness lens',
    detail: 'Insights should prioritize movement consistency, active minutes, and readiness trends.',
  },
  wellness: {
    title: 'Wellness lens',
    detail: 'Insights should favor steady habits, balanced stress, and sustainable daily patterns.',
  },
  recovery: {
    title: 'Recovery lens',
    detail: 'Insights should lean toward sleep, stress load, and signs of overreaching.',
  },
  'clinical-awareness': {
    title: 'Awareness lens',
    detail: 'Insights should put more weight on signal quality and unusual changes over raw output.',
  },
};

const Insights = () => {
  const { wearable, user } = useAuth();
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

  if (loading) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Analyzing trends...</div>;
  if (!insights) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Unable to process health intelligence.</div>;

  const averages = insights.metrics?.averages || {};
  const onboarding = user?.onboarding || {};
  
  return (
    <div className="insights-container">
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">VitalWatch Intelligence</span>
          <h1>Health Insights</h1>
          <p>Long-term trend analysis and AI correlations across your vitals.</p>
        </div>
        <div className="tracker-header-actions">
           <div className="days-picker">
            {[7, 14, 30].map((d) => (
              <button key={d} className={`picker-btn ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>
                {d}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Intelligence Hero Card */}
        <section className="card intelligence-hero-dark">
          <div className="intelligence-badge">
             <span className="live-dot" style={{ backgroundColor: statusColor[insights.status] }}></span>
             AI Mode: ${insights.metrics.readingsCount} readings processed
          </div>
          <h2>Weekly Trend Analysis</h2>
          <p className="intelligence-summary-text">{insights.summary}</p>
          <div className="intelligence-score-wrap">
             <div className="score-item">
                <span className="score-label">Health Score</span>
                <strong style={{ color: statusColor[insights.status] }}>{insights.score}</strong>
             </div>
             <div className="score-divider"></div>
             <div className="score-item">
                <span className="score-label">Continuity</span>
                <strong>{insights.metrics.consistency}%</strong>
             </div>
          </div>
        </section>

        {/* Correlation Lab */}
        {insights.correlation && (
            <section className="card correlation-card">
                <div className="correlation-icon">
                    <TrackerIcon name="trends" size={24} color="var(--accent-blue)" />
                </div>
                <div>
                    <span className="eyebrow" style={{ color: 'var(--accent-blue)' }}>Cross-Metric Correlation</span>
                    <h3>The AI Observation</h3>
                    <p>{insights.correlation}</p>
                </div>
            </section>
        )}

        {/* Recommendations & Stats Split */}
        <div className="insights-split-grid">
            <section className="card proactively-steps-card">
                <h3>Proactive Steps</h3>
                <div className="steps-list">
                    {(insights.recommendations || []).map((rec, i) => (
                        <div key={i} className="step-item">
                            <div className="step-number">{i + 1}</div>
                            <p>{rec}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card baseline-stats-card">
                <h3>Averages ({days} Days)</h3>
                <div className="baseline-grid">
                    <div className="baseline-item">
                        <span>Heart Rate</span>
                        <strong>{averages.heartRate || '--'} <small>BPM</small></strong>
                    </div>
                    <div className="baseline-item">
                        <span>Sleep Quality</span>
                        <strong>{averages.sleepScore || '--'} <small>%</small></strong>
                    </div>
                    <div className="baseline-item">
                        <span>Daily Steps</span>
                        <strong>{Math.round(averages.steps || 0).toLocaleString()}</strong>
                    </div>
                    <div className="baseline-item">
                        <span>Stress Load</span>
                        <strong>{averages.stressLevel || '--'} <small>%</small></strong>
                    </div>
                </div>
                <div className="baseline-footer">
                    Trend is based on {insights.metrics.readingsCount} manual and device-sync readings.
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default Insights;
