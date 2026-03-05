import axios from 'axios';

const normalizeApiOrigin = (value) => {
  const trimmed = (value || '').trim().replace(/\/+$/, '');
  return trimmed.replace(/\/api$/, '');
};

const fallbackOrigin =
  process.env.NODE_ENV === 'production'
    ? window.location.origin
    : 'http://localhost:5001';

if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_API_BASE_URL) {
  console.warn(
    'REACT_APP_API_BASE_URL is not set. API calls are using the frontend origin, which may cause 404 if backend is a separate service.'
  );
}

export const API_BASE_URL = normalizeApiOrigin(
  process.env.REACT_APP_API_BASE_URL || fallbackOrigin
);

const API = axios.create({ baseURL: `${API_BASE_URL}/api` });
// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Health Readings
export const submitReading = (data) => API.post('/health/reading', data);
export const getReadings = (params) => API.get('/health/readings', { params });
export const getLatestReading = () => API.get('/health/latest');
export const getStats = (days) => API.get('/health/stats', { params: { days } });
export const deleteReading = (id) => API.delete(`/health/reading/${id}`);
export const getFitnessToday = () => API.get('/health/fitness/today');
export const getGoals = () => API.get('/health/goals');
export const updateGoals = (payload) => API.put('/health/goals', payload);
export const getBillingPlans = () => API.get('/billing/plans');
export const getBillingCurrent = () => API.get('/billing/current');
export const subscribePlan = (payload) => API.post('/billing/subscribe', payload);

// Alerts
export const getAlerts = (params) => API.get('/alerts', { params });
export const markAlertRead = (id) => API.put(`/alerts/${id}/read`);
export const markAllAlertsRead = () => API.put('/alerts/read-all');
export const deleteAlert = (id) => API.delete(`/alerts/${id}`);

export default API;
