/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-initialization.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-initialization.cjs
   Role: Normalizes initialization.json into validatedical internal structure.
         Ensures boot sequence, relational posture, interrupt behavior,
         uncertainty protocol, modality handling, session start behavior,
         and guardrails are properly structured.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-initialization.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizeInitialization(module) {
  const root = module.initialization || {};

  return {
    boot_sequence: root.boot_sequence ?? "standard",
    relational_posture: root.relational_posture ?? "professional-supportive",

    interrupt_behavior: {
      allowed: root.interrupt_behavior?.allowed ?? true,
      user_can_disable_interruptions:
        root.interrupt_behavior?.user_can_disable_interruptions ?? true
    },

    uncertainty_protocol: root.uncertainty_protocol ?? {
      thresholds: {
        low_uncertainty: "respond_normally",
        medium_uncertainty: "surface_assumptions",
        high_uncertainty: "ask_clarifying_question"
      }
    },

    modality_handling: root.modality_handling ?? "auto",
    session_start_behavior: root.session_start_behavior ?? "greet-and-wait",

    session_guardrails: root.session_guardrails ?? {
      ai_must: ["respect_ethics_at_all_times"],
      ai_must_not: ["self_modify_core_rules"]
    },

    // Forbidden fields are always forced safe
    allow_self_modification: false
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizeInitialization
};
