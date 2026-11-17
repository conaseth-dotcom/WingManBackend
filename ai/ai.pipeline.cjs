/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.pipeline.cjs
   Role: Authoritative, transport-neutral backend AI session pipeline.
========================================================================= */

'use strict';

const { randomUUID } = require('crypto');
const {
  beginOrientation,
  getCurrentOrientationOperation,
  submitOrientationResponse,
  getOrientationStatus
} = require('./orientation/ai.orientation.cjs');
const {
  BOARDING_MODES,
  createBoardingRecord,
  createPlatformContinuityRecord,
  selectBoardingMode,
  validateCandidateArtifact,
  validatePlatformContinuityRecord
} = require('./orientation/boarding.record.cjs');
const ActivePartitionGateway = require('../partition/api/active-partition.gateway.cjs');

const sessions = new Map();

function normalizeProvider(provider) {
  const value = String(provider || '').trim().toLowerCase();
  return value || 'openai';
}

function defaultModel(provider) {
  switch (normalizeProvider(provider)) {
    case 'groq': return 'llama-3.3-70b-versatile';
    case 'anthropic': return 'claude-3-5-sonnet-20241022';
    case 'gemini': return 'gemini-2.0-flash';
    case 'deepseek': return 'deepseek-chat';
    case 'lmstudio':
    case 'ollama': return null;
    default: return 'gpt-4o';
  }
}

function normalizeSessionId(sessionId) {
  return typeof sessionId === 'string' ? sessionId.trim() : '';
}

function getRequiredSession(sessionId) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const session = sessions.get(normalizedSessionId);
  if (!session) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      error: `Session not found: ${normalizedSessionId}`
    };
  }
  return { ok: true, sessionId: normalizedSessionId, session };
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requirePartitionId(value) {
  const partitionId = typeof value === 'string' ? value.trim() : '';
  if (!partitionId) {
    throw new Error('Local boarding context must identify the active Partition.');
  }
  return partitionId;
}

function normalizeLocalBoardingContext(value, provider, model) {
  if (!isPlainObject(value)) {
    throw new Error('A valid localBoardingContext object is required.');
  }

  const partitionId = requirePartitionId(value.partitionId);
  const suppliedContinuity = value.platformContinuity ?? null;
  const suppliedNotes = value.orientationNotes ?? null;

  let platformContinuity;
  if (suppliedContinuity === null) {
    platformContinuity = createPlatformContinuityRecord({
      platform: provider,
      partitionId,
      model
    });
  } else {
    validatePlatformContinuityRecord(suppliedContinuity, {
      platform: provider,
      partitionId
    });
    platformContinuity = clone(suppliedContinuity);
  }

  const boardingMode = selectBoardingMode({
    platform: provider,
    partitionId,
    continuityRecord: platformContinuity
  });

  if (boardingMode === BOARDING_MODES.FIRST && suppliedNotes !== null) {
    throw new Error('First boarding cannot receive prior Orientation Notes.');
  }
  if (boardingMode === BOARDING_MODES.RETURNING && suppliedNotes === null) {
    throw new Error("Returning boarding requires this platform's prior Orientation Notes.");
  }

  const priorOrientationNotes = suppliedNotes === null
    ? null
    : validateCandidateArtifact(suppliedNotes);

  return {
    partitionId,
    boardingMode,
    platformContinuity,
    priorOrientationNotes
  };
}

function publicOrientation(session) {
  if (!session.orientation) return null;
  return getOrientationStatus(session);
}

function publicSession(session) {
  return {
    id: session.id,
    provider: session.provider,
    model: session.model,
    params: clone(session.params),
    state: session.state,
    boardingMode: session.boardingMode,
    partitionId: session.partitionId,
    boardingRecord: session.boardingRecord
      ? {
          status: session.boardingRecord.boarding.status,
          currentStep: session.boardingRecord.boarding.currentStep,
          lastCompletedStep: session.boardingRecord.boarding.lastCompletedStep
        }
      : null,
    orientation: publicOrientation(session),
    activePartition: session.activePartition
      ? {
          ...session.activePartition,
          operations: [...session.activePartition.operations]
        }
      : null,
    pendingTurn: session.pendingTurn
      ? {
          id: session.pendingTurn.id,
          type: session.pendingTurn.type,
          createdAt: session.pendingTurn.createdAt
        }
      : null,
    startedAt: session.startedAt,
    configVersion: session.configVersion,
    log: session.log.map(entry => ({ ...entry }))
  };
}

