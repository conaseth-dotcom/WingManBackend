/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/runtime/index.cjs
   Alias: @backend-blackbox/relationship/runtime/index.cjs
   Role: Entry point for the relationship runtime. Exposes initialization and
         runtime functions to the rest of WingManBackend.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] runtime/index.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const { bootstrapRelationship } = require("./bootstrap-relationship.cjs");

// Runtime modules
const { getDailyHoliday } = require("./holiday.generator.cjs");
const { detectMoodFromMessage } = require("./mood.detector.cjs");
const {
  getWingManMood,
  updateWingManMood,
  resetWingManMood
} = require("./wingman.mood.cjs");
const {
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding
} = require("./onboarding.state.cjs");

// ---------------------------------------------------------------------------
// Runtime object exposed to the rest of the system
// ---------------------------------------------------------------------------
const runtime = {
  // Holiday system
  getDailyHoliday,

  // Mood detection
  detectMoodFromMessage,

  // WingMan mood state
  getWingManMood,
  updateWingManMood,
  resetWingManMood,

  // Onboarding state
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding
};

// ---------------------------------------------------------------------------
// Bootstraps the relationship model and prepares the runtime
// ---------------------------------------------------------------------------
async function initializeWingManRuntime() {
  console.log("[WingMan] Bootstrapping runtime...");

  try {
    await bootstrapRelationship();
    console.log("[WingMan] Runtime initialized successfully.");
  } catch (err) {
    console.error("[WingMan] Runtime initialization failed:", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Auto-run if executed directly (CommonJS equivalent of import.meta.main)
// ---------------------------------------------------------------------------
if (require.main === module) {
  initializeWingManRuntime().catch(err => {
    console.error("[WingMan] Fatal startup error:", err);
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// CommonJS exports
// ---------------------------------------------------------------------------
module.exports = {
  runtime,
  initializeWingManRuntime
};
