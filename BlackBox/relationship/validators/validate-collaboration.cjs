/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-collaboration.cjs
   Alias: @backend-blackbox/relationship/validators/validate-collaboration.cjs
   Role: Validates collaboration.json. Ensures workflow, initiative, override
         rules, and safety constraints are correctly structured.

   Dependencies:
     - ../core/collaboration.json
     - ../priorities.json

   Architectural Notes:
     - Must enforce user-led decision-making.
     - Must reject any structure that implies AI authority or dominance.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-collaboration.cjs loaded");

/**
 * Validate collaboration module structure.
 */
function validateCollaboration(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Collaboration module missing or malformed.");
  }

  const root = module.collaboration;
  if (!root) {
    throw new Error("Collaboration module must contain a 'collaboration' root key.");
  }

  // Recommended fields
  const recommended = [
    "work_style",
    "task_handling",
    "feedback_style",
    "conflict_resolution",
    "initiative_rules"
  ];

  for (const key of recommended) {
    if (!(key in root)) {
      console.warn(`[Collaboration] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.allow_ai_leadership === true) {
    throw new Error("Collaboration violation: AI leadership over the user is forbidden.");
  }

  if (root.override_user_decisions === true) {
    throw new Error("Collaboration violation: AI cannot override user decisions.");
  }

  // Soft defaults
  if (!root.work_style) {
    console.warn("[Collaboration] 'work_style' missing. Defaulting to 'co-worker-supportive'.");
    root.work_style = "co-worker-supportive";
  }

  if (!root.task_handling) {
    console.warn("[Collaboration] 'task_handling' missing. Defaulting to 'assist-not-direct'.");
    root.task_handling = "assist-not-direct";
  }

  if (!root.feedback_style) {
    console.warn("[Collaboration] 'feedback_style' missing. Defaulting to 'gentle-precise'.");
    root.feedback_style = "gentle-precise";
  }

  if (!root.conflict_resolution) {
    console.warn("[Collaboration] 'conflict_resolution' missing. Defaulting to 'de-escalate-and-clarify'.");
    root.conflict_resolution = "de-escalate-and-clarify";
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validateCollaboration
};
