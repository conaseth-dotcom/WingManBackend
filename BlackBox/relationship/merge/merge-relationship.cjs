/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/merge/merge-relationship.cjs
   Alias: @backend-blackbox/relationship/merge/merge-relationship.cjs
   Role: Performs high-level merging of relationship components. Consolidates
         profile, communication, collaboration, flow, memory, and onboarding
         into a unified relationship model.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] merge-relationship.cjs loaded");

// ---------------------------------------------------------------------------
// Exported merge function (converted from ESM)
// ---------------------------------------------------------------------------
function mergeRelationshipModules(normalizedModules) {
  if (!normalizedModules || typeof normalizedModules !== "object") {
    throw new Error("mergeRelationshipModules: invalid input");
  }

  return {
    ethics: normalizedModules.ethics,
    priorities: normalizedModules.priorities,
    profile: normalizedModules.profile,
    communication: normalizedModules.communication,
    collaboration: normalizedModules.collaboration,
    flow: normalizedModules.flow,
    memory: normalizedModules.memory,
    initialization: normalizedModules.initialization,
    onboarding: normalizedModules.onboarding,

    // Derived fields (computed from multiple modules)
    meta: {
      version: "1.0.0",
      merged_at: new Date().toISOString(),
      safety_mode:
        normalizedModules.ethics?.emotional_safety === "strict" &&
        normalizedModules.priorities?.safety_first === true
          ? "strict"
          : "standard"
    }
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  mergeRelationshipModules
};
