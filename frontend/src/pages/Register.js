import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', age: '', gender: '', weight: '', height: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Let’s finish your setup.');
      navigate('/welcome');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-circle" />
        <div className="auth-bg-circle" />
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">♥</div>
          <div>
            <h1>VitalWatch</h1>
            <p>Health Monitoring System</p>
          </div>
        </div>

        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Create your account, then complete a quick 1-minute tracking setup.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Age</label>
              <input type="number" name="age" placeholder="25" value={form.age} onChange={handleChange} min="1" max="120" />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" name="weight" placeholder="70" value={form.weight} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" name="height" placeholder="175" value={form.height} onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Next step after signup: choose your goal, tracking style, and phone-first preferences before entering the dashboard.
        </p>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
