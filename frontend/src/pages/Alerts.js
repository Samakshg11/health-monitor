import React, { useState, useEffect, useCallback } from 'react';
import { getAlerts, markAlertRead, markAllAlertsRead, deleteAlert } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const typeIcons = { heartRate: '❤️', bloodPressure: '🫀', spo2: '🫁', temperature: '🌡️', steps: '👣' };
const trackingModeLabels = {
  phone_only: 'Phone-only tracking',
  future_band: 'Future wearable path',
  both: 'Phone now + wearable later',
};
const alertLens = {
  fitness: {
    title: 'Performance interruptions',
    detail: 'Treat alerts as cues that training momentum, effort balance, or recovery quality may need attention.',
    empty: 'No training interruptions right now. Your recent signals are not showing anything that should slow the week down.',
  },
  wellness: {
    title: 'Habit stability',
    detail: 'Use alerts to catch patterns that could disrupt sleep, daily rhythm, or sustainable consistency.',
    empty: 'No wellness disruptions right now. Your recent signals look steady enough to keep the routine simple.',
  },
  recovery: {
    title: 'Recovery protection',
    detail: 'These alerts should help you notice stress load, poor sleep carryover, and signs that you may need to ease off.',
    empty: 'No recovery issues are standing out right now. Sleep and strain signals look calm enough to keep rebuilding.',
  },
  'clinical-awareness': {
    title: 'Signal change watch',
    detail: 'Read alerts as prompts to review changes carefully, especially when they repeat or appear alongside stronger-confidence data.',
    empty: 'No notable changes are being flagged right now. Continue watching trends rather than isolated single readings.',
  },
};

const Alerts = () => {
  const { user } = useAuth();
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

  const onboarding = user?.onboarding || {};
  const lens = alertLens[onboarding.trackingGoal] || alertLens.fitness;
  const modeLabel = trackingModeLabels[onboarding.preferredTrackingMode] || trackingModeLabels.phone_only;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Alerts {unreadCount > 0 && <span style={{ background: 'var(--accent-red)', color: 'white', borderRadius: 20, padding: '2px 12px', fontSize: '1rem', marginLeft: 8 }}>{unreadCount}</span>}</h1>
            <p>Setup-aware alerts for your tracking lens and current source path.</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkAll}>Mark all read</button>
          )}
        </div>
      </div>
      <div className="page-content">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Alert lens</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{lens.title}</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 8 }}>{lens.detail}</p>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Tracking mode</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{modeLabel}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: 6 }}>
                {onboarding.experienceLevel || 'beginner'} level interpretation
              </div>
            </div>
          </div>
          {onboarding.preferredTrackingMode === 'phone_only' && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 14, lineHeight: 1.7 }}>
              Phone-only mode is strongest for movement patterns. Read weak-confidence vital alerts directionally and prioritize repeated patterns over one-off spikes.
            </p>
          )}
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">🔔</div><h3>No alerts</h3><p>{lens.empty}</p></div></div>
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
