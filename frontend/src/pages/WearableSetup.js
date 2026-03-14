import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { createTerraWidgetSession, getLatestReading, getTerraConnections } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ProgressRing, SignalBars, TrackerIcon } from '../components/TrackerUI';

const confidenceTone = (value) => {
  if (value >= 80) return { label: 'Excellent', color: 'var(--accent-green)' };
  if (value >= 60) return { label: 'Good', color: 'var(--accent-yellow)' };
  return { label: 'Weak', color: 'var(--accent-red)' };
};

const WearableSetup = () => {
  const { wearable, pairWearable, unpairWearable, requestSensorPermissions } = useAuth();
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [scanStatus, setScanStatus] = useState('idle');
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [terraConnections, setTerraConnections] = useState([]);
  const [terraLoading, setTerraLoading] = useState(false);

  const loadLatest = async () => {
    try {
      const { data } = await getLatestReading();
      setLatest(data.reading || null);
    } catch {}
    setLoading(false);
  };

  const loadTerraConnections = async () => {
    try {
      const { data } = await getTerraConnections();
      setTerraConnections(data.connections || []);
    } catch {}
  };

  useEffect(() => {
    loadLatest();
    loadTerraConnections();
    const id = setInterval(loadLatest, 20000);
    return () => clearInterval(id);
  }, []);

  const startWizard = () => {
    setWizardOpen(true);
    setWizardStep(1);
    setScanStatus('idle');
    setCalibrationProgress(0);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setScanStatus('idle');
    setCalibrationProgress(0);
  };

  const onPermissions = async () => {
    await requestSensorPermissions();
    toast.success('Permission check completed');
  };

  const connectTerra = async () => {
    setTerraLoading(true);
    try {
      const { data } = await createTerraWidgetSession({});
      const url = data?.session?.url || data?.session?.widget_url || data?.session?.widgetUrl;
      if (!url) throw new Error('Terra session URL missing');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Unable to start Terra connection');
    } finally {
      setTerraLoading(false);
    }
  };

  const onUnpair = () => {
    unpairWearable();
    toast.success('Device disconnected');
  };

  const runScan = () => {
    setScanStatus('scanning');
    setTimeout(() => setScanStatus('found'), 1400);
  };

  const confirmPair = () => {
    pairWearable();
    toast.success('VitalBand X1 paired successfully');
    setWizardStep(3);
    setCalibrationProgress(20);
  };

  useEffect(() => {
    if (!wizardOpen || wizardStep !== 3 || calibrationProgress >= 100) return undefined;
    const id = setInterval(() => {
      setCalibrationProgress((prev) => Math.min(100, prev + 16));
    }, 450);
    return () => clearInterval(id);
  }, [wizardOpen, wizardStep, calibrationProgress]);

  const syncHealth = useMemo(() => {
    const overall = latest?.confidence?.overall;
    if (typeof overall !== 'number') return { value: 52, ...confidenceTone(52) };
    return { value: overall, ...confidenceTone(overall) };
  }, [latest]);

  const source = wearable.sourceMode || latest?.source || 'estimated';
  const sourceDetails = latest?.sourceDetails;
  const lastSync = wearable.lastSyncAt ? new Date(wearable.lastSyncAt).toLocaleString() : 'No sync yet';
  const syncLabel = wearable.lastSyncStatus === 'ok'
    ? 'Connected and syncing'
    : wearable.lastSyncStatus === 'error'
      ? 'Connected, retrying'
      : wearable.paired
        ? 'Connected, waiting for first sync'
        : 'Not connected';
  const signalStrength = wearable.paired ? (wearable.lastSyncStatus === 'error' ? 1 : latest ? 4 : 3) : 0;

  return (
    <div>
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">Device</span>
          <h1>VitalBand X1</h1>
          <p>Make the band feel real: battery, sync quality, permissions, and calibration all in one device surface.</p>
        </div>
      </div>

      <div className="page-content">
        <section className="tracker-device-details" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Phone only</span>
                <h3>Without a band</h3>
              </div>
            </div>
            <div className="tracker-diagnostics-list">
              <div className="tracker-diagnostic-row"><span>Movement</span><strong>Phone motion + GPS</strong></div>
              <div className="tracker-diagnostic-row"><span>Vitals</span><strong>Estimated model</strong></div>
              <div className="tracker-diagnostic-row"><span>Confidence</span><strong>Moderate to low</strong></div>
            </div>
          </div>
          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Band connected</span>
                <h3>With VitalBand</h3>
              </div>
            </div>
            <div className="tracker-diagnostics-list">
              <div className="tracker-diagnostic-row"><span>Movement</span><strong>Band steps + phone correction</strong></div>
              <div className="tracker-diagnostic-row"><span>Vitals</span><strong>Optical band sensors</strong></div>
              <div className="tracker-diagnostic-row"><span>Confidence</span><strong>Higher and more direct</strong></div>
            </div>
          </div>
        </section>

        <section className="tracker-device-grid">
          <div className="card tracker-device-hero">
            <div className="tracker-device-copy">
              <span className="eyebrow">Connection</span>
              <h2>{syncLabel}</h2>
              <p>
                Source mode is <strong>{sourceDetails?.label || source.replace(/_/g, ' ')}</strong>.
                {' '}Last sync: {lastSync}.
                {' '}{sourceDetails?.primarySource ? `${sourceDetails.primarySource}.` : ''}
              </p>
              <div className="tracker-hero-badges">
                <span className="tracker-pill"><TrackerIcon name="sync" size={14} /> {wearable.paired ? 'Band paired' : 'Awaiting pair'}</span>
                <span className="tracker-pill"><TrackerIcon name="signal" size={14} /> <SignalBars strength={signalStrength} /></span>
              </div>
            </div>

            <div className="tracker-device-visual">
              <div className="tracker-device-shell">
                <div className="tracker-device-screen">
                  <TrackerIcon name="heart" size={20} />
                  <strong>{latest?.heartRate?.value || '--'}</strong>
                  <small>BPM live</small>
                </div>
              </div>
            </div>
          </div>

          <div className="tracker-device-side">
            <div className="card tracker-device-stat">
              <ProgressRing value={wearable.paired ? wearable.battery : 0} color="var(--accent-green)" label="Battery" sublabel={wearable.paired ? 'band' : 'offline'} compact />
            </div>
            <div className="card tracker-device-stat">
              <ProgressRing value={wearable.paired ? syncHealth.value : 0} color={syncHealth.color} label="Signal quality" sublabel={wearable.paired ? syncHealth.label : 'offline'} compact />
            </div>
          </div>
        </section>

        <section className="tracker-device-details">
          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Controls</span>
                <h3>Band setup</h3>
              </div>
            </div>
            <div className="tracker-device-actions">
              <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={onPermissions}>
                Check permissions
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={connectTerra} disabled={terraLoading}>
                {terraLoading ? 'Opening Terra...' : 'Connect via Terra'}
              </button>
              {wearable.paired ? (
                <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={onUnpair}>
                  Disconnect band
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={startWizard}>
                  Pair new band
                </button>
              )}
            </div>

            <div className="tracker-device-checklist">
              <div className="tracker-check-item">
                <span>Bluetooth pairing</span>
                <strong>{wearable.paired ? 'Ready' : 'Pending'}</strong>
              </div>
              <div className="tracker-check-item">
                <span>Location</span>
                <strong style={{ textTransform: 'capitalize' }}>{wearable.sensorStatus.geoPermission}</strong>
              </div>
              <div className="tracker-check-item">
                <span>Motion</span>
                <strong style={{ textTransform: 'capitalize' }}>{wearable.sensorStatus.motionPermission}</strong>
              </div>
              <div className="tracker-check-item">
                <span>Live feed</span>
                <strong>{wearable.sensorStatus.hasGeo || wearable.sensorStatus.hasMotion ? 'Streaming' : 'Idle'}</strong>
              </div>
              <div className="tracker-check-item">
                <span>Terra providers</span>
                <strong>{terraConnections.length}</strong>
              </div>
            </div>
          </div>

            <div className="card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Pipeline</span>
                  <h3>Current source path</h3>
                </div>
              </div>
              {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading diagnostics...</p>
              ) : (
                <div className="tracker-diagnostics-list">
                  <div className="tracker-diagnostic-row">
                    <span>Primary source</span>
                    <strong>{sourceDetails?.primarySource || 'Unknown'}</strong>
                  </div>
                  <div className="tracker-diagnostic-row">
                    <span>Movement path</span>
                    <strong>{sourceDetails?.movementSource || 'Unknown'}</strong>
                  </div>
                  <div className="tracker-diagnostic-row">
                    <span>Recovery path</span>
                    <strong>{sourceDetails?.recoverySource || 'Unknown'}</strong>
                  </div>
                  <div className="tracker-diagnostic-row">
                    <span>Contributors</span>
                    <strong>{(sourceDetails?.contributors || ['history-model']).join(', ')}</strong>
                  </div>
                </div>
              )}
          </div>
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Terra</span>
              <h3>Connected providers</h3>
            </div>
          </div>
          {terraConnections.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              No Terra-connected provider yet. When connected, Terra can bring Apple Health, Google Fit, Fitbit, Garmin,
              Oura, and other normalized wearable feeds into this project.
            </p>
          ) : (
            <div className="tracker-diagnostics-list">
              {terraConnections.map((connection) => (
                <div key={`${connection.terraUserId}-${connection.provider}`} className="tracker-diagnostic-row">
                  <span>{connection.provider || 'Provider'}</span>
                  <div>
                    <strong>{connection.status}</strong>
                    <small>{connection.lastWebhookUpdate ? new Date(connection.lastWebhookUpdate).toLocaleString() : 'Awaiting webhook'}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Confidence</span>
              <h3>Metric quality</h3>
            </div>
          </div>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading diagnostics...</p>
          ) : (
            <div className="tracker-diagnostics-list">
              {['heartRate', 'bloodPressure', 'spo2', 'steps', 'distance', 'sleepScore', 'stressLevel'].map((key) => {
                const value = latest?.confidence?.[key];
                const tone = confidenceTone(typeof value === 'number' ? value : 50);
                return (
                  <div key={key} className="tracker-diagnostic-row">
                    <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <div>
                      <strong>{typeof value === 'number' ? `${value}%` : '—'}</strong>
                      <small style={{ color: tone.color }}>{tone.label}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {wizardOpen && (
        <div className="landing-modal-overlay" onClick={closeWizard}>
          <div className="landing-modal tracker-pair-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <span className="eyebrow">Pairing wizard</span>
            <h3>Connect your VitalBand</h3>
            <p>Step {wizardStep} of 3. Scan nearby, confirm permissions, then calibrate motion and heart rate.</p>

            <div className="tracker-progress-bar">
              <div style={{ width: `${(wizardStep / 3) * 100}%` }} />
            </div>

            {wizardStep === 1 && (
              <div>
                <div className="tracker-wizard-panel">
                  <div className="tracker-device-shell mini">
                    <div className="tracker-device-screen">
                      <TrackerIcon name="device" size={18} />
                      <strong>X1</strong>
                      <small>{scanStatus === 'found' ? 'Found nearby' : scanStatus === 'scanning' ? 'Searching...' : 'Ready to scan'}</small>
                    </div>
                  </div>
                </div>
                <div className="landing-modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeWizard}>Cancel</button>
                  {scanStatus !== 'found' ? (
                    <button type="button" className="btn btn-primary" onClick={runScan}>
                      {scanStatus === 'scanning' ? 'Scanning...' : 'Start scan'}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={() => setWizardStep(2)}>
                      Continue
                    </button>
                  )}
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div>
                <div className="tracker-wizard-checks">
                  <div className="tracker-check-item">
                    <span>Location access</span>
                    <strong style={{ textTransform: 'capitalize' }}>{wearable.sensorStatus.geoPermission}</strong>
                  </div>
                  <div className="tracker-check-item">
                    <span>Motion access</span>
                    <strong style={{ textTransform: 'capitalize' }}>{wearable.sensorStatus.motionPermission}</strong>
                  </div>
                </div>
                <div className="landing-modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setWizardStep(1)}>Back</button>
                  <button type="button" className="btn btn-secondary" onClick={onPermissions}>Refresh permissions</button>
                  <button type="button" className="btn btn-primary" onClick={confirmPair}>Pair band</button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div>
                <div className="tracker-wizard-panel">
                  <ProgressRing value={calibrationProgress} color="var(--accent-blue)" label="Calibrating" sublabel={calibrationProgress >= 100 ? 'ready' : 'hold still'} compact />
                  <p style={{ color: 'var(--text-secondary)', marginTop: 14 }}>
                    {calibrationProgress >= 100
                      ? 'Calibration complete. The band is now ready to stream live movement and vitals.'
                      : 'Keep the device close while the tracker tunes movement and heart-rate confidence.'}
                  </p>
                </div>
                <div className="landing-modal-actions">
                  {calibrationProgress >= 100 ? (
                    <button type="button" className="btn btn-primary" onClick={closeWizard}>Finish</button>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={closeWizard}>Close</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WearableSetup;
