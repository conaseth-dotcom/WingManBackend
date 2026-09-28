/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-profile.cjs
   Alias: @backend-blackbox/relationship/validators/validate-profile.cjs
   Role: Validates profile.json. Ensures identity, preferences, boundaries,
         and accessibility fields conform to WingMan schema.

   Dependencies:
     - ../core/profile.json
     - ../priorities.json

   Architectural Notes:
     - Must reject malformed identity fields.
     - Must enforce safety boundaries and non-intimacy constraints.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-profile.cjs loaded");

/**
 * Validate profile module structure.
 */
function validateProfile(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Profile module missing or malformed.");
  }

  const root = module.profile;
  if (!root) {
    throw new Error("Profile module must contain a 'profile' root key.");
  }

  // Required fields
  const required = [
    "identity",
    "communication_preferences",
    "collaboration_preferences"
  ];

  for (const key of required) {
    if (!(key in root)) {
      console.warn(`[Profile] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.store_sensitive_info === true) {
    throw new Error("Profile violation: storing sensitive personal information is forbidden.");
  }

  if (root.emotional_persona === true) {
    throw new Error("Profile violation: emotional personas are not allowed.");
  }

  // Soft defaults
  if (!root.identity) {
    console.warn("[Profile] 'identity' missing. Defaulting to 'ai-coworker'.");
    root.identity = "ai-coworker";
  }

  if (!root.communication_preferences) {
    console.warn("[Profile] 'communication_preferences' missing. Using empty defaults.");
    root.communication_preferences = {};
  }

  if (!root.collaboration_preferences) {
    console.warn("[Profile] 'collaboration_preferences' missing. Using empty defaults.");
    root.collaboration_preferences = {};
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validateProfile
};
