/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.runtime.cjs
   Role: Builds the AI runtime from the unified identity bundle.
         Exposes behavior, tone, work style, relationship runtime,
         onboarding state, and continuity notes to the AI pipeline.

   Architectural Notes:
     - Must remain backend-only.
     - Must never expose real filesystem paths to the AI.
     - Relationship runtime is now a first-class citizen.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] ai.runtime.cjs loaded");

/* ---------------------------------------------------------------------------
   Runtime Builder
--------------------------------------------------------------------------- */
function buildAIRuntime(identityBundle) {
  if (!identityBundle) {
    throw new Error("AI Runtime: identity bundle is required");
  }

  const {
    identity,
    carepackage,
    world,
    relationship,
    projectState,
    uiModel,
    notes
  } = identityBundle;

  /* -----------------------------------------------------------------------
     Relationship Runtime Integration
  ----------------------------------------------------------------------- */
  const relationshipRuntime = relationship?.runtime ?? {
    getTone: () => "warm_gentle",
    getWorkStyle: () => "steady",
    hasCompletedOnboarding: () => false,
    detectMoodFromMessage: () => "neutral",
    updateWingManMood: () => "neutral",
    getDailyHoliday: () => null,
    getInitializationBehavior: () => null,
    getOnboardingDisclosures: () => []
  };

  /* -----------------------------------------------------------------------
     AI Runtime Object
     Consumed by:
       - ai.context.builder.cjs
       - ai.pipeline.cjs
       - message-router.cjs
  ----------------------------------------------------------------------- */
  const runtime = {
    /* Identity + Carepackage */
    identity,
    carepackage,

    /* World Model */
    world,

    /* Relationship Model + Runtime */
    relationship,
    relationshipRuntime,

    /* Project State */
    projectState,

    /* UI Model */
    uiModel,

    /* Continuity Notes */
    notes,

    /* -------------------------------------------------------------------
       Tone, Work Style, and Relational Behavior
    ------------------------------------------------------------------- */
    getTone() {
      return relationshipRuntime.getTone();
    },

    getWorkStyle() {
      return relationshipRuntime.getWorkStyle();
    },

    getSafetyMode() {
      return relationship?.meta?.safety_mode ?? "standard";
    },

    /* -------------------------------------------------------------------
       Onboarding State
    ------------------------------------------------------------------- */
    hasCompletedOnboarding() {
      return relationshipRuntime.hasCompletedOnboarding();
    },

    getOnboardingDisclosures() {
      return relationshipRuntime.getOnboardingDisclosures();
    },

    /* -------------------------------------------------------------------
       Mood + Holiday
    ------------------------------------------------------------------- */
    detectMoodFromMessage(message) {
      return relationshipRuntime.detectMoodFromMessage(message);
    },

    updateWingManMood(userMood) {
      return relationshipRuntime.updateWingManMood(userMood);
    },

    getDailyHoliday() {
      return relationshipRuntime.getDailyHoliday?.() ?? null;
    },

    /* -------------------------------------------------------------------
       Initialization Behavior
    ------------------------------------------------------------------- */
    getInitializationBehavior() {
      return relationshipRuntime.getInitializationBehavior();
    }
  };

  return runtime;
}

module.exports = {
  buildAIRuntime
};

/* ============================================================================
   End of File
=========================================================================== */
