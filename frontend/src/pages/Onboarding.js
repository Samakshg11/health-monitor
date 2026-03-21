import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Onboarding = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    trackingGoal: user?.onboarding?.trackingGoal || 'fitness',
    experienceLevel: user?.onboarding?.experienceLevel || 'beginner',
    preferredTrackingMode: user?.onboarding?.preferredTrackingMode || 'phone_only',
  });

  const summary = useMemo(() => {
    if (form.preferredTrackingMode === 'future_band') {
      return 'We will prioritize the future wearable-ready flow while keeping phone tracking usable today.';
    }
    if (form.preferredTrackingMode === 'both') {
      return 'We will keep phone-first tracking practical now and preserve a smooth transition to future wearable support.';
    }
    return 'We will keep the experience optimized for free phone-based tracking and explain low-confidence vitals more carefully.';
  }, [form.preferredTrackingMode]);

  useEffect(() => {
    if (user?.onboarding?.completed === true) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        name: user?.name || '',
        age: user?.age || '',
        gender: user?.gender || '',
        weight: user?.weight || '',
        height: user?.height || '',
        organizationName: user?.organization?.name || '',
        organizationRole: user?.organization?.role || '',
        onboarding: {
          completed: true,
          ...form,
        },
      });
      toast.success('Setup complete');
      navigate('/dashboard', { replace: true });
    } catch {
      toast.error('Unable to save setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-8 md:px-5">
      <div className="auth-bg">
        <div className="auth-bg-circle" />
        <div className="auth-bg-circle" />
      </div>
      <div className="onboarding-shell">
        <div className="onboarding-hero">
          <span className="eyebrow">Welcome</span>
          <h1>Let&apos;s set up how VitalWatch should guide you</h1>
          <p>
            This only takes a minute. We will use these preferences to explain your data path better,
            especially when you are using free phone-first tracking.
          </p>
          <div className="onboarding-summary-card">
            <strong>Your current plan</strong>
            <p>{summary}</p>
          </div>
        </div>

        <div className="relative z-[1] w-full max-w-full rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-[var(--shadow),var(--shadow-glow)]">
          <h2 className="mb-1.5 font-[var(--font-display)] text-[1.8rem] font-bold">Tracking Setup</h2>
          <p className="mb-7 text-[0.85rem] text-[var(--text-secondary)]">Choose the path that matches how you want to use the product right now.</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-[18px]">
              <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Main Goal</label>
              <select className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" name="trackingGoal" value={form.trackingGoal} onChange={handleChange}>
                <option value="fitness">Fitness</option>
                <option value="wellness">Wellness</option>
                <option value="recovery">Recovery</option>
                <option value="clinical-awareness">Clinical Awareness</option>
              </select>
            </div>

            <div className="mb-[18px]">
              <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Experience Level</label>
              <select className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" name="experienceLevel" value={form.experienceLevel} onChange={handleChange}>
                <option value="beginner">Beginner</option>
                <option value="regular">Regular</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="mb-[18px]">
              <label className="mb-2 block text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Preferred Tracking Mode</label>
              <select className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 font-[var(--font-mono)] text-[0.9rem] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]" name="preferredTrackingMode" value={form.preferredTrackingMode} onChange={handleChange}>
                <option value="phone_only">Phone only</option>
                <option value="future_band">Future wearable</option>
                <option value="both">Both paths</option>
              </select>
            </div>

            <div className="onboarding-option-list">
              <div className={`onboarding-option ${form.preferredTrackingMode === 'phone_only' ? 'active' : ''}`}>
                <strong>Phone only</strong>
                <span>Free sensors, activity-first, more careful vital confidence.</span>
              </div>
              <div className={`onboarding-option ${form.preferredTrackingMode === 'future_band' ? 'active' : ''}`}>
                <strong>Future wearable</strong>
                <span>Prepare the app around your future companion band roadmap.</span>
              </div>
              <div className={`onboarding-option ${form.preferredTrackingMode === 'both' ? 'active' : ''}`}>
                <strong>Both</strong>
                <span>Keep today&apos;s phone flow and tomorrow&apos;s wearable path aligned.</span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Finish setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
