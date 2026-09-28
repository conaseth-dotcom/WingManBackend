// C:\WingManBackend\audio\mic.engine.cjs
// WingMan Backend — single, always-on microphone engine (PCM/RMS/VAD hub)

const { EventEmitter } = require("events");
const record = require("node-record-lpcm16");

// ---------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------
const SAMPLE_RATE = 16000;
const CHANNELS = 1;

// RMS window size (samples)
const RMS_WINDOW = 1024;

// ---------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------
const emitter = new EventEmitter();

let micStream = null;

let initialized = false;
let micActive = false;
let muted = false;

let rmsAccumulator = [];
let lastError = null;

// ---------------------------------------------------------------------
// Helpers: RMS + VAD-ish (simple energy gate)
// ---------------------------------------------------------------------
function computeRms(samples) {
  if (!samples || samples.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] / 32768; // Int16 → [-1,1]
    sum += s * s;
  }
  return Math.sqrt(sum / samples.length);
}

function handlePcmChunk(chunk) {
  const view = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 2);

  if (muted) {
    rmsAccumulator.push(...view);

    if (rmsAccumulator.length >= RMS_WINDOW) {
      const window = rmsAccumulator.slice(0, RMS_WINDOW);
      rmsAccumulator = rmsAccumulator.slice(RMS_WINDOW);
      const rms = computeRms(window);
      emitter.emit("rms", rms);
    }

    return;
  }

  emitter.emit("pcm", chunk);

  try {
    const float32 = new Float32Array(view.length);
    for (let i = 0; i < view.length; i++) {
      float32[i] = view[i] / 32768;
    }

    global.mainWindow?.webContents.send("whisper:pcm", float32);

  } catch (err) {
    console.error("[mic.engine] whisper:pcm forward error:", err);
  }

  rmsAccumulator.push(...view);

  if (rmsAccumulator.length >= RMS_WINDOW) {
    const window = rmsAccumulator.slice(0, RMS_WINDOW);
    rmsAccumulator = rmsAccumulator.slice(RMS_WINDOW);
    const rms = computeRms(window);

    emitter.emit("rms", rms);

    try {
      global.mainWindow?.webContents.send("whisper:rms", rms);
    } catch (err) {
      console.error("[mic.engine] whisper:rms forward error:", err);
    }

    const THRESHOLD = 0.02;
    const vadState = rms > THRESHOLD ? "speech" : "silence";

    emitter.emit("vad", vadState);

    try {
      global.mainWindow?.webContents.send("whisper:vad", vadState);
    } catch (err) {
      console.error("[mic.engine] whisper:vad forward error:", err);
    }
  }
}

// ---------------------------------------------------------------------
// Core: start mic once at backend startup
// ---------------------------------------------------------------------
function startMicInternal() {
  if (micActive) {
    return;
  }

  try {
    micStream = record
      .start({
        sampleRate: SAMPLE_RATE,
        channels: CHANNELS,
        threshold: 0,
        endOnSilence: false,
        verbose: false
      })
      .on("data", (chunk) => {
        handlePcmChunk(chunk);
      })
      .on("error", (err) => {
        lastError = err?.message || String(err);
        micActive = false;
        emitter.emit("status", {
          active: false,
          muted,
          error: lastError
        });
      });

    micActive = true;
    lastError = null;

    emitter.emit("status", {
      active: true,
      muted,
      error: null
    });
  } catch (err) {
    lastError = err?.message || String(err);
    micActive = false;
    emitter.emit("status", {
      active: false,
      muted,
      error: lastError
    });
  }
}

// ---------------------------------------------------------------------
// Public API — called once at backend startup
// ---------------------------------------------------------------------
function initMicEngine() {
  if (initialized) {
    return;
  }

  initialized = true;
  startMicInternal();
}

// ---------------------------------------------------------------------
// Mute / unmute — gate PCM, keep hardware running
// ---------------------------------------------------------------------
function setMuted(isMuted) {
  muted = !!isMuted;
  emitter.emit("status", {
    active: micActive,
    muted,
    error: lastError
  });
}

function getMicStatus() {
  return {
    initialized,
    active: micActive,
    muted,
    error: lastError
  };
}

// ---------------------------------------------------------------------
// Shutdown (optional, e.g., on app quit)
// ---------------------------------------------------------------------
function destroyMicEngine() {
  try {
    if (micStream) {
      record.stop();
    }
  } catch (err) {}

  micStream = null;
  micActive = false;

  emitter.emit("status", {
    active: false,
    muted,
    error: null
  });
}

// ---------------------------------------------------------------------
// Subscription API — clients: Whisper, wizard, HUD, AI, etc.
// ---------------------------------------------------------------------
function onPcm(callback) {
  emitter.on("pcm", callback);
}

function onRms(callback) {
  emitter.on("rms", callback);
}

function onVad(callback) {
  emitter.on("vad", callback);
}

function onMicStatus(callback) {
  emitter.on("status", callback);
}

module.exports = {
  initMicEngine,
  setMuted,
  getMicStatus,
  destroyMicEngine,
  onPcm,
  onRms,
  onVad,
  onMicStatus
};
