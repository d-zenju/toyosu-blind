// Geofence configuration. Edit these to retarget the app to a different area.

// Path to the GeoJSON file containing a single Feature/Polygon to use as the geofence.
export const GEOJSON_PATH = './toyosu.geojson';

// Warning level thresholds (distance in meters, time in seconds, speed in m/s).
export const THRESHOLDS = {
  // Inside the polygon, distance to the nearest edge at or below this is "warning".
  warningM: 9,
  // Inside the polygon, distance to the nearest edge at or below this is "danger".
  dangerInsideM: 3,
  // Motion-aware thresholds: require at least this GPS speed (m/s) to trust direction.
  minSpeedMps: 0.3,
  // Time-to-boundary (seconds) below which state is upgraded to "warning".
  warningTtbS: 10,
};

// If the GPS reading's accuracy (meters) exceeds this, show a low-accuracy notice.
export const ACCURACY_WARN_M = 20;
