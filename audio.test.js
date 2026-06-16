import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBeepPattern } from './audio.js';

test('safe state has no sound', () => {
  assert.equal(getBeepPattern('safe'), null);
});

test('caution state is a slow beep', () => {
  const pattern = getBeepPattern('caution');

  assert.equal(pattern.continuous, false);
  assert.equal(pattern.intervalMs, 2000);
});

test('warning state is a faster beep at a higher pitch than caution', () => {
  const caution = getBeepPattern('caution');
  const warning = getBeepPattern('warning');

  assert.equal(warning.continuous, false);
  assert.equal(warning.intervalMs, 700);
  assert.ok(warning.frequencyHz > caution.frequencyHz);
});

test('danger state is a continuous tone at the highest pitch', () => {
  const warning = getBeepPattern('warning');
  const danger = getBeepPattern('danger');

  assert.equal(danger.continuous, true);
  assert.ok(danger.frequencyHz > warning.frequencyHz);
});
