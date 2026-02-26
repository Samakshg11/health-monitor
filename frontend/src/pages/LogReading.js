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
      toast.error(err.response && err.response.data && err.response.data.message || 'Failed to log reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Log Health Reading</h1>
        <p>Enter your current health vitals. Fill in the metrics you want to track.</p>
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
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Normal: 60–100 BPM</small>
              </div>
              <div className="input-field">
                <label>Systolic Pressure</label>
                <div className="input-with-unit">
                  <input type="number" name="systolic" placeholder="120" value={form.systolic} onChange={handleChange} min="60" max="250" />
                  <span className="unit-label">mmHg</span>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Normal: below 120</small>
              </div>
              <div className="input-field">
                <label>Diastolic Pressure</label>
                <div className="input-with-unit">
                  <input type="number" name="diastolic" placeholder="80" value={form.diastolic} onChange={handleChange} min="40" max="150" />
                  <span className="unit-label">mmHg</span>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Normal: below 80</small>
              </div>
            </div>

            <div className="section-title">🫁 Respiratory & Temp</div>
            <div className="input-group">
              <div className="input-field">
                <label>SpO₂ (Oxygen Saturation)</label>
                <div className="input-with-unit">
                  <input type="number" name="spo2" placeholder="98" value={form.spo2} onChange={handleChange} min="70" max="100" />
                  <span className="unit-label">%</span>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Normal: 95–100%</small>
              </div>
              <div className="input-field">
                <label>Body Temperature</label>
                <div className="input-with-unit">
                  <input type="number" name="temperature" placeholder="36.6" step="0.1" value={form.temperature} onChange={handleChange} min="30" max="45" />
                  <span className="unit-label">°C</span>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Normal: 36.1–37.2°C</small>
              </div>
            </div>

            <div className="section-title">👣 Activity</div>
            <div className="input-group" style={{ gridTemplateColumns: '1fr' }}>
              <div className="input-field">
                <label>Steps Count</label>
                <div className="input-with-unit">
                  <input type="number" name="steps" placeholder="8000" value={form.steps} onChange={handleChange} min="0" />
                  <span className="unit-label">steps</span>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Goal: 10,000 steps/day</small>
              </div>
            </div>

            <div className="section-title">📝 Notes</div>
            <div className="input-field" style={{ marginBottom: 24 }}>
              <label>Additional Notes (optional)</label>
              <textarea name="notes" placeholder="How are you feeling? Any symptoms?" value={form.notes} onChange={handleChange} rows={3} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', width: '100%' }} />
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
