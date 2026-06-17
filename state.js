const STATE_ORDER = ['safe', 'caution', 'warning', 'danger'];

function maxState(a, b) {
  return STATE_ORDER.indexOf(a) >= STATE_ORDER.indexOf(b) ? a : b;
}

function classifyByDistance({ inside, distanceToEdge }, thresholds) {
  if (inside) {
    if (distanceToEdge > thresholds.warningM) return 'safe';
    if (distanceToEdge > thresholds.dangerInsideM) return 'warning';
    return 'danger';
  }
  return 'danger';
}

// Classifies the geofence evaluation into one of three warning levels:
// 'safe', 'warning', 'danger'.
//
// motion = { speed: m/s, heading: degrees (GPS track, 0=north) } | null
// When motion data is absent or speed is below minSpeedMps, falls back to
// distance-only classification. When approaching, TTB-based upgrades apply.
export function classifyState({ inside, distanceToEdge, bearingToEdge }, thresholds, motion = null) {
  const base = classifyByDistance({ inside, distanceToEdge }, thresholds);

  const minSpeed = thresholds.minSpeedMps ?? 0.3;
  const hasMotion =
    motion != null &&
    motion.speed != null &&
    motion.speed >= minSpeed &&
    motion.heading != null;

  if (!hasMotion) return base;

  const angleDiffRad =
    (((bearingToEdge - motion.heading) % 360 + 360) % 360) * (Math.PI / 180);
  const approachMps = motion.speed * Math.cos(angleDiffRad);

  // Upgrade state when approaching: time-to-boundary takes precedence over distance.
  if (approachMps > 0) {
    const ttb = distanceToEdge / approachMps;
    if (ttb < (thresholds.warningTtbS ?? 10)) return maxState(base, 'warning');
  }

  return base;
}
