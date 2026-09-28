/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.startup.cjs
   Role: AI onboarding orchestrator. Loads carepackage, boots relationship
         engine + BlackBox, and wires AI runtime only when explicitly invoked.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] ai.startup.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (defensive, MVP-friendly)
// ---------------------------------------------------------------------------
const path = require("path");

let logger;
try {
  logger = require("./lib/logger.cjs");
} catch {
  logger = {
    info:  console.log,
    warn:  console.warn,
    error: console.error
  };
}

let ProviderFactory;
try {
  ProviderFactory = require("./lib/provider.factory.cjs");
} catch {
  ProviderFactory = null;
}

let AIRuntime;
try {
  AIRuntime = require("./ai.runtime.cjs");
} catch {
  AIRuntime = null;
}

let PersonalityEngine;
try {
  PersonalityEngine = require("./ai.personality.cjs");
} catch {
  PersonalityEngine = null;
}

let CarepackageLoader;
try {
  CarepackageLoader = require("./ai.loader.cjs");
} catch {
  CarepackageLoader = null;
}

let MemoryLoader;
try {
  MemoryLoader = require("./ai.memory.loader.cjs");
} catch {
  MemoryLoader = null;
}

let ContextBuilder;
try {
  ContextBuilder = require("./ai.context.builder.cjs");
} catch {
  ContextBuilder = null;
}

let BlackBoxRuntime;
try {
  BlackBoxRuntime = require("../BlackBox/blackbox.runtime.cjs").BlackBox;
} catch {
  BlackBoxRuntime = null;
}

let RelationshipRuntime;
let RelationshipBootstrap;
try {
  const RelationshipIndex = require("../BlackBox/relationship/runtime/index.cjs");
  RelationshipRuntime   = RelationshipIndex.runtime;
  RelationshipBootstrap = RelationshipIndex.initializeWingManRuntime || null;
} catch {
  RelationshipRuntime   = null;
  RelationshipBootstrap = null;
}

// ---------------------------------------------------------------------------
// Helper: safe call wrapper
// ---------------------------------------------------------------------------
async function safeCall(label, fn, ...args) {
  if (typeof fn !== "function") {
    logger.warn(`[AI-Startup] ${label} unavailable (no function export)`);
    return null;
  }
  try {
    const result = await fn(...args);
    logger.info(`[AI-Startup] ${label} completed`);
    return result;
  } catch (err) {
    logger.warn(`[AI-Startup] ${label} failed`, { err: err.message });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main onboarding entry point
// ---------------------------------------------------------------------------
async function startAIOnboarding({ systemSettings = {}, partitionPaths = null } = {}) {
  logger.info("[AI-Startup] Beginning AI onboarding sequence…");

  // ------------------------------------------------------------
  // Phase 1 — Load carepackage (brain + temperament)
  // ------------------------------------------------------------
  let carepackage = null;
  if (CarepackageLoader) {
    carepackage = await safeCall(
      "CarepackageLoader.loadCarepackage",
      CarepackageLoader.loadCarepackage || CarepackageLoader.load || CarepackageLoader.initialize,
      { systemSettings }
    );
  } else {
    logger.warn("[AI-Startup] Carepackage loader missing — using fallback personality only");
  }

  // ------------------------------------------------------------
  // Phase 2 — Boot relationship engine (BlackBox mind)
  // ------------------------------------------------------------
  if (RelationshipBootstrap) {
    await safeCall(
      "RelationshipBootstrap.initializeWingManRuntime",
      RelationshipBootstrap,
      { carepackage, systemSettings }
    );
  } else if (RelationshipRuntime) {
    logger.info("[AI-Startup] Relationship runtime available (no explicit bootstrap)");
  } else {
    logger.warn("[AI-Startup] Relationship engine unavailable — AI will be context-light");
  }

  // ------------------------------------------------------------
  // Phase 3 — Load personality + memory
  // ------------------------------------------------------------
  if (PersonalityEngine) {
    await safeCall(
      "PersonalityEngine.initializePersonality",
      PersonalityEngine.initializePersonality || PersonalityEngine.initialize || PersonalityEngine.load,
      { carepackage, systemSettings }
    );
  }

  if (MemoryLoader) {
    await safeCall(
      "MemoryLoader.initializeMemory",
      MemoryLoader.initializeMemory || MemoryLoader.initialize || MemoryLoader.load,
      { systemSettings, partitionPaths }
    );
  }

  // ------------------------------------------------------------
  // Phase 4 — Initialize AI providers + runtime
  // ------------------------------------------------------------
  if (ProviderFactory) {
    await safeCall(
      "ProviderFactory.initializeProviders",
      ProviderFactory.initializeProviders || ProviderFactory.initialize || ProviderFactory.loadProviders,
      { systemSettings }
    );
  }

  if (AIRuntime) {
    await safeCall(
      "AIRuntime.initializeRuntime",
      AIRuntime.initializeRuntime || AIRuntime.initialize || AIRuntime.init,
      { systemSettings }
    );
  }

  // ------------------------------------------------------------
  // Phase 5 — Build context (WingMan environment + user habits)
  // ------------------------------------------------------------
  if (ContextBuilder) {
    await safeCall(
      "ContextBuilder.initializeContext",
      ContextBuilder.initializeContext || ContextBuilder.initialize || ContextBuilder.buildContext,
      { systemSettings, partitionPaths, carepackage }
    );
  }

  // ------------------------------------------------------------
  // Phase 6 — Initialize BlackBox (gateway + autonomy + thinking)
  // ------------------------------------------------------------
  if (BlackBoxRuntime) {
    await safeCall(
      "BlackBoxRuntime.initialize",
      BlackBoxRuntime.initialize.bind(BlackBoxRuntime),
      { systemSettings }
    );
  } else {
    logger.warn("[AI-Startup] BlackBox runtime unavailable — AI will run without governed gateway");
  }

  logger.info("[AI-Startup] AI onboarding sequence complete.");
  return {
    carepackage,
    relationshipRuntime: RelationshipRuntime,
    blackbox: BlackBoxRuntime,
    aiRuntime: AIRuntime
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
module.exports = {
  startAIOnboarding
};
