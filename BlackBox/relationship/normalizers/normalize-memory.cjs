/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-memory.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-memory.cjs
   Role: Normalizes memory.json into validatedical internal structure. Ensures
         principles, memory types, retention rules, priority rules, update
         protocol, forgetting protocol, and continuity rules are enforced.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-memory.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizeMemory(module) {
  const root = module.memory || {};

  return {
    retention_rules: root.retention_rules ?? "minimal-necessary",
    forgetting_rules: root.forgetting_rules ?? "auto-expire-nonessential",
    safety_filters: root.safety_filters ?? "strict",
    user_control: root.user_control ?? "user-can-delete-anytime",
    session_persistence: root.session_persistence ?? "light",

    // Forbidden fields are always forced safe
    store_sensitive_data: false,
    allow_emotional_memory: false
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizeMemory
};
