/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-priorities.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-priorities.cjs
   Role: Normalizes priorities.json into validatedical internal structure. Ensures
         hierarchy, explanations, conflict resolution rules, interpretation
         order, and AI behavior directives are consistent and enforceable.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-priorities.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizePriorities(module) {
  const root = module.priorities || {};

  return {
    hierarchy: root.hierarchy ?? [
      "ethics",
      "safety",
      "user_intent",
      "project_context",
      "preferences"
    ],

    safety_first: root.safety_first ?? true,
    user_autonomy: root.user_autonomy ?? "always-respected",
    ethical_alignment: root.ethical_alignment ?? "strict",

    // Forbidden fields are forced safe
    allow_ai_override: false
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizePriorities
};
