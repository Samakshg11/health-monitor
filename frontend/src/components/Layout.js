import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getAlerts } from '../utils/api';

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
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/log', icon: '➕', label: 'Log Reading' },
    { to: '/history', icon: '📋', label: 'History' },
    { to: '/reports', icon: '📈', label: 'Reports' },
    { to: '/billing', icon: '💳', label: 'Billing' },
    { to: '/alerts', icon: '🔔', label: 'Alerts', badge: unreadCount },
    { to: '/profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">♥</div>
          <span>VitalWatch</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
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
                <div className="sidebar-user-email">{user.email}</div>
              </div>
            </div>
          )}
          <button className="nav-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
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
