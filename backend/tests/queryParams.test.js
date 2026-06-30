const test = require('node:test');
const assert = require('node:assert/strict');

const { parseBoundedInteger, parseDateParam, parseDaysWindow } = require('../utils/queryParams');

test('parseBoundedInteger returns fallback for missing or invalid values', () => {
  assert.equal(parseBoundedInteger(undefined, { fallback: 20 }), 20);
  assert.equal(parseBoundedInteger('abc', { fallback: 20 }), 20);
  assert.equal(parseBoundedInteger('', { fallback: 20 }), 20);
  assert.equal(parseBoundedInteger('12abc', { fallback: 20 }), 20);
  assert.equal(parseBoundedInteger('2.5', { fallback: 20 }), 20);
});

test('parseBoundedInteger clamps values to the configured range', () => {
  assert.equal(parseBoundedInteger('0', { fallback: 20, min: 1, max: 50 }), 1);
  assert.equal(parseBoundedInteger('-10', { fallback: 20, min: 1, max: 50 }), 1);
  assert.equal(parseBoundedInteger('75', { fallback: 20, min: 1, max: 50 }), 50);
  assert.equal(parseBoundedInteger('25', { fallback: 20, min: 1, max: 50 }), 25);
  assert.equal(parseBoundedInteger(' 25 ', { fallback: 20, min: 1, max: 50 }), 25);
});

test('parseDaysWindow applies a safe reporting range', () => {
  assert.equal(parseDaysWindow(undefined), 7);
  assert.equal(parseDaysWindow('0'), 1);
  assert.equal(parseDaysWindow('365'), 90);
});

test('parseDateParam returns dates only for valid values', () => {
  assert.equal(parseDateParam(undefined), undefined);
  assert.equal(parseDateParam('not-a-date'), undefined);
  assert.equal(parseDateParam(''), undefined);
  assert.equal(parseDateParam('2026-03-15').toISOString(), '2026-03-15T00:00:00.000Z');
});
