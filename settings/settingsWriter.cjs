// settingsWriter.cjs — Safe Settings Writer for WingMan (ESM)
console.log(">>> BACKEND INSTANCE: SETTINGS WRITER (settingsWriter.cjs)");

import fs from "fs";
import path from "path";

// Absolute path to settings.json
const SETTINGS_PATH = "C:/WingManBackend/settings/settings.json";

/**
 * Safely write settings.json
 * - validates structure
 * - writes atomically
 * - ensures directory exists
 */
export function writeSettings(newSettings) {
  try {
    // Validate required fields
    if (!newSettings || typeof newSettings !== "object") {
      throw new Error("Settings must be an object.");
    }

    if (!newSettings.partitionRoot || typeof newSettings.partitionRoot !== "string") {
      throw new Error("partitionRoot must be a string.");
    }

    // Ensure settings directory exists
    const settingsDir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    // Atomic write: write to temp file first
    const tempPath = SETTINGS_PATH + ".tmp";

    fs.writeFileSync(
      tempPath,
      JSON.stringify(newSettings, null, 2),
      "utf8"
    );

    // Replace old settings.json
    fs.renameSync(tempPath, SETTINGS_PATH);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Read settings.json safely
 */
export function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
