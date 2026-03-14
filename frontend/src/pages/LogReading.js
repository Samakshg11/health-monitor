import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitReading } from '../utils/api';
import { TrackerIcon } from '../components/TrackerUI';
import toast from 'react-hot-toast';

const checkInModes = {
  morning: {
    title: 'Morning check-in',
    detail: 'Best for resting vitals, sleep quality, hydration, and how recovered you feel before the day starts.',
    workoutMode: 'recovery',
    presets: {
      heartRate: ['58', '64', '72'],
      spo2: ['97', '98', '99'],
      temperature: ['36.4', '36.6', '36.8'],
      systolic: ['112', '118', '124'],
      diastolic: ['72', '78', '82'],
      hydration: ['68', '76', '84'],
      sleepScore: ['72', '82', '90'],
    },
  },
  post_workout: {
    title: 'Post-workout check-in',
    detail: 'Capture effort, active minutes, steps, hydration, and elevated vitals after a session.',
    workoutMode: 'push',
    presets: {
      heartRate: ['112', '128', '144'],
      spo2: ['95', '97', '98'],
      temperature: ['36.8', '37.0', '37.2'],
      steps: ['4200', '7600', '10800'],
      calories: ['260', '420', '580'],
      distance: ['3.2', '5.8', '8.4'],
      activeMinutes: ['24', '42', '60'],
      cadence: ['152', '164', '176'],
      hydration: ['58', '68', '78'],
    },
  },
  evening: {
    title: 'Evening recovery check-in',
    detail: 'Log how the day landed: stress, hydration, sleep outlook, and any manual vitals you measured.',
    workoutMode: 'balanced',
    presets: {
      heartRate: ['66', '74', '82'],
      spo2: ['96', '98', '99'],
      temperature: ['36.5', '36.7', '36.9'],
      hydration: ['62', '74', '86'],
      sleepScore: ['68', '79', '88'],
      activeMinutes: ['18', '36', '54'],
      steps: ['5200', '8600', '11800'],
    },
  },
};

const inputGroups = [
  {
    key: 'vitals',
    title: 'Vitals',
    icon: 'heart',
    fields: [
      { name: 'heartRate', label: 'Heart Rate', unit: 'BPM', placeholder: '72', min: 20, max: 250 },
      { name: 'spo2', label: 'SpO₂', unit: '%', placeholder: '98', min: 70, max: 100 },
      { name: 'temperature', label: 'Temperature', unit: '°C', placeholder: '36.6', min: 30, max: 45, step: '0.1' },
    ],
  },
  {
    key: 'pressure',
    title: 'Blood Pressure',
    icon: 'pressure',
    fields: [
      { name: 'systolic', label: 'Systolic', unit: 'mmHg', placeholder: '120', min: 60, max: 250 },
      { name: 'diastolic', label: 'Diastolic', unit: 'mmHg', placeholder: '80', min: 40, max: 150 },
    ],
  },
  {
    key: 'movement',
    title: 'Movement',
    icon: 'activity',
    fields: [
      { name: 'steps', label: 'Steps', unit: 'steps', placeholder: '8000', min: 0 },
      { name: 'distance', label: 'Distance', unit: 'km', placeholder: '4.2', min: 0, step: '0.01' },
      { name: 'activeMinutes', label: 'Active Minutes', unit: 'min', placeholder: '38', min: 0 },
      { name: 'calories', label: 'Calories', unit: 'kcal', placeholder: '350', min: 0 },
      { name: 'cadence', label: 'Cadence', unit: 'spm', placeholder: '164', min: 0 },
    ],
  },
  {
    key: 'recovery',
    title: 'Recovery',
    icon: 'sleep',
    fields: [
      { name: 'hydration', label: 'Hydration', unit: '%', placeholder: '78', min: 0, max: 100 },
      { name: 'sleepScore', label: 'Sleep Score', unit: '%', placeholder: '82', min: 0, max: 100 },
    ],
  },
];

const initialForm = {
  heartRate: '',
  systolic: '',
  diastolic: '',
  spo2: '',
  temperature: '',
  steps: '',
  calories: '',
  distance: '',
  cadence: '',
  activeMinutes: '',
  hydration: '',
  sleepScore: '',
  workoutMode: 'balanced',
  notes: '',
};

