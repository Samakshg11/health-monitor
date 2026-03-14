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
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: 'today', label: 'Today', hint: 'Live overview' },
    { to: '/history', icon: 'activity', label: 'Activity', hint: 'Sessions and days' },
    { to: '/reports', icon: 'trends', label: 'Trends', hint: 'Weekly patterns' },
    { to: '/insights', icon: 'recovery', label: 'Recovery', hint: 'Coaching and insights' },
    { to: '/wearable', icon: 'device', label: 'Device', hint: 'Band and sync status' },
    { to: '/verification', icon: 'verify', label: 'Verify', hint: 'Audit the pipeline' },
    { to: '/alerts', icon: 'alerts', label: 'Alerts', hint: 'Important changes', badge: unreadCount },
    { to: '/profile', icon: 'profile', label: 'You', hint: 'Goals and profile' },
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
          <div className="sidebar-panel-label">Today</div>
          <div className="sidebar-panel-value">{liveAlerts.length > 0 ? 'Attention needed' : 'In rhythm'}</div>
          <div className="sidebar-panel-meta">{liveAlerts.length > 0 ? `${liveAlerts.length} live alert${liveAlerts.length > 1 ? 's' : ''}` : 'Syncing your latest movement and vitals'}</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
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
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/billing" className={({ isActive }) => `nav-item nav-item-secondary ${isActive ? 'active' : ''}`}>
            <span className="nav-icon"><TrackerIcon name="billing" size={18} /></span>
            <span className="nav-copy">
              <strong>Membership</strong>
              <small>Plan and usage</small>
            </span>
          </NavLink>
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-email">{user.email}</div>
              </div>
            </div>
          )}
          <button className="nav-item" onClick={handleLogout}>
            <span className="nav-icon"><TrackerIcon name="logout" size={18} /></span>
            <span className="nav-copy">
              <strong>Logout</strong>
              <small>End current session</small>
            </span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
