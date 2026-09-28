/**
 * ========================================================================
 *  WingMan Backend File
 *
 *  Alias: @backend-ai/ai.ChatRuntime.cjs
 *  Role:
 *    Chat Runtime — central orchestrator for live AI conversations.
 *
 *  Architectural Notes:
 *    - Backend-only (never exposed directly to the AI).
 *    - Uses provider instances created in server.cjs.
 *    - Does NOT handle onboarding (that lives in OnboardingPipeline.cjs).
 *    - Designed to be extended, but safe in its minimal form.
 * ========================================================================
 */

console.log(">>> [WM-FILE-LOAD] ai.ChatRuntime.cjs loaded");

/* ------------------------------------------------------------------------
 * Internal state
 * ---------------------------------------------------------------------- */
let PROVIDERS = {};
let logger = console;
let eventBus = null;

/**
 * Initialise Chat Runtime.
 * Called by server.cjs with:
 *   { providers, eventBus, logger }
 */
function init({ providers, eventBus: bus, logger: log } = {}) {
  PROVIDERS = providers || {};
  eventBus = bus || null;
  logger = log || console;

  logger.info("[ChatRuntime] Initialised", {
    providers: Object.keys(PROVIDERS)
  });

  if (eventBus) {
    logger.info("[ChatRuntime] EventBus attached");
  }
}

/* ------------------------------------------------------------------------
 * Helper: pick a default provider
 * ---------------------------------------------------------------------- */
function getDefaultProvider() {
  // Prefer OpenAI if available, otherwise first available provider.
  if (PROVIDERS.openai) return { key: "openai", def: PROVIDERS.openai };

  const entries = Object.entries(PROVIDERS);
  if (entries.length === 0) return null;

  const [key, def] = entries[0];
  return { key, def };
}

/* ------------------------------------------------------------------------
 * Optional memory integration
 * ---------------------------------------------------------------------- */
let loadMemory = null;
try {
  // If memory manager exists, we’ll use it; otherwise we degrade gracefully.
  ({ loadMemory } = require("../access/identity/ai.memory.manager.cjs"));
} catch (err) {
  // No memory manager wired yet; this is safe to ignore.
  loadMemory = null;
  logger.info?.("[ChatRuntime] Memory manager not available yet");
}

/* ------------------------------------------------------------------------
 * Chat entry point
 * ---------------------------------------------------------------------- */
/**
 * ChatRuntime.chat(messages)
 *
 * Called by:
 *   - server.cjs → /api/ai/chat route
 *
 * Contract:
 *   - messages: [{ role, content }, ...]
 *   - returns: string (assistant reply)
 */
async function chat(messages = []) {
  logger.info("[ChatRuntime] chat() invoked", {
    messageCount: messages.length
  });

  // If memory is available, inject it into the system message.
  if (typeof loadMemory === "function") {
    try {
      const memory = loadMemory();
      const systemMsg = messages.find(m => m.role === "system");
      if (systemMsg) {
        systemMsg.content =
          "[WingMan Memory]\n" +
          JSON.stringify(memory) +
          "\n\n" +
          systemMsg.content;
      }
      logger.info("[ChatRuntime] Memory injected into system message");
    } catch (err) {
      logger.warn("[ChatRuntime] Failed to load/inject memory", {
        err: err.message
      });
    }
  }

  const providerEntry = getDefaultProvider();
  if (!providerEntry) {
    logger.warn("[ChatRuntime] No providers available");
    return "WingMan is online, but no AI provider is configured yet.";
  }

  const { key, def } = providerEntry;

  if (typeof def.create !== "function") {
    logger.warn("[ChatRuntime] Provider has no create() factory", { provider: key });
    return `Provider "${key}" is not fully configured yet.`;
  }

  // NOTE:
  // At this stage, we do not yet wire secure credentials.
  // This is a safe skeleton that can be extended once
  // providerKeyStore + vault integration are finalised.
  let client;
  try {
    // Placeholder: no apiKey/orgId/projectId yet.
    client = await def.create(null, null, null);
  } catch (err) {
    logger.error("[ChatRuntime] Failed to create provider client", {
      provider: key,
      err: err.message
    });
    return `WingMan could not initialise the "${key}" provider.`;
  }

  logger.info("[ChatRuntime] Provider client created", { provider: key });

  // Minimal, safe behaviour: echo last user message with a friendly notice.
  const lastUser = messages.filter(m => m.role === "user").pop();
  const userText = lastUser?.content || "";

  const reply =
    "WingMan chat runtime is online, but the secure provider credentials " +
    "have not been wired into ChatRuntime yet. " +
    (userText
      ? `You said: "${userText}"`
      : "Once keys are configured, I’ll be able to respond normally.");

  logger.info("[ChatRuntime] Returning placeholder reply");

  return reply;
}

/* ------------------------------------------------------------------------
 * Exports
 * ---------------------------------------------------------------------- */
module.exports = {
  init,
  chat
};

/* ========================================================================
 *  End of File
 * ====================================================================== */