const LogReading = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkInMode, setCheckInMode] = useState('morning');
  const [form, setForm] = useState(initialForm);

  const modeConfig = checkInModes[checkInMode];
  const completionCount = useMemo(
    () => Object.entries(form).filter(([key, value]) => key !== 'notes' && key !== 'workoutMode' && value !== '').length,
    [form]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleModeSelect = (mode) => {
    const nextMode = checkInModes[mode];
    setCheckInMode(mode);
    setForm((prev) => ({ ...prev, workoutMode: nextMode.workoutMode }));
  };

  const applyPreset = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applySmartStarter = () => {
    const starter = modeConfig.presets;
    setForm((prev) => ({
      ...prev,
      workoutMode: modeConfig.workoutMode,
      heartRate: starter.heartRate?.[1] || prev.heartRate,
      spo2: starter.spo2?.[1] || prev.spo2,
      temperature: starter.temperature?.[1] || prev.temperature,
      hydration: starter.hydration?.[1] || prev.hydration,
      sleepScore: starter.sleepScore?.[1] || prev.sleepScore,
      systolic: starter.systolic?.[1] || prev.systolic,
      diastolic: starter.diastolic?.[1] || prev.diastolic,
      steps: starter.steps?.[1] || prev.steps,
      calories: starter.calories?.[1] || prev.calories,
      distance: starter.distance?.[1] || prev.distance,
      activeMinutes: starter.activeMinutes?.[1] || prev.activeMinutes,
      cadence: starter.cadence?.[1] || prev.cadence,
    }));
    toast.success('Suggested values applied');
  };

  const buildManualPayload = () => {
    const payload = {};
    if (form.heartRate) payload.heartRate = { value: Number(form.heartRate) };
    if (form.systolic && form.diastolic) payload.bloodPressure = { systolic: Number(form.systolic), diastolic: Number(form.diastolic) };
    if (form.spo2) payload.spo2 = { value: Number(form.spo2) };
    if (form.temperature) payload.temperature = { value: Number(form.temperature) };
    if (form.steps) payload.steps = { value: Number(form.steps) };
    if (form.calories) payload.calories = { value: Number(form.calories) };
    if (form.distance) payload.distance = { value: Number(form.distance) };
    if (form.cadence) payload.cadence = { value: Number(form.cadence) };
    if (form.activeMinutes) payload.activeMinutes = { value: Number(form.activeMinutes) };
    if (form.hydration) payload.hydration = { value: Number(form.hydration) };
    if (form.sleepScore) payload.sleepScore = { value: Number(form.sleepScore) };
    if (form.workoutMode) payload.workoutMode = form.workoutMode;
    payload.source = 'manual';
    payload.sourceDetails = {
      mode: 'manual_entry',
      label: 'Manual check-in',
      deviceName: 'Manual entry',
      primarySource: `User-entered ${modeConfig.title.toLowerCase()}`,
      movementSource: payload.steps || payload.distance || payload.activeMinutes ? 'User-entered activity summary' : 'No movement metrics entered',
      recoverySource: payload.sleepScore || payload.hydration ? 'User-entered wellness summary' : 'No recovery metrics entered',
      confidenceTier: 'high',
      supportedMetrics: {
        movement: payload.steps || payload.distance || payload.activeMinutes ? 'manual summary' : 'not entered',
        vitals: payload.heartRate || payload.bloodPressure || payload.spo2 || payload.temperature ? 'manual measurement' : 'not entered',
        recovery: payload.sleepScore || payload.hydration ? 'manual summary' : 'not entered',
      },
      contributors: ['manual-check-in', checkInMode.replace('_', '-')],
    };
    payload.notes = form.notes ? `Manual check-in · ${modeConfig.title} · ${form.notes}` : `Manual check-in · ${modeConfig.title}`;
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await submitReading(buildManualPayload());
      if (data.alerts?.length > 0) {
        data.alerts.forEach((alert) => {
          if (alert.severity === 'critical') toast.error(alert.message, { duration: 6000 });
          else toast(alert.message, { icon: '⚠️', duration: 4000 });
        });
      } else {
        toast.success('Manual check-in saved');
      }
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err?.response?.data?.message || 'Failed to save manual check-in';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">Check-In</span>
          <h1>Manual vitals</h1>
          <p>Add explicit free measurements so your body signals come from a clear source instead of passive phone estimation.</p>
        </div>
      </div>

      <div className="page-content tracker-dashboard">
        <section className="card checkin-hero">
          <div>
            <div className="eyebrow">Choose flow</div>
            <h2>{modeConfig.title}</h2>
            <p>{modeConfig.detail}</p>
            <div className="checkin-mode-row">
              {Object.entries(checkInModes).map(([key, mode]) => (
                <button
                  key={key}
                  type="button"
                  className={`checkin-mode-btn ${checkInMode === key ? 'active' : ''}`}
                  onClick={() => handleModeSelect(key)}
                >
                  <strong>{mode.title}</strong>
                  <span>{mode.detail}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="checkin-hero-side">
            <div className="checkin-score-card">
              <span className="eyebrow">Filled metrics</span>
              <strong>{completionCount}</strong>
              <small>body and recovery signals captured</small>
            </div>
            <div className="checkin-score-card checkin-score-card-accent">
              <span className="eyebrow">Source</span>
              <strong>Manual check-in</strong>
              <small>high-confidence user-entered data</small>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="checkin-layout">
          <div className="form-card checkin-main-card">
            <div className="checkin-toolbar">
              <div>
                <div className="eyebrow">Quick start</div>
                <h3>Tap a starter or enter exact numbers</h3>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={applySmartStarter}>
                Apply suggested values
              </button>
            </div>

            {inputGroups.map((group) => (
              <section key={group.key} className="checkin-section">
                <div className="section-title">
                  <TrackerIcon name={group.icon} size={16} />
                  {group.title}
                </div>
                <div className="checkin-field-grid">
                  {group.fields.map((field) => (
                    <div key={field.name} className="input-field checkin-field-card">
                      <div className="checkin-field-head">
                        <label>{field.label}</label>
                        {modeConfig.presets[field.name] && (
                          <div className="checkin-preset-row">
                            {modeConfig.presets[field.name].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                className={`checkin-preset-chip ${form[field.name] === preset ? 'active' : ''}`}
                                onClick={() => applyPreset(field.name, preset)}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="input-with-unit">
                        <input
                          type="number"
                          name={field.name}
                          placeholder={field.placeholder}
                          value={form[field.name]}
                          onChange={handleChange}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                        />
                        <span className="unit-label">{field.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="checkin-section">
              <div className="section-title">
                <TrackerIcon name="activity" size={16} />
                Check-in context
              </div>
              <div className="input-group">
                <div className="input-field">
                  <label>Workout Mode</label>
                  <select name="workoutMode" value={form.workoutMode} onChange={handleChange}>
                    <option value="balanced">Balanced</option>
                    <option value="push">Push</option>
                    <option value="recovery">Recovery</option>
                  </select>
                </div>
                <div className="input-field">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    placeholder="How are you feeling, what did you measure, anything notable?"
                    value={form.notes}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </div>
            </section>

            <div className="checkin-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving check-in...' : 'Save manual check-in'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                Cancel
              </button>
            </div>
          </div>

          <aside className="checkin-sidebar">
            <div className="card checkin-side-card">
              <div className="eyebrow">Why this matters</div>
              <h3>More believable source flow</h3>
              <p>Phone sync is great for activity. Manual check-ins make vitals explicit, which keeps the app honest and much more product-realistic.</p>
            </div>
            <div className="card checkin-side-card">
              <div className="eyebrow">Best use</div>
              <h3>{modeConfig.title}</h3>
              <p>{modeConfig.detail}</p>
            </div>
            <div className="card checkin-side-card">
              <div className="eyebrow">Saved as</div>
              <div className="checkin-source-pill">
                <TrackerIcon name="heart" size={16} />
                Manual check-in
              </div>
              <p>Stored with high-confidence source metadata so trends and alerts can treat it differently from phone-only sync.</p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default LogReading;
