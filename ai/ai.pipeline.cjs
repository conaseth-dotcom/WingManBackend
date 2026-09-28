/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.pipeline.cjs
   Role: AI pipeline. Manages provider sessions, builds full WingMan context
         for each request, and streams replies from the LLM.
========================================================================= */

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const { buildAIContext } = require("./ai.context.builder.cjs");
const OnboardingRuntime = require("../BlackBox/relationship/runtime/onboarding.cjs");

const { applyPersonalityToMessages } = require("./ai.personality.cjs");
const { buildVisionPrompt } = require("./ai.vision.personality.cjs");
const { describeImage } = require("./ai.vision.cjs");

const { loadAIIdentity } = require("./ai.identity.cjs");

/* ─── Session store ───────────────────────────────────────────── */
const sessions = new Map();

/* ─── Provider client factory ────────────────────────────────── */
/* PATCH: add orgId + projectId */
async function createClient(provider, apiKey, baseUrl, orgId, projectId) {
  const p = provider?.toLowerCase();

  if (p === "openai" || p === "groq") {
    let OpenAI;
    try {
      OpenAI = require("openai");
    } catch {
      throw new Error("openai package not found. Run: npm install openai");
    }

    const BASE_URLS = {
      groq: "https://api.groq.com/openai/v1",
      openai: "https://api.openai.com/v1"
    };

    /* PATCH: inject orgId + projectId */
    return new OpenAI({
      apiKey,
      organization: orgId || undefined,
      project: projectId || undefined,
      baseURL: baseUrl ?? BASE_URLS[p] ?? BASE_URLS.openai
    });
  }

  if (p === "anthropic") {
    let Anthropic;
    try {
      Anthropic = require("@anthropic-ai/sdk");
    } catch {
      throw new Error("Anthropic SDK not found. Run: npm install @anthropic-ai/sdk");
    }
    return new Anthropic({ apiKey });
  }

  throw new Error(`Unknown provider: "${provider}". Supported: openai, groq, anthropic`);
}

function defaultModel(provider) {
  switch (provider?.toLowerCase()) {
    case "groq": return "llama-3.3-70b-versatile";
    case "anthropic": return "claude-3-5-sonnet-20241022";
    default: return "gpt-4o";
  }
}

/* ─── connect ────────────────────────────────────────────────── */
async function connect(config = {}) {
  const {
    provider = "openai",
    apiKey,
    model,
    baseUrl,
    params = {},
    /* PATCH: accept orgId + projectId */
    orgId,
    projectId
  } = config;

  if (!apiKey) return { ok: false, error: "apiKey is required" };

  try {
    /* PATCH: pass orgId + projectId */
    const client = await createClient(provider, apiKey, baseUrl, orgId, projectId);

    const sessionId = randomUUID();
    const resolvedModel = model ?? defaultModel(provider);
    const startedAt = Date.now();

    sessions.set(sessionId, {
      id: sessionId,
      provider,
      model: resolvedModel,
      client,
      params,
      log: [],
      state: "ready",
      startedAt,
      configVersion: "1.0.0",

      /* PATCH: store orgId + projectId in session */
      orgId,
      projectId
    });

    console.log(`[ai.pipeline] Session created: ${sessionId} (${provider}/${resolvedModel})`);
    return { ok: true, sessionId, provider, model: resolvedModel, state: "ready" };
  } catch (err) {
    console.error("[ai.pipeline] connect error:", err.message);
    return { ok: false, error: err.message };
  }
}

/* ─── build system/context messages ──────────────────────────── */
async function buildMessagesForSession(session, userMessage, history = []) {
  const context = await buildAIContext(session, {
    includePartitions: true,
    includeCarepackage: true,
    includeIdentity: true,
    includeWorld: true,
    includeRelationship: true,
    includeUIModel: true,
    includeNotes: true
  });

  const systemSummaryLines = [];

  if (context.identity) {
    systemSummaryLines.push(`Role: ${context.identity.role}`);
    systemSummaryLines.push(`Description: ${context.identity.description}`);
  }

  if (context.world) {
    systemSummaryLines.push(`World Rooms: ${context.world.rooms?.length ?? 0}`);
  }

  if (context.relationship) {
    systemSummaryLines.push(`Persona: ${context.relationship.persona}`);
    systemSummaryLines.push(`Tone: ${context.relationship.tone}`);
  }

  systemSummaryLines.push("Boundaries:");
  for (const [key, value] of Object.entries(context.boundaries || {})) {
    systemSummaryLines.push(`  - ${key}: ${value ? "ENABLED" : "DISABLED"}`);
  }

  const systemContent = systemSummaryLines.join("\n");

  const messages = [
    { role: "system", content: systemContent },
    ...history,
    { role: "user", content: userMessage }
  ];

  return { messages, context };
}