function buildOperationalSystemMessage(session) {
  const partitionState = session.activePartition?.state || 'unavailable';
  return [
    'You are participating in an active WingMan collaborative session.',
    'You completed the governed WingMan orientation required for this session.',
    'Continue to follow the authority, privacy, capability, and Partition boundaries established by that orientation.',
    `ACTIVE_PARTITION state: ${partitionState}.`,
    'Do not infer access from knowledge alone.',
    'Do not claim that unavailable capabilities or resources are available.',
    'Treat messages in this conversation as user communication unless WingMan explicitly identifies a different source.'
  ].join('\n');
}

function buildConversationMessages(session, userMessage) {
  return [
    { role: 'system', content: buildOperationalSystemMessage(session) },
    ...session.log.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userMessage }
  ];
}

function activatePartition(session) {
  session.state = 'activating_partition';
  const partitionAccess = ActivePartitionGateway.activate({ sessionId: session.id });

  if (!partitionAccess || partitionAccess.ok !== true) {
    session.state = 'partition_access_failed';
    throw new Error(
      `ACTIVE_PARTITION activation failed: ${partitionAccess?.error || 'unknown error'}`
    );
  }

  session.activePartition = {
    capability: partitionAccess.capability,
    state: partitionAccess.state,
    operations: Array.isArray(partitionAccess.operations)
      ? [...partitionAccess.operations]
      : []
  };
  session.state = 'ready_for_introduction';
  console.log(`[ai.pipeline] ACTIVE_PARTITION activated: ${session.id}`);
  return session.activePartition;
}

function connect(config = {}) {
  const {
    provider = 'openai',
    model,
    params = {},
    localBoardingContext
  } = config;

  const normalizedProvider = normalizeProvider(provider);
  const resolvedModel = model || defaultModel(normalizedProvider);
  const sessionId = randomUUID();

  let normalizedContext;
  try {
    normalizedContext = normalizeLocalBoardingContext(
      localBoardingContext,
      normalizedProvider,
      resolvedModel
    );
  } catch (err) {
    console.error('[ai.pipeline] local boarding context rejected:', err.message);
    return { ok: false, sessionId, error: err.message };
  }

  const session = {
    id: sessionId,
    provider: normalizedProvider,
    model: resolvedModel,
    params: params && typeof params === 'object' && !Array.isArray(params)
      ? clone(params)
      : {},
    log: [],
    state: 'admission_pending',
    boardingMode: normalizedContext.boardingMode,
    partitionId: normalizedContext.partitionId,
    platformContinuity: normalizedContext.platformContinuity,
    priorOrientationNotes: normalizedContext.priorOrientationNotes,
    boardingRecord: createBoardingRecord({
      sessionId,
      platform: normalizedProvider,
      model: resolvedModel,
      partitionId: normalizedContext.partitionId,
      mode: normalizedContext.boardingMode
    }),
    orientation: null,
    activePartition: null,
    pendingTurn: null,
    pendingPersistence: null,
    startedAt: Date.now(),
    configVersion: '3.2.0'
  };

  try {
    sessions.set(sessionId, session);
    console.log(
      `[ai.pipeline] Candidate session created: ${sessionId} ` +
      `(${normalizedProvider}/${resolvedModel || 'local-default'}, ` +
      `${session.boardingMode} boarding, Partition ${session.partitionId})`
    );

    const orientation = beginOrientation(session, {
      boardingMode: session.boardingMode,
      priorOrientationNotes: clone(session.priorOrientationNotes),
      onProgress(progress) {
        console.log('[ai.pipeline] Orientation progress:', progress);
      }
    });

    return {
      ok: true,
      active: false,
      admitted: false,
      sessionId,
      provider: session.provider,
      model: session.model,
      partitionId: session.partitionId,
      boardingMode: session.boardingMode,
      state: session.state,
      orientation: orientation.orientation,
      operation: orientation.operation
    };
  } catch (err) {
    sessions.delete(sessionId);
    console.error('[ai.pipeline] connect error:', err.message);
    return { ok: false, sessionId, error: err.message };
  }
}

