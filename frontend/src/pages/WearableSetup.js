import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getLatestReading, importHealthConnectReading } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ProgressRing, SignalBars, TrackerIcon } from '../components/TrackerUI';

const confidenceTone = (value) => {
  if (value >= 80) return { label: 'Excellent', color: 'var(--accent-green)' };
  if (value >= 60) return { label: 'Good', color: 'var(--accent-yellow)' };
  return { label: 'Weak', color: 'var(--accent-red)' };
};

const confidenceTierCopy = {
  high: 'High confidence',
  medium: 'Moderate confidence',
  low: 'Directional confidence',
};

const deviceLens = {
  fitness: {
    title: 'Performance-first device plan',
    phoneFocus: 'Use phone sensors now for movement volume, sessions, and consistency.',
    futureFocus: 'A future band would mainly improve readiness, effort tracking, and higher-confidence vitals.',
  },
  wellness: {
    title: 'Steady-habits device plan',
    phoneFocus: 'Phone tracking is enough to support routines, movement, and broad daily rhythm.',
    futureFocus: 'A future band would improve passive signals like sleep, stress, and all-day recovery context.',
  },
  recovery: {
    title: 'Recovery-first device plan',
    phoneFocus: 'Phone mode can show activity and trend direction, but it is weaker for recovery precision.',
    futureFocus: 'A future band would matter most here by improving sleep quality, overnight strain, and readiness confidence.',
  },
  'clinical-awareness': {
    title: 'Signal-quality device plan',
    phoneFocus: 'Treat phone-first mode as directional and trend-based rather than diagnostic.',
    futureFocus: 'A future band would provide stronger body-signal confidence and reduce reliance on estimated vitals.',
  },
};

const buildMockHealthConnectPayload = () => {
  const now = new Date();
  const hour = now.getHours();
  const recoveryBias = hour < 9 ? 1.06 : hour > 19 ? 0.96 : 1;

  return {
    deviceName: 'Android Health Connect',
    primarySource: 'Health Connect mock bridge',
    contributors: ['health-connect-adapter', 'android-phone', 'fitness-platform-records'],
    confidenceTier: 'high',
    summary: {
      movementSupport: 'platform-backed',
      vitalsSupport: 'connected source',
      recoverySupport: 'connected source',
    },
    confidence: {
      overall: 89,
      heartRate: 91,
      bloodPressure: 84,
      spo2: 88,
      temperature: 81,
      steps: 93,
      distance: 92,
      activeMinutes: 91,
      hydration: 72,
      sleepScore: 85,
      sleepHours: 85,
      stressLevel: 78,
    },
    workoutMode: hour > 18 ? 'recovery' : 'balanced',
    notes: 'Mock Health Connect import for free-source demo flow',
    metrics: {
      heartRate: Math.round(66 * recoveryBias),
      systolic: 118,
      diastolic: 78,
      spo2: 98,
      temperature: 36.6,
      steps: 8430,
      calories: 412,
      distance: 6.1,
      cadence: 158,
      activeMinutes: 47,
      hydration: 76,
      sleepScore: Math.round(82 * recoveryBias),
      sleepHours: Number((7.4 * recoveryBias).toFixed(1)),
      stressLevel: Math.round(34 / recoveryBias),
    },
  };
};

