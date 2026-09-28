// C:\WingManBackend\api\voice.metadata.cjs

const fs = require("fs");
const path = require("path");

// Built-in Piper models
const BUILTIN_ROOT = "C:/WingManBackend/tts_piper/piper";
const VOICE_INDEX_PATH = "C:/WingManBackend/tts_piper/voice_index.json";

// User-installed voices registry (partition)
const USER_REGISTRY_PATH = "C:/WingManPartition/runtime/user.installed.voice.options.json";

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Built-in voices (Piper) — from .onnx + voice_index.json
// ------------------------------------------------------------
function loadBuiltinVoices() {
  const result = {};
  const index = safeReadJson(VOICE_INDEX_PATH) || {};

  if (!fs.existsSync(BUILTIN_ROOT)) {
    return result;
  }

  const files = fs.readdirSync(BUILTIN_ROOT);

  for (const file of files) {
    if (!file.endsWith(".onnx")) continue;

    const id = file; // e.g. "en_US-amy-medium.onnx"
    const fullPath = path.join(BUILTIN_ROOT, file);
    const jsonPath = path.join(BUILTIN_ROOT, file + ".json");

    const friendlyName = index[id] || id;

    const metaJson = safeReadJson(jsonPath) || {};

    result[id] = {
      id,
      name: friendlyName,
      source: "builtin",
      path: fullPath,
      metadataPath: fs.existsSync(jsonPath) ? jsonPath : null,
      locale: metaJson.locale || null,
      gender: metaJson.gender || null,
      description: metaJson.description || "Piper voice model",
      quality: metaJson.quality || null,
      engine: "piper"
    };
  }

  return result;
}

// ------------------------------------------------------------
// User-installed voices — from partition registry
// ------------------------------------------------------------
function loadUserVoices() {
  const registry = safeReadJson(USER_REGISTRY_PATH);
  const result = {};

  if (!registry || typeof registry !== "object") {
    return result;
  }

  for (const id of Object.keys(registry)) {
    const entry = registry[id] || {};

    result[id] = {
      id,
      name: entry.name || id,
      source: "user",
      path: entry.path || null,
      metadataPath: entry.metadata || null,
      locale: entry.locale || null,
      gender: entry.gender || null,
      description: entry.description || "User-installed voice",
      quality: entry.quality || null,
      engine: entry.engine || "piper"
    };
  }

  return result;
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

// List voices (merged: builtin + user)
function loadVoiceList() {
  const builtin = loadBuiltinVoices();
  const user = loadUserVoices();

  const merged = {};

  // Built-in first
  for (const id of Object.keys(builtin)) {
    merged[id] = builtin[id];
  }

  // User voices override / extend
  for (const id of Object.keys(user)) {
    merged[id] = user[id];
  }

  return Object.values(merged);
}

// Metadata for a specific voice id
function loadVoiceMetadata(voiceId) {
  const builtin = loadBuiltinVoices();
  const user = loadUserVoices();

  // User overrides builtin
  if (user[voiceId]) return user[voiceId];
  if (builtin[voiceId]) return builtin[voiceId];

  return null;
}

module.exports = {
  loadVoiceList,
  loadVoiceMetadata
};
