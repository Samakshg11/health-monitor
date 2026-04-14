import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getAlerts } from '../utils/api';
import { TrackerIcon } from './TrackerUI';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { liveAlerts } = useSocket();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await getAlerts({ unread: true, limit: 1 });
        setUnreadCount(data.unreadCount);
      } catch {}
    };
    fetchUnread();
  }, [liveAlerts]);

  const handleLogout = () => {
    if (!window.confirm('Log out and return to the landing page?')) return;
    logout();
    navigate('/');
  };

  const mainNav = [
    { to: '/dashboard', icon: 'today', label: 'Home', hint: 'Overview' },
    { to: '/insights', icon: 'recovery', label: 'Intelligence', hint: 'AI recommendations' },
    { to: '/history', icon: 'activity', label: 'History', hint: 'Past sessions' },
    { to: '/log', icon: 'heart', label: 'Check-In', hint: 'Manual vitals' },
  ];

  const systemNav = [
    { to: '/alerts', icon: 'alerts', label: 'Alerts', hint: 'Pulse triggers', badge: unreadCount },
    { to: '/wearable', icon: 'device', label: 'Devices', hint: 'Sync status' },
    { to: '/profile', icon: 'profile', label: 'Settings', hint: 'Account & goals' },
    { to: '/billing', icon: 'billing', label: 'Pro', hint: 'Membership' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><TrackerIcon name="heart" size={18} /></div>
          <div>
            <span>VitalWatch</span>
            <small className="sidebar-logo-subtitle">Tracker companion</small>
          </div>
        </div>

        <div className="sidebar-panel">
          <div className="sidebar-panel-label">Status</div>
          <div className="sidebar-panel-value">{liveAlerts.length > 0 ? 'Action Needed' : 'In Rhythm'}</div>
          <div className="sidebar-panel-meta">
            {liveAlerts.length > 0 ? `${liveAlerts.length} alert(s) detected` : 'Systems performing nominal'}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">Daily</div>
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><TrackerIcon name={item.icon} size={18} /></span>
              <span className="nav-copy">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </NavLink>
          ))}

          <div className="nav-group-label" style={{ marginTop: 24 }}>System</div>
          {systemNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item nav-item-secondary ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><TrackerIcon name={item.icon} size={18} /></span>
              <span className="nav-copy">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="sidebar-user-name">{user.name}</div>
                <button className="logout-btn" onClick={handleLogout}>Log out</button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
