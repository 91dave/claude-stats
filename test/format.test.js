import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCoverage } from '../src/format.js';

const now = Date.parse('2026-11-06T12:00:00Z');
const daysAgo = (days) => now - days * 24 * 60 * 60 * 1000;

test('coverage gives the session count and how many days back the oldest session started', () => {
  assert.equal(describeCoverage({ sessions: 39, oldest: daysAgo(30), now }), '39 sessions from the last 30 days');
});

test('coverage rounds a part day up to a whole day', () => {
  assert.equal(describeCoverage({ sessions: 4, oldest: daysAgo(6.2), now }), '4 sessions from the last 7 days');
});

test('coverage of less than a day reads as the last day', () => {
  assert.equal(describeCoverage({ sessions: 2, oldest: daysAgo(0.1), now }), '2 sessions from the last day');
});

test('coverage of a single session uses the singular', () => {
  assert.equal(describeCoverage({ sessions: 1, oldest: daysAgo(3), now }), '1 session from the last 3 days');
});

test('coverage without any session start time gives only the session count', () => {
  assert.equal(describeCoverage({ sessions: 0, oldest: null, now }), '0 sessions');
});
