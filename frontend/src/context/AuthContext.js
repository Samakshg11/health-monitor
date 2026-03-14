import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rand = (min, max) => Math.random() * (max - min) + min;
const chance = (value) => Math.random() < value;
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

const round1 = (value) => Number(value.toFixed(1));
const getLocalDayKey = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);
const getTrackingStorageKey = (userId) => `vw_tracking_enabled_${userId}`;
const hasValue = (value) => value !== undefined && value !== null && value !== '';

const goalProfiles = {
  fitness: {
    modeBias: { push: 0.28, balanced: 0.57, recovery: 0.15 },
    stressOffset: 4,
    hydrationDrift: -1,
    sleepOffset: -2,
  },
  wellness: {
    modeBias: { push: 0.12, balanced: 0.6, recovery: 0.28 },
    stressOffset: -1,
    hydrationDrift: 1,
    sleepOffset: 2,
  },
  recovery: {
    modeBias: { push: 0.05, balanced: 0.35, recovery: 0.6 },
    stressOffset: -6,
    hydrationDrift: 2,
    sleepOffset: 5,
  },
  'clinical-awareness': {
    modeBias: { push: 0.08, balanced: 0.54, recovery: 0.38 },
    stressOffset: -3,
    hydrationDrift: 1,
    sleepOffset: 1,
  },
};

const pickWeightedMode = (bias) => {
  const roll = Math.random();
  if (roll < bias.push) return 'push';
  if (roll < bias.push + bias.balanced) return 'balanced';
  return 'recovery';
};

