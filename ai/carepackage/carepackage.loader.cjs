// C:\WingManBackend\ai\carepackage\carepackage.loader.cjs

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Loads WingMan carepackage metadata.
 * This is SAFE and STATIC — not part of the old canon subsystem.
 */

function loadJsonSafe(filePath, logger = console) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    logger.warn(`[WM-CAREPACKAGE] Failed to parse JSON: ${filePath} — ${e.message}`);
    return null;
  }
}

function loadCarepackage(root, logger = console) {
  const metaDir = path.join(root, 'ai', 'carepackage', 'meta');

  const result = {
    ok: true,
    errors: [],
    meta: {}
  };

  if (!fs.existsSync(metaDir)) {
    const msg = `[WM-CAREPACKAGE] Missing carepackage metadata directory: ${metaDir}`;
    logger.warn(msg);
    result.ok = false;
    result.errors.push(msg);
    return result;
  }

  const files = fs.readdirSync(metaDir);
  files.forEach(file => {
    if (file.endsWith('.json')) {
      const fullPath = path.join(metaDir, file);
      const json = loadJsonSafe(fullPath, logger);
      if (json) {
        result.meta[file.replace('.json', '')] = json;
      }
    }
  });

  return result;
}

module.exports = {
  loadCarepackage
};
