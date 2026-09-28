/**
 * ============================================================
 *  WingMan Onboarding Pipeline (Skeleton)
 *  ------------------------------------------------------------
 *  Role:
 *    Central orchestrator for all AI provider onboarding.
 *
 *  Owner:
 *    Backend → server.cjs imports this directly.
 *
 *  Scope:
 *    system-hidden (never exposed to AI)
 *
 *  Responsibilities:
 *    - Accept onboarding requests from frontend
 *    - Validate key format per provider
 *    - Test connection per provider
 *    - Write encrypted key to secure vault
 *    - Update provider metadata
 *    - Load provider implementation
 *    - Return onboarding result to frontend
 *
 *  Notes:
 *    This file replaces scattered onboarding logic across
 *    multiple backend files. All onboarding flows must pass
 *    through this pipeline.
 * ============================================================
 */

const providerRegistry = require("../providers/providerRegistry.cjs");
const providerKeyStore = require("../storage/providerKeyStore.cjs");
const loadProviderImplementation = require("../providers/loadProvider.cjs");

// Optional: centralized logging
const log = (...args) => console.log("[ONBOARD]", ...args);

/**
 * Entry point for onboarding.
 * Called by server.cjs when frontend submits provider + key.
 */
async function onboardProvider({ provider, nickname, apiKey }) {
  log("Received onboarding request:", { provider, nickname });

  // 1. Load provider definition
  const providerDef = providerRegistry.get(provider);
  if (!providerDef) {
    log("Provider not found:", provider);
    return { success: false, error: "Unknown provider." };
  }
  log("Loaded provider definition:", provider);

  // 2. Validate key format
  log("Validating key format...");
  const isValidFormat = providerKeyStore.validateKey(provider, apiKey);
  log("Key format result:", isValidFormat);

  if (!isValidFormat) {
    return { success: false, error: "Invalid key format." };
  }

  // 3. Test connection
  log("Testing provider connection...");
  const connectionOK = await providerKeyStore.testConnection(provider, apiKey);
  log("Connection result:", connectionOK);

  if (!connectionOK) {
    return { success: false, error: "Provider rejected key." };
  }

  // 4. Save key to secure vault
  log("Saving key to secure vault...");
  const credentialId = await providerKeyStore.saveKey(provider, nickname, apiKey);
  log("Key saved with credentialId:", credentialId);

  // 5. Update provider metadata
  log("Updating provider metadata...");
  await providerKeyStore.updateMetadata(provider, nickname, credentialId);

  // 6. Load provider implementation
  log("Loading provider implementation...");
  const providerImpl = loadProviderImplementation(provider);

  if (!providerImpl) {
    return { success: false, error: "Failed to load provider implementation." };
  }

  log("Provider implementation loaded:", provider);

  // 7. Return success
  log("Onboarding complete:", provider);
  return {
    success: true,
    provider,
    nickname,
    credentialId
  };
}

module.exports = {
  onboardProvider
};
