import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

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

// Alerts
export const getAlerts = (params) => API.get('/alerts', { params });
export const markAlertRead = (id) => API.put(`/alerts/${id}/read`);
export const markAllAlertsRead = () => API.put('/alerts/read-all');
export const deleteAlert = (id) => API.delete(`/alerts/${id}`);

export default API;
