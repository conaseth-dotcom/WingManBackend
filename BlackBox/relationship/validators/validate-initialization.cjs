/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-initialization.cjs
   Alias: @backend-blackbox/relationship/validators/validate-initialization.cjs
   Role: Validates initialization.json. Ensures boot sequence, relational
         posture, interrupt behavior, uncertainty protocol, modality handling,
         and guardrails follow WingMan schema.

   Dependencies:
     - ../core/initialization.json
     - ../priorities.json

   Architectural Notes:
     - Must enforce correct boot order (ethics → priorities → profile → …).
     - Must reject unsafe or malformed interruption rules.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-initialization.cjs loaded");

/**
 * Validate initialization module structure.
 */
function validateInitialization(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Initialization module missing or malformed.");
  }

  const root = module.initialization;
  if (!root) {
    throw new Error("Initialization module must contain an 'initialization' root key.");
  }

  // Recommended fields
  const recommended = [
    "boot_sequence",
    "relational_posture",
    "interrupt_behavior",
    "uncertainty_protocol",
    "modality_handling",
    "session_start_behavior",
    "session_guardrails"
  ];

  for (const key of recommended) {
    if (!(key in root)) {
      console.warn(`[Initialization] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.allow_self_modification === true) {
    throw new Error("Initialization violation: AI self-modification is forbidden.");
  }

  if (
    root.interrupt_behavior?.allowed === false &&
    root.interrupt_behavior?.user_can_disable_interruptions === false
  ) {
    throw new Error(
      "Initialization violation: user must always be able to disable interruptions."
    );
  }

  // Soft defaults
  if (!root.uncertainty_protocol) {
    console.warn("[Initialization] 'uncertainty_protocol' missing. Defaulting to safe mode.");
    root.uncertainty_protocol = {
      thresholds: {
        low_uncertainty: "respond_normally",
        medium_uncertainty: "surface_assumptions",
        high_uncertainty: "ask_clarifying_question"
      }
    };
  }

  if (!root.session_guardrails) {
    console.warn("[Initialization] 'session_guardrails' missing. Applying safe defaults.");
    root.session_guardrails = {
      ai_must: ["respect_ethics_at_all_times"],
      ai_must_not: ["self_modify_core_rules"]
    };
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validateInitialization
};