const defaultOnboarding = {
  completed: false,
  trackingGoal: 'fitness',
  experienceLevel: 'beginner',
  preferredTrackingMode: 'phone_only',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [wearablePaired, setWearablePaired] = useState(localStorage.getItem('vw_wearable_paired') === 'true');
  const [wearableBattery, setWearableBattery] = useState(Number(localStorage.getItem('vw_wearable_battery') || 87));
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [lastSyncStatus, setLastSyncStatus] = useState('idle');
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [trackingReady, setTrackingReady] = useState(false);
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
  const dailyMovementRef = useRef({
    dayKey: getLocalDayKey(),
    steps: 0,
    calories: 0,
    distance: 0,
    activeMinutes: 0,
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

  const buildSourceDetails = ({ isPaired, sensors, overallConfidence, onboarding, supportedMetrics, confidenceTier }) => {
    const contributors = [];
    if (sensors.hasMotion) contributors.push('phone-motion');
    if (sensors.hasGeo) contributors.push('phone-gps');
    if (isPaired) contributors.unshift('future-band-preview-sensors');

    return isPaired
      ? {
          mode: 'band_plus_phone',
          label: 'Future band + phone',
          deviceName: 'Future VitalWatch band preview',
          deviceBattery: wearableRef.current.battery,
          primarySource: 'Future band sensor preview',
          movementSource: sensors.hasGeo ? 'Band-style steps with phone GPS correction' : 'Band-style steps and cadence',
          recoverySource: 'Band-style vitals plus activity fusion',
          contributors,
          overallConfidence,
          confidenceTier,
          supportedMetrics,
        }
      : {
          mode: 'phone_only',
          label: 'Phone only',
          deviceName: 'Phone sensors',
          deviceBattery: null,
          primarySource: onboarding?.trackingGoal === 'clinical-awareness'
            ? 'Phone motion, routine model, and cautious trend scoring'
            : 'Phone motion and routine model',
          movementSource: sensors.hasGeo || sensors.hasMotion ? 'Phone motion and GPS estimate' : 'Routine estimate fallback',
          recoverySource: 'Historical trend estimate',
          contributors: contributors.length ? contributors : ['history-model'],
          overallConfidence,
          confidenceTier,
          supportedMetrics,
        };
  };

  const getDailyMovementState = (now) => {
    const dayKey = getLocalDayKey(now);
    if (dailyMovementRef.current.dayKey !== dayKey) {
      dailyMovementRef.current = {
        dayKey,
        steps: 0,
        calories: 0,
        distance: 0,
        activeMinutes: 0,
      };
    }
    return dailyMovementRef.current;
  };

  const enableTracking = async ({ requestPermissions = true } = {}) => {
    if (requestPermissions) {
      await requestSensorPermissions();
    }

    if (user?._id) {
      localStorage.setItem(getTrackingStorageKey(user._id), 'true');
    }

    setTrackingEnabled(true);
    setLastSyncStatus('starting');
  };

  const disableTracking = () => {
    if (user?._id) {
      localStorage.setItem(getTrackingStorageKey(user._id), 'false');
    }
    setTrackingEnabled(false);
    setLastSyncStatus('idle');
  };

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setTrackingReady(true);
        setLoading(false);
        return;
      }
      try {
        const { data } = await API.get('/auth/me');
        setUser(data.user);
        const storageKey = getTrackingStorageKey(data.user._id);
        const storedPreference = localStorage.getItem(storageKey);
        const { data: latestData } = await API.get('/health/latest');
        const hasExistingReadings = Boolean(latestData?.reading);

        setTrackingEnabled(
          storedPreference === null ? hasExistingReadings : storedPreference === 'true'
        );
        setTrackingReady(true);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setTrackingEnabled(false);
        setTrackingReady(true);
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
    if (!user || !token || !trackingReady || !trackingEnabled) return undefined;

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
      const onboarding = {
        ...defaultOnboarding,
        ...(user?.onboarding || {}),
      };
      const goalProfile = goalProfiles[onboarding.trackingGoal] || goalProfiles.fitness;
      const baseDayMode = hour < 8 || hour > 22 ? 'recovery' : hour > 17 ? 'push' : 'balanced';
      const weightedMode = pickWeightedMode(goalProfile.modeBias);
      const mode = chance(0.58) ? baseDayMode : weightedMode;
      const profile = modeTemplates[mode];
      const current = trackerRef.current;
      const sensors = sensorRef.current;
      const isPaired = wearableRef.current.paired;
      const dailyMovement = getDailyMovementState(now);

      const freshMotion = Date.now() - sensors.motionSeenAt < 45000;
      const motionBoost = freshMotion ? sensors.motionScore * 38 : 0;
      const geoDistance = sensors.distanceSinceLastKm;
      sensorRef.current.distanceSinceLastKm = 0;
      const phoneOnly = !isPaired;

      const phoneBaseSteps = rand(profile.steps[0] * 0.72, profile.steps[1] * 0.84);
      const bandBaseSteps = rand(profile.steps[0], profile.steps[1]);
      const stepDelta = Math.round(
        clamp(
          (isPaired ? bandBaseSteps : phoneBaseSteps) +
          motionBoost +
          geoDistance * (isPaired ? 980 : 1150),
          isPaired ? 45 : 20,
          isPaired ? 460 : 340
        )
      );
      const distanceDelta = Number(
        clamp(
          geoDistance > 0
            ? geoDistance
            : stepDelta * (isPaired ? 0.00074 : 0.00068) + rand(-0.03, 0.05),
          0.02,
          0.9
        ).toFixed(2)
      );
      const activeMinuteDelta = stepDelta > 95 || geoDistance > 0.05 || freshMotion ? 1 : 0;
      const calorieDelta = Math.round(clamp((stepDelta * 0.045) + (activeMinuteDelta * 4) + rand(8, 18), 10, 58));

      dailyMovement.steps = Math.round(clamp(dailyMovement.steps + stepDelta, 0, isPaired ? 42000 : 28000));
      dailyMovement.distance = Number(clamp(dailyMovement.distance + distanceDelta, 0, isPaired ? 32 : 22).toFixed(2));
      dailyMovement.activeMinutes = Math.round(clamp(dailyMovement.activeMinutes + activeMinuteDelta, 0, isPaired ? 240 : 180));
      dailyMovement.calories = Math.round(clamp(dailyMovement.calories + calorieDelta, 0, isPaired ? 4200 : 3200));

      const exertionScore = clamp(
        (stepDelta / 4) +
        (distanceDelta * 70) +
        (freshMotion ? 18 : 0) +
        (mode === 'push' ? 24 : mode === 'balanced' ? 12 : 4),
        0,
        100
      );

      const activitySignal = clamp(
        (freshMotion ? 1 : 0) * 36 +
        (sensors.hasGeo ? 24 : 0) +
        clamp(geoDistance * 400, 0, 30) +
        clamp(stepDelta / 8, 0, 18),
        10,
        100
      );
      const activityConfidenceBase = sensors.hasGeo && sensors.hasMotion ? 82 : sensors.hasGeo || sensors.hasMotion ? 66 : 40;
      const activityConfidence = clamp(
        activityConfidenceBase +
        (phoneOnly ? 0 : 12) +
        (onboarding.experienceLevel === 'advanced' ? 2 : 0),
        38,
        97
      );
      const vitalsConfidenceBase = phoneOnly
        ? 22 + (freshMotion ? 6 : 0) + (onboarding.trackingGoal === 'clinical-awareness' ? 6 : 0)
        : 76 + (freshMotion ? 4 : 0) + (sensors.hasGeo ? 3 : 0);
      const vitalsConfidence = clamp(vitalsConfidenceBase, phoneOnly ? 18 : 62, 96);
      const sleepConfidence = clamp((phoneOnly ? 44 : 78) + (goalProfile.sleepOffset > 0 ? 3 : 0) + (freshMotion ? 2 : 0), 35, 93);
      const stressConfidence = clamp((phoneOnly ? 38 : 74) + (goalProfile.stressOffset < 0 ? 4 : 0) + (freshMotion ? 4 : 0), 28, 92);

      const heartRate = clamp(
        Math.round(
          current.heartRate +
          rand(phoneOnly ? -5 : -3, phoneOnly ? 5 : 3) +
          (isPaired ? exertionScore * 0.34 : exertionScore * 0.16) +
          (rand(profile.hr[0], profile.hr[1]) - current.heartRate) * (isPaired ? 0.22 : 0.08)
        ),
        68,
        176
      );
      const estimatedHeartRate = clamp(
        Math.round(62 + (activitySignal * 0.42) + rand(-7, 8) + (goalProfile.stressOffset * 0.4)),
        60,
        152
      );
      const finalHeartRate = phoneOnly && vitalsConfidence < 40 ? estimatedHeartRate : heartRate;
      const systolic = clamp(
        Math.round((phoneOnly ? 118 : current.systolic) + rand(-4, 4) + (finalHeartRate - 110) * (phoneOnly ? 0.04 : 0.07)),
        100,
        154
      );
      const diastolic = clamp(
        Math.round((phoneOnly ? 78 : current.diastolic) + rand(-3, 3) + (finalHeartRate - 110) * (phoneOnly ? 0.02 : 0.035)),
        62,
        100
      );
      const spo2 = clamp(
        Math.round((phoneOnly ? 96 : current.spo2) + rand(phoneOnly ? -1.2 : -0.8, phoneOnly ? 0.8 : 0.8)),
        phoneOnly ? 93 : 92,
        100
      );
      const temperature = round1(
        clamp((phoneOnly ? 36.6 : current.temperature) + rand(phoneOnly ? -0.18 : -0.12, phoneOnly ? 0.18 : 0.16), 36.0, 38.3)
      );
      const cadence = clamp(Math.round(current.cadence + rand(-5, 5) + (rand(profile.cadence[0], profile.cadence[1]) - current.cadence) * (isPaired ? 0.3 : 0.18)), 118, 192);
      const hydration = clamp(
        Math.round(current.hydration - (Math.random() > 0.66 ? 1 : 0) + goalProfile.hydrationDrift + (Math.random() > 0.95 ? 2 : 0)),
        38,
        100
      );
      const sleep = clamp(Math.round(current.sleep + goalProfile.sleepOffset * 0.08 + rand(-1.6, 0.7)), 55, 97);
      const sleepHours = round1(clamp(current.sleepHours + goalProfile.sleepOffset * 0.02 + rand(-0.18, 0.16), 4.3, 9.1));
      const stressBias = (mode === 'push' ? 10 : mode === 'balanced' ? 2 : -7) + goalProfile.stressOffset;
      const stress = clamp(Math.round(current.stress + rand(-6, 5) + stressBias), 12, 92);
      const overallConfidence = Math.round(
        (activityConfidence * 0.38 + vitalsConfidence * 0.36 + sleepConfidence * 0.14 + stressConfidence * 0.12)
      );
      const confidenceTier = overallConfidence >= 78 ? 'high' : overallConfidence >= 56 ? 'medium' : 'low';
      const supportedMetrics = phoneOnly
        ? {
            movement: 'stronger',
            vitals: 'manual check-in required',
            recovery: sleepConfidence >= 55 ? 'trend-based' : 'limited',
          }
        : {
            movement: 'stronger',
            vitals: 'sensor-backed preview',
            recovery: 'sensor fusion preview',
          };
      const sourceDetails = buildSourceDetails({
        isPaired,
        sensors,
        overallConfidence,
        onboarding,
        supportedMetrics,
        confidenceTier,
      });

      trackerRef.current = {
        mode,
        heartRate: finalHeartRate,
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
          hydration: phoneOnly ? 52 : 68,
          sleepScore: sleepConfidence,
          sleepHours: sleepConfidence,
          stressLevel: stressConfidence,
        },
        workoutMode: mode,
        notes: `${sourceDetails.label} flow · ${mode} · conf ${overallConfidence}% · ${confidenceTier} confidence`,
      };

      payload.steps = { value: dailyMovement.steps };
      payload.calories = { value: dailyMovement.calories };
      payload.distance = { value: dailyMovement.distance };
      payload.cadence = { value: cadence };
      payload.activeMinutes = { value: dailyMovement.activeMinutes };

      if (!phoneOnly) {
        payload.heartRate = { value: finalHeartRate };
        payload.bloodPressure = { systolic, diastolic };
        payload.spo2 = { value: spo2 };
        payload.temperature = { value: temperature };
      }

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
  }, [user, token, trackingEnabled, trackingReady]);

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
    localStorage.setItem(getTrackingStorageKey(data.user._id), 'false');
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTrackingEnabled(false);
    setTrackingReady(false);
  };

  const updateProfile = async (profileData) => {
    const organizationName = profileData.organizationName || '';
    const organizationRole = profileData.organizationRole || '';
    const payload = {
      name: profileData.name?.trim(),
      onboarding: {
        ...defaultOnboarding,
        ...(user?.onboarding || {}),
        ...(profileData.onboarding || {}),
      },
    };

    if (hasValue(profileData.age)) payload.age = Number(profileData.age);
    if (hasValue(profileData.gender)) payload.gender = profileData.gender;
    if (hasValue(profileData.weight)) payload.weight = Number(profileData.weight);
    if (hasValue(profileData.height)) payload.height = Number(profileData.height);
    if (organizationName || organizationRole) {
      payload.organization = {
        name: organizationName,
        role: organizationRole,
      };
    }

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
        tracking: {
          enabled: trackingEnabled,
          ready: trackingReady,
        },
        enableTracking,
        disableTracking,
        pairWearable,
        unpairWearable,
        requestSensorPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
