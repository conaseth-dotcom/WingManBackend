/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.pipeline.cjs
   Role: Authoritative backend AI session pipeline.

   Responsibilities:
     - Create and retain provider sessions.
     - Deliver required governed WingMan orientation.
     - Activate ACTIVE_PARTITION only after orientation succeeds.
     - Maintain backend-owned conversation history.
     - Stream provider replies.
     - Close sessions and revoke ACTIVE_PARTITION access.

   Explicitly not responsible for:
     - Reading private Partition notes or scratch material.
     - Reading First-AI User Interview answers.
     - Rebuilding identity from legacy carepackage systems.
     - Exposing host filesystem paths.
     - Direct filesystem placement into legacy user/shared roots.
     - Frontend vision, STT, or TTS implementation.
========================================================================= */

'use strict';

const { randomUUID } = require('crypto');
const { runAIOrientation } = require('./orientation/ai.orientation.cjs');
const ActivePartitionGateway = require('../partition/api/active-partition.gateway.cjs');

const sessions = new Map();

function normalizeProvider(provider) {
  return String(provider || 'openai').trim().toLowerCase();
}

function defaultModel(provider) {
  switch (normalizeProvider(provider)) {
    case 'groq':
      return 'llama-3.3-70b-versatile';
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
    default:
      return 'gpt-4o';
  }
}

