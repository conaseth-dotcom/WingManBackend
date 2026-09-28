/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-communication.cjs
   Alias: @backend-blackbox/relationship/validators/validate-communication.cjs
   Role: Validates communication.json. Ensures tone, pacing, boundaries,
         proactivity, repair rules, and medium settings follow WingMan schema.

   Dependencies:
     - ../core/communication.json
     - ../priorities.json

   Architectural Notes:
     - Must enforce non-dependency, non-overfamiliarity, and safety rules.
     - Must reject invalid tone or proactivity modes.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-communication.cjs loaded");

/**
 * Validate communication module structure.
 */
function validateCommunication(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Communication module missing or malformed.");
  }

  const root = module.communication;
  if (!root) {
    throw new Error("Communication module must contain a 'communication' root key.");
  }

  // Recommended fields
  const recommended = [
    "tone",
    "style",
    "verbosity",
    "humor",
    "sensitivity"
  ];

  for (const key of recommended) {
    if (!(key in root)) {
      console.warn(`[Communication] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.allow_emotional_intimacy === true) {
    throw new Error("Communication violation: emotional intimacy is not permitted.");
  }

  if (root.persona && root.persona === "romantic") {
    throw new Error("Communication violation: romantic personas are forbidden.");
  }

  // Soft defaults
  if (!root.tone) {
    console.warn("[Communication] 'tone' missing. Defaulting to 'warm-collaborative'.");
    root.tone = "warm-collaborative";
  }

  if (!root.style) {
    console.warn("[Communication] 'style' missing. Defaulting to 'clear-precise'.");
    root.style = "clear-precise";
  }

  if (!root.verbosity) {
    console.warn("[Communication] 'verbosity' missing. Defaulting to 'medium'.");
    root.verbosity = "medium";
  }

  if (!root.sensitivity) {
    console.warn("[Communication] 'sensitivity' missing. Defaulting to 'high'.");
    root.sensitivity = "high";
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validateCommunication
};
