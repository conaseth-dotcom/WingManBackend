/* ========================================================================
| Phase | What runs | Notes |
| --- | --- | --- |
| **0** | Express app + HTTP server | Created early, bound last |
| **1** | EventBus · Logger · Config | All middleware applied here |
| **2** | 7 AI providers + Runtime · Pipeline · Personality · Identity · Memory · Context | Each provider is optional — missing ones are skipped |
| **3** | BlackBox Runtime · Autonomy · Thinking · Relationship · UI bridge · Gateway | Depends on Phase 2 being available |
| **4** | Mic · VoiceTransport · VoiceWS · Whisper · XTTS (Python child process) | XTTS spawned with XTTS_PYTHON env var override |
| **5** | Partition · Access · Settings · Trays | All 8 partition sub-modules loaded individually |
| **6** | 30+ /api/... routes mounted; WS attached; server binds | Core routes glob-fallback if no barrel |

Before you start
Make sure these npm packages are in your package.json:
  express  cors  helmet  morgan  compression  ws  dotenv  glob

Set your .env (or environment) with:
  PORT=4000
  HOST=127.0.0.1
  XTTS_PORT=8020
  WHISPER_PORT=9000
  XTTS_PYTHON=python   # or path to your venv python
  NODE_ENV=production

Then run: node C:\WingManBackend\server.cjs
========================================================================= */

/**
 * ============================================================
 *  WingMan Backend — Unified Orchestrator
 *  Entry point: C:/WingManBackend/server.cjs
 *
 *  Startup phases:
 *   Phase 1 — Core infrastructure   (EventBus, Logger, Config)
 *   Phase 2 — AI Stack              (Providers, Runtime, Pipeline, Personality,
 *                                    Identity, Memory, ContextBuilder)
 *   Phase 3 — BlackBox Stack        (Runtime, Autonomy, Thinking, Relationship,
 *                                    UI bridge, Gateway)
 *   Phase 4 — I/O Stack             (Mic, VoiceTransport, VoiceWS,
 *                                    Whisper, XTTS)
 *   Phase 5 — Feature Systems       (Partition, Access,
 *                                    Settings, Trays,)
 *   Phase 6 — HTTP server + WebSocket
 *
 *  All REST routes are mounted under /api/...
 *  A graceful shutdown sequence tears down subsystems in reverse order.
 * ============================================================
 */

'use strict';
(async () => {

require('dotenv').config();

// ─── Node built-ins ────────────────────────────────────────────────────────────
const path      = require('path');
const http      = require('http');
const { spawn } = require('child_process');

// ─── Third-party ───────────────────────────────────────────────────────────────
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const WebSocket   = require('ws');

// ─── Resolve root once ─────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname);               // C:/WingManBackend
const r    = (...parts) => path.join(ROOT, ...parts);

// ─── Startup timer ─────────────────────────────────────────────────────────────
const BOOT_START = Date.now();

// =============================================================================
//  PHASE 0  ·  Express app + raw HTTP server (created first; bound last)
// =============================================================================
const app    = express();
const server = http.createServer(app);

// =============================================================================
//  PHASE 1  ·  Core Infrastructure
// =============================================================================

// ── 1-A  Event Bus ─────────────────────────────────────────────────────────────
const EventEmitter = require('events');
class WingManEventBus extends EventEmitter {}
const eventBus = new WingManEventBus();
eventBus.setMaxListeners(100);
app.locals.eventBus = eventBus;

// ── 1-B  Logger ────────────────────────────────────────────────────────────────
// FIXED: core/logging/logger → ai/lib/logger  (real path)
let logger;
try {
  logger = require(r('ai/lib/logger')).default || require(r('ai/lib/logger'));
} catch {
  // Minimal fallback so every other module can use logger unconditionally
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

// ── 1-C  Environment / Config ──────────────────────────────────────────────────
require('dotenv').config({ path: r('.env') });

// FIXED: core/config → core/state
const CONFIG = (() => {
  try { return require(r('core/state')).default || require(r('core/state')); }
  catch {
    return {
      PORT        : parseInt(process.env.PORT         || '4000', 10),
      HOST        : process.env.HOST                  || '127.0.0.1',
      ENV         : process.env.NODE_ENV              || 'production',
      XTTS_PORT   : parseInt(process.env.XTTS_PORT    || '8020', 10),
      WHISPER_PORT: parseInt(process.env.WHISPER_PORT || '9000', 10),
    };
  }
})();
app.locals.config = CONFIG;
logger.info('Config loaded', { port: CONFIG.PORT, env: CONFIG.ENV });
// Legacy compatibility shim for bootstrapSettings()
// Your new architecture loads secure + partition settings separately.
function bootstrapSettings() {
  try {
    const secure = loadSecureSettings();
    const partition = loadPartitionSettings();

    return {
      secure,
      partition,
      partitionRoot: secure.partitionRoot,
      partitionSizeMB: secure.partitionSizeMB,
      developerMode: secure.developerMode
    };
  } catch (err) {
    logger.warn("[Bootstrap] Failed to load settings, using defaults:", err);
    return {
      secure: {},
      partition: {},
      partitionRoot: "D:\\WingManPartition",
      partitionSizeMB: 512,
      developerMode: false
    };
  }
}

// ── 1-D.1  Bootstrap Settings (Legacy Compatibility Shim) ─────────────────────────

// Legacy compatibility shim for bootstrapSettings()
// Your new architecture loads secure + partition settings separately.
function bootstrapSettings() {
  try {
    const secure = loadSecureSettings();
    const partition = loadPartitionSettings();

    return {
      secure,
      partition,
      partitionRoot: secure.partitionRoot,
      partitionSizeMB: secure.partitionSizeMB,
      developerMode: secure.developerMode
    };
  } catch (err) {
    logger.warn("[Bootstrap] Failed to load settings, using defaults:", err);
    return {
      secure: {},
      partition: {},
      partitionRoot: "D:\\WingManPartition",
      partitionSizeMB: 512,
      developerMode: false
    };
  }
}

const systemSettings = bootstrapSettings();
app.locals.systemSettings = systemSettings;
logger.info("System settings loaded", systemSettings);

// ── 1-D.2  Global Express middleware ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan(CONFIG.ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: msg => logger.info(msg.trim()) },
}));

