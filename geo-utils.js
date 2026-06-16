const METERS_PER_DEGREE = 111320;

// Projects lon/lat to local meters relative to an origin, using a simple
// equirectangular approximation. Adequate for small areas (a few km across).
function project(origin, point) {
  const x = (point.lon - origin.lon) * METERS_PER_DEGREE * Math.cos((origin.lat * Math.PI) / 180);
  const y = (point.lat - origin.lat) * METERS_PER_DEGREE;
  return { x, y };
}

function isInside(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const crossesY = (a.y > point.y) !== (b.y > point.y);
    if (!crossesY) continue;
    const xAtY = a.x + ((point.y - a.y) / (b.y - a.y)) * (b.x - a.x);
    if (point.x < xAtY) inside = !inside;
  }
  return inside;
}

// Closest point to `point` on the segment a-b.
function closestPointOnSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return a;

  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function nearestPointOnRing(point, ring) {
  let nearest = null;
  let minDistance = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const candidate = closestPointOnSegment(point, ring[i], ring[i + 1]);
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = candidate;
    }
  }
  return { point: nearest, distance: minDistance };
}

export function createGeofence(polygonCoordinates) {
  const origin = { lon: polygonCoordinates[0][0], lat: polygonCoordinates[0][1] };
  const ring = polygonCoordinates.map(([lon, lat]) => project(origin, { lon, lat }));

  return {
    evaluate({ lat, lon }) {
      const point = project(origin, { lon, lat });
      const nearest = nearestPointOnRing(point, ring);
      const bearingToEdge =
        (Math.atan2(nearest.point.x - point.x, nearest.point.y - point.y) * 180) / Math.PI;
      return {
        inside: isInside(point, ring),
        distanceToEdge: nearest.distance,
        bearingToEdge: (bearingToEdge + 360) % 360,
      };
    },
  };
}
