/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.startup.cjs
   Role: Backend AI admission orchestrator.

   Authority contract:
     - Electron owns provider credentials and provider transport.
     - Electron may supply local boarding facts from the active Partition.
     - The backend validates those facts and selects boarding mode.
     - The backend owns candidate-session creation, orientation progression,
       capability activation, and Participant Ready state.
     - Startup initializes backend support systems, then opens a governed
       candidate session through AIEngine.
========================================================================= */

'use strict';

console.log('>>> [WM-FILE-LOAD] ai.startup.cjs loaded');

let logger;
try {
  logger = require('./lib/logger.cjs');
} catch {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

const AIEngine = require('./ai.engine.cjs');

let PersonalityEngine;
try {
  PersonalityEngine = require('./ai.personality.cjs');
} catch {
  PersonalityEngine = null;
}

let BlackBoxRuntime;
try {
  BlackBoxRuntime = require('../BlackBox/blackbox.runtime.cjs').BlackBox;
} catch {
  BlackBoxRuntime = null;
}

let RelationshipRuntime;
let RelationshipBootstrap;
try {
  const RelationshipIndex = require('../BlackBox/relationship/runtime/index.cjs');
  RelationshipRuntime = RelationshipIndex.runtime;
  RelationshipBootstrap = RelationshipIndex.initializeWingManRuntime || null;
} catch {
  RelationshipRuntime = null;
  RelationshipBootstrap = null;
}

async function safeCall(label, fn, ...args) {
  if (typeof fn !== 'function') {
    logger.warn(`[AI-Startup] ${label} unavailable (no function export)`);
    return { ok: false, available: false, value: null };
  }

  try {
    const value = await fn(...args);
    logger.info(`[AI-Startup] ${label} completed`);
    return { ok: true, available: true, value };
  } catch (err) {
    logger.warn(`[AI-Startup] ${label} failed`, { err: err.message });
    return {
      ok: false,
      available: true,
      value: null,
      error: err.message
    };
  }
}

function summarizePhases(phases) {
  return Object.fromEntries(
    Object.entries(phases).map(([name, status]) => [
      name,
      {
        ok: status.ok === true,
        available: status.available === true,
        ...(status.error ? { error: status.error } : {})
      }
    ])
  );
}

async function startAIOnboarding({
  licenseContext,
  provider = 'openai',
  model,
  params = {},
  localBoardingContext,
  systemSettings = {},
  partitionPaths = null
} = {}) {
  logger.info('[AI-Startup] Beginning backend AI admission sequence...');

  const phases = {};

  const carepackage = null;
  phases.carepackage = {
    ok: true,
    available: false
  };

  if (RelationshipBootstrap) {
    phases.relationship = await safeCall(
      'RelationshipBootstrap.initializeWingManRuntime',
      RelationshipBootstrap,
      { carepackage, systemSettings }
    );
  } else if (RelationshipRuntime) {
    logger.info(
      '[AI-Startup] Relationship runtime available (no explicit bootstrap)'
    );
    phases.relationship = { ok: true, available: true };
  } else {
    logger.warn(
      '[AI-Startup] Relationship engine unavailable - AI will be context-light'
    );
    phases.relationship = { ok: false, available: false };
  }

  if (PersonalityEngine) {
    phases.personality = await safeCall(
      'PersonalityEngine.initializePersonality',
      PersonalityEngine.initializePersonality ||
        PersonalityEngine.initialize ||
        PersonalityEngine.load,
      { carepackage, systemSettings }
    );
  } else {
    phases.personality = { ok: false, available: false };
  }

  if (BlackBoxRuntime) {
    phases.blackbox = await safeCall(
      'BlackBoxRuntime.initialize',
      BlackBoxRuntime.initialize.bind(BlackBoxRuntime),
      { systemSettings, partitionPaths }
    );
  } else {
    logger.warn(
      '[AI-Startup] BlackBox runtime unavailable - governed gateway support is unavailable'
    );
    phases.blackbox = { ok: false, available: false };
  }

  const admission = AIEngine.connect({
    licenseContext,
    provider,
    model,
    params,
    localBoardingContext
  });

  if (!admission || admission.ok !== true) {
    const error =
      admission?.error || 'AIEngine did not create a candidate session.';

    logger.error('[AI-Startup] Candidate-session creation failed', { error });

    return {
      ok: false,
      active: false,
      admitted: false,
      error,
      phases: summarizePhases(phases)
    };
  }

  logger.info(
    `[AI-Startup] Candidate session ready for orientation transport: ${admission.sessionId}`
  );

  return {
    ...admission,
    active: false,
    admitted: false,
    phases: summarizePhases(phases)
  };
}

module.exports = {
  startAIOnboarding
};
