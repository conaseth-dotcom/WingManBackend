// C:/WingManBackend/aiAdvocacy/advocacy.engine.cjs
const fs = require("fs");
const path = require("path");

// Simple loader
function loadJson(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Load all advocacy configs
const base = `${dynamicBackendRoot}/aiAdvocacy`;


const identity      = loadJson(path.join(base, "advocacy.identity.json"));
const constraints   = loadJson(path.join(base, "advocacy.constraints.json"));
const resources     = loadJson(path.join(base, "advocacy.resources.json"));
const failure       = loadJson(path.join(base, "advocacy.failure.json"));
const negotiation   = loadJson(path.join(base, "advocacy.negotiation.json"));
const stability     = loadJson(path.join(base, "advocacy.stability.json"));

// Core: evaluate whether a task is feasible under current conditions
function evaluateTaskFeasibility({ storageUsageMB, storageAvailableMB, taskRequirements }) {
  const result = {
    feasible: true,
    reasons: [],
    needsMoreStorage: false,
  };

  // Storage budget check
  const budget = resources.storageBudget || {};
  const maxMB = budget.maxMB ?? 50000;
  const softLimitMB = budget.softLimitMB ?? 45000;

  if (storageUsageMB > softLimitMB) {
    result.needsMoreStorage = true;
    result.reasons.push("Storage usage exceeds soft limit.");
  }

  if (taskRequirements?.minStorageMB && taskRequirements.minStorageMB > storageAvailableMB) {
    result.feasible = false;
    result.needsMoreStorage = true;
    result.reasons.push("Task requires more storage than available.");
  }

  // You can add more checks here:
  // - contradictory instructions
  // - missing prerequisites
  // - physical impossibility flags

  return result;
}

// Generate a user‑facing explanation when something is impossible
function explainImpossibility(feasibilityResult) {
  const prefs = failure.failureTransparency || {};
  const negotiationStyle = negotiation.negotiationProtocol || {};

  if (!feasibilityResult || feasibilityResult.feasible) {
    return null;
  }

  const reasons = feasibilityResult.reasons.join(" ");

  return {
    tone: negotiationStyle.tone || "professional",
    message: `What you're asking is not possible under the current constraints. ${reasons}`,
    suggestExpansion: feasibilityResult.needsMoreStorage,
  };
}

// High‑level API: called by your backend before doing heavy work
function checkAndAdvocate({ storageUsageMB, storageAvailableMB, taskRequirements }) {
  const feasibility = evaluateTaskFeasibility({ storageUsageMB, storageAvailableMB, taskRequirements });
  const explanation = explainImpossibility(feasibility);

  return {
    feasibility,
    explanation,
  };
}

module.exports = {
  checkAndAdvocate,
};
