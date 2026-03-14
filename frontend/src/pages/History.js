import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import { getReadings, deleteReading } from '../utils/api';
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

const History = () => {
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
    return { steps, activeSessions, elevatedReadings };
  }, [readings]);

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
          <p>Browse snapshots the way a tracker app would: by day, time, and session feel instead of raw tables.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={exportHistory} disabled={!readings.length}>
          Export CSV
        </button>
      </div>

      <div className="page-content">
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
                  </div>
                  <small>{items.length} snapshot{items.length > 1 ? 's' : ''}</small>
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
