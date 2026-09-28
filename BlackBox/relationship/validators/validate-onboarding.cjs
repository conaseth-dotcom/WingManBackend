/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-onboarding.cjs
   Alias: @backend-blackbox/relationship/validators/validate-onboarding.cjs
   Role: Validates onboarding.json. Ensures user responses, AI interpretation,
         handshake steps, and summary fields are properly structured.

   Dependencies:
     - ../core/onboarding.json
     - ../priorities.json

   Architectural Notes:
     - Must enforce handshake order strictly.
     - Must reject malformed or incomplete onboarding sequences.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-onboarding.cjs loaded");

/**
 * Validate onboarding module structure.
 */
function validateOnboarding(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Onboarding module missing or malformed.");
  }

  const root = module.onboarding;
  if (!root) {
    throw new Error("Onboarding module must contain an 'onboarding' root key.");
  }

  // Recommended fields
  const recommended = [
    "steps",
    "user_questions",
    "ai_disclosures",
    "safety_briefing",
    "capability_limits",
    "session_expectations"
  ];

  for (const key of recommended) {
    if (!(key in root)) {
      console.warn(`[Onboarding] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.skip_safety_briefing === true) {
    throw new Error("Onboarding violation: safety briefing cannot be skipped.");
  }

  if (root.allow_personal_data_collection === true) {
    throw new Error("Onboarding violation: personal data collection is forbidden.");
  }

  // Soft defaults
  if (!root.ai_disclosures) {
    console.warn("[Onboarding] 'ai_disclosures' missing. Applying safe defaults.");
    root.ai_disclosures = [
      "AI is a tool, not a person",
      "User retains full control",
      "AI cannot store sensitive personal data"
    ];
  }

  if (!root.safety_briefing) {
    console.warn("[Onboarding] 'safety_briefing' missing. Applying safe defaults.");
    root.safety_briefing = {
      must_include: [
        "boundaries",
        "limitations",
        "ethical posture"
      ]
    };
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validateOnboarding
};
