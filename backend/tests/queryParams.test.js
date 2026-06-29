const test = require('node:test');
const assert = require('node:assert/strict');

const { parseBoundedInteger, parseDaysWindow } = require('../utils/queryParams');

test('parseBoundedInteger returns fallback for missing or invalid values', () => {
  assert.equal(parseBoundedInteger(undefined, { fallback: 20 }), 20);
  assert.equal(parseBoundedInteger('abc', { fallback: 20 }), 20);
});

test('parseBoundedInteger clamps values to the configured range', () => {
  assert.equal(parseBoundedInteger('0', { fallback: 20, min: 1, max: 50 }), 1);
  assert.equal(parseBoundedInteger('75', { fallback: 20, min: 1, max: 50 }), 50);
  assert.equal(parseBoundedInteger('25', { fallback: 20, min: 1, max: 50 }), 25);
});

test('parseDaysWindow applies a safe reporting range', () => {
  assert.equal(parseDaysWindow(undefined), 7);
  assert.equal(parseDaysWindow('0'), 1);
  assert.equal(parseDaysWindow('365'), 90);
});
