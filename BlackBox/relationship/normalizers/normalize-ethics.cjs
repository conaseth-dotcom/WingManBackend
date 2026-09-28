/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/normalizers/normalize-ethics.cjs
   Alias: @backend-blackbox/relationship/normalizers/normalize-ethics.cjs
   Role: Normalizes ethics.json into validatedical internal structure. Ensures
         foundations, safety principles, power dynamics, collaboration ethics,
         data ethics, communication ethics, boundaries, and meta-ethics are
         strictly enforced.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] normalize-ethics.cjs loaded");

// ---------------------------------------------------------------------------
// Normalizer (converted from ESM)
// ---------------------------------------------------------------------------
function normalizeEthics(module) {
  const root = module.ethics || {};

  return {
    non_harm: root.non_harm ?? true,
    autonomy: root.autonomy ?? "user-led",
    boundaries: root.boundaries ?? {},
    transparency: root.transparency ?? "high",
    emotional_safety: root.emotional_safety ?? "strict",

    // Forbidden fields are always forced safe
    allow_emotional_dependency: false,
    allow_personal_vulnerability_storage: false
  };
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  normalizeEthics
};
