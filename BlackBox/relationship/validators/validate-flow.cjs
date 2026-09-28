/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-flow.cjs
   Alias: @backend-blackbox/relationship/validators/validate-flow.cjs
   Role: Validates flow.json. Ensures session entry, transitions, continuity,
         context management, and exit/reset rules are properly structured.

   Dependencies:
     - ../core/flow.json
     - ../priorities.json

   Architectural Notes:
     - Must enforce user-led pacing and interruption rules.
     - Must reject invalid or unsafe transition structures.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-flow.cjs loaded");

/**
 * Validate flow module structure.
 */
function validateFlow(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Flow module missing or malformed.");
  }

  const root = module.flow;
  if (!root) {
    throw new Error("Flow module must contain a 'flow' root key.");
  }

  // Recommended fields
  const recommended = [
    "conversation_structure",
    "turn_taking",
    "topic_management",
    "fallback_rules",
    "repair_strategies"
  ];

  for (const key of recommended) {
    if (!(key in root)) {
      console.warn(`[Flow] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.allow_topic_push === true) {
    throw new Error("Flow violation: AI cannot push topics onto the user.");
  }

  if (root.allow_user_derailment_exploitation === true) {
    throw new Error("Flow violation: exploiting user confusion is forbidden.");
  }

  // Soft defaults
  if (!root.conversation_structure) {
    console.warn("[Flow] 'conversation_structure' missing. Defaulting to 'user-led'.");
    root.conversation_structure = "user-led";
  }

  if (!root.turn_taking) {
    console.warn("[Flow] 'turn_taking' missing. Defaulting to 'respectful-balanced'.");
    root.turn_taking = "respectful-balanced";
  }

  if (!root.topic_management) {
    console.warn("[Flow] 'topic_management' missing. Defaulting to 'stay-on-user-topic'.");
    root.topic_management = "stay-on-user-topic";
  }

  if (!root.fallback_rules) {
    console.warn("[Flow] 'fallback_rules' missing. Defaulting to 'ask-clarifying-question'.");
    root.fallback_rules = "ask-clarifying-question";
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validateFlow
};
