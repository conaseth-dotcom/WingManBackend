/* ========================================================================
   WingMan Backend File
   Alias: @backend-ai/ai.engine.cjs
   Role: Persistent-session facade for the WingMan AI pipeline.
========================================================================= */
'use strict';

const AIPipeline = require('./ai.pipeline.cjs');
const sessionLicenses = new Map();

function requireSessionId(sessionId) {
  const normalizedSessionId =
    typeof sessionId === 'string' ? sessionId.trim() : '';

  if (!normalizedSessionId) {
    return { ok: false, error: 'A valid AI sessionId is required.' };
  }

  return { ok: true, sessionId: normalizedSessionId };
}

function run(name, operation) {
  try {
    return operation();
  } catch (err) {
    console.error(`[AIEngine] ${name} failed:`, err);
    return { ok: false, error: err.message };
  }
}

function connect({
  licenseContext,
  provider = 'openai',
  model,
  params = {},
  localContext
} = {}) {
  return run('connect', () => {
    if (!licenseContext?.productRef) {
      return { ok: false, error: 'Verified license context is required.' };
    }

    const result = AIPipeline.connect({
      provider,
      model,
      params,
      localContext
    });

    if (!result || result.ok !== true) {
      return {
        ok: false,
        error: result?.error || 'The AI pipeline did not create a session.'
      };
    }

    const license = Object.freeze({
      productRef: String(licenseContext.productRef).trim(),
      tier: licenseContext.tier || null,
      verifiedAt: licenseContext.verifiedAt || new Date().toISOString()
    });

    if (!license.productRef) {
      AIPipeline.disconnect({ sessionId: result.sessionId });
      return { ok: false, error: 'Verified license context is required.' };
    }

    sessionLicenses.set(result.sessionId, license);
    return { ...result, license };
  });
}

function beginSpatialAction(args = {}) {
  return run('beginSpatialAction', () => {
    const validated = requireSessionId(args.sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.beginSpatialAction({
      ...args,
      sessionId: validated.sessionId
    });
  });
}

function completeSpatialAction({ sessionId, actionId, result } = {}) {
  return run('completeSpatialAction', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.completeSpatialAction({
      sessionId: validated.sessionId,
      actionId,
      result
    });
  });
}

function failSpatialAction({ sessionId, actionId, error } = {}) {
  return run('failSpatialAction', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.failSpatialAction({
      sessionId: validated.sessionId,
      actionId,
      error
    });
  });
}

function beginIntroduction({ sessionId, preferredName } = {}) {
  return run('beginIntroduction', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.beginIntroduction({
      sessionId: validated.sessionId,
      preferredName
    });
  });
}

function completeIntroduction({ sessionId, turnId, reply } = {}) {
  return run('completeIntroduction', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.completeIntroduction({
      sessionId: validated.sessionId,
      turnId,
      reply
    });
  });
}

function beginChat({ sessionId, message, availableActions = [] } = {}) {
  return run('beginChat', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;

    if (typeof message !== 'string' || !message.trim()) {
      return { ok: false, error: 'A non-empty user message is required.' };
    }

    return AIPipeline.beginChat({
      sessionId: validated.sessionId,
      message: message.trim(),
      availableActions
    });
  });
}

function completeChat({
  sessionId,
  turnId,
  reply,
  actionChoice = null
} = {}) {
  return run('completeChat', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;

    return AIPipeline.completeChat({
      sessionId: validated.sessionId,
      turnId,
      reply,
      actionChoice
    });
  });
}

function failPendingTurn({ sessionId, turnId, error } = {}) {
  return run('failPendingTurn', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.failPendingTurn({
      sessionId: validated.sessionId,
      turnId,
      error
    });
  });
}

function setActiveProject({ sessionId, project } = {}) {
  return run('setActiveProject', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;
    return AIPipeline.setActiveProject({
      sessionId: validated.sessionId,
      project
    });
  });
}

function status({ sessionId } = {}) {
  return run('status', () => {
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

    const admitted = Boolean(session.admission?.readyForIntroduction);
    const active = admitted && session.state !== 'disconnecting';

    return {
      ok: true,
      active,
      admitted,
      sessionId: session.id,
      provider: session.provider,
      model: session.model,
      state: session.state,
      partitionId: session.partitionId,
      activePartition: session.activePartition || null,
      activeProject: session.governance?.activeProject || null,
      governance: session.governance || null,
      admission: session.admission || null,
      pendingTurn: session.pendingTurn || null,
      pendingSpatialAction: session.pendingSpatialAction || null,
      startedAt: session.startedAt,
      readyAt: session.readyAt,
      admissionDurationMs: session.admissionDurationMs,
      configVersion: session.configVersion,
      license: sessionLicenses.get(session.id) || null
    };
  });
}

function disconnect({ sessionId } = {}) {
  return run('disconnect', () => {
    const validated = requireSessionId(sessionId);
    if (!validated.ok) return validated;

    const result = AIPipeline.disconnect({
      sessionId: validated.sessionId
    });
    sessionLicenses.delete(validated.sessionId);
    return result;
  });
}

module.exports = Object.freeze({
  connect,
  beginSpatialAction,
  completeSpatialAction,
  failSpatialAction,
  beginIntroduction,
  completeIntroduction,
  beginChat,
  completeChat,
  failPendingTurn,
  setActiveProject,
  status,
  disconnect
});
