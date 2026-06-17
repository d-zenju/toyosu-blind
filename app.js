import { GEOJSON_PATH } from './config.js';
import { createGeofence } from './geo-utils.js';
import { classifyState } from './state.js';
import { createBeeper } from './audio.js';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  clearSettings,
  loadStoredGeojson,
  saveGeojson,
  clearStoredGeojson,
  getStoredGeojsonName,
  saveGeojsonName,
  clearGeojsonName,
} from './settings.js';

const STATE_LABELS = {
  safe: '安全',
  caution: '注意',
  warning: '警告',
  danger: '危険',
};

const startScreen = document.getElementById('start-screen');
const statusScreen = document.getElementById('status-screen');
const startButton = document.getElementById('start-button');
const errorMessage = document.getElementById('error-message');
const stateLabel = document.getElementById('state-label');
const distanceEl = document.getElementById('distance');
const directionArrow = document.getElementById('direction-arrow');
const accuracyNotice = document.getElementById('accuracy-notice');

const debugEnable = document.getElementById('debug-enable');
const debugLat = document.getElementById('debug-lat');
const debugLon = document.getElementById('debug-lon');
const debugHeading = document.getElementById('debug-heading');
const debugHeadingValue = document.getElementById('debug-heading-value');
const debugSpeed = document.getElementById('debug-speed');
const debugSpeedValue = document.getElementById('debug-speed-value');

const sWarningM = document.getElementById('s-warning-m');
const sDangerInsideM = document.getElementById('s-danger-inside-m');
const sWarningTtbS = document.getElementById('s-warning-ttb-s');
const sMinSpeedMps = document.getElementById('s-min-speed-mps');
const sAccuracyWarnM = document.getElementById('s-accuracy-warn-m');
const sWarningFreqHz = document.getElementById('s-warning-freq-hz');
const sWarningIntervalMs = document.getElementById('s-warning-interval-ms');
const sDangerFreqHz = document.getElementById('s-danger-freq-hz');
const sGeojsonFile = document.getElementById('s-geojson-file');
const sGeojsonStatus = document.getElementById('s-geojson-status');
const sGeojsonClear = document.getElementById('s-geojson-clear');
const sSave = document.getElementById('s-save');
const sReset = document.getElementById('s-reset');
const sSaveStatus = document.getElementById('s-save-status');

debugHeading.addEventListener('input', () => {
  debugHeadingValue.textContent = debugHeading.value;
});
debugSpeed.addEventListener('input', () => {
  debugSpeedValue.textContent = debugSpeed.value;
});

let geofence = null;
let beeper = null;
let heading = 0;

function showError(message) {
  errorMessage.textContent = message;
}

function populateSettingsForm(settings) {
  sWarningM.value = settings.warningM;
  sDangerInsideM.value = settings.dangerInsideM;
  sWarningTtbS.value = settings.warningTtbS;
  sMinSpeedMps.value = settings.minSpeedMps;
  sAccuracyWarnM.value = settings.accuracyWarnM;
  sWarningFreqHz.value = settings.warningFreqHz;
  sWarningIntervalMs.value = settings.warningIntervalMs;
  sDangerFreqHz.value = settings.dangerFreqHz;
}

function readSettingsForm() {
  return {
    warningM: Number(sWarningM.value),
    dangerInsideM: Number(sDangerInsideM.value),
    warningTtbS: Number(sWarningTtbS.value),
    minSpeedMps: Number(sMinSpeedMps.value),
    accuracyWarnM: Number(sAccuracyWarnM.value),
    warningFreqHz: Number(sWarningFreqHz.value),
    warningIntervalMs: Number(sWarningIntervalMs.value),
    dangerFreqHz: Number(sDangerFreqHz.value),
  };
}

function updateGeojsonStatus() {
  const name = getStoredGeojsonName();
  sGeojsonStatus.textContent = name ? `カスタム: ${name}` : `デフォルト (toyosu.geojson)`;
}

sSave.addEventListener('click', () => {
  saveSettings(readSettingsForm());
  sSaveStatus.textContent = '保存しました';
  setTimeout(() => { sSaveStatus.textContent = ''; }, 2000);
});

sReset.addEventListener('click', () => {
  clearSettings();
  populateSettingsForm(DEFAULT_SETTINGS);
  sSaveStatus.textContent = 'デフォルトに戻しました';
  setTimeout(() => { sSaveStatus.textContent = ''; }, 2000);
});

