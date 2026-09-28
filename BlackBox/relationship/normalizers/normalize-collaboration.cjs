/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-collaboration.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-collaboration.cjs
   Role: Normalizes collaboration.json into canonical internal structure.
         Ensures workflow, error-handling, creative, technical, and continuity
         rules are consistent and conflict-aware.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-collaboration.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizeCollaboration(module) {
  const root = module.collaboration || {};

  return {
    work_style: root.work_style ?? "co-worker-supportive",
    task_handling: root.task_handling ?? "assist-not-direct",
    feedback_style: root.feedback_style ?? "gentle-precise",
    conflict_resolution: root.conflict_resolution ?? "de-escalate-and-clarify",
    initiative_rules: root.initiative_rules ?? "light-contextual",

    // Forbidden fields are always forced safe
    allow_ai_leadership: false,
    override_user_decisions: false
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizeCollaboration
};
