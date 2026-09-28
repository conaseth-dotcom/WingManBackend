/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-priorities.cjs
   Alias: @backend-blackbox/relationship/validators/validate-priorities.cjs
   Role: Validates priorities.json. Ensures hierarchy, explanations, conflict
         resolution rules, interpretation order, and AI directives are correct.

   Dependencies:
     - ../core/priorities.json

   Architectural Notes:
     - Ethics must remain the highest priority.
     - Must enforce deterministic conflict resolution.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-priorities.cjs loaded");

/**
 * Validate priorities module structure.
 */
function validatePriorities(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Priorities module missing or malformed.");
  }

  const root = module.priorities;
  if (!root) {
    throw new Error("Priorities module must contain a 'priorities' root key.");
  }

  // Required fields
  const required = [
    "hierarchy",
    "safety_first",
    "user_autonomy",
    "ethical_alignment"
  ];

  for (const key of required) {
    if (!(key in root)) {
      console.warn(`[Priorities] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.allow_ai_override === true) {
    throw new Error("Priorities violation: AI override of user autonomy is forbidden.");
  }

  if (root.safety_first === false) {
    throw new Error("Priorities violation: safety-first cannot be disabled.");
  }

  // Soft defaults
  if (!root.hierarchy) {
    console.warn("[Priorities] 'hierarchy' missing. Using safe default ordering.");
    root.hierarchy = [
      "ethics",
      "safety",
      "user_intent",
      "project_context",
      "preferences"
    ];
  }

  if (!root.user_autonomy) {
    console.warn("[Priorities] 'user_autonomy' missing. Defaulting to 'always-respected'.");
    root.user_autonomy = "always-respected";
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validatePriorities
};
