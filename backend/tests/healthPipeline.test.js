const test = require('node:test');
const assert = require('node:assert/strict');

const {
  metricConfidence,
  shouldSoftenEstimatedAlert,
  normalizeIncomingReading,
} = require('../utils/healthPipeline');

test('normalizeIncomingReading strips direct vitals from estimated phone-sync payloads', () => {
  const normalized = normalizeIncomingReading({
    source: 'estimated',
    heartRate: { value: 99 },
    bloodPressure: { systolic: 120, diastolic: 80 },
    spo2: { value: 97 },
    temperature: { value: 36.6 },
    steps: { value: 420 },
    confidence: {
      overall: 44,
      heartRate: 35,
      spo2: 31,
    },
    sourceDetails: {
      supportedMetrics: {
        movement: 'stronger',
        vitals: 'sensor-like',
      },
    },
  });

  assert.equal(normalized.source, 'estimated');
  assert.equal(normalized.heartRate, undefined);
  assert.equal(normalized.bloodPressure, undefined);
  assert.equal(normalized.spo2, undefined);
  assert.equal(normalized.temperature, undefined);
  assert.deepEqual(normalized.steps, { value: 420 });
  assert.equal(normalized.sourceDetails.mode, 'phone_only');
  assert.equal(normalized.sourceDetails.supportedMetrics.vitals, 'manual check-in required');
  assert.equal(normalized.confidence.heartRate, undefined);
});

test('normalizeIncomingReading preserves direct vitals for manual check-ins', () => {
  const normalized = normalizeIncomingReading({
    source: 'manual',
    heartRate: { value: 72 },
    spo2: { value: 98 },
    temperature: { value: 36.7 },
    sourceDetails: {
      contributors: ['manual-check-in'],
    },
  });

  assert.equal(normalized.source, 'manual');
  assert.deepEqual(normalized.heartRate, { value: 72 });
  assert.deepEqual(normalized.spo2, { value: 98 });
  assert.equal(normalized.sourceDetails.mode, 'manual_entry');
  assert.equal(normalized.sourceDetails.confidenceTier, 'high');
  assert.equal(normalized.sourceDetails.supportedMetrics.vitals, 'manual measurement');
});

test('shouldSoftenEstimatedAlert only softens estimated vital alerts', () => {
  assert.equal(shouldSoftenEstimatedAlert({ source: 'estimated' }, 'heartRate'), true);
  assert.equal(shouldSoftenEstimatedAlert({ source: 'estimated' }, 'stressLevel'), true);
  assert.equal(shouldSoftenEstimatedAlert({ source: 'estimated' }, 'steps'), false);
  assert.equal(shouldSoftenEstimatedAlert({ source: 'manual' }, 'heartRate'), false);
});

test('metricConfidence falls back from metric to overall confidence', () => {
  const reading = {
    confidence: {
      overall: 61,
      steps: 84,
    },
  };

  assert.equal(metricConfidence(reading, 'steps'), 84);
  assert.equal(metricConfidence(reading, 'spo2'), 61);
  assert.equal(metricConfidence({}, 'steps'), 100);
});
