import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyState } from './state.js';
import { THRESHOLDS } from './config.js';

test('deep inside the polygon is safe', () => {
  const state = classifyState({ inside: true, distanceToEdge: 20 }, THRESHOLDS);

  assert.equal(state, 'safe');
});

test('inside and within the warning distance is warning', () => {
  const state = classifyState({ inside: true, distanceToEdge: 6 }, THRESHOLDS);

  assert.equal(state, 'warning');
});

test('inside and within the danger distance is danger', () => {
  const state = classifyState({ inside: true, distanceToEdge: 2 }, THRESHOLDS);

  assert.equal(state, 'danger');
});

test('outside the polygon is danger', () => {
  const state = classifyState({ inside: false, distanceToEdge: 5 }, THRESHOLDS);

  assert.equal(state, 'danger');
});

// Motion-aware tests

test('approaching fast from safe distance upgrades to warning via TTB', () => {
  // inside 20m (safe), moving toward boundary at 5m/s → TTB = 4s < warningTtbS(10)
  const state = classifyState(
    { inside: true, distanceToEdge: 20, bearingToEdge: 0 },
    THRESHOLDS,
    { speed: 5.0, heading: 0 },
  );
  assert.equal(state, 'warning');
});

test('approaching slowly from safe distance stays safe', () => {
  // inside 20m (safe), moving toward boundary at 1m/s → TTB = 20s > warningTtbS(10)
  const state = classifyState(
    { inside: true, distanceToEdge: 20, bearingToEdge: 0 },
    THRESHOLDS,
    { speed: 1.0, heading: 0 },
  );
  assert.equal(state, 'safe');
});

test('speed below minimum falls back to distance-only', () => {
  // inside 6m (warning), heading away but speed too low to trust direction
  const state = classifyState(
    { inside: true, distanceToEdge: 6, bearingToEdge: 0 },
    THRESHOLDS,
    { speed: 0.1, heading: 180 },
  );
  assert.equal(state, 'warning');
});
