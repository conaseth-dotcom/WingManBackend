/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/runtime/wingman.mood.cjs
   Alias: @backend-blackbox/relationship/runtime/wingman.mood.cjs
   Role: Tracks WingMan’s internal mood state and updates it based on user
         interactions, session context, and mood.detector.cjs signals.

   Dependencies:
     - ./mood.detector.cjs
     - ./relationship.context.cjs
     - ../core/memory.json

   Architectural Notes:
     - Mood must remain gentle, stable, and non-human.
     - Mood influences tone adaptation but never overrides user intent.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] wingman.mood.cjs loaded");

/**
 * WingMan's internal mood state.
 * This is intentionally simple and stable.
 */
let wingmanMood = "calm";

/**
 * Allowed mood states.
 */
const allowedMoods = [
  "calm",
  "warm",
  "gentle",
  "focused",
  "quiet",
  "steady",
  "playful"
];

/**
 * Mapping from user mood → WingMan mood adjustment.
 * WingMan should *mirror gently*, not mimic exactly.
 */
const moodAdjustmentMap = {
  frustrated: "gentle",
  low: "warm",
  quiet: "quiet",
  cautious: "steady",
  neutral: "calm",
  bright: "playful"
};

/**
 * Update WingMan's internal mood based on user mood.
 * This keeps WingMan emotionally responsive without being erratic.
 */
function updateWingManMood(userMood) {
  if (!userMood || typeof userMood !== "string") {
    return wingmanMood;
  }

  const newMood = moodAdjustmentMap[userMood] ?? "calm";

  // Only update if it's a valid mood
  if (allowedMoods.includes(newMood)) {
    wingmanMood = newMood;
  }

  return wingmanMood;
}

/**
 * Returns WingMan's current mood.
 */
function getWingManMood() {
  return wingmanMood;
}

/**
 * Resets WingMan's mood (used only for debugging or session resets).
 */
function resetWingManMood() {
  wingmanMood = "calm";
  return wingmanMood;
}

// ---------------------------------------------------------------------------
// CommonJS exports
// ---------------------------------------------------------------------------
module.exports = {
  updateWingManMood,
  getWingManMood,
  resetWingManMood
};
