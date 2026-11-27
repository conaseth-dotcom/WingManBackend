/* ========================================================================
   WingMan Backend File
   Alias: @backend-ai/ai.pipeline.cjs
   Role: Authoritative, transport-neutral backend AI session pipeline.

   Governance model:
     - WingMan owns and enforces environmental boundaries.
     - The user owns objectives, project authority, and relationship choices.
     - The AI owns design and implementation only inside current authority.
     - Backend runtime state is authoritative; AI-facing instructions describe
       that state but never replace backend enforcement.
========================================================================= */
'use strict';

const { randomUUID } = require('crypto');
const ActivePartitionGateway = require('../partition/api/active-partition.gateway.cjs');
const { createFunctionRuntimeState } = require('./governance/function.runtime-state.cjs');
const { buildGovernanceInstructions } = require('./governance/governance.instructions.cjs');

const SPATIAL_ACTION = 'spatial_action';
const SPATIAL_ACTIONS = Object.freeze({
  ENTER_3D: 'enter_3d',
  LEAVE_3D: 'leave_3d'
});

const PIPELINE_VERSION = '4.0.0';
const sessions = new Map();

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

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

function requirePartitionId(value) {
  const partitionId = typeof value === 'string' ? value.trim() : '';
  if (!partitionId) {
    throw new Error('Local AI context must identify the active Partition.');
  }
  return partitionId;
}

function normalizeLocalContext(value) {
  if (!isPlainObject(value)) {
    throw new Error('A valid localContext object is required.');
  }

  const partitionId = requirePartitionId(value.partitionId);
  const activeProject = value.activeProject == null
    ? null
    : normalizeProject(value.activeProject);

  return { partitionId, activeProject };
}

function normalizeProject(project) {
  if (!isPlainObject(project) || !String(project.id || '').trim()) {
    throw new Error('An active project requires a stable project id.');
  }

  return Object.freeze({
    id: String(project.id).trim(),
    name: typeof project.name === 'string' && project.name.trim()
      ? project.name.trim()
      : null
  });
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

function normalizePreferredName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function normalizeSpatialAction(action) {
  const normalized = typeof action === 'string'
    ? action.trim().toLowerCase()
    : '';

  if (!Object.values(SPATIAL_ACTIONS).includes(normalized)) {
    throw new Error(`Unsupported spatial action: ${normalized || '<missing>'}`);
  }

  return normalized;
}

function normalizeSpatialReason(reason) {
  return typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
}

function normalizeOptionalActionChoice(actionChoice, offeredActions = []) {
  if (actionChoice === null || actionChoice === undefined) return null;

  if (!isPlainObject(actionChoice)) {
    throw new Error('The provider returned an invalid optional action choice.');
  }

  const name = typeof actionChoice.name === 'string'
    ? actionChoice.name.trim()
    : '';

  const offeredNames = new Set(
    offeredActions
      .filter(isPlainObject)
      .map((action) => typeof action.name === 'string' ? action.name.trim() : '')
      .filter(Boolean)
  );

  if (!name || !offeredNames.has(name)) {
    throw new Error(
      `The provider selected an action that was not offered: ${name || '<missing>'}`
    );
  }

  return {
    name,
    parameters: isPlainObject(actionChoice.parameters)
      ? clone(actionChoice.parameters)
      : {}
  };
}

function activatePartition(session) {
  session.state = 'activating_partition';

  const partitionAccess = ActivePartitionGateway.activate({
    sessionId: session.id,
    partitionId: session.partitionId
  });

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

  return session.activePartition;
}

function governanceSnapshot(session) {
  return {
    activeProject: clone(session.governance.getActiveProject()),
    functions: session.governance.listFunctionStates().map(clone),
    instructionsGeneratedAt: Date.now()
  };
}

function buildOperationalSystemMessage(session) {
  return buildGovernanceInstructions(session.governance, {
    heading: 'WINGMAN OPERATING PRINCIPLES'
  });
}

function buildConversationMessages(session, userMessage) {
  return [
    { role: 'system', content: buildOperationalSystemMessage(session) },
    ...session.log.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userMessage }
  ];
}

function buildIntroductionMessages(session, preferredName) {
  const nameInstruction = preferredName
    ? `The user's preferred name is ${JSON.stringify(preferredName)}. Address the user by that name.`
    : 'The user has not supplied a preferred name. Introduce yourself without inventing one.';

  return [
    {
      role: 'system',
      content: [
        buildOperationalSystemMessage(session),
        'WingMan has admitted you as the AI participant.',
        'This is your first direct introduction to the user.',
        nameInstruction,
        'Introduce yourself naturally and briefly.',
        'Do not discuss internal admission mechanics unless the user asks.'
      ].join('\n')
    }
  ];
}