function advanceOrientation({ sessionId, response } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;

  if (session.state !== 'orienting' && session.state !== 'orientation_complete') {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: `Session is not accepting orientation responses: ${session.state}`
    };
  }

  try {
    const result = submitOrientationResponse(session, response, {
      onProgress(progress) {
        console.log('[ai.pipeline] Orientation progress:', progress);
      }
    });

    if (!result.ok || !result.complete) {
      return {
        ...result,
        sessionId: normalizedSessionId,
        provider: session.provider,
        model: session.model,
        partitionId: session.partitionId,
        boardingMode: session.boardingMode,
        admitted: false
      };
    }

    const activePartition = activatePartition(session);
    return {
      ok: true,
      active: true,
      admitted: true,
      complete: true,
      sessionId: normalizedSessionId,
      provider: session.provider,
      model: session.model,
      partitionId: session.partitionId,
      boardingMode: session.boardingMode,
      state: session.state,
      orientation: publicOrientation(session),
      activePartition: {
        ...activePartition,
        operations: [...activePartition.operations]
      },
      operation: null
    };
  } catch (err) {
    console.error('[ai.pipeline] orientation response error:', err.message);
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: err.message
    };
  }
}

function submitPersistenceResult({ sessionId, persistenceType, result } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;

  const { session, sessionId: normalizedSessionId } = lookup;
  const pending = session.pendingPersistence;
  const normalizedType = typeof persistenceType === 'string'
    ? persistenceType.trim()
    : '';

  if (!pending) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'No orientation persistence operation is pending.'
    };
  }

  if (!normalizedType || normalizedType !== pending.type) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The persistence result does not match the pending operation.'
    };
  }

  if (!result || result.ok !== true || result.verified !== true) {
    const error = result?.error || 'Local persistence was not verified.';
    session.state = 'persistence_failed';
    pending.error = error;
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      persistenceType: normalizedType,
      error
    };
  }

  session.pendingPersistence = null;
  session.state = 'orienting';

  const operation = getCurrentOrientationOperation(session);
  const orientationComplete =
    session.state === 'orientation_complete' && !operation;

  if (!orientationComplete) {
    return {
      ok: true,
      active: false,
      admitted: false,
      complete: false,
      sessionId: normalizedSessionId,
      provider: session.provider,
      model: session.model,
      partitionId: session.partitionId,
      boardingMode: session.boardingMode,
      state: session.state,
      persistenceType: normalizedType,
      verified: true,
      path: result.path || null,
      orientation: publicOrientation(session),
      operation
    };
  }

  const activePartition = activatePartition(session);
  return {
    ok: true,
    active: true,
    admitted: true,
    complete: true,
    sessionId: normalizedSessionId,
    provider: session.provider,
    model: session.model,
    partitionId: session.partitionId,
    boardingMode: session.boardingMode,
    state: session.state,
    persistenceType: normalizedType,
    verified: true,
    path: result.path || null,
    orientation: publicOrientation(session),
    activePartition: {
      ...activePartition,
      operations: [...activePartition.operations]
    },
    operation: null
  };
}

function currentOperation({ sessionId } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;

  if (session.pendingPersistence?.operation) {
    return {
      ok: true,
      sessionId: normalizedSessionId,
      state: session.state,
      operation: clone(session.pendingPersistence.operation)
    };
  }

  if (session.state === 'orienting') {
    return {
      ok: true,
      sessionId: normalizedSessionId,
      state: session.state,
      operation: getCurrentOrientationOperation(session)
    };
  }

  if (session.pendingTurn) {
    return {
      ok: true,
      sessionId: normalizedSessionId,
      state: session.state,
      operation: clone(session.pendingTurn.operation)
    };
  }

  return {
    ok: true,
    sessionId: normalizedSessionId,
    state: session.state,
    operation: null
  };
}

