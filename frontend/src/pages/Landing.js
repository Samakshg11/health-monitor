import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const capabilities = [
  {
    icon: '📊',
    title: 'Executive Dashboards',
    desc: 'Operational and patient-level views with clean trend analysis for fast decision support.',
  },
  {
    icon: '🔔',
    title: 'Escalation Alerts',
    desc: 'Threshold-based monitoring with severity scoring to reduce missed high-risk events.',
  },
  {
    icon: '🧾',
    title: 'Structured Logs',
    desc: 'Consistent data capture across vitals, notes, and timestamps for clinical reliability.',
  },
  {
    icon: '🔐',
    title: 'Secure Access',
    desc: 'Role-aware authentication flows and protected APIs for compliance-ready foundations.',
  },
  {
    icon: '📈',
    title: 'Outcome Reporting',
    desc: 'Weekly and monthly summaries that surface direction-of-change, not just raw values.',
  },
  {
    icon: '⚙️',
    title: 'Fast Integration',
    desc: 'API-first architecture that can plug into portals, telehealth flows, and internal tools.',
  },
];

const faqs = [
  {
    q: 'Is VitalWatch suitable for clinics and individual users?',
    a: 'Yes. The platform works for personal tracking and can scale for care teams through shared, structured monitoring workflows.',
  },
  {
    q: 'How quickly can we start using the platform?',
    a: 'Teams can onboard in minutes. Core setup includes account creation, baseline profile configuration, and live logging.',
  },
  {
    q: 'Does it support proactive risk detection?',
    a: 'Yes. VitalWatch combines threshold checks with trend awareness to help identify deterioration before it becomes critical.',
  },
  {
    q: 'Can we customize alert thresholds later?',
    a: 'Absolutely. Thresholds and alert sensitivity can be tuned as patient history and risk tolerance evolve.',
  },
];

const testimonials = [
  {
    quote:
      'We reduced delayed follow-ups by 34% in the first month. The alert stream made triage decisions significantly faster.',
    name: 'Dr. Maya Shah',
    role: 'Care Operations Lead',
    org: 'Nexa Family Clinic',
  },
  {
    quote:
      'The workflow is simple enough for daily use and structured enough for audits. It feels production-ready.',
    name: 'Aman Verma',
    role: 'Health Program Manager',
    org: 'PulseBridge Care',
  },
  {
    quote:
      'Our team now sees trend deterioration early, not after escalation. That changed patient handling quality.',
    name: 'Olivia Carter',
    role: 'Director of Remote Care',
    org: 'Northline Health Group',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    monthly: 29,
    annual: 24,
    description: 'For individuals and small wellness programs.',
    features: ['Up to 100 active profiles', 'Real-time alerts', 'Weekly reports'],
    cta: 'Start Starter',
  },
  {
    name: 'Growth',
    monthly: 99,
    annual: 84,
    description: 'For scaling clinics and remote patient teams.',
    features: ['Up to 1,000 active profiles', 'Priority alert routing', 'Advanced analytics'],
    cta: 'Choose Growth',
    featured: true,
  },
  {
    name: 'Enterprise',
    monthly: 249,
    annual: 219,
    description: 'For multi-site operations with strict governance.',
    features: ['Unlimited profiles', 'Custom integrations', 'Dedicated support'],
    cta: 'Talk to Sales',
  },
];

const getRiskBand = (age, sys, hr) => {
  let score = 0;
  if (age >= 60) score += 2;
  else if (age >= 45) score += 1;

  if (sys >= 150) score += 3;
  else if (sys >= 130) score += 2;
  else if (sys >= 120) score += 1;

  if (hr >= 110 || hr <= 45) score += 3;
  else if (hr >= 95 || hr <= 55) score += 2;
  else if (hr >= 85) score += 1;

  if (score >= 6) return { level: 'High', note: 'Immediate clinical review is recommended.' };
  if (score >= 3) return { level: 'Moderate', note: 'Monitor closely and reassess trend within 24h.' };
  return { level: 'Low', note: 'Vitals currently appear stable with routine monitoring.' };
};

