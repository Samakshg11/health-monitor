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

test('normalizeIncomingReading preserves connected source metadata for health connect imports', () => {
  const normalized = normalizeIncomingReading({
    source: 'health_connect',
    heartRate: { value: 68 },
    steps: { value: 8123 },
    sourceDetails: {
      contributors: ['health-connect-adapter', 'android-phone'],
      supportedMetrics: {
        movement: 'platform-backed',
        vitals: 'connected source',
        recovery: 'connected source',
      },
    },
  });

  assert.equal(normalized.source, 'health_connect');
  assert.equal(normalized.sourceDetails.mode, 'health_connect');
  assert.equal(normalized.sourceDetails.label, 'Health Connect');
  assert.equal(normalized.sourceDetails.supportedMetrics.vitals, 'connected source');
  assert.deepEqual(normalized.heartRate, { value: 68 });
  assert.deepEqual(normalized.steps, { value: 8123 });
});

test('normalizeIncomingReading falls back invalid sources to manual metadata', () => {
  const normalized = normalizeIncomingReading({
    source: 'watch_guess',
    steps: { value: 1200 },
  });

  assert.equal(normalized.source, 'manual');
  assert.equal(normalized.sourceDetails.mode, 'manual_entry');
  assert.equal(normalized.sourceDetails.label, 'Manual check-in');
  assert.deepEqual(normalized.steps, { value: 1200 });
});

test('normalizeIncomingReading assigns band preview metadata for device source', () => {
  const normalized = normalizeIncomingReading({
    source: 'device',
    heartRate: { value: 76 },
  });

  assert.equal(normalized.source, 'device');
  assert.equal(normalized.sourceDetails.mode, 'band_plus_phone');
  assert.equal(normalized.sourceDetails.confidenceTier, 'high');
  assert.equal(normalized.sourceDetails.supportedMetrics.vitals, 'sensor-backed preview');
  assert.deepEqual(normalized.heartRate, { value: 76 });
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

test('metricConfidence reads numeric confidence strings from existing readings', () => {
  const reading = {
    confidence: {
      overall: '61',
      steps: '84',
    },
  };

  assert.equal(metricConfidence(reading, 'steps'), 84);
  assert.equal(metricConfidence(reading, 'spo2'), 61);
});

test('normalizeIncomingReading clamps metric-level confidence values', () => {
  const normalized = normalizeIncomingReading({
    source: 'manual',
    confidence: {
      overall: 88.7,
      steps: 104.2,
      hydration: -6,
    },
  });

  assert.equal(normalized.confidence.overall, 89);
  assert.equal(normalized.confidence.steps, 100);
  assert.equal(normalized.confidence.hydration, 0);
});

test('normalizeIncomingReading normalizes numeric confidence strings', () => {
  const normalized = normalizeIncomingReading({
    source: 'manual',
    confidence: {
      overall: '88.2',
      steps: '101',
      hydration: '',
      sleepScore: null,
    },
  });

  assert.equal(normalized.confidence.overall, 88);
  assert.equal(normalized.confidence.steps, 100);
  assert.equal(normalized.confidence.hydration, undefined);
  assert.equal(normalized.confidence.sleepScore, undefined);
});

test('normalizeIncomingReading trims notes and falls back invalid workout modes', () => {
  const normalized = normalizeIncomingReading({
    source: 'manual',
    workoutMode: 'sprint',
    notes: `  ${'x'.repeat(520)}  `,
  });

  assert.equal(normalized.workoutMode, 'balanced');
  assert.equal(normalized.notes.length, 500);
  assert.equal(normalized.notes, 'x'.repeat(500));
});

test('normalizeIncomingReading drops blank note strings', () => {
  const normalized = normalizeIncomingReading({
    source: 'manual',
    notes: '   ',
  });

  assert.equal(normalized.notes, undefined);
});
