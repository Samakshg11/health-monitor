import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getLatestReading } from '../utils/api';

const confidenceTone = (value) => {
  if (value >= 80) return { label: 'High', color: 'var(--accent-green)' };
  if (value >= 60) return { label: 'Medium', color: 'var(--accent-yellow)' };
  return { label: 'Low', color: 'var(--accent-red)' };
};

const WearableSetup = () => {
  const [paired, setPaired] = useState(localStorage.getItem('vw_wearable_paired') === 'true');
  const [battery, setBattery] = useState(Number(localStorage.getItem('vw_wearable_battery') || 87));
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLatest = async () => {
    try {
      const { data } = await getLatestReading();
      setLatest(data.reading || null);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadLatest();
    const id = setInterval(loadLatest, 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!paired) return undefined;
    const id = setInterval(() => {
      setBattery((prev) => {
        const next = Math.max(8, prev - (Math.random() > 0.7 ? 1 : 0));
        localStorage.setItem('vw_wearable_battery', String(next));
        return next;
      });
    }, 60000);
    return () => clearInterval(id);
  }, [paired]);

  const onPair = () => {
    setPaired(true);
    setBattery(91);
    localStorage.setItem('vw_wearable_paired', 'true');
    localStorage.setItem('vw_wearable_battery', '91');
    toast.success('VitalBand X1 paired successfully');
  };

  const onUnpair = () => {
    setPaired(false);
    localStorage.setItem('vw_wearable_paired', 'false');
    toast.success('Device disconnected');
  };

  const syncHealth = useMemo(() => {
    const overall = latest?.confidence?.overall;
    if (typeof overall !== 'number') return { value: 52, ...confidenceTone(52) };
    return { value: overall, ...confidenceTone(overall) };
  }, [latest]);

  const source = latest?.source || 'estimated';
  const lastSync = latest?.recordedAt ? new Date(latest.recordedAt).toLocaleString() : 'No sync yet';

  return (
    <div>
      <div className="page-header">
        <h1>Wearable Setup</h1>
        <p>Pair and monitor your VitalBand X1 connection, sync quality, and sensor confidence.</p>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Device</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>VitalBand X1</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: 4 }}>
                Status: {paired ? 'Connected' : 'Not connected'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {paired ? (
                <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={onUnpair}>
                  Disconnect
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={onPair}>
                  Pair Device
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-value">{paired ? `${battery}%` : '—'}</div>
            <div className="stat-label">Battery</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: syncHealth.color }}>{paired ? syncHealth.value : '—'}</div>
            <div className="stat-label">Sync Confidence</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ textTransform: 'capitalize' }}>{paired ? source : '—'}</div>
            <div className="stat-label">Data Source</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{paired ? lastSync : '—'}</div>
            <div className="stat-label">Last Sync</div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Sensor Confidence</h3>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading wearable diagnostics...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Confidence</th>
                    <th>Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {['heartRate', 'bloodPressure', 'spo2', 'steps', 'distance', 'sleepScore', 'stressLevel'].map((key) => {
                    const value = latest?.confidence?.[key];
                    const tone = confidenceTone(typeof value === 'number' ? value : 50);
                    return (
                      <tr key={key}>
                        <td style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                        <td>{typeof value === 'number' ? `${value}%` : '—'}</td>
                        <td style={{ color: tone.color }}>{tone.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Confidence is higher when motion and location signals are available. Low-confidence vitals are softened in alerts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WearableSetup;
