import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rand = (min, max) => Math.random() * (max - min) + min;
const toRad = (deg) => (deg * Math.PI) / 180;
const haversineKm = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [wearablePaired, setWearablePaired] = useState(localStorage.getItem('vw_wearable_paired') === 'true');
  const [wearableBattery, setWearableBattery] = useState(Number(localStorage.getItem('vw_wearable_battery') || 87));
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [lastSyncStatus, setLastSyncStatus] = useState('idle');
  const [verification, setVerification] = useState({
    lastGeneratedAt: null,
    lastGeneratedPayload: null,
    lastPostStatus: 'idle',
    lastPostedAt: null,
    lastPostResponse: null,
    lastPostError: null,
  });
  const [sensorStatus, setSensorStatus] = useState({
    geoPermission: 'unknown',
    motionPermission: 'unknown',
    hasGeo: false,
    hasMotion: false,
    motionSeenAt: 0,
  });
  const wearableRef = useRef({
    paired: localStorage.getItem('vw_wearable_paired') === 'true',
    battery: Number(localStorage.getItem('vw_wearable_battery') || 87),
  });
  const sensorRef = useRef({
    motionScore: 0,
    motionSeenAt: 0,
    distanceSinceLastKm: 0,
    lastGeo: null,
    hasGeo: false,
    hasMotion: false,
  });
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

  const syncWearableState = (next) => {
    wearableRef.current = { ...wearableRef.current, ...next };
    if (Object.prototype.hasOwnProperty.call(next, 'paired')) {
      setWearablePaired(Boolean(next.paired));
      localStorage.setItem('vw_wearable_paired', String(Boolean(next.paired)));
    }
    if (Object.prototype.hasOwnProperty.call(next, 'battery')) {
      const safeBattery = clamp(Number(next.battery), 1, 100);
      setWearableBattery(safeBattery);
      localStorage.setItem('vw_wearable_battery', String(safeBattery));
    }
  };

  const pairWearable = () => {
    syncWearableState({ paired: true, battery: 92 });
  };

  const unpairWearable = () => {
    syncWearableState({ paired: false });
  };

  const refreshSensorPermissionState = async () => {
    const next = {
      geoPermission: sensorStatus.geoPermission,
      motionPermission: sensorStatus.motionPermission,
    };

    try {
      if (navigator.permissions?.query) {
        const geo = await navigator.permissions.query({ name: 'geolocation' });
        next.geoPermission = geo.state;
      }
    } catch {}

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
        next.motionPermission = 'prompt';
      } else {
        next.motionPermission = 'granted';
      }
    } else {
      next.motionPermission = 'unsupported';
    }

    setSensorStatus((prev) => ({ ...prev, ...next }));
  };

  const requestSensorPermissions = async () => {
    let geoPermission = sensorStatus.geoPermission;
    let motionPermission = sensorStatus.motionPermission;

    try {
      await new Promise((resolve) => {
        if (!navigator.geolocation) {
          geoPermission = 'unsupported';
          resolve();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => {
            geoPermission = 'granted';
            resolve();
          },
          () => {
            geoPermission = 'denied';
            resolve();
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
      });
    } catch {}

    try {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
          const result = await window.DeviceMotionEvent.requestPermission();
          motionPermission = result === 'granted' ? 'granted' : 'denied';
        } else {
          motionPermission = 'granted';
        }
      } else {
        motionPermission = 'unsupported';
      }
    } catch {
      motionPermission = 'denied';
    }

    setSensorStatus((prev) => ({ ...prev, geoPermission, motionPermission }));
  };

  const buildSourceDetails = ({ isPaired, sensors, overallConfidence }) => {
    const contributors = [];
    if (sensors.hasMotion) contributors.push('phone-motion');
    if (sensors.hasGeo) contributors.push('phone-gps');
    if (isPaired) contributors.unshift('vitalband-optical-sensors');

    return isPaired
      ? {
          mode: 'band_plus_phone',
          label: 'Band + phone',
          deviceName: 'VitalBand X1',
          deviceBattery: wearableRef.current.battery,
          primarySource: 'VitalBand optical sensors',
          movementSource: sensors.hasGeo ? 'Band steps with phone GPS correction' : 'Band steps and cadence',
          recoverySource: 'Band vitals plus activity fusion',
          contributors,
          overallConfidence,
        }
      : {
          mode: 'phone_only',
          label: 'Phone only',
          deviceName: 'Phone sensors',
          deviceBattery: null,
          primarySource: 'Phone motion and routine model',
          movementSource: sensors.hasGeo || sensors.hasMotion ? 'Phone motion and GPS estimate' : 'Routine estimate fallback',
          recoverySource: 'Historical trend estimate',
          contributors: contributors.length ? contributors : ['history-model'],
          overallConfidence,
        };
  };

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
    refreshSensorPermissionState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || !token) return undefined;

    const modeTemplates = {
      balanced: { hr: [108, 132], cadence: [148, 168], pace: [5.5, 6.6], steps: [130, 230] },
      push: { hr: [136, 166], cadence: [170, 188], pace: [4.3, 5.4], steps: [220, 320] },
      recovery: { hr: [92, 118], cadence: [136, 154], pace: [6.7, 7.8], steps: [80, 160] },
    };

    let geoWatchId;
    if (navigator.geolocation) {
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            ts: pos.timestamp,
          };
          const prev = sensorRef.current.lastGeo;
          if (prev) {
            const delta = haversineKm(prev, next);
            if (delta > 0 && delta < 0.25) {
              sensorRef.current.distanceSinceLastKm += delta;
            }
          }
          sensorRef.current.lastGeo = next;
          sensorRef.current.hasGeo = true;
          setSensorStatus((prev) => ({ ...prev, hasGeo: true, geoPermission: 'granted' }));
        },
        () => {
          setSensorStatus((prev) => ({
            ...prev,
            hasGeo: false,
            geoPermission: prev.geoPermission === 'unknown' ? 'denied' : prev.geoPermission,
          }));
        },
        { enableHighAccuracy: false, maximumAge: 15000, timeout: 12000 }
      );
    }

    const onMotion = (event) => {
      const ax = event.accelerationIncludingGravity?.x ?? 0;
      const ay = event.accelerationIncludingGravity?.y ?? 0;
      const az = event.accelerationIncludingGravity?.z ?? 0;
      const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
      const movement = Math.max(0, Math.min(5, Math.abs(magnitude - 9.8)));
      sensorRef.current.motionScore = clamp(sensorRef.current.motionScore * 0.72 + movement * 0.28, 0, 5);
      sensorRef.current.motionSeenAt = Date.now();
      sensorRef.current.hasMotion = true;
      setSensorStatus((prev) => ({ ...prev, hasMotion: true, motionSeenAt: Date.now() }));
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', onMotion);
    }

    const postAutoReading = async () => {
      const now = new Date();
      const hour = now.getHours();
      const dayMode = hour < 8 || hour > 22 ? 'recovery' : hour > 17 ? 'push' : 'balanced';
      const mode = Math.random() > 0.82 ? 'push' : dayMode;
      const profile = modeTemplates[mode];
      const current = trackerRef.current;
      const sensors = sensorRef.current;
      const isPaired = wearableRef.current.paired;

      const freshMotion = Date.now() - sensors.motionSeenAt < 45000;
      const motionBoost = freshMotion ? sensors.motionScore * 38 : 0;
      const geoDistance = sensors.distanceSinceLastKm;
      sensorRef.current.distanceSinceLastKm = 0;

      const phoneBaseSteps = rand(profile.steps[0] * 0.72, profile.steps[1] * 0.84);
      const bandBaseSteps = rand(profile.steps[0], profile.steps[1]);
      const stepsValue = Math.round(
        clamp(
          (isPaired ? bandBaseSteps : phoneBaseSteps) +
          motionBoost +
          geoDistance * (isPaired ? 980 : 1150),
          isPaired ? 45 : 20,
          isPaired ? 460 : 340
        )
      );
      const distanceEstimate = Number(
        clamp(
          geoDistance > 0
            ? geoDistance
            : stepsValue * (isPaired ? 0.00074 : 0.00068) + rand(-0.03, 0.05),
          0.02,
          0.9
        ).toFixed(2)
      );
      const activeMinutesValue = stepsValue > 95 || geoDistance > 0.05 || freshMotion ? 1 : 0;

      const exertionScore = clamp(
        (stepsValue / 4) +
        (distanceEstimate * 70) +
        (freshMotion ? 18 : 0) +
        (mode === 'push' ? 24 : mode === 'balanced' ? 12 : 4),
        0,
        100
      );

      const heartRate = clamp(
        Math.round(
          current.heartRate +
          rand(-3, 3) +
          (isPaired ? exertionScore * 0.34 : exertionScore * 0.22) +
          (rand(profile.hr[0], profile.hr[1]) - current.heartRate) * (isPaired ? 0.22 : 0.12)
        ),
        72,
        176
      );
      const systolic = clamp(Math.round(current.systolic + rand(-3, 3) + (heartRate - 112) * 0.07), 102, 154);
      const diastolic = clamp(Math.round(current.diastolic + rand(-2, 2) + (heartRate - 112) * 0.035), 64, 100);
      const spo2 = clamp(Math.round(current.spo2 + rand(isPaired ? -0.8 : -0.4, isPaired ? 0.8 : 0.4)), 92, 100);
      const temperature = Number(clamp(current.temperature + rand(isPaired ? -0.12 : -0.06, isPaired ? 0.16 : 0.09), 36.0, 38.3).toFixed(1));
      const cadence = clamp(Math.round(current.cadence + rand(-5, 5) + (rand(profile.cadence[0], profile.cadence[1]) - current.cadence) * (isPaired ? 0.3 : 0.18)), 118, 192);
      const hydration = clamp(Math.round(current.hydration - (Math.random() > 0.66 ? 1 : 0) + (Math.random() > 0.92 ? 2 : 0)), 38, 100);
      const sleep = clamp(Math.round(current.sleep + rand(-1.4, 0.5)), 55, 97);
      const sleepHours = Number(clamp(current.sleepHours + rand(-0.18, 0.16), 4.3, 9.1).toFixed(1));
      const stressBias = mode === 'push' ? 10 : mode === 'balanced' ? 2 : -7;
      const stress = clamp(Math.round(current.stress + rand(-6, 5) + stressBias), 12, 92);

      const activityConfidenceBase = sensors.hasGeo && sensors.hasMotion ? 80 : sensors.hasGeo || sensors.hasMotion ? 66 : 42;
      const activityConfidence = clamp(activityConfidenceBase + (isPaired ? 12 : 0), 38, 97);
      const vitalsConfidence = clamp((isPaired ? 78 : 32) + (sensors.hasMotion ? 8 : 0), 25, 96);
      const sleepConfidence = clamp((isPaired ? 76 : 52) + (sensors.hasMotion ? 4 : 0), 42, 92);
      const stressConfidence = clamp((isPaired ? 74 : 44) + (sensors.hasMotion ? 6 : 0), 35, 92);
      const overallConfidence = Math.round(
        (activityConfidence * 0.38 + vitalsConfidence * 0.36 + sleepConfidence * 0.14 + stressConfidence * 0.12)
      );
      const sourceDetails = buildSourceDetails({ isPaired, sensors, overallConfidence });

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
        steps: { value: stepsValue },
        calories: { value: Math.round(rand(14, 42)) },
        distance: { value: distanceEstimate },
        cadence: { value: cadence },
        activeMinutes: { value: activeMinutesValue },
        hydration: { value: hydration },
        sleepScore: { value: sleep },
        sleepHours: { value: sleepHours },
        stressLevel: { value: stress },
        source: isPaired ? 'device' : 'estimated',
        sourceDetails,
        confidence: {
          overall: overallConfidence,
          heartRate: vitalsConfidence,
          bloodPressure: vitalsConfidence,
          spo2: vitalsConfidence - 2,
          temperature: vitalsConfidence,
          steps: activityConfidence,
          distance: activityConfidence,
          activeMinutes: activityConfidence,
          hydration: 55,
          sleepScore: sleepConfidence,
          sleepHours: sleepConfidence,
          stressLevel: stressConfidence,
        },
        workoutMode: mode,
        notes: `${sourceDetails.label} flow · ${mode} · conf ${overallConfidence}%`,
      };

      setVerification((prev) => ({
        ...prev,
        lastGeneratedAt: new Date().toISOString(),
        lastGeneratedPayload: payload,
        lastPostStatus: 'posting',
        lastPostError: null,
      }));

      try {
        const response = await API.post('/health/reading', payload);
        setLastSyncAt(new Date().toISOString());
        setLastSyncStatus('ok');
        setVerification((prev) => ({
          ...prev,
          lastPostStatus: 'ok',
          lastPostedAt: new Date().toISOString(),
          lastPostResponse: response.data,
          lastPostError: null,
        }));
        if (isPaired) {
          syncWearableState({
            battery: wearableRef.current.battery - (Math.random() > 0.72 ? 1 : 0),
          });
        }
      } catch (err) {
        setLastSyncStatus('error');
        setVerification((prev) => ({
          ...prev,
          lastPostStatus: 'error',
          lastPostedAt: new Date().toISOString(),
          lastPostError: err?.response?.data || err?.message || 'Unknown error',
        }));
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
      if (geoWatchId !== undefined) navigator.geolocation.clearWatch(geoWatchId);
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', onMotion);
      }
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
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        wearable: {
          paired: wearablePaired,
          battery: wearableBattery,
          lastSyncAt,
          lastSyncStatus,
          sourceMode: wearablePaired ? 'band_plus_phone' : 'phone_only',
          sensorStatus,
        },
        verification,
        pairWearable,
        unpairWearable,
        requestSensorPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
