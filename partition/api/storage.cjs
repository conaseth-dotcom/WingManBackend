/* ========================================================================
   WingMan Backend — Partition Storage (Deterministic Mode)
   Path: C:/WingManBackend/partition/api/storage.cjs
========================================================================= */

const fs   = require("fs");
const path = require("path");

// Deterministic path resolver
const { PartitionPaths } = require("./partition.paths.cjs");
const AdvocacyEngine = require("C:/WingManBackend/BlackBox/core/aiAdvocacy/advocacy.engine.cjs");

// ------------------------------------------------------------
// Advocacy feasibility wrapper
// ------------------------------------------------------------
function checkFeasibility(bytesNeeded) {
  const currentUsage = computePartitionUsageBytes(STORAGE_ROOT);
  const availableBytes = PARTITION_SIZE_BYTES - currentUsage;

  // *** IMPORTANT FIX ***
  // Evaluate feasibility based on TOTAL required storage,
  // not just the size of the new data.
  const totalRequiredBytes = currentUsage + bytesNeeded;

  const { feasibility, explanation } = AdvocacyEngine.checkAndAdvocate({
    storageUsageMB: Math.round(currentUsage / (1024 * 1024)),
    storageAvailableMB: Math.round(availableBytes / (1024 * 1024)),
    taskRequirements: {
      minStorageMB: Math.round(totalRequiredBytes / (1024 * 1024))
    }
  });

  if (!feasibility.feasible) {
    throw new Error(explanation.message || "Operation not feasible under current constraints.");
  }
}

// ------------------------------------------------------------
// Initialization — called from server.cjs Phase 5
// ------------------------------------------------------------
let STORAGE_ROOT = null;
let PARTITION_SIZE_BYTES = null;

function init({ logger, systemSettings }) {
  STORAGE_ROOT = PartitionPaths.resolve("system/storage");
  PARTITION_SIZE_BYTES = systemSettings.partitionSizeMB * 1024 * 1024;

  if (!fs.existsSync(STORAGE_ROOT)) {
    logger.info(`[PartitionStorage] Creating storage root: ${STORAGE_ROOT}`);
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  }

  logger.info(
    `[PartitionStorage] Ready at ${STORAGE_ROOT} (limit: ${systemSettings.partitionSizeMB} MB)`
  );

  return true;
}

// ------------------------------------------------------------
// Partition usage calculator
// ------------------------------------------------------------
function computePartitionUsageBytes(root) {
  let total = 0;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        try {
          const stat = fs.statSync(fullPath);
          total += stat.size;
        } catch {
          // ignore unreadable files
        }
      }
    }
  }

  walk(root);
  return total;
}

// ------------------------------------------------------------
// Internal JSON helpers (quota‑aware + advocacy‑aware)
// ------------------------------------------------------------
function writeJson(filePath, data) {
  const normalized = path.normalize(filePath);

  const newDataBytes = Buffer.byteLength(JSON.stringify(data));

  // Advocacy feasibility check
  checkFeasibility(newDataBytes);

  fs.mkdirSync(path.dirname(normalized), { recursive: true });
  fs.writeFileSync(normalized, JSON.stringify(data, null, 2), "utf8");
}

function readJson(filePath, fallback = null) {
  const normalized = path.normalize(filePath);
  if (!fs.existsSync(normalized)) return fallback;

  try {
    const raw = fs.readFileSync(normalized, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ------------------------------------------------------------
// Session logs
// ------------------------------------------------------------
function saveSessionLog(entry) {
  try {
    const logPath = path.join(STORAGE_ROOT, "session.log.json");
    const logs = readJson(logPath, []);
    logs.push({ timestamp: new Date().toISOString(), ...entry });

    checkFeasibility(Buffer.byteLength(JSON.stringify(logs)));
    writeJson(logPath, logs);

    return { ok: true, count: logs.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function loadSessionLogs() {
  const logPath = path.join(STORAGE_ROOT, "session.log.json");
  return readJson(logPath, []);
}

// ------------------------------------------------------------
// Metadata
// ------------------------------------------------------------
function saveMetadata(key, value) {
  try {
    const metaPath = path.join(STORAGE_ROOT, "metadata.json");
    const metadata = readJson(metaPath, {});
    metadata[key] = value;

    checkFeasibility(Buffer.byteLength(JSON.stringify(metadata)));
    writeJson(metaPath, metadata);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function loadMetadata(key = null) {
  const metaPath = path.join(STORAGE_ROOT, "metadata.json");
  const metadata = readJson(metaPath, {});
  if (key === null) return metadata;
  return metadata[key] ?? null;
}

// ------------------------------------------------------------
// Export bundle
// ------------------------------------------------------------
module.exports = {
  init,
  saveSessionLog,
  loadSessionLogs,
  saveMetadata,
  loadMetadata,
  loadJSON: readJson,
  saveJSON: writeJson
};
