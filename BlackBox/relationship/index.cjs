/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/index.cjs
   Role: Relationship subsystem entry point.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] relationship/index.cjs loaded");

// ---------------------------------------------------------------------------
// Validators (converted from ESM)
// ---------------------------------------------------------------------------
const { validateEthics } = require("./validators/validate-ethics.cjs");
const { validatePriorities } = require("./validators/validate-priorities.cjs");
const { validateProfile } = require("./validators/validate-profile.cjs");
const { validateCommunication } = require("./validators/validate-communication.cjs");
const { validateCollaboration } = require("./validators/validate-collaboration.cjs");
const { validateFlow } = require("./validators/validate-flow.cjs");
const { validateMemory } = require("./validators/validate-memory.cjs");
const { validateInitialization } = require("./validators/validate-initialization.cjs");
const { validateOnboarding } = require("./validators/validate-onboarding.cjs");

// ---------------------------------------------------------------------------
// Normalizers (converted from ESM)
// ---------------------------------------------------------------------------
const { normalizeEthics } = require("./normalizers/normalize-ethics.cjs");
const { normalizePriorities } = require("./normalizers/normalize-priorities.cjs");
const { normalizeProfile } = require("./normalizers/normalize-profile.cjs");
const { normalizeCommunication } = require("./normalizers/normalize-communication.cjs");
const { normalizeCollaboration } = require("./normalizers/normalize-collaboration.cjs");
const { normalizeFlow } = require("./normalizers/normalize-flow.cjs");
const { normalizeMemory } = require("./normalizers/normalize-memory.cjs");
const { normalizeInitialization } = require("./normalizers/normalize-initialization.cjs");
const { normalizeOnboarding } = require("./normalizers/normalize-onboarding.cjs");

// ---------------------------------------------------------------------------
// Merger + Alias Resolver + Builder (converted from ESM)
// ---------------------------------------------------------------------------
const { mergeRelationshipModules } = require("./merge/merge-relationship.cjs");
const { resolveAliases } = require("./merge/resolve-aliases.cjs");
const { buildRelationship } = require("./build/build-relationship.cjs");

// ---------------------------------------------------------------------------
// Runtime layer (converted from ESM)
// ---------------------------------------------------------------------------
const { runtime: wingmanRuntime } = require("./runtime/index.cjs");

// ---------------------------------------------------------------------------
// Continuity Gateway (NEW)
// ---------------------------------------------------------------------------
const continuity = require("./state/continuity.gateway.cjs");

// ---------------------------------------------------------------------------
// Main loader function
// ---------------------------------------------------------------------------
function loadRelationshipModel(rawModules) {
  if (!rawModules || typeof rawModules !== "object") {
    throw new Error("loadRelationshipModel: rawModules must be an object");
  }

  // 1. VALIDATION
  validateEthics(rawModules);
  validatePriorities(rawModules);
  validateProfile(rawModules);
  validateCommunication(rawModules);
  validateCollaboration(rawModules);
  validateFlow(rawModules);
  validateMemory(rawModules);
  validateInitialization(rawModules);
  validateOnboarding(rawModules);

  // 2. NORMALIZATION
  const normalized = {
    ethics: normalizeEthics(rawModules),
    priorities: normalizePriorities(rawModules),
    profile: normalizeProfile(rawModules),
    communication: normalizeCommunication(rawModules),
    collaboration: normalizeCollaboration(rawModules),
    flow: normalizeFlow(rawModules),
    memory: normalizeMemory(rawModules),
    initialization: normalizeInitialization(rawModules),
    onboarding: normalizeOnboarding(rawModules)
  };

  // 3. MERGE
  const merged = mergeRelationshipModules(normalized);

  // 4. RESOLVE ALIASES
  const resolved = resolveAliases(merged);

  // 5. BUILD FINAL MODEL
  const model = buildRelationship(resolved);
  // 6. Attach continuity subsystem (canonical + derived)
  model.continuity = continuity.loadAll();

  // 7. Attach continuity writers for runtime use
  model.continuity.write = {
    understanding: continuity.writeUnderstanding,
    projectMap: continuity.writeProjectMap,
    preferences: continuity.writePreferences
  };

  // 8. ATTACH RUNTIME LAYER
  model.runtime = wingmanRuntime;

  return model;
}

// ---------------------------------------------------------------------------
// Export (CommonJS)
// ---------------------------------------------------------------------------
module.exports = {
  loadRelationshipModel
};
