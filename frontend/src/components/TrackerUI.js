import React from 'react';

const iconMap = {
  today: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="4" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  activity: (
    <>
      <path d="M4 13h3l2.5-5 4 9 2.2-4H20" />
    </>
  ),
  trends: (
    <>
      <path d="M5 17l4-5 3 2 5-7 2 2" />
      <path d="M15 7h4v4" />
    </>
  ),
  recovery: (
    <>
      <path d="M12 20s-6-3.7-6-9a3.7 3.7 0 0 1 6-2.7A3.7 3.7 0 0 1 18 11c0 5.3-6 9-6 9Z" />
    </>
  ),
  device: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <circle cx="12" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9 15h6" />
    </>
  ),
  alerts: (
    <>
      <path d="M12 4a4 4 0 0 0-4 4v2.2c0 .6-.2 1.2-.5 1.7L6 14.5h12l-1.5-2.6c-.3-.5-.5-1.1-.5-1.7V8a4 4 0 0 0-4-4Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  billing: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="3" />
      <path d="M3.5 10h17M7 14h3" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
      <path d="M13 8l4 4-4 4M9 12h8" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z" />
    </>
  ),
  steps: (
    <>
      <path d="M9.4 6.5A2.6 2.6 0 1 1 14 4.8c1.7 1 2.8 2.8 2.8 5 0 2.7-2 4.8-4.5 4.8S7.7 12.5 7.7 9.8c0-1.4.6-2.6 1.7-3.3Z" />
      <path d="M6.3 14.4c1-.8 2.3-1.3 3.7-1.3 2.6 0 4.8 1.9 4.8 4.3 0 1.4-.8 2.7-2 3.5" />
    </>
  ),
  sleep: (
    <>
      <path d="M15.5 5.8A6.5 6.5 0 1 0 18 18a6 6 0 0 1-2.5-12.2Z" />
    </>
  ),
  calories: (
    <>
      <path d="M12.2 3.8c2.5 2.2 4.8 5 4.8 8.2a5 5 0 0 1-10 0c0-2.6 1.6-5.1 5.2-8.2Z" />
    </>
  ),
  distance: (
    <>
      <path d="M12 20s5.5-5.6 5.5-10A5.5 5.5 0 1 0 6.5 10c0 4.4 5.5 10 5.5 10Z" />
      <circle cx="12" cy="10" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  battery: (
    <>
      <rect x="4" y="7" width="15" height="10" rx="2" />
      <path d="M19 10h1.5v4H19" />
      <path d="M7 10h6" />
    </>
  ),
  signal: (
    <>
      <path d="M5 16h2v2H5zM9 13h2v5H9zM13 10h2v8h-2zM17 7h2v11h-2z" fill="currentColor" stroke="none" />
    </>
  ),
  sync: (
    <>
      <path d="M17 8a6 6 0 0 0-9.7-1.7L5 8.5M7 16a6 6 0 0 0 9.7 1.7L19 15.5" />
      <path d="M5 5v3.5h3.5M19 19v-3.5h-3.5" />
    </>
  ),
  temperature: (
    <>
      <path d="M10 5a2 2 0 1 1 4 0v7.2a4 4 0 1 1-4 0V5Z" />
    </>
  ),
  oxygen: (
    <>
      <path d="M12 4.5c2.5 3.1 4.8 5.8 4.8 8.3a4.8 4.8 0 1 1-9.6 0c0-2.5 2.3-5.2 4.8-8.3Z" />
    </>
  ),
  stress: (
    <>
      <path d="M12 3.5 8.8 10H12l-1 10 4.2-7.2H12L12 3.5Z" />
    </>
  ),
  pressure: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 12l3-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </>
  ),
  verify: (
    <>
      <path d="M5 12.5 9 16l10-10" />
      <path d="M4 4h16v16H4z" />
    </>
  ),
};

export const TrackerIcon = ({ name, size = 18, className = '' }) => (
  <span className={`tracker-icon ${className}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconMap[name] || iconMap.today}
    </svg>
  </span>
);

export const ProgressRing = ({
  value = 0,
  size = 110,
  strokeWidth = 10,
  color = 'var(--accent-red)',
  trailColor = 'rgba(255,255,255,0.08)',
  label,
  sublabel,
  compact = false,
}) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeValue / 100);

  return (
    <div className={`progress-ring ${compact ? 'compact' : ''}`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trailColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="progress-ring-center">
        <strong>{safeValue}%</strong>
        {label && <span>{label}</span>}
        {sublabel && <small>{sublabel}</small>}
      </div>
    </div>
  );
};

export const SignalBars = ({ strength = 3 }) => {
  const safeStrength = Math.max(0, Math.min(4, Number(strength) || 0));
  return (
    <div className="signal-bars" aria-hidden="true">
      {[1, 2, 3, 4].map((bar) => (
        <span key={bar} className={bar <= safeStrength ? 'active' : ''} />
      ))}
    </div>
  );
};
