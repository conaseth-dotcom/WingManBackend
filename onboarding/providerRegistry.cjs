/**
 * ============================================================
 *  WingMan Provider Registry (Skeleton)
 *  ------------------------------------------------------------
 *  Role:
 *    Central list of all supported AI providers.
 *
 *  Owner:
 *    OnboardingPipeline.cjs imports this directly.
 *
 *  Scope:
 *    system-hidden (never exposed to AI)
 *
 *  Responsibilities:
 *    - Define provider metadata
 *    - Provide lookup functions
 *    - Ensure consistent provider naming
 *    - Prevent orphaned provider files
 *
 *  Notes:
 *    This file replaces scattered provider definitions.
 *    All providers must be registered here.
 * ============================================================
 */

const log = (...args) => console.log("[REGISTRY]", ...args);

// Provider definitions (expand as needed)
const PROVIDERS = {
  openai: {
    id: "openai",
    displayName: "OpenAI",
    requiresKey: true,
    keyPrefix: "sk-",
    testModel: "gpt-4o-mini" // or whatever you choose
  },

  anthropic: {
    id: "anthropic",
    displayName: "Anthropic (Claude)",
    requiresKey: true,
    keyPrefix: "sk-ant-",
    testModel: "claude-3-haiku"
  }
};

/**
 * Get provider definition by ID.
 */
function get(providerId) {
  log("Lookup provider:", providerId);
  return PROVIDERS[providerId] || null;
}

/**
 * List all providers.
 */
function list() {
  log("Listing all providers");
  return Object.values(PROVIDERS);
}

/**
 * Check if provider exists.
 */
function exists(providerId) {
  const found = !!PROVIDERS[providerId];
  log("Provider exists:", providerId, found);
  return found;
}

module.exports = {
  get,
  list,
  exists
};
