/**
 * ============================================================
 *  WingMan Provider Key Store (Skeleton)
 *  ------------------------------------------------------------
 *  Role:
 *    Validate keys, test provider connections, write encrypted
 *    keys to vault, update provider metadata.
 *
 *  Owner:
 *    OnboardingPipeline.cjs imports this directly.
 *
 *  Scope:
 *    system-hidden (never exposed to AI)
 *
 *  Responsibilities:
 *    - validateKey(provider, apiKey)
 *    - testConnection(provider, apiKey)
 *    - saveKey(provider, nickname, apiKey)
 *    - updateMetadata(provider, nickname, credentialId)
 *
 *  Notes:
 *    This file replaces scattered key-handling logic.
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const providerRegistry = require("./providerRegistry.cjs");

// Paths inside system-hidden namespace
const VAULT_PATH = path.join(__dirname, "../../partition/system-hidden/vault/wm.securekeys.json");
const META_PATH  = path.join(__dirname, "../../partition/system-hidden/provider-meta/wm.providerMeta.json");

const log = (...args) => console.log("[KEYSTORE]", ...args);

/* ============================================================
 * 1. VALIDATE KEY FORMAT
 * ============================================================
 */
function validateKey(provider, apiKey) {
  log("Validating key format for provider:", provider);

  const def = providerRegistry.get(provider);
  if (!def) {
    log("Provider not found during validation:", provider);
    return false;
  }

  const prefix = def.keyPrefix;
  const ok = apiKey.startsWith(prefix);

  log("Key format result:", ok);
  return ok;
}

/* ============================================================
 * 2. TEST CONNECTION (provider-specific)
 * ============================================================
 */
async function testConnection(provider, apiKey) {
  log("Testing connection for provider:", provider);

  const def = providerRegistry.get(provider);
  if (!def) {
    log("Provider not found during testConnection:", provider);
    return false;
  }

  // Provider-specific test logic
  if (provider === "openai") {
    return await testOpenAI(apiKey, def.testModel);
  }

  if (provider === "anthropic") {
    return await testAnthropic(apiKey, def.testModel);
  }

  log("No testConnection handler for provider:", provider);
  return false;
}

/* -------------------------
 * OpenAI testConnection
 * -------------------------
 */
async function testOpenAI(apiKey, model) {
  log("Running OpenAI testConnection...");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1
      })
    });

    log("OpenAI test status:", response.status);
    return response.ok;
  } catch (err) {
    log("OpenAI test error:", err.message);
    return false;
  }
}

/* -------------------------
 * Anthropic testConnection
 * -------------------------
 */
async function testAnthropic(apiKey, model) {
  log("Running Anthropic testConnection...");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1
      })
    });

    log("Anthropic test status:", response.status);
    return response.ok;
  } catch (err) {
    log("Anthropic test error:", err.message);
    return false;
  }
}

/* ============================================================
 * 3. SAVE KEY TO SECURE VAULT (encrypted)
 * ============================================================
 */
async function saveKey(provider, nickname, apiKey) {
  log("Saving key to secure vault:", provider, nickname);

  const credentialId = crypto.randomUUID();

  let vault = {};
  if (fs.existsSync(VAULT_PATH)) {
    vault = JSON.parse(fs.readFileSync(VAULT_PATH, "utf8"));
  }

  vault[credentialId] = encrypt(apiKey);

  fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2));
  log("Key saved with credentialId:", credentialId);

  return credentialId;
}

/* ============================================================
 * 4. UPDATE PROVIDER METADATA
 * ============================================================
 */
async function updateMetadata(provider, nickname, credentialId) {
  log("Updating provider metadata:", provider);

  let meta = {};
  if (fs.existsSync(META_PATH)) {
    meta = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  }

  if (!meta[provider]) {
    meta[provider] = { defaultKey: 0, keys: [] };
  }

  // Remove duplicates (same nickname)
  meta[provider].keys = meta[provider].keys.filter(k => k.nickname !== nickname);

  // Add new entry
  meta[provider].keys.push({
    nickname,
    credentialId,
    orgId: null,
    projectId: null
  });

  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  log("Metadata updated for provider:", provider);
}

/* ============================================================
 * 5. ENCRYPTION HELPERS
 * ============================================================
 */
function encrypt(text) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { encrypted: encrypted.toString("base64"), iv: iv.toString("base64"), tag: tag.toString("base64"), key: key.toString("base64") };
}

module.exports = {
  validateKey,
  testConnection,
  saveKey,
  updateMetadata
};
