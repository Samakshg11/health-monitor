import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitReading } from '../utils/api';
import toast from 'react-hot-toast';

const LogReading = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    heartRate: '',
    systolic: '', diastolic: '',
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
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
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
      if (form.notes) payload.notes = form.notes;

      const { data } = await submitReading(payload);

      if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach((alert) => {
          if (alert.severity === 'critical') toast.error(alert.message, { duration: 6000 });
          else toast(alert.message, { icon: '⚠️', duration: 4000 });
        });
      } else {
        toast.success('Reading logged successfully!');
      }
      navigate('/dashboard');
    } catch (err) {
      const errorMessage =
        (err.response && err.response.data && err.response.data.message) || 'Failed to log reading';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Log Health Reading</h1>
        <p>Track vitals and fitness metrics in one reading.</p>
      </div>
      <div className="page-content">
        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="section-title">❤️ Cardiovascular</div>
            <div className="input-group">
              <div className="input-field">
                <label>Heart Rate</label>
                <div className="input-with-unit">
                  <input type="number" name="heartRate" placeholder="72" value={form.heartRate} onChange={handleChange} min="20" max="250" />
                  <span className="unit-label">BPM</span>
                </div>
              </div>
              <div className="input-field">
                <label>Systolic Pressure</label>
                <div className="input-with-unit">
                  <input type="number" name="systolic" placeholder="120" value={form.systolic} onChange={handleChange} min="60" max="250" />
                  <span className="unit-label">mmHg</span>
                </div>
              </div>
              <div className="input-field">
                <label>Diastolic Pressure</label>
                <div className="input-with-unit">
                  <input type="number" name="diastolic" placeholder="80" value={form.diastolic} onChange={handleChange} min="40" max="150" />
                  <span className="unit-label">mmHg</span>
                </div>
              </div>
            </div>

            <div className="section-title">🫁 Respiratory & Temp</div>
            <div className="input-group">
              <div className="input-field">
                <label>SpO₂</label>
                <div className="input-with-unit">
                  <input type="number" name="spo2" placeholder="98" value={form.spo2} onChange={handleChange} min="70" max="100" />
                  <span className="unit-label">%</span>
                </div>
              </div>
              <div className="input-field">
                <label>Body Temperature</label>
                <div className="input-with-unit">
                  <input type="number" name="temperature" placeholder="36.6" step="0.1" value={form.temperature} onChange={handleChange} min="30" max="45" />
                  <span className="unit-label">°C</span>
                </div>
              </div>
              <div className="input-field">
                <label>Workout Mode</label>
                <select name="workoutMode" value={form.workoutMode} onChange={handleChange}>
                  <option value="balanced">Balanced</option>
                  <option value="push">Push</option>
                  <option value="recovery">Recovery</option>
                </select>
              </div>
            </div>

            <div className="section-title">👟 Fitness Metrics</div>
            <div className="input-group">
              <div className="input-field">
                <label>Steps</label>
                <div className="input-with-unit">
                  <input type="number" name="steps" placeholder="8000" value={form.steps} onChange={handleChange} min="0" />
                  <span className="unit-label">steps</span>
                </div>
              </div>
              <div className="input-field">
                <label>Calories</label>
                <div className="input-with-unit">
                  <input type="number" name="calories" placeholder="350" value={form.calories} onChange={handleChange} min="0" />
                  <span className="unit-label">kcal</span>
                </div>
              </div>
              <div className="input-field">
                <label>Distance</label>
                <div className="input-with-unit">
                  <input type="number" name="distance" placeholder="4.2" value={form.distance} onChange={handleChange} min="0" step="0.01" />
                  <span className="unit-label">km</span>
                </div>
              </div>
            </div>

            <div className="input-group">
              <div className="input-field">
                <label>Cadence</label>
                <div className="input-with-unit">
                  <input type="number" name="cadence" placeholder="164" value={form.cadence} onChange={handleChange} min="0" />
                  <span className="unit-label">spm</span>
                </div>
              </div>
              <div className="input-field">
                <label>Active Minutes</label>
                <div className="input-with-unit">
                  <input type="number" name="activeMinutes" placeholder="38" value={form.activeMinutes} onChange={handleChange} min="0" />
                  <span className="unit-label">min</span>
                </div>
              </div>
              <div className="input-field">
                <label>Hydration</label>
                <div className="input-with-unit">
                  <input type="number" name="hydration" placeholder="78" value={form.hydration} onChange={handleChange} min="0" max="100" />
                  <span className="unit-label">%</span>
                </div>
              </div>
            </div>

            <div className="input-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="input-field">
                <label>Sleep Score</label>
                <div className="input-with-unit">
                  <input type="number" name="sleepScore" placeholder="82" value={form.sleepScore} onChange={handleChange} min="0" max="100" />
                  <span className="unit-label">%</span>
                </div>
              </div>
            </div>

            <div className="section-title">📝 Notes</div>
            <div className="input-field" style={{ marginBottom: 24 }}>
              <label>Additional Notes (optional)</label>
              <textarea name="notes" placeholder="How are you feeling?" value={form.notes} onChange={handleChange} rows={3} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Saving...' : '💾 Save Reading'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogReading;