/* ─── chat (streaming, with full context) ────────────────────── */
async function chat({ sessionId, message, history = [], onChunk } = {}) {
  const session = sessions.get(sessionId);
  if (!session) return { ok: false, error: `Session not found: ${sessionId}` };

  session.state = "thinking";
  const t0 = Date.now();

  try {
    const { messages, context } = await buildMessagesForSession(session, message, history);

    const identity = loadAIIdentity();
    applyPersonalityToMessages(identity, messages);

    const onboarding = context.onboarding;
    const relationshipRuntime = context.relationshipRuntime;

    /* ─── Onboarding Mode ───────────────────────────────────────── */
    if (onboarding && onboarding.completed === false) {
      console.log(">>> [AI-PIPELINE] Onboarding mode active");

      const {
        nextState,
        updatedProfile,
        onboardingComplete
      } = await OnboardingRuntime.advanceOnboardingHandshake(session, message);

      if (onboardingComplete === true) {
        console.log(">>> [AI-PIPELINE] Onboarding completed");
        relationshipRuntime.markOnboardingComplete();
      }

      const systemPrompt = context.systemPrompt ?? "WingMan Onboarding";

      const onboardingMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ];

      const reply = await session.client.chat.completions.create({
        model: session.model,
        messages: onboardingMessages,
        stream: false,
        ...session.params
      });

      const fullReply = reply.choices?.[0]?.message?.content ?? "";

      session.log.push(
        { role: "user", content: message, ts: t0 },
        { role: "assistant", content: fullReply, ts: Date.now() }
      );

      session.state = "ready";

      return {
        ok: true,
        fullReply,
        onboardingState: nextState,
        onboardingComplete
      };
    }

    /* ─── Normal Chat Mode (Streaming) ─────────────────────────── */
    let fullReply = "";

    if (session.provider === "openai" || session.provider === "groq") {
      const stream = await session.client.chat.completions.create({
        model: session.model,
        messages,
        stream: true,
        ...session.params
      });
      for await (const chunk of stream) {
        const segment = chunk.choices?.[0]?.delta?.content ?? "";
        if (segment) {
          fullReply += segment;
          onChunk?.(segment);
        }
      }

    } else if (session.provider === "anthropic") {
      const systemMsg = messages.find(m => m.role === "system");
      const userMessages = messages.filter(m => m.role !== "system");

      const maxOutput = session.params.maxOutput ?? 2048;

      const stream = session.client.messages.stream({
        model: session.model,
        max_tokens: maxOutput,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: userMessages
      });

      for await (const event of stream) {
        const segment = event.delta?.text ?? "";
        if (segment) {
          fullReply += segment;
          onChunk?.(segment);
        }
      }

    } else {
      throw new Error(`No chat implementation for provider: ${session.provider}`);
    }

    const latencyMs = Date.now() - t0;

    session.log.push(
      { role: "user", content: message, ts: t0 },
      { role: "assistant", content: fullReply, ts: Date.now() }
    );

    session.state = "ready";
    console.log(`[ai.pipeline] chat done: ${sessionId} (${latencyMs}ms)`);

    return { ok: true, fullReply, latencyMs };

  } catch (err) {
    session.state = "error";
    console.error("[ai.pipeline] chat error:", err.message);
    return { ok: false, error: err.message };
  }
}

/* ─── vision mode (personality-aware) ─────────────────────────── */
async function vision({ imagePath }) {
  const identity = loadAIIdentity();

  const rawDescription = await describeImage(imagePath);
  const prompt = buildVisionPrompt(identity, rawDescription);

  const session = [...sessions.values()][0];
  if (!session) return { ok: false, error: "No active session" };

  const reply = await session.client.chat.completions.create({
    model: session.model,
    messages: [
      { role: "system", content: "WingMan Vision Mode" },
      { role: "user", content: prompt }
    ],
    stream: false
  });

  const fullReply = reply.choices?.[0]?.message?.content ?? "";
  return { ok: true, fullReply };
}

/* ─── disconnect ─────────────────────────────────────────────── */
function disconnect({ sessionId } = {}) {
  const session = sessions.get(sessionId);
  if (!session) return { ok: false, error: `Session not found: ${sessionId}` };

  const log = [...session.log];
  sessions.delete(sessionId);

  console.log(`[ai.pipeline] Session closed: ${sessionId}`);
  return { ok: true, log };
}

/* ─── exportLog ──────────────────────────────────────────────── */
function exportLog(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return { ok: false, error: `Session not found: ${sessionId}` };
  return { ok: true, log: [...session.log] };
}

/* ─── getSession ─────────────────────────────────────────────── */
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const { client, ...safe } = session;
  return safe;
}

/* ─── placeFile (partition → sandbox pipeline) ─────────── */
async function placeFile({ localPath, partition }) {
  try {
    const session = [...sessions.values()][0];
    if (!session) {
      return { ok: false, error: "No active WingMan session." };
    }

    const sandbox = await createAISandbox(session);

    const destRoot =
      partition === "shared"
        ? sandbox.getSharedPartitionRoot()
        : sandbox.getUserPartitionRoot();

    if (!fs.existsSync(destRoot)) {
      fs.mkdirSync(destRoot, { recursive: true });
    }

    const fileName = path.basename(localPath);
    const destPath = path.join(destRoot, fileName);

    fs.copyFileSync(localPath, destPath);

    console.log(`[ai.pipeline] File placed in partition "${partition}": ${fileName}`);

    return {
      ok: true,
      path: destPath,
      partition,
      fileName
    };
  } catch (err) {
    console.error("[ai.pipeline] placeFile error:", err);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  connect,
  chat,
  vision,
  disconnect,
  exportLog,
  getSession,
  placeFile
};
