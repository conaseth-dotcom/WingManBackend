/**
 * WingMan Provider Registry
 *
 * Canonical backend registry for providers currently implemented in
 * WingManBackend/providers.
 */

const log = (...args) => console.log("[REGISTRY]", ...args);

const PROVIDERS = {
  openai: {
    id: "openai",
    displayName: "OpenAI",
    requiresKey: true,
    keyPrefix: "sk-",
    supportsOrgId: true,
    supportsProjectId: true,
    testModel: "gpt-4o-mini"
  },

  anthropic: {
    id: "anthropic",
    displayName: "Anthropic (Claude)",
    requiresKey: true,
    keyPrefix: "sk-ant-",
    supportsOrgId: false,
    supportsProjectId: false,
    testModel: "claude-3-haiku"
  },

  gemini: {
    id: "gemini",
    displayName: "Google Gemini",
    requiresKey: true,
    keyPrefix: null,
    supportsOrgId: false,
    supportsProjectId: false,
    testModel: "gemini-1.5-flash"
  },

  deepseek: {
    id: "deepseek",
    displayName: "DeepSeek",
    requiresKey: true,
    keyPrefix: null,
    supportsOrgId: false,
    supportsProjectId: false,
    testModel: null
  },

  lmstudio: {
    id: "lmstudio",
    displayName: "LM Studio",
    requiresKey: false,
    keyPrefix: null,
    supportsOrgId: false,
    supportsProjectId: false,
    testModel: null
  },

  ollama: {
    id: "ollama",
    displayName: "Ollama",
    requiresKey: false,
    keyPrefix: null,
    supportsOrgId: false,
    supportsProjectId: false,
    testModel: null
  }
};

function get(providerId) {
  log("Lookup provider:", providerId);
  return PROVIDERS[providerId] || null;
}

function list() {
  log("Listing all providers");
  return Object.values(PROVIDERS);
}

function exists(providerId) {
  const found = Boolean(PROVIDERS[providerId]);
  log("Provider exists:", providerId, found);
  return found;
}

module.exports = {
  get,
  list,
  exists
};
