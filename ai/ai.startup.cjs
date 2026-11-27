/* ========================================================================
   WingMan Backend File
   Alias: @backend-ai/ai.startup.cjs
   Role: Minimal backend AI session-start orchestrator.

   Authority contract:
     - Electron owns provider credentials and provider transport.
     - Electron supplies applicable local Partition/session context.
     - The backend validates admission through AIEngine.
     - Independent backend subsystems own their own lifecycle.
========================================================================= */
'use strict';

const AIEngine = require('./ai.engine.cjs');

async function startAISession({
  licenseContext,
  provider = 'openai',
  model,
  params = {},
  localContext
} = {}) {
  try {
    const admission = AIEngine.connect({
      licenseContext,
      provider,
      model,
      params,
      localContext
    });

    if (!admission || admission.ok !== true) {
      return {
        ok: false,
        active: false,
        admitted: false,
        error: admission?.error || 'AIEngine did not create an AI session.'
      };
    }

    return admission;
  } catch (err) {
    console.error('[AI-Startup] startAISession failed:', err);
    return {
      ok: false,
      active: false,
      admitted: false,
      error: err.message
    };
  }
}

module.exports = Object.freeze({
  startAISession
});
