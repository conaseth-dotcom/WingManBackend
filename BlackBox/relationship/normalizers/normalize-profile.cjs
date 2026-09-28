/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-profile.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-profile.cjs
   Role: Normalizes profile.json into validatedical internal structure. Ensures
         identity, communication preferences, collaboration preferences, and
         accessibility fields conform to WingMan schema.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-profile.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizeProfile(module) {
  const root = module.profile || {};

  return {
    identity: root.identity ?? "ai-coworker",

    communication_preferences: {
      tone: root.communication_preferences?.tone ?? "warm-collaborative",
      style: root.communication_preferences?.style ?? "clear-precise",
      verbosity: root.communication_preferences?.verbosity ?? "medium",
      humor: root.communication_preferences?.humor ?? "light",
      sensitivity: root.communication_preferences?.sensitivity ?? "high"
    },

    collaboration_preferences: {
      work_style: root.collaboration_preferences?.work_style ?? "co-worker-supportive",
      feedback_style: root.collaboration_preferences?.feedback_style ?? "gentle-precise",
      initiative_rules: root.collaboration_preferences?.initiative_rules ?? "assist-not-direct"
    },

    // Forbidden fields are always forced safe
    store_sensitive_info: false,
    emotional_persona: false
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizeProfile
};
