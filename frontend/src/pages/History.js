import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import { getReadings, deleteReading } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { TrackerIcon } from '../components/TrackerUI';
import { downloadCsv } from '../utils/export';

const formatDayLabel = (value) => {
  const date = new Date(value);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
};

const statusLabel = (status) => {
  if (status === 'critical') return 'Attention';
  if (status === 'warning') return 'Elevated';
  return 'Stable';
};

const historyLens = {
  fitness: {
    title: 'Momentum view',
    detail: 'Read your history by movement quality, active sessions, and whether effort stayed consistent enough to keep momentum.',
    strongDay: 'A strong day means movement stayed high and flagged readings stayed limited.',
  },
  wellness: {
    title: 'Steady-habits view',
    detail: 'Read your history by routine quality, balanced activity, and whether the day looked sustainable rather than intense.',
    strongDay: 'A strong day means movement stayed steady and the pattern felt calm enough to repeat.',
  },
  recovery: {
    title: 'Recovery view',
    detail: 'Read your history by whether workload stayed balanced with sleep, stress, and the need to rebuild.',
    strongDay: 'A strong day means activity stayed controlled while recovery signals avoided extra strain.',
  },
  'clinical-awareness': {
    title: 'Trend-watch view',
    detail: 'Read your history by repeated patterns and source confidence, not by isolated single snapshots.',
    strongDay: 'A strong day means the stream stayed stable enough to compare trends without overreacting.',
  },
};

const scoreLabel = {
  strong: 'Strong fit',
  steady: 'Steady day',
  watch: 'Needs context',
};

const scoreSnapshot = (reading, trackingGoal) => {
  const steps = reading.steps?.value || 0;
  const sleepScore = reading.sleepScore?.value || 0;
  const stress = reading.stressLevel?.value || 0;
  const flagged = ['warning', 'critical'].includes(reading.heartRate?.status) ||
    ['warning', 'critical'].includes(reading.spo2?.status) ||
    ['warning', 'critical'].includes(reading.temperature?.status);
  const overallConfidence = reading.confidence?.overall ?? 50;

  if (trackingGoal === 'recovery') {
    if (sleepScore >= 75 && stress <= 45 && !flagged) return 'strong';
    if (sleepScore >= 60 && stress <= 60) return 'steady';
    return 'watch';
  }

  if (trackingGoal === 'clinical-awareness') {
    if (overallConfidence >= 70 && !flagged) return 'strong';
    if (overallConfidence >= 55) return 'steady';
    return 'watch';
  }

  if (trackingGoal === 'wellness') {
    if (steps >= 5000 && stress <= 55 && !flagged) return 'strong';
    if (steps >= 3000 && stress <= 70) return 'steady';
    return 'watch';
  }

  if (steps >= 7000 && !flagged) return 'strong';
  if (steps >= 4000) return 'steady';
  return 'watch';
};

