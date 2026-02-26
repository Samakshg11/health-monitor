import React, { useState, useEffect, useCallback } from 'react';
import { getAlerts, markAlertRead, markAllAlertsRead, deleteAlert } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const typeIcons = { heartRate: '❤️', bloodPressure: '🫀', spo2: '🫁', temperature: '🌡️', steps: '👣' };

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { liveAlerts } = useSocket();

  const load = useCallback(async () => {
    try {
      const { data } = await getAlerts({ limit: 50 });
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, liveAlerts]);

  const handleMarkRead = async (id) => {
    try {
      await markAlertRead(id);
      load();
    } catch {}
  };

  const handleMarkAll = async () => {
    try {
      await markAllAlertsRead();
      toast.success('All alerts marked as read');
      load();
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      await deleteAlert(id);
      toast.success('Alert removed');
      load();
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Alerts {unreadCount > 0 && <span style={{ background: 'var(--accent-red)', color: 'white', borderRadius: 20, padding: '2px 12px', fontSize: '1rem', marginLeft: 8 }}>{unreadCount}</span>}</h1>
            <p>Health alerts and notifications</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkAll}>Mark all read</button>
          )}
        </div>
      </div>
      <div className="page-content">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">🔔</div><h3>No alerts</h3><p>You're all clear! Your vitals are within normal range.</p></div></div>
        ) : (
          <div>
            {alerts.map((alert) => (
              <div key={alert._id} className={`alert-item ${!alert.read ? 'unread' : ''} severity-${alert.severity}`}>
                <div className="alert-severity-icon">
                  {alert.severity === 'critical' ? '🚨' : '⚠️'}
                </div>
                <div className="alert-content">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-meta">
                    <span className="alert-type-badge">{typeIcons[alert.type]} {alert.type}</span>
                    {alert.value && <span style={{ marginRight: 8, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{alert.value}</span>}
                    <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!alert.read && (
                    <button onClick={() => handleMarkRead(alert._id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}>
                      Read
                    </button>
                  )}
                  <button onClick={() => handleDelete(alert._id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
