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
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-5">
      <div className="auth-bg">
        <div className="auth-bg-circle" />
        <div className="auth-bg-circle" />
      </div>
      <div className="relative z-[1] w-full max-w-[460px] rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-[var(--shadow),var(--shadow-glow)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-bright)] bg-[var(--accent-red-dim)] text-[1.3rem] text-[var(--accent-red)]">♥</div>
          <div>
            <h1 className="font-[var(--font-display)] text-[1.4rem] font-bold text-[var(--text-primary)]">VitalWatch</h1>
            <p className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">Health Monitoring System</p>
          </div>
        </div>

        <h2 className="mb-1.5 font-[var(--font-display)] text-[1.8rem] font-bold">Create account</h2>
        <p className="mb-7 text-[0.85rem] text-[var(--text-secondary)]">Create your account, then complete a quick 1-minute tracking setup.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-[18px]">
            <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Full Name</label>
            <input className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
          </div>
          <div className="mb-[18px]">
            <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Email Address</label>
            <input className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div className="mb-[18px]">
            <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Password</label>
            <input className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" type="password" name="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="mb-[18px]">
              <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Age</label>
              <input className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" type="number" name="age" placeholder="25" value={form.age} onChange={handleChange} min="1" max="120" />
            </div>
            <div className="mb-[18px]">
              <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Gender</label>
              <select className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="mb-[18px]">
              <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Weight (kg)</label>
              <input className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" type="number" name="weight" placeholder="70" value={form.weight} onChange={handleChange} />
            </div>
            <div className="mb-[18px]">
              <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Height (cm)</label>
              <input className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" type="number" name="height" placeholder="175" value={form.height} onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Next step after signup: choose your goal, tracking style, and phone-first preferences before entering the dashboard.
        </p>

        <p className="mt-5 text-center text-[0.85rem] text-[var(--text-secondary)]">
          Already have an account? <Link className="text-[var(--accent-red)]" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
