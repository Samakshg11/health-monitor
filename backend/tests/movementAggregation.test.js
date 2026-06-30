const test = require('node:test');
const assert = require('node:assert/strict');

const { summarizeMovementMetric } = require('../utils/movementAggregation');

test('summarizeMovementMetric uses daily max for streaming sources', () => {
  const summary = summarizeMovementMetric([
    { source: 'estimated', recordedAt: '2026-03-15T08:00:00.000Z', steps: { value: 1200 } },
    { source: 'estimated', recordedAt: '2026-03-15T09:00:00.000Z', steps: { value: 2400 } },
    { source: 'estimated', recordedAt: '2026-03-15T10:00:00.000Z', steps: { value: 3100 } },
  ], 'steps');

  assert.equal(summary.total, 3100);
  assert.equal(summary.max, 3100);
  assert.equal(summary.avg, 3100);
});

test('summarizeMovementMetric adds manual entries on top of streaming daily totals', () => {
  const summary = summarizeMovementMetric([
    { source: 'estimated', recordedAt: '2026-03-15T08:00:00.000Z', steps: { value: 2200 } },
    { source: 'estimated', recordedAt: '2026-03-15T11:00:00.000Z', steps: { value: 4800 } },
    { source: 'manual', recordedAt: '2026-03-15T18:00:00.000Z', steps: { value: 900 } },
    { source: 'estimated', recordedAt: '2026-03-16T08:00:00.000Z', steps: { value: 3500 } },
  ], 'steps');

  assert.equal(summary.total, 9200);
  assert.equal(summary.max, 5700);
  assert.equal(summary.avg, 4600);
});

test('summarizeMovementMetric keeps distance precision for daily totals', () => {
  const summary = summarizeMovementMetric([
    { source: 'health_connect', recordedAt: '2026-03-15T08:00:00.000Z', distance: { value: 2.45 } },
    { source: 'health_connect', recordedAt: '2026-03-15T12:00:00.000Z', distance: { value: 4.12 } },
    { source: 'manual', recordedAt: '2026-03-15T21:00:00.000Z', distance: { value: 0.8 } },
  ], 'distance', { precision: 2 });

  assert.equal(summary.total, 4.92);
  assert.equal(summary.max, 4.92);
  assert.equal(summary.avg, 4.9);
  assert.deepEqual(summary.dailyTotals, [4.92]);
});

test('summarizeMovementMetric rounds daily totals with requested precision', () => {
  const summary = summarizeMovementMetric([
    { source: 'manual', recordedAt: '2026-03-15T08:00:00.000Z', distance: { value: 1.111 } },
    { source: 'manual', recordedAt: '2026-03-15T12:00:00.000Z', distance: { value: 2.222 } },
  ], 'distance', { precision: 2 });

  assert.deepEqual(summary.dailyTotals, [3.33]);
});

test('summarizeMovementMetric ignores negative and invalid movement values', () => {
  const summary = summarizeMovementMetric([
    { source: 'manual', recordedAt: '2026-03-15T08:00:00.000Z', steps: { value: -500 } },
    { source: 'manual', recordedAt: '2026-03-15T09:00:00.000Z', steps: { value: 'nope' } },
    { source: 'manual', recordedAt: '2026-03-15T10:00:00.000Z', steps: { value: 1200 } },
  ], 'steps');

  assert.equal(summary.total, 1200);
  assert.equal(summary.max, 1200);
  assert.equal(summary.avg, 1200);
});

test('summarizeMovementMetric returns daily totals in chronological order', () => {
  const summary = summarizeMovementMetric([
    { source: 'manual', recordedAt: '2026-03-17T08:00:00.000Z', steps: { value: 3000 } },
    { source: 'manual', recordedAt: '2026-03-15T08:00:00.000Z', steps: { value: 1000 } },
    { source: 'manual', recordedAt: '2026-03-16T08:00:00.000Z', steps: { value: 2000 } },
  ], 'steps');

  assert.deepEqual(summary.dailyTotals, [1000, 2000, 3000]);
});
