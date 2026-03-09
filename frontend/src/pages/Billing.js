import React, { useEffect, useState } from 'react';
import { getBillingCurrent, getBillingPlans, subscribePlan } from '../utils/api';
import toast from 'react-hot-toast';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const Billing = () => {
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [plansRes, currentRes] = await Promise.all([getBillingPlans(), getBillingCurrent()]);
      setPlans(plansRes.data.plans || []);
      setCurrent(currentRes.data);
      setBillingCycle(currentRes.data.subscription?.billingCycle || 'monthly');
    } catch {
      toast.error('Failed to load billing details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubscribe = async (planId) => {
    setUpgrading(true);
    try {
      const { data } = await subscribePlan({ planId, billingCycle });
      toast.success(data.message || 'Plan updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update plan');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading billing...</div>;
  }

  const activePlan = current?.subscription?.plan || 'starter';
  const usage = current?.usage?.readings;

  return (
    <div>
      <div className="page-header">
        <h1>Billing & Plans</h1>
        <p>Manage subscription, usage limits, and upgrade path.</p>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Current Plan</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', textTransform: 'capitalize' }}>{activePlan}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Status: {current?.subscription?.status || 'active'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Usage This Month</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
                {usage?.used ?? 0}{usage?.limit === null ? ' / Unlimited' : ` / ${usage?.limit || 0}`}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Remaining: {usage?.remaining === null ? 'Unlimited' : usage?.remaining}
              </div>
            </div>
          </div>

          {usage?.limit !== null && (
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${usage?.percent || 0}%`, height: '100%', background: 'linear-gradient(90deg, #e63946, #4ecdc4)' }} />
              </div>
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{usage?.percent || 0}% of monthly limit used</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <button type="button" className={`btn btn-sm ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto' }} onClick={() => setBillingCycle('monthly')}>Monthly</button>
          <button type="button" className={`btn btn-sm ${billingCycle === 'annual' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto' }} onClick={() => setBillingCycle('annual')}>Annual</button>
        </div>

        <div className="landing-pricing-grid" style={{ marginTop: 0 }}>
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.yearlyPrice : plan.monthlyPrice;
            const isActive = activePlan === plan.id;
            return (
              <article key={plan.id} className={`landing-pricing-card ${isActive ? 'featured' : ''}`}>
                <h3>{plan.label}</h3>
                <p>
                  {plan.limits.readingsPerMonth === null
                    ? 'Unlimited readings and premium tooling.'
                    : `${plan.limits.readingsPerMonth} readings/month with guided monitoring.`}
                </p>
                <h4>
                  {formatINR(price)}
                  <span>/mo</span>
                </h4>
                <ul>
                  <li>{plan.limits.readingsPerMonth === null ? 'Unlimited readings' : `${plan.limits.readingsPerMonth} readings/month`}</li>
                  <li>{plan.limits.teamMembers === null ? 'Unlimited users' : `${plan.limits.teamMembers} team member${plan.limits.teamMembers > 1 ? 's' : ''}`}</li>
                  <li>{plan.limits.aiInsightsEnabled ? 'AI insights enabled' : 'Basic insights only'}</li>
                </ul>
                <button
                  type="button"
                  className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'} landing-btn`}
                  disabled={isActive || upgrading}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isActive ? 'Current Plan' : `Switch to ${plan.label}`}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Billing;