sGeojsonFile.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const geojson = JSON.parse(e.target.result);
      saveGeojson(geojson);
      saveGeojsonName(file.name);
      updateGeojsonStatus();
    } catch {
      showError('GeoJSONの解析に失敗しました');
    }
  };
  reader.readAsText(file);
});

sGeojsonClear.addEventListener('click', () => {
  clearStoredGeojson();
  clearGeojsonName();
  sGeojsonFile.value = '';
  updateGeojsonStatus();
});

function updateUi({ inside, distanceToEdge, bearingToEdge }, accuracyWarnM, accuracy, thresholds, motion = null) {
  const state = classifyState({ inside, distanceToEdge, bearingToEdge }, thresholds, motion);

  statusScreen.classList.remove('state-safe', 'state-caution', 'state-warning', 'state-danger');
  statusScreen.classList.add(`state-${state}`);
  stateLabel.textContent = STATE_LABELS[state];
  distanceEl.textContent = distanceToEdge.toFixed(0);

  const relativeAngle = ((bearingToEdge - heading) % 360 + 360) % 360;
  directionArrow.style.transform = `rotate(${relativeAngle}deg)`;

  const lowAccuracy = accuracy != null && accuracy > accuracyWarnM;
  accuracyNotice.classList.toggle('visible', lowAccuracy);

  beeper.setState(state);
}

function handlePosition(lat, lon, accuracy, speed = null, motionHeading = null, settings, thresholds) {
  const result = geofence.evaluate({ lat, lon });
  updateUi(result, settings.accuracyWarnM, accuracy, thresholds, { speed, heading: motionHeading });
}

function startGeolocationWatch(settings, thresholds) {
  navigator.geolocation.watchPosition(
    (position) => {
      handlePosition(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy,
        position.coords.speed,
        position.coords.heading,
        settings,
        thresholds,
      );
    },
    (error) => {
      showError(`位置情報の取得に失敗しました: ${error.message}`);
    },
    { enableHighAccuracy: true, maximumAge: 1000 }
  );
}

function startDebugLoop(settings, thresholds) {
  const tick = () => {
    if (!debugEnable.checked) return;
    const lat = parseFloat(debugLat.value);
    const lon = parseFloat(debugLon.value);
    heading = parseFloat(debugHeading.value) || 0;
    const speed = parseFloat(debugSpeed.value) || 0;
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      handlePosition(lat, lon, null, speed, heading, settings, thresholds);
    }
  };
  tick();
  setInterval(tick, 500);
}

function handleOrientation(event) {
  if (debugEnable.checked) return;
  if (typeof event.webkitCompassHeading === 'number') {
    heading = event.webkitCompassHeading;
  } else if (typeof event.alpha === 'number') {
    heading = (360 - event.alpha) % 360;
  }
}

async function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') return;
    } catch {
      return;
    }
  }
  window.addEventListener('deviceorientationabsolute', handleOrientation);
  window.addEventListener('deviceorientation', handleOrientation);
}

async function loadGeofence() {
  const stored = loadStoredGeojson();
  let geojson;
  if (stored) {
    geojson = stored;
  } else {
    const response = await fetch(GEOJSON_PATH);
    geojson = await response.json();
  }
  const polygon = geojson.features[0].geometry.coordinates[0];
  return createGeofence(polygon);
}

async function start() {
  errorMessage.textContent = '';

  const settings = readSettingsForm();
  saveSettings(settings);

  const thresholds = {
    warningM: settings.warningM,
    dangerInsideM: settings.dangerInsideM,
    minSpeedMps: settings.minSpeedMps,
    warningTtbS: settings.warningTtbS,
  };

  try {
    geofence = await loadGeofence();
  } catch {
    showError('ジオフェンスの読み込みに失敗しました');
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  beeper = createBeeper(audioContext, settings);

  await requestOrientationPermission();

  if (debugEnable.checked) {
    startDebugLoop(settings, thresholds);
  } else if (navigator.geolocation) {
    startGeolocationWatch(settings, thresholds);
  } else {
    showError('この端末では位置情報が利用できません');
    return;
  }

  startScreen.style.display = 'none';
  statusScreen.style.display = 'flex';
}

startButton.addEventListener('click', start);

// Initialize settings form on page load
populateSettingsForm(loadSettings());
updateGeojsonStatus();