const WearableSetup = () => {
  const { wearable, user, pairWearable, unpairWearable, requestSensorPermissions } = useAuth();
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [scanStatus, setScanStatus] = useState('idle');
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [importingHealthConnect, setImportingHealthConnect] = useState(false);

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
    toast.success('Future band preview paired successfully');
    setWizardStep(3);
    setCalibrationProgress(20);
  };

  const importMockHealthConnect = async () => {
    setImportingHealthConnect(true);
    try {
      const payload = buildMockHealthConnectPayload();
      await importHealthConnectReading(payload);
      await loadLatest();
      toast.success('Mock Health Connect reading imported');
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to import Health Connect sample';
      toast.error(message);
    } finally {
      setImportingHealthConnect(false);
    }
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
  const signalStrength = wearable.paired ? (wearable.lastSyncStatus === 'error' ? 1 : latest ? 4 : 3) : 0;
  const onboarding = user?.onboarding || {};
  const lens = deviceLens[onboarding.trackingGoal] || deviceLens.fitness;
  const modeLabel = onboarding.preferredTrackingMode === 'future_band'
    ? 'Future wearable path'
    : onboarding.preferredTrackingMode === 'both'
      ? 'Phone now + wearable later'
      : 'Phone-first path';
  const strategyHeadline = wearable.paired ? 'Previewing the future hardware path' : 'Optimizing the free phone-first path';
  const supportedMetrics = sourceDetails?.supportedMetrics || {};
  const confidenceTier = sourceDetails?.confidenceTier || (latest?.confidence?.overall >= 78 ? 'high' : latest?.confidence?.overall >= 56 ? 'medium' : 'low');
  const mockHealthConnectPayload = useMemo(() => buildMockHealthConnectPayload(), []);
  const latestHealthConnectImport = latest?.source === 'health_connect' ? latest : null;

  return (
    <div>
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">Device</span>
          <h1>Device roadmap</h1>
          <p>Free-first integration path now, future companion band later. This keeps the product credible without locking you into paid aggregators.</p>
        </div>
      </div>

      <div className="page-content">
        <section className="card tracker-device-intro" style={{ marginBottom: 18 }}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Your setup</span>
              <h3>{lens.title}</h3>
            </div>
          </div>
          <div className="tracker-device-intro-grid">
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Current mode</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', marginBottom: 8 }}>{modeLabel}</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{lens.phoneFocus}</p>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>Why the band matters later</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', marginBottom: 8 }}>{strategyHeadline}</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{lens.futureFocus}</p>
            </div>
          </div>
        </section>

        <section className="tracker-device-triptych" style={{ marginBottom: 18 }}>
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
              <div className="tracker-diagnostic-row"><span>Best use</span><strong>{onboarding.trackingGoal === 'recovery' ? 'Activity context' : onboarding.trackingGoal === 'clinical-awareness' ? 'Trend watching' : 'Daily consistency'}</strong></div>
            </div>
          </div>
          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Android next</span>
                <h3>With Health Connect</h3>
              </div>
            </div>
            <div className="tracker-diagnostics-list">
              <div className="tracker-diagnostic-row"><span>Movement</span><strong>Platform-backed activity records</strong></div>
              <div className="tracker-diagnostic-row"><span>Vitals</span><strong>Connected source when available</strong></div>
              <div className="tracker-diagnostic-row"><span>Confidence</span><strong>Higher than phone-only</strong></div>
              <div className="tracker-diagnostic-row"><span>Status</span><strong>Backend adapter ready</strong></div>
            </div>
          </div>
          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Band connected</span>
                <h3>With our future band</h3>
              </div>
            </div>
            <div className="tracker-diagnostics-list">
              <div className="tracker-diagnostic-row"><span>Movement</span><strong>Band steps + phone correction</strong></div>
              <div className="tracker-diagnostic-row"><span>Vitals</span><strong>Direct wearable-style sensor feed</strong></div>
              <div className="tracker-diagnostic-row"><span>Confidence</span><strong>Higher and more direct</strong></div>
              <div className="tracker-diagnostic-row"><span>Main upgrade</span><strong>{onboarding.trackingGoal === 'fitness' ? 'Readiness + effort quality' : onboarding.trackingGoal === 'wellness' ? 'Passive recovery context' : onboarding.trackingGoal === 'recovery' ? 'Sleep + strain precision' : 'Stronger signal confidence'}</strong></div>
            </div>
          </div>
        </section>

        <section className="tracker-device-grid">
          <div className="card tracker-device-hero">
            <div className="tracker-device-copy">
              <span className="eyebrow">Connection</span>
              <h2>{wearable.paired ? 'Preview band flow active' : 'Phone-first flow active'}</h2>
              <p>
                Source mode is <strong>{sourceDetails?.label || source.replace(/_/g, ' ')}</strong>.
                {' '}Last sync: {lastSync}.
                {' '}{sourceDetails?.primarySource ? `${sourceDetails.primarySource}.` : ''}
              </p>
              <div className="tracker-hero-badges">
                <span className="tracker-pill"><TrackerIcon name="sync" size={14} /> {wearable.paired ? 'Preview flow paired' : 'Awaiting preview pair'}</span>
                <span className="tracker-pill"><TrackerIcon name="signal" size={14} /> <SignalBars strength={signalStrength} /></span>
                <span className="tracker-pill"><TrackerIcon name="device" size={14} /> {confidenceTierCopy[confidenceTier] || 'Moderate confidence'}</span>
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

        <section className="tracker-device-triptych">
          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Free integrations</span>
                <h3>Recommended path</h3>
              </div>
            </div>
            <div className="tracker-device-actions">
              <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={onPermissions}>
                Check permissions
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: 'auto' }}
                onClick={importMockHealthConnect}
                disabled={importingHealthConnect}
              >
                {importingHealthConnect ? 'Importing sample...' : 'Import Health Connect sample'}
              </button>
              {wearable.paired ? (
                <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={onUnpair}>
                  Disconnect preview
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={startWizard}>
                  Start preview pairing
                </button>
              )}
            </div>

            <div className="tracker-device-checklist">
              <div className="tracker-check-item">
                <span>Bluetooth pairing</span>
                <strong>{wearable.paired ? 'Preview ready' : 'Pending'}</strong>
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
                <span>Android path</span>
                <strong>Health Connect</strong>
              </div>
              <div className="tracker-check-item">
                <span>Adapter</span>
                <strong>Backend-ready</strong>
              </div>
              <div className="tracker-check-item">
                <span>Best fit</span>
                <strong>{onboarding.trackingGoal || 'fitness'}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Demo bridge</span>
                <h3>Health Connect mock importer</h3>
              </div>
            </div>
            <div className="tracker-diagnostics-list">
              <div className="tracker-diagnostic-row">
                <span>Status</span>
                <strong>{latestHealthConnectImport ? 'Latest reading came from Health Connect' : 'Ready to import sample'}</strong>
              </div>
              <div className="tracker-diagnostic-row">
                <span>Last import</span>
                <strong>{latestHealthConnectImport?.recordedAt ? new Date(latestHealthConnectImport.recordedAt).toLocaleString() : 'No Health Connect sample yet'}</strong>
              </div>
              <div className="tracker-diagnostic-row">
                <span>Bridge source</span>
                <strong>{mockHealthConnectPayload.primarySource}</strong>
              </div>
              <div className="tracker-diagnostic-row">
                <span>Sample movement</span>
                <strong>{mockHealthConnectPayload.metrics.steps.toLocaleString()} steps · {mockHealthConnectPayload.metrics.distance} km</strong>
              </div>
              <div className="tracker-diagnostic-row">
                <span>Sample vitals</span>
                <strong>{mockHealthConnectPayload.metrics.heartRate} BPM · {mockHealthConnectPayload.metrics.spo2}% SpO₂</strong>
              </div>
              <div className="tracker-diagnostic-row">
                <span>Sample recovery</span>
                <strong>{mockHealthConnectPayload.metrics.sleepHours} hrs · {mockHealthConnectPayload.metrics.sleepScore}% sleep score</strong>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 14, lineHeight: 1.7 }}>
              This stays free: the button above sends a sample connected-source payload through your backend `Health Connect` adapter route, so you can demo an Android integration path without any paid aggregator.
            </p>
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
                  <span>Confidence tier</span>
                  <strong>{confidenceTierCopy[confidenceTier] || 'Moderate confidence'}</strong>
                </div>
                <div className="tracker-diagnostic-row">
                  <span>Movement support</span>
                  <strong>{supportedMetrics.movement || 'Unknown'}</strong>
                </div>
                <div className="tracker-diagnostic-row">
                  <span>Vitals support</span>
                  <strong>{supportedMetrics.vitals || 'Unknown'}</strong>
                </div>
                <div className="tracker-diagnostic-row">
                  <span>Recovery support</span>
                  <strong>{supportedMetrics.recovery || 'Unknown'}</strong>
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
              <span className="eyebrow">Roadmap</span>
              <h3>Free-first wearable strategy</h3>
            </div>
          </div>
          <div className="tracker-diagnostics-list">
              <div className="tracker-diagnostic-row">
                <span>Android</span>
                <div>
                  <strong>Health Connect</strong>
                  <small>Best free path for normalized phone and health data, with backend adapter support now prepared</small>
                </div>
              </div>
            <div className="tracker-diagnostic-row">
              <span>iPhone</span>
              <div>
                <strong>HealthKit</strong>
                <small>No monthly platform fee, but Apple developer membership is typically needed</small>
              </div>
            </div>
              <div className="tracker-diagnostic-row">
                <span>Later</span>
                <div>
                  <strong>Direct provider APIs</strong>
                  <small>Fitbit, Garmin, Oura, or your own band when traction justifies it</small>
                </div>
              </div>
            </div>
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
            <span className="eyebrow">Preview pairing</span>
            <h3>Simulate the future companion band</h3>
            <p>Step {wizardStep} of 3. This preview shows how the app would behave once your own wearable is available.</p>

            <div className="tracker-progress-bar">
              <div style={{ width: `${(wizardStep / 3) * 100}%` }} />
            </div>

            {wizardStep === 1 && (
              <div>
                <div className="tracker-wizard-panel">
                  <div className="tracker-device-shell mini">
                    <div className="tracker-device-screen">
                      <TrackerIcon name="device" size={18} />
                      <strong>Preview</strong>
                      <small>{scanStatus === 'found' ? 'Preview device found' : scanStatus === 'scanning' ? 'Searching...' : 'Ready to scan'}</small>
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
                  <button type="button" className="btn btn-primary" onClick={confirmPair}>Enable preview</button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div>
                <div className="tracker-wizard-panel">
                  <ProgressRing value={calibrationProgress} color="var(--accent-blue)" label="Calibrating" sublabel={calibrationProgress >= 100 ? 'ready' : 'hold still'} compact />
                  <p style={{ color: 'var(--text-secondary)', marginTop: 14 }}>
                    {calibrationProgress >= 100
                      ? 'Calibration complete. The future band preview flow is now active for live movement and vitals.'
                      : 'Keep the device close while the app previews movement and heart-rate confidence tuning.'}
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