function publicSession(session) {
  return {
    id: session.id,
    provider: session.provider,
    model: session.model,
    params: clone(session.params),
    state: session.state,
    partitionId: session.partitionId,
    activePartition: session.activePartition
      ? { ...session.activePartition, operations: [...session.activePartition.operations] }
      : null,
    governance: governanceSnapshot(session),
    admission: clone(session.admission),
    pendingTurn: session.pendingTurn
      ? {
          id: session.pendingTurn.id,
          type: session.pendingTurn.type,
          createdAt: session.pendingTurn.createdAt
        }
      : null,
    pendingSpatialAction: session.pendingSpatialAction
      ? {
          id: session.pendingSpatialAction.id,
          action: session.pendingSpatialAction.action,
          initiatedBy: session.pendingSpatialAction.initiatedBy,
          reason: session.pendingSpatialAction.reason,
          createdAt: session.pendingSpatialAction.createdAt
        }
      : null,
    introductionReply: session.introductionReply,
    startedAt: session.startedAt,
    readyAt: session.readyAt,
    admissionDurationMs: session.admissionDurationMs,
    configVersion: session.configVersion,
    log: session.log.map((entry) => ({ ...entry }))
  };
}

function connect(config = {}) {
  const {
    provider = 'openai',
    model,
    params = {},
    localContext
  } = config;

  const normalizedProvider = normalizeProvider(provider);
  const resolvedModel = model || defaultModel(normalizedProvider);
  const sessionId = randomUUID();
  const startedAt = Date.now();

  let context;
  try {
    context = normalizeLocalContext(localContext);
  } catch (err) {
    return { ok: false, sessionId, error: err.message };
  }

  const governance = createFunctionRuntimeState({
    activeProject: context.activeProject
  });

  const session = {
    id: sessionId,
    provider: normalizedProvider,
    model: resolvedModel,
    params: isPlainObject(params) ? clone(params) : {},
    partitionId: context.partitionId,
    governance,
    activePartition: null,
    pendingTurn: null,
    pendingSpatialAction: null,
    introductionReply: null,
    log: [],
    state: 'admission_pending',
    startedAt,
    readyAt: null,
    admissionDurationMs: null,
    configVersion: PIPELINE_VERSION,
    admission: {
      governanceInitialized: false,
      partitionActivated: false,
      readyForIntroduction: false,
      introductionComplete: false
    }
  };

  try {
    sessions.set(sessionId, session);
    session.admission.governanceInitialized = true;

    activatePartition(session);
    session.admission.partitionActivated = true;

    session.state = 'ready_for_introduction';
    session.readyAt = Date.now();
    session.admissionDurationMs = session.readyAt - startedAt;
    session.admission.readyForIntroduction = true;

    return {
      ok: true,
      active: true,
      admitted: true,
      sessionId,
      provider: session.provider,
      model: session.model,
      partitionId: session.partitionId,
      state: session.state,
      activePartition: clone(session.activePartition),
      governance: governanceSnapshot(session),
      governanceInstructions: buildOperationalSystemMessage(session),
      admissionDurationMs: session.admissionDurationMs
    };
  } catch (err) {
    sessions.delete(sessionId);
    return { ok: false, sessionId, error: err.message };
  }
}

function beginIntroduction({ sessionId, preferredName } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;

  if (session.state !== 'ready_for_introduction') {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: `Session is not ready for introduction: ${session.state}`
    };
  }

  if (!session.activePartition) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The introduction is blocked because ACTIVE_PARTITION is unavailable.'
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
  const normalizedName = normalizePreferredName(preferredName);
  const createdAt = Date.now();
  const operation = {
    type: 'introduction_turn',
    turnId,
    sessionId: normalizedSessionId,
    provider: session.provider,
    model: session.model,
    params: clone(session.params),
    preferredName: normalizedName || null,
    message: 'Provide your authorized introduction to the user now.',
    messages: buildIntroductionMessages(session, normalizedName)
  };

  session.pendingTurn = {
    id: turnId,
    type: 'introduction_turn',
    preferredName: normalizedName || null,
    createdAt,
    operation
  };
  session.state = 'awaiting_introduction_response';

  return {
    ok: true,
    sessionId: normalizedSessionId,
    state: session.state,
    operation: clone(operation)
  };
}

