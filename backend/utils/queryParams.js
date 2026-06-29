const parseBoundedInteger = (value, { fallback, min = 1, max = 100 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const parseDaysWindow = (value, { fallback = 7, min = 1, max = 90 } = {}) =>
  parseBoundedInteger(value, { fallback, min, max });

module.exports = {
  parseBoundedInteger,
  parseDaysWindow,
};
