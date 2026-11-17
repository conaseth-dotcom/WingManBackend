/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.engine.cjs
   Role: Authoritative persistent-session facade for the WingMan AI pipeline.
========================================================================= */

'use strict';

const AIPipeline = require('./ai.pipeline.cjs');

function requireSessionId(sessionId) {
  const normalizedSessionId =
    typeof sessionId === 'string' ? sessionId.trim() : '';

  if (!normalizedSessionId) {
    return { ok: false, error: 'A valid AI sessionId is required.' };
  }

  return { ok: true, sessionId: normalizedSessionId };
}

function connect({
  provider = 'openai',
  model,
  params = {},
  localBoardingContext
} = {}) {
  try {
    const result = AIPipeline.connect({
      provider,
      model,
      params,
      localBoardingContext
    });

    if (!result || result.ok !== true) {
      return {
        ok: false,
        error: result?.error || 'The AI pipeline did not create a session.'
      };
    }

    return result;
  } catch (err) {
    console.error('[AIEngine] connect failed:', err);
    return { ok: false, error: err.message };
  }
}

function advanceOrientation({ sessionId, response } = {}) {
  try {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.advanceOrientation({
      sessionId: validated.sessionId,
      response
    });
  } catch (err) {
    console.error('[AIEngine] advanceOrientation failed:', err);
    return { ok: false, error: err.message };
  }
}

function submitPersistenceResult({
  sessionId,
  persistenceType,
  result
} = {}) {
  try {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;

    return AIPipeline.submitPersistenceResult({
      sessionId: validated.sessionId,
      persistenceType,
      result
    });
  } catch (err) {
    console.error('[AIEngine] submitPersistenceResult failed:', err);
    return { ok: false, error: err.message };
  }
}

function currentOperation({ sessionId } = {}) {
  try {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.currentOperation({ sessionId: validated.sessionId });
  } catch (err) {
    console.error('[AIEngine] currentOperation failed:', err);
    return { ok: false, error: err.message };
  }
}

function beginChat({ sessionId, message } = {}) {
  try {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    if (typeof message !== 'string' || !message.trim()) {
      return { ok: false, error: 'A non-empty user message is required.' };
    }
    return AIPipeline.beginChat({
      sessionId: validated.sessionId,
      message: message.trim()
    });
  } catch (err) {
    console.error('[AIEngine] beginChat failed:', err);
    return { ok: false, error: err.message };
  }
}

function completeChat({ sessionId, turnId, reply } = {}) {
  try {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.completeChat({
      sessionId: validated.sessionId,
      turnId,
      reply
    });
  } catch (err) {
    console.error('[AIEngine] completeChat failed:', err);
    return { ok: false, error: err.message };
  }
}

function failPendingTurn({ sessionId, turnId, error } = {}) {
  try {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.failPendingTurn({
      sessionId: validated.sessionId,
      turnId,
      error
    });
  } catch (err) {
    console.error('[AIEngine] failPendingTurn failed:', err);
    return { ok: false, error: err.message };
  }
}

function status({ sessionId } = {}) {
  try {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    const session = AIPipeline.getSession(validated.sessionId);

    if (!session) {
      return {
        ok: true,
        active: false,
        admitted: false,
        sessionId: validated.sessionId,
        state: 'disconnected'
      };
    }

    const admitted =
      session.state === 'ready_for_introduction' ||
      session.state === 'ready' ||
      session.state === 'awaiting_provider_response';

    return {
      ok: true,
      active: admitted,
      admitted,
      sessionId: session.id,
      provider: session.provider,
      model: session.model,
      state: session.state,
      boardingMode: session.boardingMode,
      partitionId: session.partitionId,
      orientation: session.orientation,
      activePartition: session.activePartition || null,
      pendingTurn: session.pendingTurn || null,
      startedAt: session.startedAt
    };
  } catch (err) {
    console.error('[AIEngine] status failed:', err);
    return { ok: false, error: err.message };
  }
}

function disconnect({ sessionId } = {}) {
  try {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.disconnect({ sessionId: validated.sessionId });
  } catch (err) {
    console.error('[AIEngine] disconnect failed:', err);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  connect,
  advanceOrientation,
  submitPersistenceResult,
  currentOperation,
  beginChat,
  completeChat,
  failPendingTurn,
  status,
  disconnect
};
