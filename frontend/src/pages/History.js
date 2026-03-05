import React, { useState, useEffect, useCallback } from 'react';
import { getReadings, deleteReading } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const StatusDot = ({ status }) => (
  <span className={`status-dot dot-${status || 'normal'}`} />
);

const History = () => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getReadings({ page, limit: LIMIT });
      setReadings(data.readings);
      setTotal(data.pagination.total);
    } catch (e) {}
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this reading?')) return;
    try {
      await deleteReading(id);
      toast.success('Reading deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <h1>Reading History</h1>
        <p>All your logged health and fitness readings · {total} total records</p>
      </div>
      <div className="page-content">
        <div className="card">
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>Loading...</p>
          ) : readings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No readings found</h3>
              <p>Start logging readings to see them here</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Heart Rate</th>
                    <th>Blood Pressure</th>
                    <th>SpO₂</th>
                    <th>Temp</th>
                    <th>Steps</th>
                    <th>Calories</th>
                    <th>Distance</th>
                    <th>Mode</th>
                    <th>Hydration</th>
                    <th>Sleep</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <tr key={r._id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {format(new Date(r.recordedAt), 'MMM d, yyyy')}<br />
                        <small>{format(new Date(r.recordedAt), 'HH:mm')}</small>
                      </td>
                      <td>
                        {r.heartRate && r.heartRate.value ? (
                          <><StatusDot status={r.heartRate.status} />{r.heartRate.value} BPM</>
                        ) : '—'}
                      </td>
                      <td>
                        {r.bloodPressure && r.bloodPressure.systolic ? (
                          <><StatusDot status={r.bloodPressure.status} />{r.bloodPressure.systolic}/{r.bloodPressure.diastolic}</>
                        ) : '—'}
                      </td>
                      <td>
                        {r.spo2 && r.spo2.value ? (
                          <><StatusDot status={r.spo2.status} />{r.spo2.value}%</>
                        ) : '—'}
                      </td>
                      <td>
                        {r.temperature && r.temperature.value ? (
                          <><StatusDot status={r.temperature.status} />{r.temperature.value}°C</>
                        ) : '—'}
                      </td>
                      <td>{r.steps && r.steps.value ? r.steps.value.toLocaleString() : '—'}</td>
                      <td>{r.calories && r.calories.value ? r.calories.value : '—'}</td>
                      <td>{r.distance && r.distance.value ? `${r.distance.value} km` : '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{r.workoutMode || 'balanced'}</td>
                      <td>{r.hydration && r.hydration.value ? `${r.hydration.value}%` : '—'}</td>
                      <td>{r.sleepScore && r.sleepScore.value ? `${r.sleepScore.value}%` : '—'}</td>
                      <td>
                        <button onClick={() => handleDelete(r._id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }} title="Delete">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
