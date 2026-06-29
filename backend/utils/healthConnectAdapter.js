const numberMetric = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? { value: number } : undefined;
};

const mapHealthConnectPayload = (payload = {}) => {
  const metrics = payload.metrics || {};
  const summary = payload.summary || {};

  return {
    source: 'health_connect',
    sourceDetails: {
      label: 'Health Connect',
      deviceName: payload.deviceName || 'Android Health Connect',
      primarySource: payload.primarySource || 'Android Health Connect adapter',
      movementSource: payload.movementSource || 'Health Connect activity records',
      recoverySource: payload.recoverySource || 'Health Connect wellness records',
      confidenceTier: payload.confidenceTier || 'high',
      supportedMetrics: {
        movement: summary.movementSupport || 'platform-backed',
        vitals: summary.vitalsSupport || 'connected source',
        recovery: summary.recoverySupport || 'connected source',
      },
      contributors: payload.contributors || ['health-connect-adapter'],
    },
    confidence: payload.confidence || {
      overall: 88,
      heartRate: 90,
      bloodPressure: 82,
      spo2: 88,
      temperature: 80,
      steps: 92,
      distance: 92,
      activeMinutes: 90,
      hydration: 70,
      sleepScore: 84,
      sleepHours: 84,
      stressLevel: 76,
    },
    workoutMode: payload.workoutMode || 'balanced',
    notes: payload.notes || 'Imported from Health Connect adapter',
    heartRate: numberMetric(metrics.heartRate),
    bloodPressure:
      numberMetric(metrics.systolic) && numberMetric(metrics.diastolic)
        ? { systolic: Number(metrics.systolic), diastolic: Number(metrics.diastolic) }
        : undefined,
    spo2: numberMetric(metrics.spo2),
    temperature: numberMetric(metrics.temperature),
    steps: numberMetric(metrics.steps),
    calories: numberMetric(metrics.calories),
    distance: numberMetric(metrics.distance),
    cadence: numberMetric(metrics.cadence),
    activeMinutes: numberMetric(metrics.activeMinutes),
    hydration: numberMetric(metrics.hydration),
    sleepScore: numberMetric(metrics.sleepScore),
    sleepHours: numberMetric(metrics.sleepHours),
    stressLevel: numberMetric(metrics.stressLevel),
  };
};

module.exports = {
  mapHealthConnectPayload,
};
