/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-onboarding.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-onboarding.cjs
   Role: Normalizes onboarding.json into validatedical internal structure. Ensures
         user responses, AI interpretation, handshake steps, and summary fields
         are properly structured and consistent.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-onboarding.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizeOnboarding(module) {
  const root = module.onboarding || {};

  return {
    steps: root.steps ?? [],
    user_questions: root.user_questions ?? [],

    ai_disclosures: root.ai_disclosures ?? [
      "AI is a tool, not a person",
      "User retains full control",
      "AI cannot store sensitive personal data"
    ],

    safety_briefing: root.safety_briefing ?? {
      must_include: ["boundaries", "limitations", "ethical_posture"]
    },

    capability_limits: root.capability_limits ?? "standard",
    session_expectations: root.session_expectations ?? "collaborative-structured",

    // Forbidden fields are always forced safe
    skip_safety_briefing: false,
    allow_personal_data_collection: false
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizeOnboarding
};
