import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInsights } from '../utils/api';
import { useAuth } from '../context/AuthContext';

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

  if (loading) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading insights...</div>;
  if (!insights) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Unable to load insights.</div>;

  const averages = insights.metrics?.averages || {};
  const onboarding = user?.onboarding || {};
  const lens = goalLens[onboarding.trackingGoal] || goalLens.fitness;
  const personalizedRecommendations = [
    onboarding.trackingGoal === 'recovery'
      ? 'Keep an eye on sleep score and stress before increasing training load.'
      : onboarding.trackingGoal === 'clinical-awareness'
        ? 'Treat weak-confidence phone-only vitals as directional until you have stronger source data.'
        : onboarding.trackingGoal === 'wellness'
          ? 'Aim for repeatable habits more than perfect single-day scores.'
          : 'Use movement and active-minute consistency as your main success signal.',
    onboarding.preferredTrackingMode === 'future_band'
      ? 'Your setup is already tuned for a future wearable path, so watch how confidence would improve with direct sensor input.'
      : onboarding.preferredTrackingMode === 'both'
        ? 'Balance what phone-first tracking can do today with the future wearable roadmap you selected.'
        : 'Phone-first mode works best when you focus on trends, not isolated exact readings.',
  ];

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
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Your setup lens</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>{lens.title}</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 8 }}>{lens.detail}</p>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Tracking mode</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', textTransform: 'capitalize' }}>
                {onboarding.preferredTrackingMode === 'future_band' ? 'Future wearable' : onboarding.preferredTrackingMode === 'both' ? 'Both paths' : 'Phone only'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: 6 }}>
                {onboarding.experienceLevel || 'beginner'} level
              </div>
            </div>
          </div>
        </div>

        {!wearable.paired && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Source note</div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              You are currently in phone-first mode. Activity trends are stronger than body-vital precision, so guidance should be read as directional rather than device-grade. For explicit vitals, use manual check-ins.
            </p>
            <Link to="/log" className="btn btn-secondary btn-sm" style={{ width: 'auto', marginTop: 12 }}>
              Add manual vitals
            </Link>
          </div>
        )}
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
            {!wearable.paired && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Manual or preview source</div>}
          </div>
          <div className="stat-card">
            <div className="stat-value">{averages.spo2 ?? '—'}</div>
            <div className="stat-label">Avg SpO₂</div>
            {!wearable.paired && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Manual or preview source</div>}
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
            {personalizedRecommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
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