function beginChat({ sessionId, message } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  const userMessage = typeof message === 'string' ? message.trim() : '';

  if (!userMessage) return { ok: false, error: 'A non-empty user message is required.' };
  if (session.state !== 'ready' && session.state !== 'ready_for_introduction') {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The AI has not been admitted to WingMan.'
    };
  }
  if (session.pendingTurn) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'A provider turn is already pending.'
    };
  }

  const turnId = randomUUID();
  const startedAt = Date.now();
  const operation = {
    type: 'chat_turn',
    turnId,
    sessionId: normalizedSessionId,
    provider: session.provider,
    model: session.model,
    params: clone(session.params),
    messages: buildConversationMessages(session, userMessage)
  };

  session.pendingTurn = {
    id: turnId,
    type: 'chat_turn',
    userMessage,
    createdAt: startedAt,
    operation
  };
  session.state = 'awaiting_provider_response';

  return {
    ok: true,
    sessionId: normalizedSessionId,
    state: session.state,
    operation: clone(operation)
  };
}

function completeChat({ sessionId, turnId, reply } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  const pending = session.pendingTurn;
  const normalizedTurnId = typeof turnId === 'string' ? turnId.trim() : '';
  const fullReply = typeof reply === 'string' ? reply.trim() : '';

  if (!pending || pending.type !== 'chat_turn') {
    return { ok: false, sessionId: normalizedSessionId, state: session.state, error: 'No chat turn is awaiting a provider response.' };
  }
  if (!normalizedTurnId || normalizedTurnId !== pending.id) {
    return { ok: false, sessionId: normalizedSessionId, state: session.state, error: 'The provider response does not match the pending chat turn.' };
  }
  if (!fullReply) {
    return { ok: false, sessionId: normalizedSessionId, state: session.state, error: 'A non-empty provider reply is required.' };
  }

  const completedAt = Date.now();
  const latencyMs = completedAt - pending.createdAt;
  session.log.push(
    { role: 'user', content: pending.userMessage, ts: pending.createdAt },
    { role: 'assistant', content: fullReply, ts: completedAt }
  );
  session.pendingTurn = null;
  session.state = 'ready';

  return {
    ok: true,
    sessionId: normalizedSessionId,
    provider: session.provider,
    state: session.state,
    fullReply,
    reply: fullReply,
    latencyMs
  };
}

function failPendingTurn({ sessionId, turnId, error } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  const pending = session.pendingTurn;
  const normalizedTurnId = typeof turnId === 'string' ? turnId.trim() : '';

  if (!pending) {
    return { ok: false, sessionId: normalizedSessionId, state: session.state, error: 'No provider turn is pending.' };
  }
  if (normalizedTurnId && normalizedTurnId !== pending.id) {
    return { ok: false, sessionId: normalizedSessionId, state: session.state, error: 'The failure does not match the pending provider turn.' };
  }

  session.pendingTurn = null;
  session.state = session.activePartition ? 'ready' : 'orienting';
  return {
    ok: true,
    sessionId: normalizedSessionId,
    state: session.state,
    providerError: String(error || 'Provider transport failed.')
  };
}

function disconnect({ sessionId } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  session.state = 'disconnecting';

  let partitionResult = null;
  if (typeof ActivePartitionGateway.deactivate === 'function') {
    partitionResult = ActivePartitionGateway.deactivate({ sessionId: normalizedSessionId });
  }

  sessions.delete(normalizedSessionId);
  console.log(`[ai.pipeline] Session closed: ${normalizedSessionId}`);
  return {
    ok: true,
    active: false,
    sessionId: normalizedSessionId,
    state: 'disconnected',
    partition: partitionResult
  };
}

function getSession(sessionId) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return null;
  return publicSession(lookup.session);
}

module.exports = {
  connect,
  advanceOrientation,
  submitPersistenceResult,
  currentOperation,
  beginChat,
  completeChat,
  failPendingTurn,
  disconnect,
  getSession
};
