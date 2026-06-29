const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_DAILY_GOALS, normalizeDailyGoals } = require('../utils/dailyGoals');

test('normalizeDailyGoals falls back to default targets for invalid input', () => {
  assert.deepEqual(normalizeDailyGoals({ steps: 'many', activeMinutes: null, hydration: undefined }), DEFAULT_DAILY_GOALS);
});

test('normalizeDailyGoals rounds and clamps daily targets', () => {
  assert.deepEqual(
    normalizeDailyGoals({
      steps: 999999,
      activeMinutes: 1,
      hydration: 140.4,
    }),
    {
      steps: 50000,
      activeMinutes: 5,
      hydration: 100,
    }
  );
});

test('normalizeDailyGoals accepts numeric strings', () => {
  assert.deepEqual(
    normalizeDailyGoals({
      steps: '8500',
      activeMinutes: '47.7',
      hydration: '82',
    }),
    {
      steps: 8500,
      activeMinutes: 48,
      hydration: 82,
    }
  );
});
