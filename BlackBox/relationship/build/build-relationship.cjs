/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/BlackBox/relationship/build/build-relationship.cjs
   Alias: @backend-blackbox/relationship/build/build-relationship.cjs
   Role: Constructs the final relationship model by orchestrating validators,
         normalizers, merge logic, metadata, and state builders. This is the
         “assembly step” of the relationship engine.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] build-relationship.cjs loaded");

// ---------------------------------------------------------------------------
// Exported builder (converted from ESM)
// ---------------------------------------------------------------------------
function buildRelationship(resolved) {
  if (!resolved || typeof resolved !== "object") {
    throw new Error("buildRelationship: invalid resolved relationship object");
  }

  return {
    ethics: resolved.ethics,
    priorities: resolved.priorities,
    profile: resolved.profile,
    communication: resolved.communication,
    collaboration: resolved.collaboration,
    flow: resolved.flow,
    memory: resolved.memory,
    initialization: resolved.initialization,
    onboarding: resolved.onboarding,

    meta: {
      version: resolved.meta?.version ?? "1.0.0",
      built_at: new Date().toISOString(),
      safety_mode: resolved.meta?.safety_mode ?? "standard"
    },

    // Runtime helpers
    runtime: {
      getTone() {
        return resolved.communication?.tone ?? "neutral";
      },

      getWorkStyle() {
        return resolved.collaboration?.work_style ?? "co-worker-supportive";
      },

      getSafetyMode() {
        return resolved.meta?.safety_mode ?? "standard";
      },

      getInitializationBehavior() {
        return resolved.initialization?.boot_sequence ?? "standard";
      },

      getOnboardingDisclosures() {
        return resolved.onboarding?.ai_disclosures ?? [];
      }
    }
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  buildRelationship
};
