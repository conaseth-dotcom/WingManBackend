// C:\WingManBackend\core\system\system.metadata.loader.cjs

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Loads and validates system-level metadata from the WingManPartition.
 * This includes junction box metadata, system logs, system errors,
 * and any future system-level canonical definitions.
 *
 * Partition path is provided by the partition loader.
 */

function loadSystemMetadata(partitionRoot, logger = console) {
  const systemDir = path.join(partitionRoot, 'metaData', 'system');

  const result = {
    ok: true,
    errors: [],
    data: {}
  };

  // Ensure system directory exists
  if (!fs.existsSync(systemDir)) {
    const msg = `[WM-SYSTEM] System metadata directory missing: ${systemDir}`;
    logger.warn(msg);
    result.ok = false;
    result.errors.push(msg);
    return result;
  }

  // Helper: safe JSON loader
  const loadJson = (filePath) => {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      const msg = `[WM-SYSTEM] Failed to load JSON: ${filePath} — ${e.message}`;
      logger.warn(msg);
      result.errors.push(msg);
      result.ok = false;
      return null;
    }
  };

  // ───────────────────────────────────────────────────────────────
  // Load junction box metadata
  // ───────────────────────────────────────────────────────────────
  const junctionBoxPath = path.join(systemDir, 'junctionBox.json');
  if (fs.existsSync(junctionBoxPath)) {
    logger.info('[WM-SYSTEM] Loading junctionBox.json…');
    const jb = loadJson(junctionBoxPath);
    if (jb) {
      result.data.junctionBox = jb.junctionBox || jb;
      logger.info('[WM-SYSTEM] junctionBox metadata loaded');
    }
  } else {
    logger.warn('[WM-SYSTEM] junctionBox.json not found in system metadata');
  }

  // ───────────────────────────────────────────────────────────────
  // Ensure logs + errors directories exist
  // ───────────────────────────────────────────────────────────────
  const logsDir = path.join(systemDir, 'logs');
  const errorsDir = path.join(systemDir, 'errors');

  if (!fs.existsSync(logsDir)) {
    logger.info('[WM-SYSTEM] Creating logs directory…');
    fs.mkdirSync(logsDir, { recursive: true });
  }

  if (!fs.existsSync(errorsDir)) {
    logger.info('[WM-SYSTEM] Creating errors directory…');
    fs.mkdirSync(errorsDir, { recursive: true });
  }

  result.data.paths = {
    systemDir,
    logsDir,
    errorsDir
  };

  // ───────────────────────────────────────────────────────────────
  // Final result
  // ───────────────────────────────────────────────────────────────
  if (result.ok) {
    logger.info('[WM-SYSTEM] System metadata loaded successfully');
  } else {
    logger.warn('[WM-SYSTEM] System metadata loaded with warnings/errors');
  }

  return result;
}

module.exports = {
  loadSystemMetadata
};
