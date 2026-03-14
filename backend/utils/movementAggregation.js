const cumulativeMovementSources = new Set(['estimated', 'device', 'health_connect']);

const getDayKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const metricValue = (reading, key) => Number(reading?.[key]?.value || 0);

const aggregateMovementMetricByDay = (readings, key) => {
  const byDay = new Map();

  for (const reading of readings) {
    const dayKey = getDayKey(reading?.recordedAt);
    if (!dayKey) continue;

    const value = metricValue(reading, key);
    if (!value) continue;

    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, { cumulativeMax: 0, manualSum: 0 });
    }

    const bucket = byDay.get(dayKey);
    if (cumulativeMovementSources.has(reading.source)) {
      bucket.cumulativeMax = Math.max(bucket.cumulativeMax, value);
    } else {
      bucket.manualSum += value;
    }
  }

  return Array.from(byDay.values()).map(({ cumulativeMax, manualSum }) => cumulativeMax + manualSum);
};

const summarizeMovementMetric = (readings, key, { precision = 0 } = {}) => {
  const dailyTotals = aggregateMovementMetricByDay(readings, key);
  const sum = dailyTotals.reduce((total, value) => total + value, 0);
  const avg = dailyTotals.length ? sum / dailyTotals.length : null;
  const max = dailyTotals.length ? Math.max(...dailyTotals) : null;

  const normalize = (value) => {
    if (value === null) return null;
    return precision > 0 ? Number(value.toFixed(precision)) : Math.round(value);
  };

  return {
    total: normalize(sum),
    avg: avg === null ? null : Number(avg.toFixed(1)),
    max: normalize(max),
    dailyTotals,
  };
};

module.exports = {
  aggregateMovementMetricByDay,
  summarizeMovementMetric,
};
