import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import Billing from './pages/Billing';
import Insights from './pages/Insights';
import WearableSetup from './pages/WearableSetup';
import Layout from './components/Layout';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-screen">
      <div className="pulse-loader">
        <div className="heart-icon">♥</div>
        <p>Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                color: '#e0e0e0',
                border: '1px solid #e63946',
                borderRadius: '12px',
                fontFamily: "'JetBrains Mono', monospace",
              },
              success: { iconTheme: { primary: '#2ecc71', secondary: '#fff' } },
              error: { iconTheme: { primary: '#e63946', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route
              path="/dashboard"
              element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>}
            />
            <Route path="/log" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/history"
              element={<PrivateRoute><Layout><History /></Layout></PrivateRoute>}
            />
            <Route
              path="/reports"
              element={<PrivateRoute><Layout><Reports /></Layout></PrivateRoute>}
            />
            <Route
              path="/alerts"
              element={<PrivateRoute><Layout><Alerts /></Layout></PrivateRoute>}
            />
            <Route
              path="/profile"
              element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>}
            />
            <Route
              path="/billing"
              element={<PrivateRoute><Layout><Billing /></Layout></PrivateRoute>}
            />
            <Route
              path="/insights"
              element={<PrivateRoute><Layout><Insights /></Layout></PrivateRoute>}
            />
            <Route
              path="/wearable"
              element={<PrivateRoute><Layout><WearableSetup /></Layout></PrivateRoute>}
            />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
