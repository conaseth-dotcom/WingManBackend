/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.engine.cjs
   Role: Authoritative persistent-session facade for the WingMan AI pipeline.

   Authority:
     - The backend creates and owns AI sessions.
     - The backend performs governed AI orientation.
     - The backend activates and deactivates session capabilities.
     - The frontend may request these operations, but does not perform them.
========================================================================= */

'use strict';

const AIPipeline = require('./ai.pipeline.cjs');

/* ------------------------------------------------------------------------
   CONNECT

   Creates one persistent backend-owned AI session. AIPipeline.connect()
   performs provider connection, governed orientation, and capability setup.
------------------------------------------------------------------------ */
async function connect({
  provider = 'openai',
  apiKey,
  model,
  baseUrl,
  params = {},
  orgId,
  projectId
} = {}) {
  try {
    const result = await AIPipeline.connect({
      provider,
      apiKey,
      model,
      baseUrl,
      params,
      orgId,
      projectId
    });

    if (!result || result.ok !== true) {
      return {
        ok: false,
        error: result?.error || 'The AI pipeline did not create a session.'
      };
    }

    return {
      ok: true,
      active: true,
      sessionId: result.sessionId,
      provider: result.provider,
      model: result.model,
      state: result.state,
      orientation: result.orientation
    };
  } catch (err) {
    console.error('[AIEngine] connect failed:', err);
    return { ok: false, error: err.message };
  }
}

/* ------------------------------------------------------------------------
   CHAT

   Uses an existing backend-owned session. It does not create, orient, or
   close a session. Conversation continuity belongs to the backend session.
------------------------------------------------------------------------ */
async function chat({ sessionId, message, history = [], onChunk } = {}) {
  try {
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return { ok: false, error: 'A valid AI sessionId is required.' };
    }

    if (typeof message !== 'string' || !message.trim()) {
      return { ok: false, error: 'A non-empty user message is required.' };
    }

    return await AIPipeline.chat({
      sessionId: sessionId.trim(),
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      onChunk: typeof onChunk === 'function' ? onChunk : undefined
    });
  } catch (err) {
    console.error('[AIEngine] chat failed:', err);
    return { ok: false, error: err.message };
  }
}

/* ------------------------------------------------------------------------
   STATUS
------------------------------------------------------------------------ */
function status({ sessionId } = {}) {
  try {
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return { ok: false, error: 'A valid AI sessionId is required.' };
    }

    const session = AIPipeline.getSession(sessionId.trim());

    if (!session) {
      return {
        ok: true,
        active: false,
        sessionId: sessionId.trim(),
        state: 'disconnected'
      };
    }

    return {
      ok: true,
      active: true,
      sessionId: session.id,
      provider: session.provider,
      model: session.model,
      state: session.state,
      orientation: session.orientation,
      activePartition: session.activePartition || null,
      startedAt: session.startedAt
    };
  } catch (err) {
    console.error('[AIEngine] status failed:', err);
    return { ok: false, error: err.message };
  }
}

/* ------------------------------------------------------------------------
   DISCONNECT

   Closes the exact backend-owned session. AIPipeline.disconnect() also
   removes that session's ACTIVE_PARTITION authorization.
------------------------------------------------------------------------ */
function disconnect({ sessionId } = {}) {
  try {
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return { ok: false, error: 'A valid AI sessionId is required.' };
    }

    return AIPipeline.disconnect({ sessionId: sessionId.trim() });
  } catch (err) {
    console.error('[AIEngine] disconnect failed:', err);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  connect,
  chat,
  status,
  disconnect
};
