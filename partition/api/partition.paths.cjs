/* ========================================================================
   WingMan Backend — Partition Path Helpers (Deterministic Mode)
   Path: C:/WingManBackend/partition/api/partition.paths.cjs
========================================================================= */

const path = require("path");

let PARTITION_ROOT = null;

function init({ logger, systemSettings }) {
  const root = systemSettings.partitionRoot;

  if (typeof root !== "string" || !root.trim()) {
    throw new Error("Invalid partitionRoot provided to PartitionPaths.init()");
  }

  PARTITION_ROOT = root;
  logger?.info?.(`[PartitionPaths] Root set to: ${PARTITION_ROOT}`);

  return true;
}

function rootJoin(...parts) {
  if (!PARTITION_ROOT) {
    throw new Error("PartitionPaths not initialized — PARTITION_ROOT is null");
  }
  return path.join(PARTITION_ROOT, ...parts);
}

const PartitionPaths = {
  init,
  getPartitionRoot: () => PARTITION_ROOT,

  // Core roots
  getUserRoot:    () => rootJoin("user"),
  getAiRoot:      () => rootJoin("ai"),
  getOverlayRoot: () => rootJoin("overlay"),
  getRuntimeRoot: () => rootJoin("runtime"),
  getSharedRoot:  () => rootJoin("shared"),
  getSystemRoot:  () => rootJoin("system"),

  // Trays
  getTraysRoot: () => rootJoin("user", "trays"),

  getTrayFolder: (trayId) => {
    const id = String(trayId).startsWith("tray-") ? trayId : `tray-${trayId}`;
    return rootJoin("user", "trays", id);
  },

  getItemFolder: (trayId, itemName) =>
    rootJoin("user", "trays",
      String(trayId).startsWith("tray-") ? trayId : `tray-${trayId}`,
      String(itemName)
    ),

  getMetadataPath: (trayId, itemName) =>
    rootJoin("user", "trays",
      String(trayId).startsWith("tray-") ? trayId : `tray-${trayId}`,
      String(itemName),
      "metadata.json"
    ),

  getPreviewFolder: (trayId, itemName) =>
    rootJoin("user", "trays",
      String(trayId).startsWith("tray-") ? trayId : `tray-${trayId}`,
      String(itemName),
      "preview"
    ),

  // Legacy override
  overrideRoot(newRoot) {
    if (typeof newRoot === "string" && newRoot.trim()) {
      PARTITION_ROOT = newRoot;
    }
    return { ok: true, root: PARTITION_ROOT };
  }
};

// ⭐ FIX: Export the object directly so callers see the correct shape
module.exports = PartitionPaths;
