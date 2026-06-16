const STATE_ORDER = ['safe', 'caution', 'warning', 'danger'];

function maxState(a, b) {
  return STATE_ORDER.indexOf(a) >= STATE_ORDER.indexOf(b) ? a : b;
}

function classifyByDistance({ inside, distanceToEdge }, thresholds) {
  if (inside) {
    if (distanceToEdge > thresholds.cautionM) return 'safe';
    if (distanceToEdge > thresholds.warningM) return 'caution';
    return 'warning';
  }
  return distanceToEdge <= thresholds.dangerOutsideM ? 'warning' : 'danger';
}

// Classifies the geofence evaluation into one of four warning levels:
// 'safe', 'caution', 'warning', 'danger'.
//
// motion = { speed: m/s, heading: degrees (GPS track, 0=north) } | null
// When motion data is absent or speed is below minSpeedMps, falls back to
// distance-only classification. When approaching, TTB-based upgrades apply.
// When clearly moving away, caution-level alerts are suppressed to safe.
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

  // Suppress caution when clearly moving away from the boundary while inside.
  if (inside && base === 'caution' && approachMps < -minSpeed) {
    return 'safe';
  }

  // Upgrade state when approaching: time-to-boundary takes precedence over distance.
  if (approachMps > 0) {
    const ttb = distanceToEdge / approachMps;
    if (ttb < (thresholds.warningTtbS ?? 10)) return maxState(base, 'warning');
    if (ttb < (thresholds.cautionTtbS ?? 30)) return maxState(base, 'caution');
  }

  return base;
}
