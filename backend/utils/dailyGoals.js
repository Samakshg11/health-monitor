const DEFAULT_DAILY_GOALS = {
  steps: 10000,
  activeMinutes: 60,
  hydration: 100,
};

const normalizeGoalNumber = (value, { fallback, min, max }) => {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

const normalizeDailyGoals = (payload = {}) => ({
  steps: normalizeGoalNumber(payload.steps, {
    fallback: DEFAULT_DAILY_GOALS.steps,
    min: 1000,
    max: 50000,
  }),
  activeMinutes: normalizeGoalNumber(payload.activeMinutes, {
    fallback: DEFAULT_DAILY_GOALS.activeMinutes,
    min: 5,
    max: 300,
  }),
  hydration: normalizeGoalNumber(payload.hydration, {
    fallback: DEFAULT_DAILY_GOALS.hydration,
    min: 20,
    max: 100,
  }),
});

const progressPercent = (value, goal) => {
  const current = Number(value || 0);
  const target = Number(goal || 0);
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
};

const buildDailyGoalProgress = (totals = {}, goals = DEFAULT_DAILY_GOALS, latest = {}) => ({
  steps: progressPercent(totals.steps, goals.steps),
  activeMinutes: progressPercent(totals.activeMinutes, goals.activeMinutes),
  hydration: progressPercent(latest.hydration?.value, goals.hydration),
});

module.exports = {
  DEFAULT_DAILY_GOALS,
  buildDailyGoalProgress,
  normalizeDailyGoals,
};
