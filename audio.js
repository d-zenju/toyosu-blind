// Maps a warning state to a beep pattern. Returns null for no sound, or an
// object describing the tone:
//   - frequencyHz: oscillator frequency
//   - intervalMs: time between beep starts (ignored when continuous)
//   - continuous: true for an unbroken alert tone
const PATTERNS = {
  safe: null,
  caution: { frequencyHz: 440, intervalMs: 2000, continuous: false },
  warning: { frequencyHz: 880, intervalMs: 700, continuous: false },
  danger: { frequencyHz: 1320, intervalMs: 0, continuous: true },
};

export function getBeepPattern(state) {
  return PATTERNS[state] ?? null;
}

const BEEP_DURATION_MS = 150;

// Plays the beep pattern for a warning state using the Web Audio API.
// Call setState() whenever the warning state changes; it stops any
// previous sound before starting the new pattern.
export function createBeeper(audioContext) {
  let timer = null;
  let oscillator = null;
  let gainNode = null;
  let currentState = null;

  function stopOscillator() {
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
  }

  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    stopOscillator();
    currentState = null;
  }

  function playPulse(frequencyHz) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.frequency.value = frequencyHz;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + BEEP_DURATION_MS / 1000);
  }

  function setState(state) {
    if (state === currentState) return;
    stop();
    currentState = state;

    const pattern = getBeepPattern(state);
    if (!pattern) return;

    if (pattern.continuous) {
      oscillator = audioContext.createOscillator();
      gainNode = audioContext.createGain();
      oscillator.frequency.value = pattern.frequencyHz;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
    } else {
      const tick = () => {
        playPulse(pattern.frequencyHz);
        timer = setTimeout(tick, pattern.intervalMs);
      };
      tick();
    }
  }

  return { setState, stop };
}
