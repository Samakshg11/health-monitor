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
    heartRate: metrics.heartRate ? { value: Number(metrics.heartRate) } : undefined,
    bloodPressure:
      metrics.systolic && metrics.diastolic
        ? { systolic: Number(metrics.systolic), diastolic: Number(metrics.diastolic) }
        : undefined,
    spo2: metrics.spo2 ? { value: Number(metrics.spo2) } : undefined,
    temperature: metrics.temperature ? { value: Number(metrics.temperature) } : undefined,
    steps: metrics.steps ? { value: Number(metrics.steps) } : undefined,
    calories: metrics.calories ? { value: Number(metrics.calories) } : undefined,
    distance: metrics.distance ? { value: Number(metrics.distance) } : undefined,
    cadence: metrics.cadence ? { value: Number(metrics.cadence) } : undefined,
    activeMinutes: metrics.activeMinutes ? { value: Number(metrics.activeMinutes) } : undefined,
    hydration: metrics.hydration ? { value: Number(metrics.hydration) } : undefined,
    sleepScore: metrics.sleepScore ? { value: Number(metrics.sleepScore) } : undefined,
    sleepHours: metrics.sleepHours ? { value: Number(metrics.sleepHours) } : undefined,
    stressLevel: metrics.stressLevel ? { value: Number(metrics.stressLevel) } : undefined,
  };
};

module.exports = {
  mapHealthConnectPayload,
};
