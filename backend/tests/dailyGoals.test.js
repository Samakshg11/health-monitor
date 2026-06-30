const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_DAILY_GOALS, buildDailyGoalProgress, normalizeDailyGoals } = require('../utils/dailyGoals');

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

test('buildDailyGoalProgress caps movement and hydration progress', () => {
  assert.deepEqual(
    buildDailyGoalProgress(
      { steps: 12000, activeMinutes: 45 },
      { steps: 10000, activeMinutes: 60, hydration: 80 },
      { hydration: { value: 90 } }
    ),
    {
      steps: 100,
      activeMinutes: 75,
      hydration: 100,
    }
  );
});

test('buildDailyGoalProgress handles missing or invalid goals safely', () => {
  assert.deepEqual(
    buildDailyGoalProgress(
      { steps: 5000, activeMinutes: 30 },
      { steps: 0, activeMinutes: 'many', hydration: null },
      {}
    ),
    {
      steps: 0,
      activeMinutes: 0,
      hydration: 0,
    }
  );
});
