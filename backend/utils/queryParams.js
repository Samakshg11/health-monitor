const parseBoundedInteger = (value, { fallback, min = 1, max = 100 } = {}) => {
  if (value === undefined || value === null || value === '') return fallback;
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) return fallback;
  const parsed = Number.parseInt(text, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const parseDaysWindow = (value, { fallback = 7, min = 1, max = 90 } = {}) =>
  parseBoundedInteger(value, { fallback, min, max });

const parseDateParam = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

module.exports = {
  parseBoundedInteger,
  parseDateParam,
  parseDaysWindow,
};
