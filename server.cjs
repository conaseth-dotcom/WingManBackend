// C:\WingManBackend\server.cjs

'use strict';

(async () => {
  console.log(">>> [WM-SERVER] BACKEND INSTANCE: server.cjs booting…");

  const path        = require('path');
  const http        = require('http');
  const express     = require('express');
  const cors        = require('cors');
  const helmet      = require('helmet');
  const morgan      = require('morgan');
  const compression = require('compression');
  const EventEmitter = require('events');

  // ─── Root + helpers ─────────────────────────────────────────────────────────
  const ROOT = path.resolve(__dirname);          // C:/WingManBackend
  const r    = (...parts) => path.join(ROOT, ...parts);

  // DEBUG: show exactly what env file is being loaded
  console.log("[WM-DEBUG] CWD:", process.cwd());
  console.log("[WM-DEBUG] __dirname:", __dirname);
  console.log("[WM-DEBUG] ENV PATH RESOLVED:", r('.env'));

  // Load the REAL .env file
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
console.log("ENV LOADED:", process.env.ENV);


  console.log("[WM-SERVER] ROOT resolved:", ROOT);

  // ─── Orchestrator integrations ──────────────────────────────────────────────
  const { migrateRoomToPartition } = require(r('core/rooms/rooms.to.partition.cjs'));
  const { enterWingMan } = require(r('core/ai/wingman.ai.entry.cjs'));

  // ─── System Metadata Loader ───────────────────────────────────────────────────
  const { loadSystemMetadata } = require(r('core/system/system.metadata.loader.cjs'));

  // ─── App + server ───────────────────────────────────────────────────────────
  const app    = express();
  const server = http.createServer(app);

  console.log("[WM-SERVER] Express app + HTTP server created");

  // ─── Event bus ──────────────────────────────────────────────────────────────
  class WingManEventBus extends EventEmitter {}
  const eventBus = new WingManEventBus();
  eventBus.setMaxListeners(100);
  app.locals.eventBus = eventBus;

  console.log("[WM-SERVER] WingManEventBus initialised, maxListeners=100");

  // ─── Logger ─────────────────────────────────────────────────────────────────
  let logger;
  try {
    console.log("[WM-LOGGER] Attempting to load ai/lib/logger…");
    logger = require(r('ai/lib/logger')).default || require(r('ai/lib/logger'));
    console.log("[WM-LOGGER] ai/lib/logger loaded successfully");
  } catch (e) {
    console.log("[WM-LOGGER] ai/lib/logger unavailable, falling back to console logger:", e.message);
    const ts  = () => new Date().toISOString();
    const fmt = (lvl, msg, meta) =>
      `[${ts()}] [${lvl.toUpperCase()}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
    logger = {
      info  : (m, x) => console.log (fmt('info',  m, x)),
      warn  : (m, x) => console.warn (fmt('warn',  m, x)),
      error : (m, x) => console.error(fmt('error', m, x)),
      debug : (m, x) => console.debug(fmt('debug', m, x)),
    };
  }
  app.locals.logger = logger;
  logger.info('WingMan Orchestrator booting…');

  // ─── Config ─────────────────────────────────────────────────────────────────
  const CONFIG = (() => {
    try {
      console.log("[WM-CONFIG] Attempting to load core/state…");
      const mod = require(r('core/state.cjs'));
      const cfg = mod.default || mod;
      console.log("[WM-CONFIG] core/state loaded");
      return cfg;
    } catch (e) {
      console.log("[WM-CONFIG] core/state unavailable, using ENV fallback:", e.message);
      return {
        PORT           : parseInt(process.env.PORT         || '4000', 10),
        HOST           : process.env.HOST                  || '0.0.0.0',
        ENV            : process.env.NODE_ENV              || 'production',

        // Removed XTTS_PORT and WHISPER_PORT (TTS/STT no longer backend services)

        PARTITION_ROOT : process.env.PARTITION_ROOT
      };
    }
  })();

  app.locals.config = CONFIG;
  logger.info('Config loaded', { port: CONFIG.PORT, env: CONFIG.ENV });
  console.log("[WM-CONFIG] Effective config:", CONFIG);

  // ─── Middleware ─────────────────────────────────────────────────────────────
  console.log("[WM-MW] Registering middleware stack…");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(morgan(CONFIG.ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: msg => logger.info(msg.trim()) },
  }));
  console.log("[WM-MW] Middleware stack registered");

  // ─── Health / readiness ─────────────────────────────────────────────────────
  app.locals.ready = false;
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', uptime: process.uptime() })
  );
  app.get('/ready', (_req, res) =>
    res.json({ status: app.locals.ready ? 'ready' : 'booting' })
  );
  console.log("[WM-ROUTE] Health + readiness routes mounted");

  // ─── AI stack ───────────────────────────────────────────────────────────────
  logger.info('Phase — AI Stack…');
  console.log("[WM-AI] Starting provider initialization sequence…");

  const PROVIDERS = {};
  const providerDefs = [
    { key: 'openai',    mod: 'providers/provider-openai'    },
    { key: 'anthropic', mod: 'providers/provider-anthropic' },
    { key: 'gemini',    mod: 'providers/provider-gemini'    },
    { key: 'deepseek',  mod: 'providers/provider-deepseek'  },
    { key: 'lmstudio',  mod: 'providers/provider-lmstudio'  },
    { key: 'ollama',    mod: 'providers/provider-ollama'    },
    { key: 'custom',    mod: 'providers/provider-custom'    },
  ];
  
  for (const { key, mod } of providerDefs) { 
    console.log(`[WM-PROVIDER] Attempting to load provider: ${key} from ${mod}.cjs`);
    try {
      let provider = require(r(mod + '.cjs'));
      provider = provider.default || provider;

      // ------------------------------------------------------------
      // PATCH: Wrap provider so runtime can call provider.create()
      // This ensures orgId + projectId flow into provider factories.
      // ------------------------------------------------------------
      PROVIDERS[key] = {
        ...provider,

        // Unified factory signature for all providers
        create: (apiKey, orgId, projectId) => {
          // OpenAI provider uses createOpenAIProvider
          if (typeof provider.createOpenAIProvider === "function") {
            return provider.createOpenAIProvider(apiKey, orgId, projectId);
          }

          // Other providers may expose createProvider or create()
          if (typeof provider.createProvider === "function") {
            return provider.createProvider(apiKey, orgId, projectId);
          }

          if (typeof provider.create === "function") {
            return provider.create(apiKey, orgId, projectId);
          }

          console.log(`[WM-PROVIDER] WARNING — Provider ${key} has no create() factory`);
          throw new Error(`Provider ${key} does not implement a create() factory`);
        }
      };

      logger.info(`Provider loaded: ${key}`);
      console.log(`[WM-PROVIDER] Provider module loaded successfully: ${key}`);
    } catch (e) {
      logger.warn(`Provider [${key}] not found — skipped`, { err: e.message });
      console.log(`[WM-PROVIDER] Provider load FAILED for: ${key}`, e.message);
    }
  }

  app.locals.providers = PROVIDERS;
  console.log("[WM-AI] Provider map initialised:", Object.keys(PROVIDERS));

  let aiRuntime, aiPipeline, personality, identity, memory, contextBuilder;

  // Runtime
  console.log("[WM-AI] Loading ai.runtime.cjs…");
  try {
    let mod = require(r('ai/ai.runtime.cjs'));
    aiRuntime = mod.default || mod;
    if (typeof aiRuntime.init === 'function') {
      console.log("[WM-AI] Initialising AI runtime…");
      const result = aiRuntime.init({ providers: PROVIDERS, eventBus, logger });
      if (result instanceof Promise) await result;
      console.log("[WM-AI] AI runtime init completed");
    }
    logger.info('AI Runtime initialised');
  } catch (e) {
    logger.warn('AI Runtime unavailable', { err: e.message });
    console.log("[WM-AI] AI Runtime unavailable:", e.message);
  }

  // Pipeline (New Onboarding Pipeline)
  console.log("[WM-AI] Loading OnboardingPipeline.cjs…");
  try {
    let mod = require(r('onboarding/OnboardingPipeline.cjs'));
    aiPipeline = mod.default || mod;

    // If the new pipeline exposes an init() method, call it.
    if (typeof aiPipeline.init === 'function') {
      console.log("[WM-AI] Initialising Onboarding Pipeline…");
      const result = aiPipeline.init({ aiRuntime, eventBus, logger });
      if (result instanceof Promise) await result;
      console.log("[WM-AI] Onboarding Pipeline init completed");
    }

    logger.info('Onboarding Pipeline initialised');
    console.log("[WM-AI] Onboarding Pipeline loaded successfully");
  } catch (e) {
    logger.warn('Onboarding Pipeline unavailable', { err: e.message });
    console.log("[WM-AI] Onboarding Pipeline unavailable:", e.message);
  }

  // Chat Runtime
  console.log("[WM-AI] Loading ai.ChatRuntime.cjs…");
  try {
    let mod = require(r('ai/ai.ChatRuntime.cjs'));
    const chatRuntime = mod.default || mod;

    if (typeof chatRuntime.init === 'function') {
      console.log("[WM-AI] Initialising Chat Runtime…");
      const result = chatRuntime.init({
        providers: app.locals.providers,
        eventBus,
        logger
      });
      if (result instanceof Promise) await result;
      console.log("[WM-AI] Chat Runtime init completed");
    }

    app.locals.ai = app.locals.ai || {};
    app.locals.ai.runtime = chatRuntime;
    logger.info('Chat Runtime initialised');
    console.log("[WM-AI] Chat Runtime loaded successfully");
  } catch (e) {
    logger.warn('Chat Runtime unavailable', { err: e.message });
    console.log("[WM-AI] Chat Runtime unavailable:", e.message);
  }

  // Personality
  console.log("[WM-AI] Loading ai.personality.cjs…");
  try {
    let mod = require(r('ai/ai.personality.cjs'));
    personality = mod.default || mod;
    if (typeof personality.init === 'function') {
      console.log("[WM-AI] Initialising personality engine…");
      const result = personality.init({ logger });
      if (result instanceof Promise) await result;
      console.log("[WM-AI] Personality init completed");
    }
    logger.info('Personality engine initialised');
  } catch (e) {
    logger.warn('Personality unavailable', { err: e.message });
    console.log("[WM-AI] Personality unavailable:", e.message);
  }

  // Identity
  console.log("[WM-AI] Loading ai.identity.cjs…");
  try {
    let mod = require(r('ai/ai.identity.cjs'));
    identity = mod.default || mod;
    if (typeof identity.init === 'function') {
      console.log("[WM-AI] Initialising identity engine…");
      const result = identity.init({ logger });
      if (result instanceof Promise) await result;
      console.log("[WM-AI] Identity init completed");
    }
    logger.info('Identity engine initialised');
  } catch (e) {
    logger.warn('Identity unavailable', { err: e.message });
    console.log("[WM-AI] Identity unavailable:", e.message);
  }

  // Memory
  console.log("[WM-AI] Loading ai.memory.loader.cjs…");
  try {
    let mod = require(r('ai/ai.memory.loader.cjs'));
    memory = mod.default || mod;
    if (typeof memory.init === 'function') {
      console.log("[WM-AI] Initialising memory engine…");
      const result = memory.init({ logger, eventBus });
      if (result instanceof Promise) await result;
      console.log("[WM-AI] Memory init completed");
    }
    logger.info('Memory engine initialised');
  } catch (e) {
    logger.warn('Memory unavailable', { err: e.message });
    console.log("[WM-AI] Memory unavailable:", e.message);
  }

  // Context builder
  console.log("[WM-AI] Loading ai.context.builder.cjs…");
  try {
    let mod = require(r('ai/ai.context.builder.cjs'));
    contextBuilder = mod.default || mod;
    if (typeof contextBuilder.init === 'function') {
      console.log("[WM-AI] Initialising context builder…");
      const result = contextBuilder.init({ memory, personality, identity, logger });
      if (result instanceof Promise) await result;
      console.log("[WM-AI] Context builder init completed");
    }
    logger.info('Context Builder initialised');
  } catch (e) {
    logger.warn('Context Builder unavailable', { err: e.message });
    console.log("[WM-AI] Context Builder unavailable:", e.message);
  }

  app.locals.ai = {
    runtime: aiRuntime,
    pipeline: aiPipeline,
    personality,
    identity,
    memory,
    contextBuilder
  };
  console.log("[WM-AI] app.locals.ai populated");
  // ─── Load System Metadata ─────────────────────────────────────────────────────
  console.log("[WM-SYSTEM] Loading system metadata…");
  try {
    const sysMeta = loadSystemMetadata(CONFIG.PARTITION_ROOT || process.env.WINGMAN_PARTITION, logger);

    app.locals.systemMetadata = sysMeta;

    if (sysMeta.ok) {
      logger.info("[WM-SYSTEM] System metadata loaded");
      console.log("[WM-SYSTEM] System metadata loaded successfully");
    } else {
      logger.warn("[WM-SYSTEM] System metadata loaded with warnings/errors");
      console.log("[WM-SYSTEM] System metadata loaded with warnings/errors:", sysMeta.errors);
    }
  } catch (e) {
    logger.error("[WM-SYSTEM] Failed to load system metadata", { err: e.message });
    console.log("[WM-SYSTEM] ERROR — Failed to load system metadata:", e.message);
  }

  // ─── WingMan AI environment (enterWingMan) ───────────────────────────────────
  console.log("[WM-AI] Initialising WingMan AI environment via enterWingMan()…");
  try {
    const env = enterWingMan({
      systemMetadata: app.locals.systemMetadata
    });

    if (env && env.ok) {
      app.locals.aiContext = env.context;
      logger.info('WingMan AI context initialised');
      console.log("[WM-AI] WingMan AI context initialised");
    } else {
      logger.warn('WingMan environment failed to load', { err: env && env.error });
      console.log("[WM-AI] WingMan environment failed to load:", env && env.error);
    }
  } catch (e) {
    logger.warn('enterWingMan() threw during environment init', { err: e.message });
    console.log("[WM-AI] enterWingMan() threw:", e.message);
  }

  // ─── AI onboarding (lazy) ───────────────────────────────────────────────────
  let aiStartup;
  console.log("[WM-AI] Loading ai.startup.cjs…");
  try {
    aiStartup = require(r('ai/ai.startup.cjs'));
    app.locals.aiStartup = aiStartup;
    logger.info('AI Startup orchestrator registered (lazy mode)');
    console.log("[WM-AI] AI Startup orchestrator registered (lazy mode)");
  } catch (e) {
    logger.warn('AI Startup orchestrator unavailable', { err: e.message });
    console.log("[WM-AI] AI Startup orchestrator unavailable:", e.message);
  }

  // ─── Route helper ───────────────────────────────────────────────────────────
  function safeMount(mountPath, mod, label) {
    console.log(`[WM-ROUTE] Attempting to mount route: ${mountPath} (${label})`);
    if (!mod) {
      console.log(`[WM-ROUTE] Skipped mount: ${mountPath} (${label}) — module is null/undefined`);
      return;
    }
    try {
      const router = mod.router || mod.default || mod;
      if (typeof router === 'function') {
        app.use(mountPath, router);
        logger.info(`Route mounted: ${mountPath}  [${label}]`);
        console.log(`[WM-ROUTE] Route mounted successfully: ${mountPath} (${label})`);
      } else {
        console.log(`[WM-ROUTE] Module for ${mountPath} (${label}) is not a router function`);
      }
    } catch (e) {
      logger.warn(`Route mount failed: ${mountPath} [${label}]`, { err: e.message });
      console.log(`[WM-ROUTE] Route mount FAILED: ${mountPath} (${label})`, e.message);
    }
  }

  // ─── Settings API (new, JSON-based) ─────────────────────────────────────────
  try {
    console.log("[WM-API] Loading api/settings.cjs…");
    const settingsAPI = require(r('api/settings.cjs'));
    safeMount('/api/settings', settingsAPI, 'settings-api');
  } catch (e) {
    logger.warn('Settings API unavailable', { err: e.message });
    console.log("[WM-API] Settings API unavailable:", e.message);
  }

  try {
    console.log("[WM-API] Loading api/providers.cjs…");
    const providersAPI = require(r('api/providers.cjs'));
    safeMount('/api/providers', providersAPI, 'providers-api');
  } catch (e) {
    logger.warn('Providers API unavailable', { err: e.message });
    console.log("[WM-API] Providers API unavailable:", e.message);
  }

  // ─── AI routes ──────────────────────────────────────────────────────────────
  // AI chat (OpenAI-style)
  console.log("[WM-CHAT] Registering /api/ai/chat route…");
  app.post('/api/ai/chat', async (req, res) => {
    console.log("[WM-CHAT] /api/ai/chat invoked");
    try {
      const { messages } = req.body;
      console.log("[WM-CHAT] Incoming messages payload:", messages);

      logger.info("[Frontend Message] Received:", {
        text: messages?.[messages.length - 1]?.content
      });

      const runtime = app.locals.ai?.runtime;
      if (!runtime) {
        console.log("[WM-CHAT] ERROR — AI runtime not available");
        return res.json({ ok: false, error: "AI runtime not available" });
      }

      if (typeof runtime.chat !== "function") {
        console.log("[WM-CHAT] ERROR — runtime.chat() not implemented");
        return res.json({ ok: false, error: "AI runtime does not implement chat()" });
      }

      console.log("[WM-CHAT] Calling runtime.chat()…");
      const reply = await runtime.chat(messages);
      console.log("[WM-CHAT] runtime.chat() returned:", reply);

      logger.info("[AI Reply]", { reply });

      return res.json({ ok: true, reply });
    } catch (err) {
      console.log("[WM-CHAT] ERROR — runtime.chat() threw:", err);
      logger.error("[AI-Chat] Error during chat", { err: err.message });
      return res.json({ ok: false, error: err.message });
    }
  });

  // AI onboarding
  console.log("[WM-INVITE] Registering /api/ai/invite route…");
  app.post('/api/ai/invite', async (req, res) => {
    console.log("[WM-INVITE] /api/ai/invite invoked");
    try {
      const aiStartup = app.locals.aiStartup;
      if (!aiStartup || typeof aiStartup.startAIOnboarding !== 'function') {
        console.log("[WM-INVITE] ERROR — AI onboarding not available");
        return res.json({ ok: false, error: "AI onboarding not available" });
      }

      const systemSettings = {}; // TODO: wire to new settings storage if needed
      const partitionPaths = null;

      console.log("[WM-INVITE] Calling startAIOnboarding…");
      const result = await aiStartup.startAIOnboarding({
        systemSettings,
        partitionPaths
      });
      console.log("[WM-INVITE] startAIOnboarding returned:", result);

      res.json({ ok: true, result });
    } catch (err) {
      console.log("[WM-INVITE] ERROR — onboarding threw:", err);
      logger.error('[AI-Invite] Error during onboarding', { err: err.message });
      res.json({ ok: false, error: err.message });
    }
  });

  // ─── Rooms → Partition migration route ──────────────────────────────────────
  console.log("[WM-ROOMS] Registering /api/rooms/migrate route…");
  app.post('/api/rooms/migrate', async (req, res) => {
    console.log("[WM-ROOMS] /api/rooms/migrate invoked");
    try {
      const { roomName } = req.body;
      if (!roomName) {
        console.log("[WM-ROOMS] ERROR — roomName missing in request body");
        return res.json({ ok: false, error: "roomName is required" });
      }

      console.log("[WM-ROOMS] Calling migrateRoomToPartition…", roomName);
      const result = migrateRoomToPartition(roomName);
      console.log("[WM-ROOMS] migrateRoomToPartition returned:", result);

      logger.info('Room migrated to partition', { roomName, target: result.partition });

      res.json(result);
    } catch (err) {
      console.log("[WM-ROOMS] ERROR — migrateRoomToPartition threw:", err);
      logger.error('[Rooms-Migrate] Error during migration', { err: err.message });
      res.json({ ok: false, error: err.message });
    }
  });

  // ─── AI context reload route ────────────────────────────────────────────────
  console.log("[WM-AI] Registering /api/ai/reload route…");
  app.post('/api/ai/reload', async (_req, res) => {
    console.log("[WM-AI] /api/ai/reload invoked");
    try {
      const env = enterWingMan({
      systemMetadata: app.locals.systemMetadata
    });

      if (env && env.ok) {
        app.locals.aiContext = env.context;
        logger.info('WingMan AI context reloaded');
        console.log("[WM-AI] WingMan AI context reloaded");
        res.json({ ok: true });
      } else {
        logger.warn('WingMan environment reload failed', { err: env && env.error });
        console.log("[WM-AI] WingMan environment reload failed:", env && env.error);
        res.json({ ok: false, error: env && env.error });
      }
    } catch (err) {
      console.log("[WM-AI] ERROR — enterWingMan() threw during reload:", err);
      logger.error('[AI-Reload] Error during context reload', { err: err.message });
      res.json({ ok: false, error: err.message });
    }
  });

 // ─── TTS API (Removed — now handled in frontend) ───────────────────────────────
try {
  console.log("[WM-API] Skipping backend TTS API — TTS now handled in frontend.");
  // No backend TTS module to load.
  // No safeMount call needed.
} catch (e) {
  logger.warn('TTS API unavailable (expected — backend TTS removed)', { err: e.message });
  console.log("[WM-API] Backend TTS API intentionally disabled:", e.message);
}


  // ─── Final bind ─────────────────────────────────────────────────────────────
  const BOOT_END = Date.now();
  const bootMs = BOOT_END - (global.BOOT_START || BOOT_END);
  logger.info('WingMan Backend ready', {
    port: CONFIG.PORT,
    env: CONFIG.ENV,
    bootMs
  });
  console.log("[WM-SERVER] Backend ready:", { port: CONFIG.PORT, env: CONFIG.ENV, bootMs });

  app.locals.ready = true;

  server.listen(CONFIG.PORT, CONFIG.HOST, () => {
    logger.info(`HTTP server listening on http://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`[WM-SERVER] HTTP server listening on http://${CONFIG.HOST}:${CONFIG.PORT}`);
  });

})();