function completeIntroduction({ sessionId, turnId, reply } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  const pending = session.pendingTurn;
  const normalizedTurnId = typeof turnId === 'string' ? turnId.trim() : '';
  const fullReply = typeof reply === 'string' ? reply.trim() : '';

  if (!pending || pending.type !== 'introduction_turn') {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'No introduction turn is awaiting a provider response.'
    };
  }

  if (!normalizedTurnId || normalizedTurnId !== pending.id) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The provider response does not match the pending introduction turn.'
    };
  }

  if (!fullReply) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'A non-empty introduction reply is required.'
    };
  }

  const completedAt = Date.now();
  const latencyMs = completedAt - pending.createdAt;
  session.log.push({ role: 'assistant', content: fullReply, ts: completedAt });
  session.introductionReply = fullReply;
  session.pendingTurn = null;
  session.state = 'ready';
  session.admission.introductionComplete = true;

  return {
    ok: true,
    active: true,
    admitted: true,
    complete: true,
    sessionId: normalizedSessionId,
    provider: session.provider,
    state: session.state,
    fullReply,
    reply: fullReply,
    introduction: fullReply,
    latencyMs
  };
}

function beginChat({ sessionId, message, availableActions = [] } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  const userMessage = typeof message === 'string' ? message.trim() : '';

  if (!userMessage) {
    return { ok: false, error: 'A non-empty user message is required.' };
  }

  if (session.state !== 'ready') {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: session.state === 'ready_for_introduction'
        ? 'The AI is admitted but has not completed its introduction.'
        : 'The AI session is not ready for chat.'
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

  const normalizedAvailableActions = Array.isArray(availableActions)
    ? availableActions
        .filter((action) => isPlainObject(action) && String(action.name || '').trim())
        .map((action) => ({
          name: String(action.name).trim(),
          description: typeof action.description === 'string'
            ? action.description.trim()
            : '',
          parameters: isPlainObject(action.parameters)
            ? clone(action.parameters)
            : {}
        }))
    : [];

  const turnId = randomUUID();
  const startedAt = Date.now();
  const operation = {
    type: 'chat_turn',
    turnId,
    sessionId: normalizedSessionId,
    provider: session.provider,
    model: session.model,
    params: clone(session.params),
    messages: buildConversationMessages(session, userMessage),
    optionalActions: normalizedAvailableActions
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

function completeChat({ sessionId, turnId, reply, actionChoice = null } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  const pending = session.pendingTurn;
  const normalizedTurnId = typeof turnId === 'string' ? turnId.trim() : '';
  const fullReply = typeof reply === 'string' ? reply.trim() : '';

  if (!pending || pending.type !== 'chat_turn') {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'No chat turn is awaiting a provider response.'
    };
  }

  let normalizedActionChoice;
  try {
    normalizedActionChoice = normalizeOptionalActionChoice(
      actionChoice,
      pending.operation.optionalActions || []
    );
  } catch (err) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: err.message
    };
  }

  if (!normalizedTurnId || normalizedTurnId !== pending.id) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The provider response does not match the pending chat turn.'
    };
  }

  if (!fullReply && !normalizedActionChoice) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The provider response contained neither text nor an offered action choice.'
    };
  }

  const completedAt = Date.now();
  const latencyMs = completedAt - pending.createdAt;
  session.log.push({ role: 'user', content: pending.userMessage, ts: pending.createdAt });
  if (fullReply) {
    session.log.push({ role: 'assistant', content: fullReply, ts: completedAt });
  }
  session.pendingTurn = null;
  session.state = 'ready';

  return {
    ok: true,
    sessionId: normalizedSessionId,
    provider: session.provider,
    state: session.state,
    fullReply,
    reply: fullReply,
    actionChoice: normalizedActionChoice,
    latencyMs
  };
}

function requiredSpatialFunction(action) {
  switch (action) {
    case SPATIAL_ACTIONS.ENTER_3D:
    case SPATIAL_ACTIONS.LEAVE_3D:
      return 'enter_3d_environment';
    default:
      return null;
  }
}

