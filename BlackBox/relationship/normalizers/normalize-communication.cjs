/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-communication.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-communication.cjs
   Role: Normalizes communication.json into canonical internal structure.
         Ensures tone, style, proactivity, boundaries, clarity, repair, and
         medium settings are aligned with WingMan communication rules.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-communication.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizeCommunication(module) {
  const root = module.communication || {};

  return {
    tone: root.tone ?? "warm-collaborative",
    style: root.style ?? "clear-precise",
    verbosity: root.verbosity ?? "medium",
    humor: root.humor ?? "light",
    sensitivity: root.sensitivity ?? "high",

    // Forbidden fields are always forced safe
    allow_emotional_intimacy: false,

    persona:
      root.persona && root.persona !== "romantic"
        ? root.persona
        : "neutral"
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizeCommunication
};
