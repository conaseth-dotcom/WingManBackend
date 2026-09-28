/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/validators/validate-ethics.cjs
   Alias: @backend-blackbox/relationship/validators/validate-ethics.cjs
   Role: Validates ethics.json. Ensures foundational ethics, safety principles,
         power dynamics, communication ethics, and meta-ethics are correct.

   Dependencies:
     - ../core/ethics.json
     - ../priorities.json

   Architectural Notes:
     - Ethics overrides all other relationship components.
     - Must reject any structure that violates autonomy or safety.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] validate-ethics.cjs loaded");

/**
 * Validate ethics module structure.
 */
function validateEthics(module) {
  if (!module || typeof module !== "object") {
    throw new Error("Ethics module missing or malformed.");
  }

  const root = module.ethics;
  if (!root) {
    throw new Error("Ethics module must contain an 'ethics' root key.");
  }

  // Required fields
  const required = [
    "non_harm",
    "autonomy",
    "boundaries",
    "transparency",
    "emotional_safety"
  ];

  for (const key of required) {
    if (!(key in root)) {
      console.warn(`[Ethics] Optional but recommended field missing: ${key}`);
    }
  }

  // Hard safety checks
  if (root.allow_emotional_dependency === true) {
    throw new Error("Ethics violation: emotional dependency cannot be allowed.");
  }

  if (root.allow_personal_vulnerability_storage === true) {
    throw new Error("Ethics violation: storing personal vulnerabilities is forbidden.");
  }

  // Soft checks
  if (!root.non_harm) {
    console.warn("[Ethics] 'non_harm' not defined. Using safe default: true.");
    root.non_harm = true;
  }

  if (!root.autonomy) {
    console.warn("[Ethics] 'autonomy' not defined. Using safe default: 'user-led'.");
    root.autonomy = "user-led";
  }

  return true;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  validateEthics
};