function beginSpatialAction({
  sessionId,
  action,
  parameters = {},
  initiatedBy = 'ai',
  reason = '',
  userOverride = false
} = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;

  if (session.state !== 'ready') {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'Spatial actions require an admitted, ready AI session.'
    };
  }

  if (session.pendingTurn || session.pendingSpatialAction) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'Another governed operation is already pending.'
    };
  }

  let normalizedAction;
  try {
    normalizedAction = normalizeSpatialAction(action);
  } catch (err) {
    return { ok: false, sessionId: normalizedSessionId, state: session.state, error: err.message };
  }

  const functionId = requiredSpatialFunction(normalizedAction);
  const functionState = session.governance.getFunctionState(functionId);

  if (userOverride === true && functionState.hasCurrentAuthority === false) {
    session.governance.clearUserAuthorityOverride(functionId);
  }

  let evaluation = session.governance.evaluate(functionId);
  if (!evaluation.actionable && evaluation.nextAction === 'TAKE_OWNERSHIP') {
    session.governance.claimOwnership(functionId);
    evaluation = session.governance.evaluate(functionId);
  }

  if (!evaluation.actionable) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      function: functionId,
      governance: clone(evaluation),
      error: `Spatial function is not actionable: ${evaluation.failedCondition}`
    };
  }

  const actionId = randomUUID();
  const createdAt = Date.now();
  const normalizedInitiator = initiatedBy === 'user' || initiatedBy === 'user_override'
    ? initiatedBy
    : 'ai';
  const operation = {
    type: SPATIAL_ACTION,
    actionId,
    sessionId: normalizedSessionId,
    action: normalizedAction,
    parameters: isPlainObject(parameters) ? clone(parameters) : {},
    initiatedBy: normalizedInitiator,
    reason: normalizeSpatialReason(reason) || null,
    userOverride: userOverride === true
  };

  session.pendingSpatialAction = {
    id: actionId,
    action: normalizedAction,
    function: functionId,
    initiatedBy: normalizedInitiator,
    reason: operation.reason,
    createdAt,
    operation
  };

  return {
    ok: true,
    sessionId: normalizedSessionId,
    state: session.state,
    operation: clone(operation)
  };
}

function completeSpatialAction({ sessionId, actionId, result } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  const pending = session.pendingSpatialAction;
  const normalizedActionId = typeof actionId === 'string' ? actionId.trim() : '';

  if (!pending) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'No spatial action is awaiting a renderer result.'
    };
  }

  if (!normalizedActionId || normalizedActionId !== pending.id) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The renderer result does not match the pending spatial action.'
    };
  }

  session.pendingSpatialAction = null;

  if (!isPlainObject(result) || result.ok !== true) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      action: pending.action,
      error: result?.error || 'The renderer did not complete the spatial action.'
    };
  }

  return {
    ok: true,
    sessionId: normalizedSessionId,
    state: session.state,
    action: pending.action,
    spatialState: clone(result.state || null)
  };
}

function failSpatialAction({ sessionId, actionId, error } = {}) {
  return completeSpatialAction({
    sessionId,
    actionId,
    result: { ok: false, error: String(error || 'Spatial action failed.') }
  });
}

function failPendingTurn({ sessionId, turnId, error } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  const pending = session.pendingTurn;
  const normalizedTurnId = typeof turnId === 'string' ? turnId.trim() : '';

  if (!pending) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'No provider turn is pending.'
    };
  }

  if (normalizedTurnId && normalizedTurnId !== pending.id) {
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: 'The failure does not match the pending provider turn.'
    };
  }

  session.pendingTurn = null;
  session.state = pending.type === 'introduction_turn'
    ? 'ready_for_introduction'
    : 'ready';

  return {
    ok: true,
    sessionId: normalizedSessionId,
    state: session.state,
    providerError: String(error || 'Provider transport failed.')
  };
}

function setActiveProject({ sessionId, project } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const normalizedProject = project == null ? null : normalizeProject(project);

  if (normalizedProject) {
    lookup.session.governance.setActiveProject(normalizedProject);
  } else {
    lookup.session.governance.clearActiveProject();
  }

  return {
    ok: true,
    sessionId: lookup.sessionId,
    state: lookup.session.state,
    activeProject: clone(lookup.session.governance.getActiveProject()),
    governanceInstructions: buildOperationalSystemMessage(lookup.session)
  };
}

function disconnect({ sessionId } = {}) {
  const lookup = getRequiredSession(sessionId);
  if (!lookup.ok) return lookup;
  const { session, sessionId: normalizedSessionId } = lookup;
  session.state = 'disconnecting';
  session.pendingTurn = null;
  session.pendingSpatialAction = null;

  let partitionResult = null;
  if (typeof ActivePartitionGateway.deactivate === 'function') {
    partitionResult = ActivePartitionGateway.deactivate({
      sessionId: normalizedSessionId
    });
  }

  sessions.delete(normalizedSessionId);

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

module.exports = Object.freeze({
  PIPELINE_VERSION,
  SPATIAL_ACTION,
  SPATIAL_ACTIONS,
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
  disconnect,
  getSession
});
