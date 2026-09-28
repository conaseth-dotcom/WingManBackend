// api/tts.cjs — WingMan TTS HTTP API (Piper-based, cross-platform)
// Supports Windows (local dev) and Linux (Render.com) without code changes.

const express      = require("express");
const { execFile } = require("child_process");
const path         = require("path");
const fs           = require("fs");

const router = express.Router();

// ─── Platform detection ───────────────────────────────────────────────────────
const IS_LINUX = process.platform === "linux";

// Backend root (one level up from /api)
const ROOT = path.resolve(__dirname, "..");
const r    = (...parts) => path.join(ROOT, ...parts);

// ─── Piper binary ─────────────────────────────────────────────────────────────
// Priority: env var → platform default
const PIPER_BIN = process.env.PIPER_BIN || (IS_LINUX
  ? r("tts_piper", "piper")                                                  // Linux / Render
  : r("piper_cli", "piper_windows_amd64", "piper", "piper.exe"));            // Windows / local

// ─── Voice model ──────────────────────────────────────────────────────────────
const PIPER_MODEL = process.env.PIPER_MODEL || (IS_LINUX
  ? r("tts_piper", "models", "en_US-lessac-medium.onnx")                     // Linux / Render
  : r("piper_cli", "piper_windows_amd64", "piper", "models", "en_US-lessac-medium.onnx")); // Windows

// ─── Output directory ─────────────────────────────────────────────────────────
// /tmp is writable on Render and survives across requests (cleared by OS, not deploys)
const OUTPUT_DIR = process.env.TTS_OUTPUT_DIR || (IS_LINUX
  ? "/tmp/tts_output"
  : r("tts_output"));

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ─── Startup diagnostics ──────────────────────────────────────────────────────
console.log("[TTS] Platform    :", process.platform);
console.log("[TTS] PIPER_BIN   :", PIPER_BIN);
console.log("[TTS] PIPER_MODEL :", PIPER_MODEL);
console.log("[TTS] OUTPUT_DIR  :", OUTPUT_DIR);

// ─── execFile environment ─────────────────────────────────────────────────────
// On Linux, Piper ships its own .so files (libespeak-ng, libonnxruntime).
// LD_LIBRARY_PATH must point to the folder containing them.
function piperEnv() {
  if (!IS_LINUX) return process.env;
  return {
    ...process.env,
    LD_LIBRARY_PATH: [
      path.dirname(PIPER_BIN),
      process.env.LD_LIBRARY_PATH || ""
    ].filter(Boolean).join(":")
  };
}

// =============================================================================
// runPiperCLI(text) → absolute path to generated WAV file
// =============================================================================
async function runPiperCLI(text) {
  return new Promise((resolve, reject) => {
    const outFile = path.join(OUTPUT_DIR, `${Date.now()}.wav`);

    execFile(
      PIPER_BIN,
      [
        "--model",        PIPER_MODEL,
        "--speaker",      "0",
        "--length_scale", "1.0",
        "--noise_scale",  "0.667",
        "--noise_w",      "0.8",
        "--output_file",  outFile,
        "--text",         text
      ],
      { env: piperEnv() },
      (error) => {
        if (error) {
          console.error("[Piper] Error:", error.message);
          return reject(error);
        }
        resolve(outFile);
      }
    );
  });
}

// =============================================================================
// POST /api/tts/piper  { text }
// Returns: audio/wav bytes
// =============================================================================
router.post("/piper", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ ok: false, error: "Missing text" });
    }
    const wavPath  = await runPiperCLI(text);
    const wavBytes = fs.readFileSync(wavPath);
    res.setHeader("Content-Type",   "audio/wav");
    res.setHeader("Content-Length", wavBytes.length);
    res.send(wavBytes);
  } catch (err) {
    console.error("[TTS] Piper failed:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// GET /api/tts/list-voices
// =============================================================================
router.get("/list-voices", (_req, res) => {
  try {
    const modelDir = path.dirname(PIPER_MODEL);
    const voices   = fs.readdirSync(modelDir)
      .filter(f => f.endsWith(".onnx"))
      .map(f => ({ id: f, name: f }));
    res.json({ ok: true, voices });
  } catch (err) {
    console.error("[TTS] list-voices failed:", err.message);
    res.json({ ok: false, error: err.message });
  }
});

// =============================================================================
// GET /api/tts/metadata
// =============================================================================
router.get("/metadata", (_req, res) => {
  res.json({
    engine:     "piper-cli",
    platform:   process.platform,
    sampleRate: 22050,
    channels:   1,
    binary:     PIPER_BIN,
    model:      PIPER_MODEL,
    outputDir:  OUTPUT_DIR
  });
});

module.exports = { router };
