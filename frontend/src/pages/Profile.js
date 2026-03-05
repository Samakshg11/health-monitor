import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGoals, updateGoals } from '../utils/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [form, setForm] = useState({
    name: (user && user.name) || '',
    age: (user && user.age) || '',
    gender: (user && user.gender) || '',
    weight: (user && user.weight) || '',
    height: (user && user.height) || '',
  });
  const [goals, setGoals] = useState({ steps: 10000, activeMinutes: 60, hydration: 100 });

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const { data } = await getGoals();
        setGoals(data.goals);
      } catch {}
    };
    loadGoals();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleGoalChange = (e) => setGoals((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalsSubmit = async (e) => {
    e.preventDefault();
    setGoalsLoading(true);
    try {
      const { data } = await updateGoals({
        steps: Number(goals.steps),
        activeMinutes: Number(goals.activeMinutes),
        hydration: Number(goals.hydration),
      });
      setGoals(data.goals);
      toast.success('Daily goals updated!');
    } catch {
      toast.error('Failed to update goals');
    } finally {
      setGoalsLoading(false);
    }
  };

  const bmi = form.weight && form.height
    ? (form.weight / Math.pow(form.height / 100, 2)).toFixed(1)
    : null;

  const bmiCategory = bmi
    ? bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
    : null;

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your personal info and fitness goals</p>
      </div>
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          <div className="form-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
              <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, var(--accent-red), var(--accent-purple))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {user && user.name && user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>{user && user.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user && user.email}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="section-title">👤 Personal Information</div>
              <div className="input-group">
                <div className="input-field">
                  <label>Full Name</label>
                  <input name="name" value={form.name} onChange={handleChange} />
                </div>
                <div className="input-field">
                  <label>Age</label>
                  <input type="number" name="age" value={form.age} onChange={handleChange} min="1" max="120" />
                </div>
              </div>
              <div className="input-group">
                <div className="input-field">
                  <label>Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="section-title">📏 Body Measurements</div>
              <div className="input-group">
                <div className="input-field">
                  <label>Weight</label>
                  <div className="input-with-unit">
                    <input type="number" name="weight" value={form.weight} onChange={handleChange} />
                    <span className="unit-label">kg</span>
                  </div>
                </div>
                <div className="input-field">
                  <label>Height</label>
                  <div className="input-with-unit">
                    <input type="number" name="height" value={form.height} onChange={handleChange} />
                    <span className="unit-label">cm</span>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </form>

            <form onSubmit={handleGoalsSubmit} style={{ marginTop: 28 }}>
              <div className="section-title">🎯 Daily Fitness Goals</div>
              <div className="input-group">
                <div className="input-field">
                  <label>Steps Goal</label>
                  <div className="input-with-unit">
                    <input type="number" name="steps" value={goals.steps} onChange={handleGoalChange} min="1000" />
                    <span className="unit-label">steps</span>
                  </div>
                </div>
                <div className="input-field">
                  <label>Active Minutes Goal</label>
                  <div className="input-with-unit">
                    <input type="number" name="activeMinutes" value={goals.activeMinutes} onChange={handleGoalChange} min="10" />
                    <span className="unit-label">min</span>
                  </div>
                </div>
                <div className="input-field">
                  <label>Hydration Goal</label>
                  <div className="input-with-unit">
                    <input type="number" name="hydration" value={goals.hydration} onChange={handleGoalChange} min="20" max="100" />
                    <span className="unit-label">%</span>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-secondary" disabled={goalsLoading}>
                {goalsLoading ? 'Saving...' : 'Save Goals'}
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bmi && (
              <div className="card">
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>BMI Calculator</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: 'var(--accent-red)', lineHeight: 1 }}>{bmi}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>{bmiCategory}</div>
              </div>
            )}
            <div className="card">
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>Reference</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div>❤️ HR: 60–100 BPM</div>
                <div>🫀 BP: &lt;120/80 mmHg</div>
                <div>🫁 SpO₂: 95–100%</div>
                <div>🌡️ Temp: 36.1–37.2°C</div>
                <div>👣 Steps: 10,000/day</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
