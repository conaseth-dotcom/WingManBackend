// WingManBackend/providers/ai.providers.cjs
// ------------------------------------------------------------
// Modern Provider Connector (Multi-Key + OS Secure Storage)
// ------------------------------------------------------------
console.log("[WM-FILE-LOAD] ai.providers.cjs loaded");

const credentialStore = require("../storage/credentialStore.cjs");
const providerKeyStore = require("../storage/providerKeyStore.cjs");

// Provider factory modules
const { createOpenAIProvider } = require("./provider-openai.cjs");
const { createAnthropicProvider } = require("./provider-anthropic.cjs");
const { createGeminiProvider } = require("./provider-gemini.cjs");
const { createDeepSeekProvider } = require("./provider-deepseek.cjs");
const { createOllamaProvider } = require("./provider-ollama.cjs");
const { createLMStudioProvider } = require("./provider-lmstudio.cjs");

let currentProvider = null;
let currentProviderName = null;

// ------------------------------------------------------------
// Provider factories
// ------------------------------------------------------------
const providerFactories = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  gemini: createGeminiProvider,
  deepseek: createDeepSeekProvider,
  ollama: createOllamaProvider,
  lmstudio: createLMStudioProvider  
};

// ------------------------------------------------------------
// CONNECT PROVIDER (auto-loads default key)
// ------------------------------------------------------------
async function connectProvider(providerName) {
  const factory = providerFactories[providerName];

  if (!factory) {
    return {
      ok: false,
      error: `Unknown provider '${providerName}'.`,
      provider: providerName
    };
  }

  // Load default key metadata
  const keyEntry = providerKeyStore.getDefaultProviderKey(providerName);
  if (!keyEntry) {
    return {
      ok: false,
      error: `No API key configured for provider '${providerName}'.`,
      provider: providerName
    };
  }

  // Retrieve decrypted key from OS secure storage
  const keyResult = credentialStore.getKey(keyEntry.credentialId);
  if (!keyResult.ok) {
    return {
      ok: false,
      error: `Failed to retrieve key for provider '${providerName}': ${keyResult.error}`,
      provider: providerName
    };
  }
  function scrubKey(apiKey) {
    if (!apiKey) return apiKey;

    let cleaned = apiKey.trim();

    // Remove common provider prefixes
    cleaned = cleaned.replace(/^sk-proj-[a-zA-Z0-9_-]+:/, "");
    cleaned = cleaned.replace(/^sk-[a-zA-Z0-9_-]+:/, "");
    cleaned = cleaned.replace(/^proj-[a-zA-Z0-9_-]+:/, "");
    cleaned = cleaned.replace(/^org-[a-zA-Z0-9_-]+:/, "");
    cleaned = cleaned.replace(/^user-[a-zA-Z0-9_-]+:/, "");

    // Remove invisible Unicode, stray whitespace, accidental newlines
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");
    cleaned = cleaned.replace(/\s+/g, "");

    return cleaned;
  }

  const apiKey = keyResult.key;

  try {
    const provider = await factory(apiKey);

    currentProvider = provider;
    currentProviderName = providerName;

    return {
      ok: true,
      provider: providerName,
      connected: true
    };
  } catch (err) {
    console.error(`[AI Providers] Failed to connect provider '${providerName}':`, err);
    return {
      ok: false,
      provider: providerName,
      error: err.message || "Failed to initialize AI provider."
    };
  }
}

// ------------------------------------------------------------
// STATUS
// ------------------------------------------------------------
function getProviderStatus() {
  return {
    ok: true,
    provider: currentProviderName || null,
    connected: !!currentProvider
  };
}

// ------------------------------------------------------------
// DISCONNECT
// ------------------------------------------------------------
function disconnectProvider() {
  currentProvider = null;
  currentProviderName = null;

  return {
    ok: true,
    provider: null,
    disconnected: true
  };
}

// ------------------------------------------------------------
// CHAT
// ------------------------------------------------------------
async function chatWithProvider(messages) {
  if (!currentProvider) {
    return {
      ok: false,
      error: "AI provider not connected. Call connectProvider() first."
    };
  }

  if (typeof currentProvider.sendMessages !== "function") {
    return {
      ok: false,
      error: "Current provider does not implement sendMessages()."
    };
  }

  const reply = await currentProvider.sendMessages(messages);

  return {
    ok: true,
    reply
  };
}

// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------
module.exports = {
  connectProvider,
  getProviderStatus,
  disconnectProvider,
  chatWithProvider
};
