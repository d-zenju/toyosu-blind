import { GEOJSON_PATH, THRESHOLDS, ACCURACY_WARN_M } from './config.js';
import { createGeofence } from './geo-utils.js';
import { classifyState } from './state.js';
import { createBeeper } from './audio.js';

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

function updateUi({ inside, distanceToEdge, bearingToEdge }, accuracy, motion = null) {
  const state = classifyState({ inside, distanceToEdge, bearingToEdge }, THRESHOLDS, motion);

  statusScreen.classList.remove('state-safe', 'state-caution', 'state-warning', 'state-danger');
  statusScreen.classList.add(`state-${state}`);
  stateLabel.textContent = STATE_LABELS[state];
  distanceEl.textContent = distanceToEdge.toFixed(0);

  const relativeAngle = ((bearingToEdge - heading) % 360 + 360) % 360;
  directionArrow.style.transform = `rotate(${relativeAngle}deg)`;

  const lowAccuracy = accuracy != null && accuracy > ACCURACY_WARN_M;
  accuracyNotice.classList.toggle('visible', lowAccuracy);

  beeper.setState(state);
}

function handlePosition(lat, lon, accuracy, speed = null, motionHeading = null) {
  const result = geofence.evaluate({ lat, lon });
  updateUi(result, accuracy, { speed, heading: motionHeading });
}

function startGeolocationWatch() {
  navigator.geolocation.watchPosition(
    (position) => {
      handlePosition(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy,
        position.coords.speed,
        position.coords.heading,
      );
    },
    (error) => {
      showError(`位置情報の取得に失敗しました: ${error.message}`);
    },
    { enableHighAccuracy: true, maximumAge: 1000 }
  );
}

function startDebugLoop() {
  const tick = () => {
    if (!debugEnable.checked) return;
    const lat = parseFloat(debugLat.value);
    const lon = parseFloat(debugLon.value);
    heading = parseFloat(debugHeading.value) || 0;
    const speed = parseFloat(debugSpeed.value) || 0;
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      handlePosition(lat, lon, null, speed, heading);
    }
  };
  tick();
  setInterval(tick, 500);
}

function handleOrientation(event) {
  if (debugEnable.checked) return;
  // webkitCompassHeading (iOS) is already a compass bearing (0 = North).
  // The standard `alpha` is the rotation of the device around the z-axis;
  // compass heading is approximately (360 - alpha).
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
  const response = await fetch(GEOJSON_PATH);
  const geojson = await response.json();
  const polygon = geojson.features[0].geometry.coordinates[0];
  return createGeofence(polygon);
}

async function start() {
  errorMessage.textContent = '';

  try {
    geofence = await loadGeofence();
  } catch {
    showError('ジオフェンスの読み込みに失敗しました');
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  beeper = createBeeper(audioContext);

  await requestOrientationPermission();

  if (debugEnable.checked) {
    startDebugLoop();
  } else if (navigator.geolocation) {
    startGeolocationWatch();
  } else {
    showError('この端末では位置情報が利用できません');
    return;
  }

  startScreen.style.display = 'none';
  statusScreen.style.display = 'flex';
}

startButton.addEventListener('click', start);
