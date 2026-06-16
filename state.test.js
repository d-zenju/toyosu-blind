import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyState } from './state.js';
import { THRESHOLDS } from './config.js';

test('deep inside the polygon is safe', () => {
  const state = classifyState({ inside: true, distanceToEdge: 25 }, THRESHOLDS);

  assert.equal(state, 'safe');
});

test('inside but within the caution distance is caution', () => {
  const state = classifyState({ inside: true, distanceToEdge: 15 }, THRESHOLDS);

  assert.equal(state, 'caution');
});

test('inside and within the warning distance is warning', () => {
  const state = classifyState({ inside: true, distanceToEdge: 5 }, THRESHOLDS);

  assert.equal(state, 'warning');
});

test('just outside, within the danger-outside buffer, is still warning', () => {
  const state = classifyState({ inside: false, distanceToEdge: 2 }, THRESHOLDS);

  assert.equal(state, 'warning');
});

test('outside beyond the danger-outside buffer is danger', () => {
  const state = classifyState({ inside: false, distanceToEdge: 5 }, THRESHOLDS);

  assert.equal(state, 'danger');
});

// Motion-aware tests

test('moving away from boundary suppresses caution to safe', () => {
  // inside 15m (caution), boundary is north (0°), moving south (180°) = directly away
  const state = classifyState(
    { inside: true, distanceToEdge: 15, bearingToEdge: 0 },
    THRESHOLDS,
    { speed: 1.0, heading: 180 },
  );
  assert.equal(state, 'safe');
});

test('moving toward boundary keeps caution', () => {
  // inside 15m (caution), moving directly toward boundary
  const state = classifyState(
    { inside: true, distanceToEdge: 15, bearingToEdge: 0 },
    THRESHOLDS,
    { speed: 1.0, heading: 0 },
  );
  assert.equal(state, 'caution');
});

test('approaching fast from safe distance upgrades to caution via TTB', () => {
  // inside 25m (safe), moving toward boundary at 2m/s → TTB = 12.5s < cautionTtbS(30)
  const state = classifyState(
    { inside: true, distanceToEdge: 25, bearingToEdge: 0 },
    THRESHOLDS,
    { speed: 2.0, heading: 0 },
  );
  assert.equal(state, 'caution');
});

test('approaching very fast from safe distance upgrades to warning via TTB', () => {
  // inside 25m (safe), moving toward boundary at 5m/s → TTB = 5s < warningTtbS(10)
  const state = classifyState(
    { inside: true, distanceToEdge: 25, bearingToEdge: 0 },
    THRESHOLDS,
    { speed: 5.0, heading: 0 },
  );
  assert.equal(state, 'warning');
});

test('speed below minimum falls back to distance-only (no suppression)', () => {
  // inside 15m (caution), heading away but speed too low to trust direction
  const state = classifyState(
    { inside: true, distanceToEdge: 15, bearingToEdge: 0 },
    THRESHOLDS,
    { speed: 0.1, heading: 180 },
  );
  assert.equal(state, 'caution');
});
