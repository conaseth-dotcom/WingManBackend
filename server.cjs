// C:\WingManBackend\server.cjs

'use strict';

(() => {
  const bootStartedAt = Date.now();

  console.log('>>> [WM-SERVER] BACKEND INSTANCE: server.cjs booting...');

  const path = require('path');
  const http = require('http');
  const fs = require('fs');
  const EventEmitter = require('events');

  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const compression = require('compression');

  // --------------------------------------------------------------------------
  // Root, environment, and helpers
  // --------------------------------------------------------------------------
  const ROOT = path.resolve(__dirname);
  const resolveFromRoot = (...parts) => path.join(ROOT, ...parts);
  const PUBLIC_DIR = resolveFromRoot('public');

  require('dotenv').config({ path: resolveFromRoot('.env') });

  function formatLog(level, message, metadata) {
    const timestamp = new Date().toISOString();
    const suffix = metadata === undefined ? '' : ` ${JSON.stringify(metadata)}`;
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${suffix}`;
  }

  const logger = Object.freeze({
    info: (message, metadata) => console.log(formatLog('info', message, metadata)),
    warn: (message, metadata) => console.warn(formatLog('warn', message, metadata)),
    error: (message, metadata) => console.error(formatLog('error', message, metadata)),
    debug: (message, metadata) => console.debug(formatLog('debug', message, metadata))
  });

  function loadConfig() {
    try {
      const loaded = require(resolveFromRoot('core', 'state.cjs'));
      return loaded.default || loaded;
    } catch (error) {
      logger.warn('core/state.cjs unavailable; using environment fallback', {
        error: error.message
      });

      return {
        PORT: process.env.PORT || 4000,
        HOST: process.env.HOST || '0.0.0.0',
        ENV: process.env.NODE_ENV || process.env.ENV || 'production'
      };
    }
  }

  function readPublicJson(filename) {
    const filePath = path.join(PUBLIC_DIR, filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  const CONFIG = loadConfig();
  const PORT = Number(process.env.PORT || CONFIG.PORT || 4000);
  const HOST = process.env.HOST || CONFIG.HOST || '0.0.0.0';
  const ENV = process.env.NODE_ENV || CONFIG.ENV || process.env.ENV || 'production';

  if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
    throw new Error(`Invalid server port: ${process.env.PORT || CONFIG.PORT}`);
  }

  // --------------------------------------------------------------------------
  // App, server, and shared runtime objects
  // --------------------------------------------------------------------------
  const app = express();
  const server = http.createServer(app);

  class WingManEventBus extends EventEmitter {}

  const eventBus = new WingManEventBus();
  eventBus.setMaxListeners(100);

  app.locals.eventBus = eventBus;
  app.locals.logger = logger;
  app.locals.config = Object.freeze({ PORT, HOST, ENV });
  app.locals.ready = false;

  logger.info('WingMan Backend booting', { port: PORT, host: HOST, env: ENV });

  // --------------------------------------------------------------------------
  // Middleware
  // --------------------------------------------------------------------------
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(morgan(ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: message => logger.info(message.trim()) }
  }));

  // --------------------------------------------------------------------------
  // Public launcher/update assets
  // --------------------------------------------------------------------------
  app.use(express.static(PUBLIC_DIR));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/ready', (_req, res) => {
    const ready = app.locals.ready === true;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'booting' });
  });

  app.get('/version', (_req, res) => {
    try {
      res.json(readPublicJson('version.json'));
    } catch (error) {
      logger.error('Failed to serve version.json', { error: error.message });
      res.status(500).json({ error: 'version.json missing or unreadable' });
    }
  });

  app.get('/api/messages', (_req, res) => {
    const filePath = path.join(PUBLIC_DIR, 'messages.json');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'messages.json not found' });
    }

    return res.sendFile(filePath);
  });

  app.get('/wingman-ui-bundle.zip', (_req, res) => {
    const bundlePath = path.join(PUBLIC_DIR, 'wingman-ui-bundle.zip');

    if (!fs.existsSync(bundlePath)) {
      return res.status(404).json({ error: 'UI bundle not found' });
    }

    return res.sendFile(bundlePath);
  });

  app.get('/api/launcher/config', (_req, res) => {
    try {
      res.json({
        ok: true,
        manifest: readPublicJson('manifest.json'),
        messages: readPublicJson('messages.json'),
        version: readPublicJson('version.json'),
        maintenance: readPublicJson('maintenance.json'),
        urlMap: readPublicJson('backend_URL_map.json')
      });
    } catch (error) {
      logger.error('Failed to assemble launcher configuration', {
        error: error.message
      });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // --------------------------------------------------------------------------
  // Runtime modules and API routes
  // --------------------------------------------------------------------------
  function loadRequiredModule(relativePath, label) {
    try {
      return require(resolveFromRoot(...relativePath.split('/')));
    } catch (error) {
      logger.error(`${label} unavailable`, { error: error.message });
      throw error;
    }
  }

  function mountRouter(mountPath, moduleValue, label) {
    const router = moduleValue?.router || moduleValue?.default || moduleValue;

    if (typeof router !== 'function') {
      throw new TypeError(`${label} does not export an Express router function`);
    }

    app.use(mountPath, router);
    logger.info('Route mounted', { mountPath, label });
  }

  const aiStartup = loadRequiredModule('ai/ai.startup.cjs', 'AI startup orchestrator');
  app.locals.aiStartup = aiStartup;

  const licenseRoutes = loadRequiredModule(
    'api/license.protected.routes.cjs',
    'Protected license routes'
  );
  mountRouter('/api/license', licenseRoutes, 'license-protected-api');

  const aiSessionRoutes = loadRequiredModule(
    'api/ai.session.routes.cjs',
    'Governed AI session routes'
  );
  mountRouter('/api/ai', aiSessionRoutes, 'governed-ai-session-api');

  // --------------------------------------------------------------------------
  // Final bind and lifecycle
  // --------------------------------------------------------------------------
  app.locals.ready = true;

  server.listen(PORT, HOST, () => {
    logger.info('WingMan Backend ready', {
      port: PORT,
      host: HOST,
      env: ENV,
      bootMs: Date.now() - bootStartedAt
    });
  });

  function shutdown(signal) {
    logger.info('Shutdown requested', { signal });
    app.locals.ready = false;

    server.close(error => {
      if (error) {
        logger.error('HTTP server shutdown failed', { error: error.message });
        process.exitCode = 1;
      }
    });
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
})();
