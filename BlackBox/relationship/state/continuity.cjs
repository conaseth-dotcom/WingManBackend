/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/state/continuity.cjs
   Alias: @blackbox/relationship/state/continuity
   Role: Unified continuity subsystem. Loads canonical + derived continuity
         files and provides safe read/write access for the relationship engine.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] continuity.cjs loaded");

const fs = require("fs");
const path = require("path");
const { Paths } = require("../../core/paths/paths.cjs");
const { loadJSON } = require("../../../partition/api/storage.cjs");
const writer = require("./continuity.writer.cjs");

// ------------------------------------------------------------
// Helper: ensure derived file exists
// ------------------------------------------------------------
function ensureDerived(canonical) {
  if (!canonical.aiWriteTarget) return null;

  const derivedPath = Paths.resolveVirtual(canonical.aiWriteTarget);

  if (!fs.existsSync(derivedPath)) {
    fs.mkdirSync(path.dirname(derivedPath), { recursive: true });
    fs.writeFileSync(derivedPath, JSON.stringify({}, null, 2));
  }

  return derivedPath;
}

// ------------------------------------------------------------
// Load canonical + derived continuity files
// ------------------------------------------------------------
function loadUnderstanding() {
  const canonicalPath =
    "wm://blackbox/relationship/state/ai.understanding.snapshot";

  const canonical = loadJSON(Paths.resolveVirtual(canonicalPath));
  const derivedPath = ensureDerived(canonical);
  const derived = loadJSON(derivedPath);

  return { canonical, derived };
}

function loadProjectMap() {
  const canonicalPath =
    "wm://blackbox/relationship/state/ai.project.map";

  const canonical = loadJSON(Paths.resolveVirtual(canonicalPath));
  const derivedPath = ensureDerived(canonical);
  const derived = loadJSON(derivedPath);

  return { canonical, derived };
}

function loadPreferences() {
  const canonicalPath =
    "wm://blackbox/relationship/state/preferences";

  const canonical = loadJSON(Paths.resolveVirtual(canonicalPath));
  const derivedPath = ensureDerived(canonical);
  const derived = loadJSON(derivedPath);

  return { canonical, derived };
}

// ------------------------------------------------------------
// Unified loader
// ------------------------------------------------------------
function loadAll() {
  return {
    understanding: loadUnderstanding(),
    projectMap: loadProjectMap(),
    preferences: loadPreferences()
  };
}

// ------------------------------------------------------------
// Unified writers (delegates to continuity.writer)
// ------------------------------------------------------------
function writeUnderstanding(data) {
  return writer.writeUnderstanding(data);
}

function writeProjectMap(data) {
  return writer.writeProjectMap(data);
}

function writePreferences(data) {
  return writer.writePreferences(data);
}

// ------------------------------------------------------------
// Export
// ------------------------------------------------------------
module.exports = {
  loadAll,
  loadUnderstanding,
  loadProjectMap,
  loadPreferences,
  writeUnderstanding,
  writeProjectMap,
  writePreferences
};
