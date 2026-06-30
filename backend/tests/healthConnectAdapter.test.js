const test = require('node:test');
const assert = require('node:assert/strict');

const { mapHealthConnectPayload } = require('../utils/healthConnectAdapter');

test('mapHealthConnectPayload applies Health Connect source metadata defaults', () => {
  const mapped = mapHealthConnectPayload({
    metrics: {
      heartRate: '72',
      steps: '5400',
      activeMinutes: '38',
    },
  });

  assert.equal(mapped.source, 'health_connect');
  assert.equal(mapped.sourceDetails.label, 'Health Connect');
  assert.equal(mapped.sourceDetails.deviceName, 'Android Health Connect');
  assert.equal(mapped.sourceDetails.supportedMetrics.movement, 'platform-backed');
  assert.deepEqual(mapped.sourceDetails.contributors, ['health-connect-adapter']);
  assert.equal(mapped.confidence.overall, 88);
  assert.deepEqual(mapped.heartRate, { value: 72 });
  assert.deepEqual(mapped.steps, { value: 5400 });
  assert.deepEqual(mapped.activeMinutes, { value: 38 });
});

test('mapHealthConnectPayload preserves caller-provided source labels and confidence', () => {
  const mapped = mapHealthConnectPayload({
    deviceName: 'Pixel Watch',
    confidenceTier: 'medium',
    confidence: {
      overall: 74,
      steps: 80,
    },
    summary: {
      movementSupport: 'watch-backed',
      vitalsSupport: 'watch sensor',
      recoverySupport: 'sleep session',
    },
  });

  assert.equal(mapped.sourceDetails.deviceName, 'Pixel Watch');
  assert.equal(mapped.sourceDetails.confidenceTier, 'medium');
  assert.equal(mapped.sourceDetails.supportedMetrics.movement, 'watch-backed');
  assert.equal(mapped.sourceDetails.supportedMetrics.vitals, 'watch sensor');
  assert.equal(mapped.sourceDetails.supportedMetrics.recovery, 'sleep session');
  assert.deepEqual(mapped.confidence, { overall: 74, steps: 80 });
});

test('mapHealthConnectPayload preserves explicit zero metric values', () => {
  const mapped = mapHealthConnectPayload({
    metrics: {
      steps: 0,
      calories: '0',
      distance: 0,
      activeMinutes: '0',
    },
  });

  assert.deepEqual(mapped.steps, { value: 0 });
  assert.deepEqual(mapped.calories, { value: 0 });
  assert.deepEqual(mapped.distance, { value: 0 });
  assert.deepEqual(mapped.activeMinutes, { value: 0 });
});

test('mapHealthConnectPayload accepts object-shaped metric values', () => {
  const mapped = mapHealthConnectPayload({
    metrics: {
      heartRate: { value: '71' },
      steps: { value: 6400 },
      sleepHours: { value: '7.5' },
    },
  });

  assert.deepEqual(mapped.heartRate, { value: 71 });
  assert.deepEqual(mapped.steps, { value: 6400 });
  assert.deepEqual(mapped.sleepHours, { value: 7.5 });
});
