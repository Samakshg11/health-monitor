const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const cloneMetric = (metric) => {
  if (!metric || typeof metric !== 'object') return undefined;
  return { ...metric };
};

const normalizeNotes = (notes) => {
  if (typeof notes !== 'string') return notes;
  const trimmed = notes.trim();
  return trimmed ? trimmed.slice(0, 500) : undefined;
};

const metricConfidence = (reading, key) => {
  const confidenceValue = (value) => {
    const number = Number(value);
    return value !== '' && Number.isFinite(number) ? number : undefined;
  };

  const explicit = confidenceValue(reading?.confidence?.[key]);
  if (explicit !== undefined) return explicit;
  const overall = confidenceValue(reading?.confidence?.overall);
  if (overall !== undefined) return overall;
  return 100;
};

const shouldSoftenEstimatedAlert = (reading, key) => {
  if (reading?.source !== 'estimated') return false;
  const vitalKeys = ['heartRate', 'bloodPressure', 'spo2', 'temperature', 'stressLevel'];
  return vitalKeys.includes(key);
};

const buildDefaultSourceDetails = (source, sourceDetails = {}) => {
  if (source === 'health_connect') {
    return {
      mode: 'health_connect',
      label: 'Health Connect',
      deviceName: 'Android Health Connect',
      primarySource: 'Android Health Connect adapter',
      movementSource: 'Health Connect activity records',
      recoverySource: 'Health Connect wellness records',
      confidenceTier: 'high',
      supportedMetrics: {
        movement: 'platform-backed',
        vitals: 'connected source',
        recovery: 'connected source',
      },
      contributors: ['health-connect-adapter'],
      ...sourceDetails,
    };
  }

  if (source === 'manual') {
    return {
      mode: 'manual_entry',
      label: 'Manual check-in',
      deviceName: 'Manual entry',
      primarySource: 'User-entered health check-in',
      movementSource: 'User-entered activity summary',
      recoverySource: 'User-entered wellness summary',
      confidenceTier: 'high',
      supportedMetrics: {
        movement: 'manual summary',
        vitals: 'manual measurement',
        recovery: 'manual summary',
      },
      contributors: ['manual-check-in'],
      ...sourceDetails,
    };
  }

  if (source === 'device') {
    return {
      mode: 'band_plus_phone',
      label: 'Future band + phone',
      deviceName: 'Future VitalWatch band preview',
      primarySource: 'Future band sensor preview',
      movementSource: 'Band-style steps with phone correction',
      recoverySource: 'Band-style vitals plus activity fusion',
      confidenceTier: 'high',
      supportedMetrics: {
        movement: 'stronger',
        vitals: 'sensor-backed preview',
        recovery: 'sensor fusion preview',
      },
      contributors: ['future-band-preview-sensors'],
      ...sourceDetails,
    };
  }

  return {
    mode: 'phone_only',
    label: 'Phone only',
    deviceName: 'Phone sensors',
    primarySource: 'Phone motion and routine model',
    movementSource: 'Phone motion and GPS estimate',
    recoverySource: 'Historical trend estimate',
    confidenceTier: 'low',
    supportedMetrics: {
      movement: 'stronger',
      vitals: 'manual check-in required',
      recovery: 'trend-based',
    },
    contributors: ['history-model'],
    ...sourceDetails,
  };
};

const normalizeConfidence = (confidence = {}, source) => {
  const next = { ...confidence };

  for (const [key, value] of Object.entries(next)) {
    if (value === '' || value === null) {
      delete next[key];
      continue;
    }

    const number = Number(value);
    if (Number.isFinite(number)) {
      next[key] = clamp(Math.round(number), 0, 100);
    }
  }

  const vitalKeys = ['heartRate', 'bloodPressure', 'spo2', 'temperature'];
  if (source === 'estimated') {
    for (const key of vitalKeys) {
      delete next[key];
    }
  }

  return next;
};

const normalizeIncomingReading = (payload = {}) => {
  const source = ['manual', 'estimated', 'device', 'health_connect'].includes(payload.source) ? payload.source : 'manual';
  const sourceDetails = buildDefaultSourceDetails(source, payload.sourceDetails);
  const confidence = normalizeConfidence(payload.confidence, source);

  const normalized = {
    heartRate: cloneMetric(payload.heartRate),
    bloodPressure: cloneMetric(payload.bloodPressure),
    spo2: cloneMetric(payload.spo2),
    temperature: cloneMetric(payload.temperature),
    steps: cloneMetric(payload.steps),
    calories: cloneMetric(payload.calories),
    distance: cloneMetric(payload.distance),
    cadence: cloneMetric(payload.cadence),
    activeMinutes: cloneMetric(payload.activeMinutes),
    hydration: cloneMetric(payload.hydration),
    sleepScore: cloneMetric(payload.sleepScore),
    sleepHours: cloneMetric(payload.sleepHours),
    stressLevel: cloneMetric(payload.stressLevel),
    source,
    sourceDetails,
    confidence,
    workoutMode: ['balanced', 'push', 'recovery'].includes(payload.workoutMode) ? payload.workoutMode : 'balanced',
    notes: normalizeNotes(payload.notes),
  };

  if (source === 'estimated') {
    normalized.heartRate = undefined;
    normalized.bloodPressure = undefined;
    normalized.spo2 = undefined;
    normalized.temperature = undefined;
    normalized.sourceDetails.supportedMetrics = {
      ...(normalized.sourceDetails.supportedMetrics || {}),
      vitals: 'manual check-in required',
    };
  }

  if (source === 'manual') {
    normalized.sourceDetails.mode = 'manual_entry';
    normalized.sourceDetails.confidenceTier = 'high';
  }

  if (source === 'device') {
    normalized.sourceDetails.mode = 'band_plus_phone';
  }

  if (source === 'health_connect') {
    normalized.sourceDetails.mode = 'health_connect';
  }

  return normalized;
};

module.exports = {
  metricConfidence,
  shouldSoftenEstimatedAlert,
  normalizeIncomingReading,
};
