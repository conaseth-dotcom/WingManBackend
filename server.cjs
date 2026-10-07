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
  const fs          = require('fs');

  const ROOT = path.resolve(__dirname);
  const r    = (...parts) => path.join(ROOT, ...parts);

  require('dotenv').config({ path: path.resolve(__dirname, '.env') });

  const { loadSystemMetadata } = require(r('core/system/system.metadata.loader.cjs'));
  const { enterWingMan }       = require(r('core/ai/wingman.ai.entry.cjs'));
  const PartitionManager       = require(r('partition/partition.manager.cjs'));

  // ─────────────────────────────────────────────────────────────
  // EXPRESS + BASIC BOOT (SAFE)
  // ─────────────────────────────────────────────────────────────
  const app    = express();
  const server = http.createServer(app);

  class WingManEventBus extends EventEmitter {}
  const eventBus = new WingManEventBus();
  eventBus.setMaxListeners(100);
  app.locals.eventBus = eventBus;

  // Logger
  let logger;
  try {
    logger = require(r('ai/lib/logger')).default || require(r('ai/lib/logger'));
  } catch {
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

  // Config
  const CONFIG = (() => {
    try {
      const mod = require(r('core/state.cjs'));
      return mod.default || mod;
    } catch {
      return {
        PORT           : parseInt(process.env.PORT || '4000', 10),
        HOST           : process.env.HOST || '0.0.0.0',
        ENV            : process.env.NODE_ENV || 'production',
        PARTITION_ROOT : process.env.PARTITION_ROOT
      };
    }
  })();
  app.locals.config = CONFIG;

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(morgan(CONFIG.ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: msg => logger.info(msg.trim()) },
  }));

  // ─────────────────────────────────────────────────────────────
  // SAFE ROUTES (AVAILABLE IMMEDIATELY)
  // ─────────────────────────────────────────────────────────────
  app.locals.ready = false;

  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', uptime: process.uptime() })
  );

  app.get('/ready', (_req, res) =>
    res.json({ status: app.locals.ready ? 'ready' : 'booting' })
  );

  app.get('/version', (req, res) => {
    try {
      const versionData = require(path.join(__dirname, "public", "version.json"));
      res.json(versionData);
    } catch {
      res.status(500).json({ error: "version.json missing or unreadable" });
    }
  });

  app.get('/api/messages', (req, res) => {
    try {
      const messagesPath = path.join(__dirname, "public", "messages.json");
      const data = require(messagesPath);
      res.json(data);
    } catch {
      res.status(500).json({ error: "messages.json missing or unreadable" });
    }
  });

  app.get('/wingman-ui-bundle.zip', (req, res) => {
    const bundlePath = path.join(__dirname, "public", "wingman-ui-bundle.zip");
    if (!fs.existsSync(bundlePath)) {
      return res.status(404).json({ error: "UI bundle not found" });
    }
    res.sendFile(bundlePath);
  });

  // ─────────────────────────────────────────────────────────────
  // PHASED INITIALIZATION FUNCTION
  // ─────────────────────────────────────────────────────────────
  async function initializeWingManEnvironment(partitionInfo) {
    const logger = app.locals.logger;
    const eventBus = app.locals.eventBus;

    logger.info("[WM-INIT] Starting WingMan environment initialization…");

    // 1. System Metadata
    const sysMeta = loadSystemMetadata(partitionInfo.root, logger);
    app.locals.systemMetadata = sysMeta;

    // 2. Providers
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
      try {
        let provider = require(r(mod + '.cjs'));
        provider = provider.default || provider;

        PROVIDERS[key] = {
          ...provider,
          create: (apiKey, orgId, projectId) => {
            if (provider.createOpenAIProvider)
              return provider.createOpenAIProvider(apiKey, orgId, projectId);
            if (provider.createProvider)
              return provider.createProvider(apiKey, orgId, projectId);
            if (provider.create)
              return provider.create(apiKey, orgId, projectId);
            throw new Error(`Provider ${key} missing create()`);
          }
        };
      } catch {}
    }
    app.locals.providers = PROVIDERS;

    // 3. AI Runtime
    try {
      let mod = require(r('ai/ai.runtime.cjs'));
      const aiRuntime = mod.default || mod;
      if (aiRuntime.init) await aiRuntime.init({ providers: PROVIDERS, eventBus, logger });
      app.locals.ai = { runtime: aiRuntime };
    } catch {}

    // 4. Onboarding Pipeline
    try {
      let mod = require(r('onboarding/OnboardingPipeline.cjs'));
      const pipeline = mod.default || mod;
      if (pipeline.init) await pipeline.init({ aiRuntime: app.locals.ai.runtime, eventBus, logger });
      app.locals.ai.pipeline = pipeline;
    } catch {}

    // 5. Personality / Identity / Memory / Context Builder
    const aiModules = [
      { key: "personality", mod: "ai/ai.personality.cjs" },
      { key: "identity",    mod: "ai/ai.identity.cjs" },
      { key: "memory",      mod: "ai/ai.memory.loader.cjs" },
      { key: "contextBuilder", mod: "ai/ai.context.builder.cjs" }
    ];

    for (const { key, mod } of aiModules) {
      try {
        let module = require(r(mod));
        module = module.default || module;
        if (module.init) await module.init({ logger, eventBus });
        app.locals.ai[key] = module;
      } catch {}
    }

    // 6. Chat Runtime
    try {
      let mod = require(r('ai/ai.ChatRuntime.cjs'));
      const chatRuntime = mod.default || mod;
      if (chatRuntime.init) await chatRuntime.init({ providers: PROVIDERS, eventBus, logger });
      app.locals.ai.runtime = chatRuntime;
    } catch {}

    // 7. WingMan AI Environment
    try {
      const env = enterWingMan({ systemMetadata: app.locals.systemMetadata });
      if (env && env.ok) app.locals.aiContext = env.context;
    } catch {}

    // 8. AI Startup
    try {
      const aiStartup = require(r('ai/ai.startup.cjs'));
      app.locals.aiStartup = aiStartup;
    } catch {}

    // 9. Mark backend ready
    app.locals.ready = true;
    logger.info("[WM-INIT] WingMan environment initialization complete");
  }

  // ─────────────────────────────────────────────────────────────
  // PARTITION-READY HANDLER
  // ─────────────────────────────────────────────────────────────
  process.on("message", async (msg) => {
    if (!msg || !msg.type) return;

    if (msg.type === "partition-ready") {
      const logger = app.locals.logger;

      try {
        const initResult = PartitionManager.init({
          logger,
          systemSettings: {
            partitionRoot: msg.path,
            partitionSizeMB: msg.sizeMB,
            version: msg.version || CONFIG.ENV || "unknown"
          }
        });

        if (!initResult || !initResult.root) {
          if (process.send) process.send({ type: "backend-error", reason: "partition-init-failed" });
          return;
        }

        await initializeWingManEnvironment(initResult);

        if (process.send) process.send({ type: "backend-ready" });

      } catch (err) {
        if (process.send) process.send({ type: "backend-error", reason: err.message });
      }
    }

    if (msg.type === "launch-wingman") {
      app.locals.logger.info("[WM-HANDSHAKE] Received launch-wingman");
      // Additional launch logic goes here
    }
  });

  // ─────────────────────────────────────────────────────────────
  // FINAL: START HTTP SERVER
  // ─────────────────────────────────────────────────────────────
  server.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`[WM-SERVER] HTTP server listening on http://${CONFIG.HOST}:${CONFIG.PORT}`);
  });

})();
