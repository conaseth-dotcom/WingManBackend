/* ========================================================================
   WingMan Continuity Gateway
   Path: BlackBox/relationship/state/continuity.gateway.cjs
   Role: Blanket directive for continuity. Intercepts loads/writes for
         understanding, project map, and preferences. Prevents direct
         canonical writes and provides unified access.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] continuity.gateway.cjs loaded");

const fs = require("fs");
const path = require("path");
const { Paths } = require("../../core/paths/paths.cjs");
const writer = require("./continuity.writer.cjs");
const { loadJSON } = require("../../../partition/api/storage.cjs");

// ------------------------------------------------------------
// Canonical continuity virtual paths
// ------------------------------------------------------------
const CANONICAL = {
  understanding: "wm://blackbox/relationship/state/ai.understanding.snapshot",
  projectMap: "wm://blackbox/relationship/state/ai.project.map",
  preferences: "wm://blackbox/relationship/state/preferences"
};

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
// Unified loaders
// ------------------------------------------------------------
function loadUnderstanding() {
  const canonical = loadJSON(Paths.resolveVirtual(CANONICAL.understanding));
  const derivedPath = ensureDerived(canonical);
  const derived = loadJSON(derivedPath);
  return { canonical, derived };
}

function loadProjectMap() {
  const canonical = loadJSON(Paths.resolveVirtual(CANONICAL.projectMap));
  const derivedPath = ensureDerived(canonical);
  const derived = loadJSON(derivedPath);
  return { canonical, derived };
}

function loadPreferences() {
  const canonical = loadJSON(Paths.resolveVirtual(CANONICAL.preferences));
  const derivedPath = ensureDerived(canonical);
  const derived = loadJSON(derivedPath);
  return { canonical, derived };
}

// ------------------------------------------------------------
// Unified writers
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
// Blanket directive: unified continuity API
// ------------------------------------------------------------
module.exports = {
  loadAll() {
    return {
      understanding: loadUnderstanding(),
      projectMap: loadProjectMap(),
      preferences: loadPreferences()
    };
  },

  getUnderstanding: () => loadUnderstanding().derived,
  getProjectMap: () => loadProjectMap().derived,
  getPreferences: () => loadPreferences().derived,

  writeUnderstanding,
  writeProjectMap,
  writePreferences
};
