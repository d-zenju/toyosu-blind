import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeofence } from './geo-utils.js';

// Simple square polygon, ~111.32m per side, near the equator so that
// 1 degree of longitude and latitude both equal ~111320m (cos(0) = 1).
const SQUARE = [
  [0, 0],
  [0, 0.001],
  [0.001, 0.001],
  [0.001, 0],
  [0, 0],
];

test('point inside the polygon is reported as inside', () => {
  const geofence = createGeofence(SQUARE);

  const result = geofence.evaluate({ lat: 0.0005, lon: 0.0005 });

  assert.equal(result.inside, true);
});

test('point outside the polygon is reported as outside', () => {
  const geofence = createGeofence(SQUARE);

  const result = geofence.evaluate({ lat: 0.002, lon: 0.002 });

  assert.equal(result.inside, false);
});

test('distance to the nearest edge is reported for a point inside', () => {
  const geofence = createGeofence(SQUARE);

  // Center of the square is equidistant (half a side, ~55.66m) from every edge.
  const result = geofence.evaluate({ lat: 0.0005, lon: 0.0005 });

  assert.ok(Math.abs(result.distanceToEdge - 55.66) < 0.1);
});

test('distance to the nearest edge is reported for a point outside', () => {
  const geofence = createGeofence(SQUARE);

  // Diagonally outside the (0.001, 0.001) corner by (0.001, 0.001) degrees,
  // i.e. ~157.36m away (sqrt(2) * 111.32m).
  const result = geofence.evaluate({ lat: 0.002, lon: 0.002 });

  assert.ok(Math.abs(result.distanceToEdge - 157.36) < 0.1);
});

test('bearing to the nearest edge points toward the closer side', () => {
  const geofence = createGeofence(SQUARE);

  // This point is closer to the west edge (lon=0) than any other edge,
  // so the nearest point on the boundary is directly west (bearing 270).
  const result = geofence.evaluate({ lat: 0.0005, lon: 0.0002 });

  assert.ok(Math.abs(result.bearingToEdge - 270) < 0.1);
});
