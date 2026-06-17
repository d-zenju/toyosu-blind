import { THRESHOLDS, ACCURACY_WARN_M } from './config.js';

const STORAGE_KEY = 'toyosu-blind-settings';
const GEOJSON_KEY = 'toyosu-blind-geojson';

export const DEFAULT_SETTINGS = {
  warningM: THRESHOLDS.warningM,
  dangerInsideM: THRESHOLDS.dangerInsideM,
  minSpeedMps: THRESHOLDS.minSpeedMps,
  warningTtbS: THRESHOLDS.warningTtbS,
  accuracyWarnM: ACCURACY_WARN_M,
  warningFreqHz: 880,
  warningIntervalMs: 700,
  dangerFreqHz: 1320,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearSettings() {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadStoredGeojson() {
  try {
    const raw = localStorage.getItem(GEOJSON_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGeojson(geojson) {
  localStorage.setItem(GEOJSON_KEY, JSON.stringify(geojson));
}

export function clearStoredGeojson() {
  localStorage.removeItem(GEOJSON_KEY);
}

export function getStoredGeojsonName() {
  try {
    const raw = localStorage.getItem(GEOJSON_KEY + '-name');
    return raw || null;
  } catch {
    return null;
  }
}

export function saveGeojsonName(name) {
  localStorage.setItem(GEOJSON_KEY + '-name', name);
}

export function clearGeojsonName() {
  localStorage.removeItem(GEOJSON_KEY + '-name');
}
