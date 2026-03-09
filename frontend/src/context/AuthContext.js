import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rand = (min, max) => Math.random() * (max - min) + min;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const trackerRef = useRef({
    mode: 'balanced',
    heartRate: 118,
    systolic: 122,
    diastolic: 80,
    spo2: 97,
    temperature: 36.7,
    cadence: 156,
    hydration: 78,
    sleep: 84,
    sleepHours: 7.2,
    stress: 34,
  });

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await API.get('/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  useEffect(() => {
    if (!user || !token) return undefined;

    const modeTemplates = {
      balanced: { hr: [108, 132], cadence: [148, 168], pace: [5.5, 6.6], steps: [130, 230] },
      push: { hr: [136, 166], cadence: [170, 188], pace: [4.3, 5.4], steps: [220, 320] },
      recovery: { hr: [92, 118], cadence: [136, 154], pace: [6.7, 7.8], steps: [80, 160] },
    };

    const postAutoReading = async () => {
      const now = new Date();
      const hour = now.getHours();
      const dayMode = hour < 8 || hour > 22 ? 'recovery' : hour > 17 ? 'push' : 'balanced';
      const mode = Math.random() > 0.82 ? 'push' : dayMode;
      const profile = modeTemplates[mode];
      const current = trackerRef.current;

      const heartRate = clamp(Math.round(current.heartRate + rand(-4, 4) + (rand(profile.hr[0], profile.hr[1]) - current.heartRate) * 0.2), 88, 176);
      const systolic = clamp(Math.round(current.systolic + rand(-3, 3) + (heartRate - 118) * 0.08), 104, 154);
      const diastolic = clamp(Math.round(current.diastolic + rand(-2, 2) + (heartRate - 118) * 0.04), 66, 100);
      const spo2 = clamp(Math.round(current.spo2 + rand(-1.1, 1.1)), 92, 100);
      const temperature = Number(clamp(current.temperature + rand(-0.12, 0.14), 36.0, 38.3).toFixed(1));
      const cadence = clamp(Math.round(current.cadence + rand(-5, 5) + (rand(profile.cadence[0], profile.cadence[1]) - current.cadence) * 0.3), 128, 192);
      const hydration = clamp(Math.round(current.hydration - (Math.random() > 0.66 ? 1 : 0) + (Math.random() > 0.92 ? 2 : 0)), 38, 100);
      const sleep = clamp(Math.round(current.sleep + rand(-1.4, 0.5)), 55, 97);
      const sleepHours = Number(clamp(current.sleepHours + rand(-0.18, 0.16), 4.3, 9.1).toFixed(1));
      const stressBias = mode === 'push' ? 10 : mode === 'balanced' ? 2 : -7;
      const stress = clamp(Math.round(current.stress + rand(-6, 5) + stressBias), 12, 92);

      trackerRef.current = {
        mode,
        heartRate,
        systolic,
        diastolic,
        spo2,
        temperature,
        cadence,
        hydration,
        sleep,
        sleepHours,
        stress,
      };

      const payload = {
        heartRate: { value: heartRate },
        bloodPressure: { systolic, diastolic },
        spo2: { value: spo2 },
        temperature: { value: temperature },
        steps: { value: Math.round(rand(profile.steps[0], profile.steps[1])) },
        calories: { value: Math.round(rand(14, 42)) },
        distance: { value: Number(rand(0.12, 0.48).toFixed(2)) },
        cadence: { value: cadence },
        activeMinutes: { value: Math.random() > 0.38 ? 1 : 0 },
        hydration: { value: hydration },
        sleepScore: { value: sleep },
        sleepHours: { value: sleepHours },
        stressLevel: { value: stress },
        workoutMode: mode,
        notes: `Auto tracker sync · ${mode}`,
      };

      try {
        await API.post('/health/reading', payload);
      } catch (err) {
        if (err?.response?.status !== 402) {
          // Keep silent for transient network issues; stream retries automatically.
          console.debug('Auto tracker sync skipped', err?.message || err);
        }
      }
    };

    const startup = setTimeout(postAutoReading, 1800);
    const interval = setInterval(postAutoReading, 12000);
    return () => {
      clearTimeout(startup);
      clearInterval(interval);
    };
  }, [user, token]);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email: email.trim(), password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const payload = {
      name: formData.name?.trim(),
      email: formData.email?.trim(),
      password: formData.password,
      ...(formData.age !== '' ? { age: Number(formData.age) } : {}),
      ...(formData.gender ? { gender: formData.gender } : {}),
      ...(formData.weight !== '' ? { weight: Number(formData.weight) } : {}),
      ...(formData.height !== '' ? { height: Number(formData.height) } : {}),
    };

    const { data } = await API.post('/auth/register', payload);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const payload = {
      ...profileData,
      organization: {
        name: profileData.organizationName || '',
        role: profileData.organizationRole || '',
      },
    };
    const { data } = await API.put('/auth/profile', payload);
    setUser(data.user);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