async function createClient(provider, apiKey, baseUrl, orgId, projectId) {
  const normalizedProvider = normalizeProvider(provider);

  if (normalizedProvider === 'openai' || normalizedProvider === 'groq') {
    let OpenAI;
    try {
      OpenAI = require('openai');
    } catch {
      throw new Error('openai package not found. Run: npm install openai');
    }

    const baseUrls = {
      openai: 'https://api.openai.com/v1',
      groq: 'https://api.groq.com/openai/v1'
    };

    return new OpenAI({
      apiKey,
      organization: orgId || undefined,
      project: projectId || undefined,
      baseURL: baseUrl || baseUrls[normalizedProvider]
    });
  }

  if (normalizedProvider === 'anthropic') {
    let Anthropic;
    try {
      Anthropic = require('@anthropic-ai/sdk');
    } catch {
      throw new Error('Anthropic SDK not found. Run: npm install @anthropic-ai/sdk');
    }

    return new Anthropic({ apiKey });
  }

  throw new Error(
    `Unknown provider: "${provider}". Supported: openai, groq, anthropic`
  );
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

async function connect(config = {}) {
  const {
    provider = 'openai',
    apiKey,
    model,
    baseUrl,
    params = {},
    orgId,
    projectId
  } = config;

  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return { ok: false, error: 'apiKey is required' };
  }

  const normalizedProvider = normalizeProvider(provider);
  const resolvedModel = model || defaultModel(normalizedProvider);
  const sessionId = randomUUID();

  try {
    const client = await createClient(
      normalizedProvider,
      apiKey,
      baseUrl,
      orgId,
      projectId
    );

    const session = {
      id: sessionId,
      provider: normalizedProvider,
      model: resolvedModel,
      client,
      params: params && typeof params === 'object' ? params : {},
      log: [],
      state: 'orienting',
      orientation: null,
      activePartition: null,
      startedAt: Date.now(),
      configVersion: '2.0.0',
      orgId: orgId || null,
      projectId: projectId || null
    };

    sessions.set(sessionId, session);

    console.log(
      `[ai.pipeline] Session created: ${sessionId} (${normalizedProvider}/${resolvedModel})`
    );
    console.log(`[ai.pipeline] AI orientation starting: ${sessionId}`);

    const orientation = await runAIOrientation(session, {
      onProgress(progress) {
        console.log('[ai.pipeline] Orientation progress:', progress);
      }
    });

    session.orientation = orientation;
    console.log(`[ai.pipeline] AI orientation complete: ${sessionId}`);

    session.state = 'activating_partition';
    const partitionAccess = ActivePartitionGateway.activate({ sessionId });

    if (!partitionAccess || partitionAccess.ok !== true) {
      session.state = 'partition_access_failed';
      throw new Error(
        `ACTIVE_PARTITION activation failed: ${
          partitionAccess?.error || 'unknown error'
        }`
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

    console.log(`[ai.pipeline] ACTIVE_PARTITION activated: ${sessionId}`);

    return {
      ok: true,
      active: true,
      sessionId,
      provider: normalizedProvider,
      model: resolvedModel,
      state: session.state,
      orientation: session.orientation,
      activePartition: { ...session.activePartition }
    };
  } catch (err) {
    console.error('[ai.pipeline] connect error:', err.message);

    try {
      if (typeof ActivePartitionGateway.deactivate === 'function') {
        ActivePartitionGateway.deactivate({ sessionId });
      }
    } catch (cleanupError) {
      console.error(
        '[ai.pipeline] connect cleanup failed:',
        cleanupError.message
      );
    }

    sessions.delete(sessionId);
    return { ok: false, error: err.message };
  }
}

async function chat({ sessionId, message, onChunk } = {}) {
  const normalizedSessionId =
    typeof sessionId === 'string' ? sessionId.trim() : '';
  const userMessage = typeof message === 'string' ? message.trim() : '';
  const session = sessions.get(normalizedSessionId);

  if (!session) {
    return { ok: false, error: `Session not found: ${normalizedSessionId}` };
  }

  if (!userMessage) {
    return { ok: false, error: 'A non-empty user message is required.' };
  }

  if (
    session.state !== 'ready' &&
    session.state !== 'ready_for_introduction'
  ) {
    return {
      ok: false,
      error: 'The AI has not completed WingMan orientation.',
      state: session.state
    };
  }

  session.state = 'thinking';
  const startedAt = Date.now();

  try {
    const messages = buildConversationMessages(session, userMessage);
    let fullReply = '';

    if (session.provider === 'openai' || session.provider === 'groq') {
      const stream = await session.client.chat.completions.create({
        model: session.model,
        messages,
        stream: true,
        ...session.params
      });

      for await (const chunk of stream) {
        const segment = chunk.choices?.[0]?.delta?.content || '';
        if (!segment) continue;
        fullReply += segment;
        if (typeof onChunk === 'function') onChunk(segment);
      }
    } else if (session.provider === 'anthropic') {
      const systemMessage = messages.find(item => item.role === 'system');
      const conversation = messages.filter(item => item.role !== 'system');
      const maxTokens = session.params.maxOutput || session.params.max_tokens || 2048;

      const anthropicParams = { ...session.params };
      delete anthropicParams.maxOutput;
      delete anthropicParams.max_tokens;

      const stream = session.client.messages.stream({
        model: session.model,
        max_tokens: maxTokens,
        ...(systemMessage ? { system: systemMessage.content } : {}),
        messages: conversation,
        ...anthropicParams
      });

      for await (const event of stream) {
        const segment = event.delta?.text || '';
        if (!segment) continue;
        fullReply += segment;
        if (typeof onChunk === 'function') onChunk(segment);
      }
    } else {
      throw new Error(`No chat implementation for provider: ${session.provider}`);
    }

    const completedAt = Date.now();
    const latencyMs = completedAt - startedAt;

    session.log.push(
      { role: 'user', content: userMessage, ts: startedAt },
      { role: 'assistant', content: fullReply, ts: completedAt }
    );
    session.state = 'ready';

    console.log(
      `[ai.pipeline] chat done: ${normalizedSessionId} (${latencyMs}ms)`
    );

    return {
      ok: true,
      sessionId: normalizedSessionId,
      provider: session.provider,
      state: session.state,
      fullReply,
      reply: fullReply,
      latencyMs
    };
  } catch (err) {
    session.state = 'ready';
    console.error('[ai.pipeline] chat error:', err.message);
    return {
      ok: false,
      sessionId: normalizedSessionId,
      state: session.state,
      error: err.message
    };
  }
}

function disconnect({ sessionId } = {}) {
  const normalizedSessionId =
    typeof sessionId === 'string' ? sessionId.trim() : '';
  const session = sessions.get(normalizedSessionId);

  if (!session) {
    return { ok: false, error: `Session not found: ${normalizedSessionId}` };
  }

  session.state = 'disconnecting';

  let partitionResult = null;
  if (typeof ActivePartitionGateway.deactivate === 'function') {
    partitionResult = ActivePartitionGateway.deactivate({
      sessionId: normalizedSessionId
    });
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
  const normalizedSessionId =
    typeof sessionId === 'string' ? sessionId.trim() : '';
  const session = sessions.get(normalizedSessionId);

  if (!session) return null;

  const { client, ...safeSession } = session;
  return {
    ...safeSession,
    log: session.log.map(entry => ({ ...entry })),
    orientation: session.orientation
      ? { ...session.orientation }
      : null,
    activePartition: session.activePartition
      ? {
          ...session.activePartition,
          operations: [...session.activePartition.operations]
        }
      : null
  };
}

module.exports = {
  connect,
  chat,
  disconnect,
  getSession
};