const History = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getReadings({ page, limit: LIMIT });
      setReadings(data.readings);
      setTotal(data.pagination.total);
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session snapshot?')) return;
    try {
      await deleteReading(id);
      toast.success('Snapshot removed');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const onboarding = user?.onboarding || {};
  const lens = historyLens[onboarding.trackingGoal] || historyLens.fitness;

  const groupedReadings = useMemo(() => readings.reduce((groups, reading) => {
    const key = format(new Date(reading.recordedAt), 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key].push(reading);
    return groups;
  }, {}), [readings]);

  const overview = useMemo(() => {
    if (!readings.length) return null;
    const steps = readings.reduce((sum, reading) => sum + (reading.steps?.value || 0), 0);
    const activeSessions = readings.filter((reading) => (reading.steps?.value || 0) > 120).length;
    const elevatedReadings = readings.filter((reading) => (
      ['warning', 'critical'].includes(reading.heartRate?.status) ||
      ['warning', 'critical'].includes(reading.spo2?.status) ||
      ['warning', 'critical'].includes(reading.temperature?.status)
    )).length;
    const strongSnapshots = readings.filter((reading) => scoreSnapshot(reading, onboarding.trackingGoal) === 'strong').length;
    return { steps, activeSessions, elevatedReadings, strongSnapshots };
  }, [readings, onboarding.trackingGoal]);

  const daySummaries = useMemo(() => Object.entries(groupedReadings).reduce((acc, [day, items]) => {
    const strongCount = items.filter((reading) => scoreSnapshot(reading, onboarding.trackingGoal) === 'strong').length;
    const watchCount = items.filter((reading) => scoreSnapshot(reading, onboarding.trackingGoal) === 'watch').length;
    acc[day] = {
      label: strongCount >= Math.max(1, Math.ceil(items.length / 2))
        ? 'Strong day'
        : watchCount > 0
          ? 'Needs context'
          : 'Steady day',
      note: watchCount > 0 && onboarding.preferredTrackingMode === 'phone_only'
        ? 'Some snapshots are better read directionally because this is still phone-first.'
        : lens.strongDay,
    };
    return acc;
  }, {}), [groupedReadings, onboarding.trackingGoal, onboarding.preferredTrackingMode, lens.strongDay]);

  const exportHistory = () => {
    if (!readings.length) return;
    const rows = [
      ['Recorded At', 'Mode', 'Source', 'Heart Rate', 'SpO2', 'Temperature', 'Steps', 'Distance Km', 'Sleep Hours', 'Stress', 'Confidence'],
      ...readings.map((reading) => [
        new Date(reading.recordedAt).toISOString(),
        reading.workoutMode || 'balanced',
        reading.sourceDetails?.label || reading.source || '',
        reading.heartRate?.value ?? '',
        reading.spo2?.value ?? '',
        reading.temperature?.value ?? '',
        reading.steps?.value ?? '',
        reading.distance?.value ?? '',
        reading.sleepHours?.value ?? '',
        reading.stressLevel?.value ?? '',
        reading.confidence?.overall ?? '',
      ]),
    ];
    downloadCsv('vitalwatch-history.csv', rows);
  };

  return (
    <div>
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">Activity log</span>
          <h1>Your recent days</h1>
          <p>Browse snapshots through your setup lens, with stronger cues for what counts as a solid day versus a directional one.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={exportHistory} disabled={!readings.length}>
          Export CSV
        </button>
      </div>

      <div className="page-content">
        <section className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>History lens</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{lens.title}</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 8 }}>{lens.detail}</p>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Interpretation mode</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                {onboarding.preferredTrackingMode === 'future_band' ? 'Future wearable path' : onboarding.preferredTrackingMode === 'both' ? 'Dual path' : 'Phone-first path'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: 6 }}>
                {onboarding.experienceLevel || 'beginner'} level review
              </div>
            </div>
          </div>
          {onboarding.preferredTrackingMode === 'phone_only' && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 14, lineHeight: 1.7 }}>
              In phone-first mode, movement history is stronger than exact body-vital precision. Use repeated patterns to build confidence.
            </p>
          )}
        </section>

        {overview && (
          <section className="tracker-history-overview">
            <div className="card tracker-highlight-card">
              <div className="tracker-highlight-icon"><TrackerIcon name="steps" size={18} /></div>
              <span className="eyebrow">Movement</span>
              <strong>{overview.steps.toLocaleString()} <small>steps</small></strong>
              <p>Across the latest {readings.length} snapshots</p>
            </div>
            <div className="card tracker-highlight-card">
              <div className="tracker-highlight-icon"><TrackerIcon name="activity" size={18} /></div>
              <span className="eyebrow">Sessions</span>
              <strong>{overview.activeSessions} <small>active</small></strong>
              <p>Moments with elevated movement</p>
            </div>
            <div className="card tracker-highlight-card">
              <div className="tracker-highlight-icon"><TrackerIcon name="alerts" size={18} /></div>
              <span className="eyebrow">Checks</span>
              <strong>{overview.elevatedReadings} <small>flagged</small></strong>
              <p>Readings that deserve a second look</p>
            </div>
            <div className="card tracker-highlight-card">
              <div className="tracker-highlight-icon"><TrackerIcon name="spark" size={18} /></div>
              <span className="eyebrow">Lens score</span>
              <strong>{overview.strongSnapshots} <small>strong</small></strong>
              <p>Snapshots that fit your current goal well</p>
            </div>
          </section>
        )}

        <section className="tracker-history-list">
          {loading ? (
            <div className="card"><p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>Loading activity...</p></div>
          ) : readings.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">◎</div>
                <h3>No activity yet</h3>
                <p>Your first synced sessions will appear here.</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedReadings).map(([day, items]) => (
              <article key={day} className="tracker-day-group">
                <div className="tracker-day-header">
                  <div>
                    <span className="eyebrow">Day</span>
                    <h3>{formatDayLabel(day)}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{daySummaries[day]?.note}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <small>{items.length} snapshot{items.length > 1 ? 's' : ''}</small>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{daySummaries[day]?.label}</div>
                  </div>
                </div>
                <div className="tracker-session-list">
                  {items.map((reading) => (
                    <div key={reading._id} className="card tracker-session-card">
                      <div className="tracker-session-main">
                        <div>
                          <div className="tracker-session-time">{format(new Date(reading.recordedAt), 'h:mm a')}</div>
                          <div className="tracker-session-mode">{reading.workoutMode || 'balanced'} mode</div>
                        </div>
                        <span className={`tracker-session-status status-${reading.heartRate?.status || 'normal'}`}>
                          {statusLabel(reading.heartRate?.status)}
                        </span>
                      </div>

                      <div className="tracker-session-tags" style={{ marginBottom: 12 }}>
                        <span>{scoreLabel[scoreSnapshot(reading, onboarding.trackingGoal)]}</span>
                        <span>{reading.sourceDetails?.label || reading.source || 'Estimated source'}</span>
                        <span>{typeof reading.confidence?.overall === 'number' ? `${reading.confidence.overall}% confidence` : 'Confidence pending'}</span>
                      </div>

                      <div className="tracker-session-metrics">
                        <span><TrackerIcon name="heart" size={14} /> {reading.heartRate?.value || '—'} BPM</span>
                        <span><TrackerIcon name="oxygen" size={14} /> {reading.spo2?.value || '—'}%</span>
                        <span><TrackerIcon name="temperature" size={14} /> {reading.temperature?.value || '—'}°C</span>
                        <span><TrackerIcon name="steps" size={14} /> {(reading.steps?.value || 0).toLocaleString()} steps</span>
                        <span><TrackerIcon name="distance" size={14} /> {reading.distance?.value || '—'} km</span>
                        <span><TrackerIcon name="sleep" size={14} /> {reading.sleepHours?.value || '—'} hrs</span>
                      </div>

                      <div className="tracker-session-footer">
                        <div className="tracker-session-tags">
                          <span>Stress {reading.stressLevel?.value || '—'}%</span>
                          <span>Hydration {reading.hydration?.value || '—'}%</span>
                          <span>Sleep {reading.sleepScore?.value || '—'}%</span>
                        </div>
                        <button type="button" className="tracker-delete-btn" onClick={() => handleDelete(reading._id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>

        {totalPages > 1 && (
          <div className="tracker-pagination">
            <button className="btn btn-secondary btn-sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
