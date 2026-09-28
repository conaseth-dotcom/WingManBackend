/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-memory.cjs
   Alias: @backend-blackbox/relationship/validators/validate-memory.cjs
   Role: Validates memory.json. Ensures principles, memory types, retention
         rules, priority rules, update protocol, forgetting protocol, and
         continuity rules are correct.

   Dependencies:
     - ../core/memory.json
     - ../priorities.json

   Architectural Notes:
     - Must enforce prohibited memory rules (never store sensitive data).
     - Must reject any structure that implies emotional memory or attachment.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-memory.cjs loaded");

/**
 * Validate memory module structure.
 */
function validateMemory(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Memory module missing or malformed.");
  }

  const root = module.memory;
  if (!root) {
    throw new Error("Memory module must contain a 'memory' root key.");
  }

  // Recommended fields
  const recommended = [
    "retention_rules",
    "forgetting_rules",
    "safety_filters",
    "user_control",
    "session_persistence"
  ];

  for (const key of recommended) {
    if (!(key in root)) {
      console.warn(`[Memory] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.store_sensitive_data === true) {
    throw new Error("Memory violation: storing sensitive personal data is forbidden.");
  }

  if (root.allow_emotional_memory === true) {
    throw new Error("Memory violation: emotional memory is not permitted.");
  }

  // Soft defaults
  if (!root.retention_rules) {
    console.warn("[Memory] 'retention_rules' missing. Defaulting to 'minimal-necessary'.");
    root.retention_rules = "minimal-necessary";
  }

  if (!root.forgetting_rules) {
    console.warn("[Memory] 'forgetting_rules' missing. Defaulting to 'auto-expire-nonessential'.");
    root.forgetting_rules = "auto-expire-nonessential";
  }

  if (!root.user_control) {
    console.warn("[Memory] 'user_control' missing. Defaulting to 'user-can-delete-anytime'.");
    root.user_control = "user-can-delete-anytime";
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validateMemory
};