const Landing = () => {
  const [openFaq, setOpenFaq] = useState(0);
  const [snapshot, setSnapshot] = useState({ age: 36, systolic: 124, heartRate: 74 });
  const [billing, setBilling] = useState('monthly');
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', organization: '', teamSize: '' });
  const [roiInput, setRoiInput] = useState({ profiles: 220, events: 18, savingsPerEvent: 180 });
  const counterRefs = useRef([]);
  counterRefs.current = [];

  const risk = useMemo(
    () => getRiskBand(Number(snapshot.age), Number(snapshot.systolic), Number(snapshot.heartRate)),
    [snapshot]
  );

  const roiOutput = useMemo(() => {
    const monthlyPrevented = Math.round((roiInput.profiles * roiInput.events) / 100);
    const monthlySavings = monthlyPrevented * roiInput.savingsPerEvent;
    return {
      monthlyPrevented,
      monthlySavings,
      annualSavings: monthlySavings * 12,
    };
  }, [roiInput]);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = max > 0 ? (window.scrollY / max) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, nextProgress)));
      setShowTop(window.scrollY > 500);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      gsap.from('.landing-topbar', { y: -40, opacity: 0, duration: 0.7, ease: 'power2.out' });
      gsap.from('.landing-hero > *', {
        y: 22,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        delay: 0.15,
        ease: 'power2.out',
      });

      gsap.from('.macbook-shell', {
        y: 28,
        scale: 0.95,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.landing-device-showcase',
          start: 'top 82%',
        },
      });

      gsap.to('.macbook-screen-glare', {
        xPercent: 80,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.macbook-chart-bars span', {
        scaleY: () => 0.5 + Math.random() * 0.75,
        duration: 0.7,
        stagger: 0.08,
        repeat: -1,
        yoyo: true,
        transformOrigin: 'bottom center',
        ease: 'sine.inOut',
      });

      gsap.utils.toArray('.landing-section').forEach((section) => {
        gsap.from(section, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
          },
        });
      });

      gsap.to('.auth-bg-circle:nth-child(1)', {
        x: 40,
        y: 50,
        ease: 'none',
        scrollTrigger: {
          trigger: '.landing-page',
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });
      gsap.to('.auth-bg-circle:nth-child(2)', {
        x: -35,
        y: -45,
        ease: 'none',
        scrollTrigger: {
          trigger: '.landing-page',
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      counterRefs.current.forEach((counter) => {
        const end = Number(counter.dataset.target || 0);
        const decimals = Number(counter.dataset.decimals || 0);
        const prefix = counter.dataset.prefix || '';
        const suffix = counter.dataset.suffix || '';
        const obj = { value: 0 };

        gsap.to(obj, {
          value: end,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: counter,
            start: 'top 88%',
            once: true,
          },
          onUpdate: () => {
            counter.textContent = `${prefix}${obj.value.toFixed(decimals)}${suffix}`;
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  const registerCounter = (node) => {
    if (node && !counterRefs.current.includes(node)) {
      counterRefs.current.push(node);
    }
  };

  const submitDemoRequest = (e) => {
    e.preventDefault();
    if (!demoForm.name || !demoForm.email) {
      toast.error('Please enter name and email.');
      return;
    }
    toast.success('Demo request submitted. Team will contact you shortly.');
    setDemoOpen(false);
    setDemoForm({ name: '', email: '', organization: '', teamSize: '' });
  };

  return (
    <div className="landing-page">
      <div className="landing-progress">
        <span style={{ width: `${scrollProgress}%` }} />
      </div>
      <div className="auth-bg">
        <div className="auth-bg-circle" />
        <div className="auth-bg-circle" />
      </div>

      <header className="landing-topbar">
        <Link to="/" className="landing-brand">
          <span className="landing-brand-icon">♥</span>
          <span>VitalWatch</span>
        </Link>
        <nav className="landing-topbar-links">
          <a href="#preview">Preview</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#workflow">Workflow</a>
          <a href="#risk-snapshot">Risk Snapshot</a>
          <a href="#faq">FAQ</a>
        </nav>
        <nav className="landing-topbar-actions">
          <button type="button" className="landing-nav-link" onClick={() => setDemoOpen(true)}>
            Book Demo
          </button>
          <Link to="/login" className="landing-nav-link">
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary landing-nav-btn">
            Get Started
          </Link>
        </nav>
      </header>

      <section className="landing-hero landing-reveal">
        <div className="landing-chip">Industry-grade Remote Health Monitoring</div>
        <h1>
          Proactive care operations
          <br />
          for modern health teams.
        </h1>
        <p>
          VitalWatch combines live data capture, trend intelligence, and automated alerting so
          teams can move from reactive follow-ups to continuous, high-confidence patient monitoring.
        </p>

        <div className="landing-cta">
          <Link to="/register" className="btn btn-primary landing-btn">
            Start Free Workspace
          </Link>
          <Link to="/login" className="btn btn-secondary landing-btn">
            Open Existing Account
          </Link>
        </div>

        <div className="landing-kpis">
          <div>
            <h3 ref={registerCounter} data-target="99.9" data-decimals="1" data-suffix="%">
              0%
            </h3>
            <p>API availability target</p>
          </div>
          <div>
            <h3 ref={registerCounter} data-target="3" data-prefix="< " data-suffix=" min">
              &lt; 0 min
            </h3>
            <p>Average onboarding time</p>
          </div>
          <div>
            <h3 ref={registerCounter} data-target="24" data-suffix="/7">
              0/7
            </h3>
            <p>Continuous event tracking</p>
          </div>
        </div>
      </section>

      <section className="landing-device-showcase landing-section" id="preview">
        <div className="landing-section-head">
          <span>Product Preview</span>
          <h2>MacBook-style live dashboard view</h2>
        </div>
        <div className="macbook-shell">
          <div className="macbook-lid">
            <div className="macbook-notch" />
            <div className="macbook-screen">
              <div className="macbook-screen-glare" />
              <div className="macbook-ui-top">
                <span />
                <span />
                <span />
                <p>VitalWatch Dashboard • Live</p>
              </div>
              <div className="macbook-ui-grid">
                <article>
                  <h4>Heart Rate</h4>
                  <strong>74 bpm</strong>
                  <small>Stable • Last 5 min</small>
                </article>
                <article>
                  <h4>Systolic BP</h4>
                  <strong>124 mmHg</strong>
                  <small>Within safe range</small>
                </article>
                <article>
                  <h4>Alerts</h4>
                  <strong>2 pending</strong>
                  <small>1 moderate • 1 low</small>
                </article>
              </div>
              <div className="macbook-ui-chart">
                <div className="macbook-chart-bars">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
          <div className="macbook-base">
            <div className="macbook-trackpad" />
          </div>
        </div>
      </section>

      <section className="landing-capabilities landing-section" id="capabilities">
        <div className="landing-section-head">
          <span>Platform Capabilities</span>
          <h2>Built for reliability, visibility, and rapid intervention</h2>
        </div>
        <div className="landing-capability-grid">
          {capabilities.map((item, idx) => (
            <article
              key={item.title}
              className="landing-feature-card landing-reveal"
              style={{ animationDelay: `${0.12 + idx * 0.06}s, ${0.9 + idx * 0.08}s` }}
            >
              <span className="landing-feature-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-workflow landing-section" id="workflow">
        <div className="landing-section-head">
          <span>Operational Flow</span>
          <h2>From intake to escalation in three clear steps</h2>
        </div>
        <div className="landing-workflow-grid">
          <article>
            <span>01</span>
            <h3>Capture Baseline</h3>
            <p>Record profile and initial vitals to establish a reliable trend starting point.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Monitor Continuously</h3>
            <p>Track heart rate, blood pressure, oxygen, and temperature over time with timestamps.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Act on Signals</h3>
            <p>Surface risk and route alerts to the right person before the condition worsens.</p>
          </article>
        </div>
      </section>

      <section className="landing-snapshot landing-section" id="risk-snapshot">
        <div className="landing-section-head">
          <span>Interactive Tool</span>
          <h2>Risk snapshot estimator</h2>
        </div>
        <div className="landing-snapshot-card">
          <div className="landing-snapshot-inputs">
            <label>
              Age
              <input
                type="number"
                min="1"
                max="120"
                value={snapshot.age}
                onChange={(e) => setSnapshot((prev) => ({ ...prev, age: e.target.value }))}
              />
            </label>
            <label>
              Systolic BP (mmHg)
              <input
                type="number"
                min="70"
                max="240"
                value={snapshot.systolic}
                onChange={(e) => setSnapshot((prev) => ({ ...prev, systolic: e.target.value }))}
              />
            </label>
            <label>
              Resting Heart Rate (bpm)
              <input
                type="number"
                min="30"
                max="220"
                value={snapshot.heartRate}
                onChange={(e) => setSnapshot((prev) => ({ ...prev, heartRate: e.target.value }))}
              />
            </label>
          </div>
          <div className={`landing-risk-panel risk-${risk.level.toLowerCase()}`}>
            <p>Estimated Risk Level</p>
            <h3>{risk.level}</h3>
            <span>{risk.note}</span>
            <small>
              Snapshot is indicative only and should complement professional clinical judgment.
            </small>
          </div>
        </div>
      </section>

      <section className="landing-impact landing-section" id="impact">
        <div className="landing-section-head">
          <span>Impact Calculator</span>
          <h2>Estimate operational value before rollout</h2>
        </div>
        <div className="landing-impact-card">
          <div className="landing-impact-inputs">
            <label>
              Active profiles: <strong>{roiInput.profiles}</strong>
              <input
                type="range"
                min="50"
                max="2000"
                step="10"
                value={roiInput.profiles}
                onChange={(e) => setRoiInput((prev) => ({ ...prev, profiles: Number(e.target.value) }))}
              />
            </label>
            <label>
              Critical events/month (%): <strong>{roiInput.events}%</strong>
              <input
                type="range"
                min="5"
                max="40"
                value={roiInput.events}
                onChange={(e) => setRoiInput((prev) => ({ ...prev, events: Number(e.target.value) }))}
              />
            </label>
            <label>
              Avg savings/event ($): <strong>${roiInput.savingsPerEvent}</strong>
              <input
                type="range"
                min="100"
                max="600"
                step="10"
                value={roiInput.savingsPerEvent}
                onChange={(e) =>
                  setRoiInput((prev) => ({ ...prev, savingsPerEvent: Number(e.target.value) }))
                }
              />
            </label>
          </div>
          <div className="landing-impact-output">
            <div>
              <p>Potential events proactively handled/month</p>
              <h3>{roiOutput.monthlyPrevented}</h3>
            </div>
            <div>
              <p>Estimated monthly savings</p>
              <h3>${roiOutput.monthlySavings.toLocaleString()}</h3>
            </div>
            <div>
              <p>Estimated annual savings</p>
              <h3>${roiOutput.annualSavings.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-testimonials landing-section" id="testimonials">
        <div className="landing-section-head">
          <span>Customer Stories</span>
          <h2>Used by teams focused on reliable outcomes</h2>
        </div>
        <div className="landing-testimonial-slider">
          {testimonials.map((item, idx) => (
            <article
              key={item.name}
              className={`landing-testimonial-card ${activeTestimonial === idx ? 'active' : ''}`}
            >
              <p>"{item.quote}"</p>
              <div>
                <h4>{item.name}</h4>
                <span>
                  {item.role} · {item.org}
                </span>
              </div>
            </article>
          ))}
          <div className="landing-slider-controls">
            <button
              type="button"
              onClick={() =>
                setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)
              }
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setActiveTestimonial((prev) => (prev + 1) % testimonials.length)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="landing-pricing landing-section" id="pricing">
        <div className="landing-section-head">
          <span>Pricing</span>
          <h2>Transparent plans for every growth stage</h2>
        </div>
        <div className="landing-billing-toggle">
          <button
            type="button"
            className={billing === 'monthly' ? 'active' : ''}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billing === 'annual' ? 'active' : ''}
            onClick={() => setBilling('annual')}
          >
            Annual
          </button>
        </div>
        <div className="landing-pricing-grid">
          {pricingPlans.map((plan) => (
            <article key={plan.name} className={`landing-pricing-card ${plan.featured ? 'featured' : ''}`}>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
              <h4>
                ${billing === 'monthly' ? plan.monthly : plan.annual}
                <span>/mo</span>
              </h4>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.name === 'Enterprise' ? (
                <button type="button" className="btn btn-secondary landing-btn" onClick={() => setDemoOpen(true)}>
                  {plan.cta}
                </button>
              ) : (
                <Link to="/register" className="btn btn-primary landing-btn">
                  {plan.cta}
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-faq landing-section" id="faq">
        <div className="landing-section-head">
          <span>Frequently Asked Questions</span>
          <h2>Answers for implementation and operations teams</h2>
        </div>
        <div className="landing-faq-list">
          {faqs.map((item, idx) => (
            <button
              type="button"
              key={item.q}
              className={`landing-faq-item ${openFaq === idx ? 'open' : ''}`}
              onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
            >
              <div className="landing-faq-question">
                <h3>{item.q}</h3>
                <span>{openFaq === idx ? '−' : '+'}</span>
              </div>
              {openFaq === idx && <p>{item.a}</p>}
            </button>
          ))}
        </div>
      </section>

      <section className="landing-final-cta landing-section">
        <h2>Launch reliable remote monitoring in your workflow today.</h2>
        <p>Move faster with structured data, alert automation, and clear patient-level visibility.</p>
        <div className="landing-cta">
          <button type="button" className="btn btn-secondary landing-btn" onClick={() => setDemoOpen(true)}>
            Book Live Demo
          </button>
          <Link to="/register" className="btn btn-primary landing-btn">
            Create Your Workspace
          </Link>
          <Link to="/login" className="btn btn-secondary landing-btn">
            Sign In
          </Link>
        </div>
      </section>

      {showTop && (
        <button type="button" className="landing-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          ↑
        </button>
      )}

      {demoOpen && (
        <div className="landing-modal-overlay" onClick={() => setDemoOpen(false)}>
          <div className="landing-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Book a Product Demo</h3>
            <p>Share your details and our team will schedule a tailored walkthrough.</p>
            <form onSubmit={submitDemoRequest} className="landing-modal-form">
              <input
                placeholder="Full name"
                value={demoForm.name}
                onChange={(e) => setDemoForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="email"
                placeholder="Work email"
                value={demoForm.email}
                onChange={(e) => setDemoForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <input
                placeholder="Organization"
                value={demoForm.organization}
                onChange={(e) => setDemoForm((prev) => ({ ...prev, organization: e.target.value }))}
              />
              <input
                placeholder="Team size"
                value={demoForm.teamSize}
                onChange={(e) => setDemoForm((prev) => ({ ...prev, teamSize: e.target.value }))}
              />
              <div className="landing-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setDemoOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
