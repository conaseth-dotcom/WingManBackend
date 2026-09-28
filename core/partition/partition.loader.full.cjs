// C:\WingManBackend\core\partition\partition.loader.full.cjs

'use strict';

const fs = require('fs');
const path = require('path');

const paths = require('./partition.paths.cjs');
const validator = require('./json.validator.partition.cjs');
const writer = require('./json.writer.cjs');

/**
 * Full partition loader.
 * Loads all partition metadata categories:
 * - system
 * - data
 * - runtime
 * - overlay
 * - settings
 * - shared
 */

function loadJsonSafe(filePath, logger = console) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    logger.warn(`[WM-PARTITION] Failed to parse JSON: ${filePath} — ${e.message}`);
    return null;
  }
}

function loadPartition(root, logger = console) {
  const partitionRoot = paths.resolvePartitionRoot(root);

  const result = {
    ok: true,
    errors: [],
    meta: {
      system: {},
      data: {},
      runtime: {},
      overlay: {},
      settings: {},
      shared: {}
    }
  };

  // ───────────────────────────────────────────────────────────────
  // Load system metadata
  // ───────────────────────────────────────────────────────────────
  const systemDir = paths.systemDir(partitionRoot);
  if (fs.existsSync(systemDir)) {
    const files = fs.readdirSync(systemDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const fullPath = path.join(systemDir, file);
        const json = loadJsonSafe(fullPath, logger);
        if (json) {
          result.meta.system[file.replace('.json', '')] = json;
        }
      }
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Load other metadata categories
  // ───────────────────────────────────────────────────────────────
  const categories = [
    ['data', paths.dataDir],
    ['runtime', paths.runtimeDir],
    ['overlay', paths.overlayDir],
    ['settings', paths.settingsDir],
    ['shared', paths.sharedDir]
  ];

  categories.forEach(([key, fn]) => {
    const dir = fn(partitionRoot);
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const fullPath = path.join(dir, file);
        const json = loadJsonSafe(fullPath, logger);
        if (json) {
          result.meta[key][file.replace('.json', '')] = json;
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────
  // Validate partition
  // ───────────────────────────────────────────────────────────────
  const validation = validator.validatePartition(result.meta);
  if (!validation.ok) {
    result.ok = false;
    result.errors.push(...validation.errors);
  }

  return result;
}

module.exports = {
  loadPartition
};