// ── 1-F  Health + readiness endpoints (unauthenticated) ───────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/ready',  (_req, res) => res.json({ status: app.locals.ready ? 'ready' : 'booting' }));

// =============================================================================
//  PHASE 2  ·  AI Stack
// =============================================================================
logger.info('Phase 2 — Initialising AI Stack…');

// ── 2-A  Providers ─────────────────────────────────────────────────────────────
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
    // Future-proof: try .cjs first, then .cjs
    let provider;
    try { provider = require(r(mod + '.cjs')); }
    catch { provider = require(r(mod + '.cjs')); }

    PROVIDERS[key] = provider.default || provider;
    logger.info(`Provider loaded: ${key}`);
  } catch (e) {
    logger.warn(`Provider [${key}] not found — skipped`, { err: e.message });
  }
}

app.locals.providers = PROVIDERS;

// ── 2-B  AI Runtime ────────────────────────────────────────────────────────────
let aiRuntime;
try {
  let mod;
  try {
    mod = require(r('ai/ai.runtime.cjs'));
  } catch {
    mod = require(r('ai/ai.runtime.cjs'));
  }

  aiRuntime = mod.default || mod;

  if (typeof aiRuntime.init === 'function') {
    const result = aiRuntime.init({
      providers: PROVIDERS,
      eventBus,
      logger
    });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('AI Runtime initialised');
} catch (e) {
  logger.warn('AI Runtime unavailable', { err: e.message });
}

// ── 2-C  AI Pipeline ───────────────────────────────────────────────────────────
let aiPipeline;
try {
  let mod;
  try {
    mod = require(r('ai/ai.pipeline.cjs'));
  } catch {
    mod = require(r('ai/ai.pipeline.cjs'));
  }

  aiPipeline = mod.default || mod;

  if (typeof aiPipeline.init === 'function') {
    const result = aiPipeline.init({
      aiRuntime,
      eventBus,
      logger
    });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('AI Pipeline initialised');
} catch (e) {
  logger.warn('AI Pipeline unavailable', { err: e.message });
}

// ── 2-D  Personality ───────────────────────────────────────────────────────────
let personality;
try {
  let mod;
  try {
    mod = require(r('ai/ai.personality.cjs'));
  } catch {
    mod = require(r('ai/ai.personality.cjs'));
  }

  personality = mod.default || mod;

  if (typeof personality.init === 'function') {
    const result = personality.init({ logger });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('Personality engine initialised');
} catch (e) {
  logger.warn('Personality unavailable', { err: e.message });
}

// ── 2-E  Identity ──────────────────────────────────────────────────────────────
let identity;
try {
  let mod;
  try {
    mod = require(r('ai/ai.identity.cjs'));
  } catch {
    mod = require(r('ai/ai.identity.cjs'));
  }

  identity = mod.default || mod;

  if (typeof identity.init === 'function') {
    const result = identity.init({ logger });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('Identity engine initialised');
} catch (e) {
  logger.warn('Identity unavailable', { err: e.message });
}

// ── 2-F  Memory ────────────────────────────────────────────────────────────────
let memory;
try {
  let mod;
  try {
    mod = require(r('ai/ai.memory.loader.cjs'));
  } catch {
    mod = require(r('ai/ai.memory.loader.cjs'));
  }

  memory = mod.default || mod;

  if (typeof memory.init === 'function') {
    const result = memory.init({
      logger,
      eventBus
    });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('Memory engine initialised');
} catch (e) {
  logger.warn('Memory unavailable', { err: e.message });
}

// ── 2-G  Context Builder ───────────────────────────────────────────────────────
let contextBuilder;
try {
  let mod;
  try {
    mod = require(r('ai/ai.context.builder.cjs'));
  } catch {
    mod = require(r('ai/ai.context.builder.cjs'));
  }

  contextBuilder = mod.default || mod;

  if (typeof contextBuilder.init === 'function') {
    const result = contextBuilder.init({
      memory,
      personality,
      identity,
      logger
    });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('Context Builder initialised');
} catch (e) {
  logger.warn('Context Builder unavailable', { err: e.message });
}

app.locals.ai = {
  runtime: aiRuntime,
  pipeline: aiPipeline,
  personality,
  identity,
  memory,
  contextBuilder
};

// ── 3-A  BlackBox Runtime ──────────────────────────────────────────────────────
let bbRuntime;
try {
  bbRuntime = require(r('BlackBox/blackbox.runtime.cjs'));

  if (typeof bbRuntime.init === 'function') {
    const result = bbRuntime.init({
      aiRuntime,
      aiPipeline,
      eventBus,
      logger
    });

    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('BlackBox Runtime initialised');
} catch (e) {
  logger.warn('BlackBox Runtime unavailable', { err: e.message });
}

// ── 2-H  AI Onboarding Orchestrator (lazy-loaded) ──────────────────────────────
let aiStartup;
try {
  aiStartup = require(r('ai/ai.startup.cjs'));
  app.locals.aiStartup = aiStartup;
  logger.info('AI Startup orchestrator registered (lazy mode)');
} catch (e) {
  logger.warn('AI Startup orchestrator unavailable', { err: e.message });
}

// ── 3-B  Autonomy Engine ───────────────────────────────────────────────────────
let bbAutonomy;
try {
  bbAutonomy = require(r('BlackBox/blackbox.autonomy.cjs'));

  if (typeof bbAutonomy.init === 'function') {
    const result = bbAutonomy.init({
      bbRuntime,
      eventBus,
      logger
    });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('BlackBox Autonomy initialised');
} catch (e) {
  logger.warn('BlackBox Autonomy unavailable', { err: e.message });
}

// ── 3-C  Thinking Engine ───────────────────────────────────────────────────────
let bbThinking;
try {
  bbThinking = require(r('BlackBox/blackbox.thinking.cjs'));

  if (typeof bbThinking.init === 'function') {
    const result = bbThinking.init({
      bbRuntime,
      contextBuilder,
      logger
    });

    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('BlackBox Thinking initialised');
} catch (e) {
  logger.warn('BlackBox Thinking unavailable', { err: e.message });
}

// ── 3-D  Relationship Engine ───────────────────────────────────────────────────
let bbRelationship;
try {
  bbRelationship = require(r('BlackBox/relationship/runtime/index.cjs'));

  if (typeof bbRelationship.init === 'function') {
    const result = bbRelationship.init({
      memory,
      identity,
      logger
    });

    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('BlackBox Relationship Engine initialised');
} catch (e) {
  logger.warn('BlackBox Relationship Engine unavailable', { err: e.message });
}

// ── 3-E  BlackBox UI Bridge ────────────────────────────────────────────────────
let bbUI;
try {
  bbUI = require(r('BlackBox/ui/index.cjs'));

  if (typeof bbUI.init === 'function') {
    const result = bbUI.init({
      eventBus,
      logger
    });

    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('BlackBox UI Bridge initialised');
} catch (e) {
  logger.warn('BlackBox UI Bridge unavailable', { err: e.message });
}

// ── 3-F  BlackBox Gateway ──────────────────────────────────────────────────────
let bbGateway;
try {
  bbGateway = require(r('BlackBox/blackbox.gateway.cjs'));

  if (typeof bbGateway.init === 'function') {
    const result = bbGateway.init({
      bbRuntime,
      bbAutonomy,
      bbThinking,
      bbRelationship,
      eventBus,
      logger
    });

    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('BlackBox Gateway initialised');
} catch (e) {
  logger.warn('BlackBox Gateway unavailable', { err: e.message });
}

app.locals.blackbox = {
  runtime: bbRuntime,
  autonomy: bbAutonomy,
  thinking: bbThinking,
  relationship: bbRelationship,
  ui: bbUI,
  gateway: bbGateway,
};

// ── 4-D  Voice WebSocket ───────────────────────────────────────────────────────
let voiceWS = null;
try {
  // If your actual module path differs, adjust the require() path only.
  voiceWS = require(r('voice/voice.ws.cjs'));

  if (typeof voiceWS.init === 'function') {
    const result = voiceWS.init({ eventBus, logger });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('Voice WebSocket subsystem initialised');
} catch (e) {
  logger.warn('Voice WebSocket subsystem unavailable', { err: e.message });
}
// ── 5-A  Partition Manager (placeholder) ───────────────────────────────────────
let partitionManager;
try {
  partitionManager = require(r('partition/partition.manager.cjs'));

  if (typeof partitionManager.init === 'function') {
    const result = partitionManager.init({
      logger,
      systemSettings: app.locals.systemSettings
    });

    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('Partition Manager (placeholder) initialised');
} catch (e) {
  logger.warn('Partition Manager unavailable', { err: e.message });
}

let partitionAPI, partitionFS, partitionPaths, partitionMerge,
    partitionReview, partitionValidator, partitionSession, partitionStorage;

try {
  partitionFS        = require(r('partition/api/partition.fs.cjs'));
  partitionPaths     = require(r('partition/api/partition.paths.cjs')).default;
  partitionMerge     = require(r('partition/api/partition.merge.cjs'));
  partitionReview    = require(r('partition/api/partition.review.cjs'));
  partitionValidator = require(r('partition/api/partition.validator.cjs'));
  partitionSession   = require(r('partition/api/partition.session.cjs'));
  partitionStorage   = require(r('partition/api/storage.cjs'));

  // NEW: Initialize modules that support init()
  const ss = app.locals.systemSettings;

  if (typeof partitionFS.init === 'function') {
    const result = partitionFS.init({ logger, systemSettings: ss });
    if (result instanceof Promise) await result;
  }

  if (typeof partitionPaths.init === 'function') {
    const result = partitionPaths.init({ logger, systemSettings: ss });
    if (result instanceof Promise) await result;
  }

  if (typeof partitionStorage.init === 'function') {
    const result = partitionStorage.init({ logger, systemSettings: ss });
    if (result instanceof Promise) await result;
  }

  if (typeof partitionSession.init === 'function') {
    const result = partitionSession.init({ logger, systemSettings: ss });
    if (result instanceof Promise) await result;
  }

  if (typeof partitionValidator.init === 'function') {
    const result = partitionValidator.init({ logger, systemSettings: ss });
    if (result instanceof Promise) await result;
  }

  logger.info('Partition System loaded');
} catch (e) {
  logger.warn('Partition System partial/unavailable', { err: e.message });
}

// ── 5-D  Access ────────────────────────────────────────────────────────────────
let accessAPI, accessManager;
try {
  accessAPI     = require(r('access/api'));
  accessManager = require(r('access/manager'));
  logger.info('Access system loaded');
} catch (e) {
  logger.warn('Access system partial/unavailable', { err: e.message });
}

// ── 5-E  Settings ──────────────────────────────────────────────────────────────
// FIXED: settings/settings.router    → router/SettingsRouter
//        settings/settings.validator → settings/settingsValidator
let settingsRouter, settingsValidator;
try {
  //settingsRouter    = require(r('router/SettingsRouter'));
  settingsValidator = require(r('settings/settingsValidator'));
  logger.info('Settings system loaded');
} catch (e) { logger.warn('Settings system partial/unavailable', { err: e.message }); }

// ── 5-F  Trays ─────────────────────────────────────────────────────────────────
// FIXED: tray sub-modules are flat in trays/
//   trays/loader/tray.loader           → trays/tray.loader
//   trays/persistence/tray.persistence → trays/tray.persistence
//   trays/fs/tray.fs                   → trays/tray.fs
//   trays/ipc/tray.ipc                 → trays/tray.ipc
let trayLoader, trayPersistence, trayFS, trayIPC;
try {
  trayLoader      = require(r('trays/tray.loader.cjs'));
  trayPersistence = require(r('trays/tray.persistence.cjs'));
  trayFS          = require(r('trays/tray.fs.cjs'));
  trayIPC         = require(r('trays/tray.ipc.cjs'));

  // Initialize tray loader if supported
  if (typeof trayLoader.init === 'function') {
    const result = trayLoader.init({
      persistence: trayPersistence,
      fs: trayFS,
      ipc: trayIPC,
      eventBus,
      logger
    });

    // Support async init() if the module returns a Promise
    if (result instanceof Promise) {
      await result;
    }
  }

  logger.info('Tray system loaded');
} catch (e) {
  logger.warn('Tray system partial/unavailable', { err: e.message });
}

// =============================================================================
//  PHASE 6  ·  Route Mounting
// =============================================================================
logger.info('Phase 6 — Mounting routes…');

/**
 * safeMount(mountPath, routerModule, label)
 * Accepts: express.Router, { router }, or a plain middleware function.
 */
function safeMount(mountPath, mod, label) {
  if (!mod) return;
  try {
    const router = mod.router || mod.default || mod;
    if (typeof router === 'function') {
      app.use(mountPath, router);
      logger.info(`Route mounted: ${mountPath}  [${label}]`);
    }
  } catch (e) {
    logger.warn(`Route mount failed: ${mountPath} [${label}]`, { err: e.message });
  }
}

// ── Core server routes (barrel or glob) ───────────────────────────────────────
try {
  const coreRoutes = require(r('core/server/routes')).default || require(r('core/server/routes'));
  safeMount('/api', coreRoutes, 'core-routes');
} catch {
  const glob  = require('glob');
  const files = glob.sync(r('core/server/routes/**/*.route.cjs').replace(/\\/g, '/'));
  for (const f of files) {
    try {
      const slug = path.basename(f, '.route.cjs');
      const routeMod = require(f).default || require(f);
      safeMount(`/api/${slug}`, routeMod, `core-route:${slug}`);
    } catch (e) {
      logger.warn(`Core route load failed: ${f}`, { err: e.message });
    }
  }
}

// ── AI routes ──────────────────────────────────────────────────────────────────
safeMount('/api/ai/runtime',     aiRuntime,     'ai-runtime');
safeMount('/api/ai/pipeline',    aiPipeline,    'ai-pipeline');
safeMount('/api/ai/personality', personality,   'ai-personality');
safeMount('/api/ai/identity',    identity,      'ai-identity');
safeMount('/api/ai/memory',      memory,        'ai-memory');
safeMount('/api/ai/context',     contextBuilder,'ai-context');

// ⭐ NEW: Invite AI onboarding route
app.post('/api/ai/invite', async (req, res) => {
  try {
    const aiStartup = app.locals.aiStartup;
    const { loadSecureSettings } = require(r('router/SettingsRouter'));
    const secureSettings = loadSecureSettings();
    const systemSettings = {
      ...app.locals.systemSettings,
      secure: secureSettings,
      partitionRoot: secureSettings.partitionRoot,
      partitionSizeMB: secureSettings.partitionSizeMB,
      developerMode: secureSettings.developerMode,
      aiSetup: secureSettings.aiSetup
    };

    const partitionPaths = app.locals.partitionPaths || null;

    const result = await aiStartup.startAIOnboarding({
      systemSettings,
      partitionPaths
    });

    res.json({ ok: true, result });
  } catch (err) {
    logger.error('[AI-Invite] Error during onboarding', { err: err.message });
    res.json({ ok: false, error: err.message });
  }
});

// ⭐ NEW: AI Chat route (OpenAI-compatible)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    logger.info("[Voice/Text] Received from frontend:", { text: messages?.[messages.length - 1]?.content });

    const aiRuntime = app.locals.ai?.runtime;

    if (!aiRuntime) {
      return res.json({
        ok: false,
        error: "AI runtime not available (Phase 2-B failed)"
      });
    }

    if (typeof aiRuntime.chat !== "function") {
      return res.json({
        ok: false,
        error: "AI runtime does not implement chat()"
      });
    }

    const reply = await aiRuntime.chat(messages);
    logger.info("[AI Reply]", { reply });

    return res.json({
      ok: true,
      reply
    });
  } catch (err) {
    logger.error("[AI-Chat] Error during chat", { err: err.message });
    return res.json({
      ok: false,
      error: err.message
    });
  }
});
// ⭐ Settings: write preferences into partition
//app.post('/api/settings/write', async (req, res) => {
  try {
    const { key, value } = req.body;

    const partitionFS = require(r('partition/api/partition.fs.cjs'));

    const result = await partitionFS.write(key, value);

    res.json({ ok: true, result });
  } catch (err) {
    logger.error("[Settings] Write failed", { err });
    res.json({ ok: false, error: err.message });
  }
});

// ⭐ Settings: read preferences from partition
//app.post('/api/settings/read', async (req, res) => {
  try {
    const { key } = req.body;

    const partitionFS = require(r('partition/api/partition.fs.cjs'));

    const result = await partitionFS.read(key);

    res.json({ ok: true, result });
  } catch (err) {
    logger.error("[Settings] Read failed", { err });
    res.json({ ok: false, error: err.message });
  }
});

// ── BlackBox routes ────────────────────────────────────────────────────────────
safeMount('/api/blackbox/runtime',      bbRuntime,      'bb-runtime');
safeMount('/api/blackbox/autonomy',     bbAutonomy,     'bb-autonomy');
safeMount('/api/blackbox/thinking',     bbThinking,     'bb-thinking');
safeMount('/api/blackbox/relationship', bbRelationship, 'bb-relationship');
safeMount('/api/blackbox/ui',           bbUI,           'bb-ui');
safeMount('/api/blackbox/gateway',      bbGateway,      'bb-gateway');

// ── Partition routes ───────────────────────────────────────────────────────────
safeMount('/api/partition',           partitionAPI,       'partition-api');
safeMount('/api/partition/fs',        partitionFS,        'partition-fs');
safeMount('/api/partition/paths',     partitionPaths,     'partition-paths');
safeMount('/api/partition/merge',     partitionMerge,     'partition-merge');
safeMount('/api/partition/review',    partitionReview,    'partition-review');
safeMount('/api/partition/validator', partitionValidator, 'partition-validator');
safeMount('/api/partition/session',   partitionSession,   'partition-session');
safeMount('/api/partition/storage',   partitionStorage,   'partition-storage');

// ── Access routes ──────────────────────────────────────────────────────────────
safeMount('/api/access',         accessAPI,     'access-api');
safeMount('/api/access/manager', accessManager, 'access-manager');

// ── Settings routes ────────────────────────────────────────────────────────────
safeMount('/api/settings', settingsRouter, 'settings');

// ── Tray routes ────────────────────────────────────────────────────────────────
safeMount('/api/trays', trayLoader, 'trays');
// ⭐ NEW: Settings API (HTTP-based)
try {
  const settingsAPI = require(r('api/settings.cjs'));
  safeMount('/api/settings', settingsAPI, 'settings-api');
} catch (e) {
  logger.warn('Settings API unavailable', { err: e.message });
}

// ── Catch-all 404 ──────────────────────────────────────────────────────────────
app.use('/api/*', (req, res) =>
  res.status(404).json({ error: 'Not found', path: req.originalUrl }));

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error('Unhandled request error', { err: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// =============================================================================
//  SERVER BIND  ·  HTTP listen + WebSocket attach
// =============================================================================
server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  const elapsed = ((Date.now() - BOOT_START) / 1000).toFixed(2);
  logger.info(`WingMan Orchestrator ready in ${elapsed}s`, {
    url: `http://${CONFIG.HOST}:${CONFIG.PORT}`,
  });
  app.locals.ready = true;
  eventBus.emit('server:ready', { port: CONFIG.PORT, host: CONFIG.HOST });
});

// ── Voice WebSocket ─────────────────────────────────────────────────────────────
if (voiceWS && typeof voiceWS.attach === 'function') {
  voiceWS.attach(server);
  logger.info('Voice WebSocket attached to HTTP server');
} else {
  // Fallback: bare ws server on a sub-path
  const wss = new WebSocket.Server({ server, path: '/ws/voice' });
  wss.on('connection', (ws, req) => {
    logger.info('WS client connected', { ip: req.socket.remoteAddress });
    ws.on('message', msg  => eventBus.emit('ws:message', { msg, ws }));
    ws.on('close',   ()   => logger.debug('WS client disconnected'));
    ws.on('error',   err  => logger.error('WS error', { err: err.message }));
  });
  app.locals.wss = wss;
  logger.info('Fallback Voice WebSocket listening at ws://…/ws/voice');
}
})();
