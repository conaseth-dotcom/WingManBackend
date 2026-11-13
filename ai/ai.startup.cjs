/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.startup.cjs
   Role: AI activation orchestrator. Loads carepackage, boots relationship
         engine + BlackBox, and wires AI runtime only when explicitly invoked.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] ai.startup.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (defensive, MVP-friendly)
// ---------------------------------------------------------------------------
let logger;
try {
  logger = require("./lib/logger.cjs");
} catch {
  logger = {
    info: console.log,
    warn: console.warn,
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
  RelationshipRuntime = RelationshipIndex.runtime;
  RelationshipBootstrap = RelationshipIndex.initializeWingManRuntime || null;
} catch {
  RelationshipRuntime = null;
  RelationshipBootstrap = null;
}

// ---------------------------------------------------------------------------
// Helper: safe call wrapper
// ---------------------------------------------------------------------------
async function safeCall(label, fn, ...args) {
  if (typeof fn !== "function") {
    logger.warn(`[AI-Startup] ${label} unavailable (no function export)`);
    return { ok: false, available: false, value: null };
  }

  try {
    const value = await fn(...args);
    logger.info(`[AI-Startup] ${label} completed`);
    return { ok: true, available: true, value };
  } catch (err) {
    logger.warn(`[AI-Startup] ${label} failed`, { err: err.message });
    return { ok: false, available: true, value: null, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Main AI activation entry point
// ---------------------------------------------------------------------------
async function startAIOnboarding({ systemSettings = {}, partitionPaths = null } = {}) {
  logger.info("[AI-Startup] Beginning AI activation sequence...");

  const phases = {};

  // Phase 1 - Load carepackage
  let carepackage = null;
  if (CarepackageLoader) {
    phases.carepackage = await safeCall(
      "CarepackageLoader.loadCarepackage",
      CarepackageLoader.loadCarepackage ||
        CarepackageLoader.load ||
        CarepackageLoader.initialize,
      { systemSettings }
    );
    carepackage = phases.carepackage.value;
  } else {
    logger.warn("[AI-Startup] Carepackage loader missing - using fallback personality only");
    phases.carepackage = { ok: false, available: false };
  }

  // Phase 2 - Boot relationship engine
  if (RelationshipBootstrap) {
    phases.relationship = await safeCall(
      "RelationshipBootstrap.initializeWingManRuntime",
      RelationshipBootstrap,
      { carepackage, systemSettings }
    );
  } else if (RelationshipRuntime) {
    logger.info("[AI-Startup] Relationship runtime available (no explicit bootstrap)");
    phases.relationship = { ok: true, available: true };
  } else {
    logger.warn("[AI-Startup] Relationship engine unavailable - AI will be context-light");
    phases.relationship = { ok: false, available: false };
  }

  // Phase 3 - Load personality + memory
  if (PersonalityEngine) {
    phases.personality = await safeCall(
      "PersonalityEngine.initializePersonality",
      PersonalityEngine.initializePersonality ||
        PersonalityEngine.initialize ||
        PersonalityEngine.load,
      { carepackage, systemSettings }
    );
  } else {
    phases.personality = { ok: false, available: false };
  }

  if (MemoryLoader) {
    phases.memory = await safeCall(
      "MemoryLoader.initializeMemory",
      MemoryLoader.initializeMemory ||
        MemoryLoader.initialize ||
        MemoryLoader.load,
      { systemSettings, partitionPaths }
    );
  } else {
    phases.memory = { ok: false, available: false };
  }

  // Phase 4 - Initialize providers + runtime
  if (ProviderFactory) {
    phases.providers = await safeCall(
      "ProviderFactory.initializeProviders",
      ProviderFactory.initializeProviders ||
        ProviderFactory.initialize ||
        ProviderFactory.loadProviders,
      { systemSettings }
    );
  } else {
    phases.providers = { ok: false, available: false };
  }

  if (AIRuntime) {
    phases.runtime = await safeCall(
      "AIRuntime.initializeRuntime",
      AIRuntime.initializeRuntime || AIRuntime.initialize || AIRuntime.init,
      { systemSettings }
    );
  } else {
    phases.runtime = { ok: false, available: false };
  }

  // Phase 5 - Build context
  if (ContextBuilder) {
    phases.context = await safeCall(
      "ContextBuilder.initializeContext",
      ContextBuilder.initializeContext ||
        ContextBuilder.initialize ||
        ContextBuilder.buildContext,
      { systemSettings, partitionPaths, carepackage }
    );
  } else {
    phases.context = { ok: false, available: false };
  }

  // Phase 6 - Initialize BlackBox
  if (BlackBoxRuntime) {
    phases.blackbox = await safeCall(
      "BlackBoxRuntime.initialize",
      BlackBoxRuntime.initialize.bind(BlackBoxRuntime),
      { systemSettings }
    );
  } else {
    logger.warn("[AI-Startup] BlackBox runtime unavailable - AI will run without governed gateway");
    phases.blackbox = { ok: false, available: false };
  }

  logger.info("[AI-Startup] AI activation sequence complete.");

  // IMPORTANT:
  // Never return runtime/module objects here. They may contain circular
  // references and are internal backend implementation details.
  return {
    active: true,
    phases: Object.fromEntries(
      Object.entries(phases).map(([name, status]) => [
        name,
        {
          ok: status.ok === true,
          available: status.available === true,
          ...(status.error ? { error: status.error } : {})
        }
      ])
    )
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
module.exports = {
  startAIOnboarding
};
