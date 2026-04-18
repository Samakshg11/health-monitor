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
import Verification from './pages/Verification';
import Onboarding from './pages/Onboarding';
import LogReading from './pages/LogReading';
import Layout from './components/Layout';
import './App.css';

const PrivateRoute = ({ children, allowIncomplete = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse text-5xl text-[var(--accent-red)]">♥</div>
        <p>Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!allowIncomplete && user?.onboarding?.completed !== true) {
    return <Navigate to="/welcome" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return children;
  return <Navigate to={user?.onboarding?.completed === true ? '/dashboard' : '/welcome'} replace />;
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
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route
              path="/welcome"
              element={<PrivateRoute allowIncomplete><Onboarding /></PrivateRoute>}
            />
            <Route
              path="/dashboard"
              element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>}
            />
            <Route
              path="/log"
              element={<PrivateRoute><Layout><LogReading /></Layout></PrivateRoute>}
            />
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
            <Route
              path="/verification"
              element={<PrivateRoute><Layout><Verification /></Layout></PrivateRoute>}
            />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
