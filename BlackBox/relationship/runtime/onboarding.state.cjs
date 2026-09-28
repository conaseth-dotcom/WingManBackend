/* ========================================================================
   WingMan Backend File
   Path: C:\WingManBackend\BlackBox\relationship\runtime\onboarding.state.cjs
   Alias: @backend-blackbox/relationship/runtime/onboarding.state.cjs
   Role: Stores temporary onboarding state during the handshake process.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] runtime/onboarding.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports
// ---------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");

// ⭐ REMOVE THIS — CommonJS already defines __dirname
// const __dirname = path.dirname(__filename);

// Build correct path to onboarding.json
const onboardingPath = path.join(__dirname, "onboarding.json");

// Load JSON safely
const onboardingJson = JSON.parse(fs.readFileSync(onboardingPath, "utf8"));

let onboardingCompleted = onboardingJson.status === "complete";

function hasCompletedOnboarding() {
  return onboardingCompleted === true;
}

function markOnboardingComplete() {
  onboardingCompleted = true;
  return onboardingCompleted;
}

function resetOnboarding() {
  onboardingCompleted = false;
  return onboardingCompleted;
}

module.exports = {
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding
};
