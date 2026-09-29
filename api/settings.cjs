// WingManBackend/api/settings.cjs

const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Base directory for settings storage
const SETTINGS_DIR = path.join(__dirname, "..", "storage", "settings");

// Utility: load a JSON file safely
function loadJSON(filePath) {
  try {
    console.log(`[SettingsAPI] Loading file: ${filePath}`);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error("[SettingsAPI] Failed to load:", filePath, err);
    return null;
  }
}

// Utility: write a JSON file safely
function saveJSON(filePath, data) {
  try {
    console.log(`[SettingsAPI] Saving file: ${filePath}`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[SettingsAPI] Failed to save:", filePath, err);
    return false;
  }
}

// ------------------------------------------------------------
// POST /api/settings/read
// ------------------------------------------------------------
router.post("/read", (req, res) => {
  const { key } = req.body;
  console.log(`[SettingsAPI] READ called for key: ${key}`);

  if (!key) {
    console.warn("[SettingsAPI] READ missing key in request body");
    return res.json({ ok: false, error: "Missing key" });
  }

  const filePath = path.join(SETTINGS_DIR, `${key}.json`);

  if (!fs.existsSync(filePath)) {
    console.warn(`[SettingsAPI] Settings file not found for key: ${key}`);
    return res.json({ ok: false, error: `Settings file not found: ${key}` });
  }

  const data = loadJSON(filePath);

  if (!data) {
    console.error(`[SettingsAPI] Failed to read settings file for key: ${key}`);
    return res.json({ ok: false, error: "Failed to read settings file" });
  }

  console.log(`[SettingsAPI] READ success for key: ${key}`);
  return res.json({ ok: true, result: data });
});

// ------------------------------------------------------------
// POST /api/settings/write
// ------------------------------------------------------------
router.post("/write", (req, res) => {
  const { key, value } = req.body;
  console.log(`[SettingsAPI] WRITE called for key: ${key}`);

  if (!key || value === undefined) {
    console.warn("[SettingsAPI] WRITE missing key or value in request body");
    return res.json({ ok: false, error: "Missing key or value" });
  }

  const filePath = path.join(SETTINGS_DIR, `${key}.json`);

  const success = saveJSON(filePath, value);

  if (!success) {
    console.error(`[SettingsAPI] Failed to write settings file for key: ${key}`);
    return res.json({ ok: false, error: "Failed to write settings file" });
  }

  console.log(`[SettingsAPI] WRITE success for key: ${key}`);
  return res.json({ ok: true, result: true });
});

// ------------------------------------------------------------
// GET /api/settings/all
// ------------------------------------------------------------
router.get("/all", (req, res) => {
  console.log("[SettingsAPI] READ ALL called");

  const files = fs.readdirSync(SETTINGS_DIR);
  const all = {};

  for (const file of files) {
    if (file.endsWith(".json")) {
      const key = file.replace(".json", "");
      const fullPath = path.join(SETTINGS_DIR, file);
      const data = loadJSON(fullPath);
      all[key] = data;
    }
  }

  console.log("[SettingsAPI] READ ALL success");
  return res.json({ ok: true, result: all });
});
// ------------------------------------------------------------
// GET /api/settings
// Base settings endpoint expected by the launcher
// ------------------------------------------------------------
router.get("/", (req, res) => {
  try {
    const versionData = require(path.join(__dirname, "..", "public", "version.json"));

    res.json({
      ok: true,
      version: versionData.version,
      partitionRequired: true,
      continuityRequired: true,
      message: "WingMan backend settings OK"
    });
  } catch (err) {
    console.error("[SettingsAPI] Failed to load version.json:", err);
    res.status(500).json({ ok: false, error: "version.json missing or unreadable" });
  }
});

module.exports = router;
