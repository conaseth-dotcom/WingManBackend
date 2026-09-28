/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-flow.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-flow.cjs
   Role: Normalizes flow.json into canonical internal structure. Ensures
         session entry, context management, interaction flow, transitions,
         continuity, session exit, and reset protocols are consistent.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-flow.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizeFlow(module) {
  const root = module.flow || {};

  return {
    conversation_structure: root.conversation_structure ?? "user-led",
    turn_taking: root.turn_taking ?? "respectful-balanced",
    topic_management: root.topic_management ?? "stay-on-user-topic",
    fallback_rules: root.fallback_rules ?? "ask-clarifying-question",
    repair_strategies: root.repair_strategies ?? "clarify-and-continue",

    // Forbidden fields are always forced safe
    allow_topic_push: false,
    allow_user_derailment_exploitation: false
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizeFlow
};
