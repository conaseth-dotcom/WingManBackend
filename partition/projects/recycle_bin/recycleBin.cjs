/**
 * ============================================================
 *  WingMan Partition Recycle Bin (Shared AI/User)
 *  ------------------------------------------------------------
 *  Location:
 *    /projects/recycle_bin
 *
 *  Role:
 *    Safe deletion layer for AI autonomy inside the partition.
 *
 *  Ownership:
 *    Shared between AI and user.
 *
 *  Responsibilities:
 *    - Move deleted files into recycle_bin
 *    - Track metadata for each deletion
 *    - Allow user to restore files
 *    - Allow user to permanently delete files
 *    - Allow AI to request restore (requires user approval)
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Paths } = require("../paths/paths.cjs");
const { ensureFolder, moveFile, deleteFile } = require("../fs/PartitionFS.cjs");

const log = (...args) => console.log("[RECYCLE]", ...args);

/* ============================================================
 * 1. PATHS
 * ============================================================
 */
function getRecycleRoot() {
  return path.join(Paths.getProjectsRoot(), "recycle_bin");
}

function getRecycleMetaPath() {
  return path.join(getRecycleRoot(), "metadata.json");
}

/* ============================================================
 * 2. ENSURE STRUCTURE
 * ============================================================
 */
function ensureRecycleStructure() {
  ensureFolder(getRecycleRoot());

  if (!fs.existsSync(getRecycleMetaPath())) {
    fs.writeFileSync(getRecycleMetaPath(), JSON.stringify({ items: [] }, null, 2));
  }
}

/* ============================================================
 * 3. LOAD / SAVE METADATA
 * ============================================================
 */
function loadMetadata() {
  try {
    return JSON.parse(fs.readFileSync(getRecycleMetaPath(), "utf8"));
  } catch {
    return { items: [] };
  }
}

function saveMetadata(meta) {
  fs.writeFileSync(getRecycleMetaPath(), JSON.stringify(meta, null, 2));
}

/* ============================================================
 * 4. MOVE FILE TO RECYCLE BIN (AI + User)
 * ============================================================
 */
function moveToRecycle(relativePath, deletedBy = "AI") {
  ensureRecycleStructure();

  const fullOriginal = Paths.resolvePath(relativePath);
  const fileName = path.basename(relativePath);
  const recycleRelative = `projects/recycle_bin/${fileName}`;
  const recycleFull = Paths.resolvePath(recycleRelative);

  log("Recycling file:", fullOriginal, "→", recycleFull);

  moveFile(relativePath, recycleRelative);

  const meta = loadMetadata();
  meta.items.push({
    id: crypto.randomUUID(),
    originalPath: relativePath,
    recyclePath: recycleRelative,
    deletedAt: new Date().toISOString(),
    deletedBy
  });

  saveMetadata(meta);

  return { ok: true };
}

/* ============================================================
 * 5. RESTORE FILE FROM RECYCLE BIN (User or AI w/ approval)
 * ============================================================
 */
function restoreFromRecycle(itemId) {
  ensureRecycleStructure();

  const meta = loadMetadata();
  const item = meta.items.find(i => i.id === itemId);

  if (!item) {
    return { ok: false, error: "Item not found in recycle bin." };
  }

  log("Restoring file:", item.recyclePath, "→", item.originalPath);

  moveFile(item.recyclePath, item.originalPath);

  meta.items = meta.items.filter(i => i.id !== itemId);
  saveMetadata(meta);

  return { ok: true };
}

/* ============================================================
 * 6. PERMANENT DELETE (User only)
 * ============================================================
 */
function permanentlyDelete(itemId) {
  ensureRecycleStructure();

  const meta = loadMetadata();
  const item = meta.items.find(i => i.id === itemId);

  if (!item) {
    return { ok: false, error: "Item not found." };
  }

  log("Permanently deleting:", item.recyclePath);

  deleteFile(item.recyclePath);

  meta.items = meta.items.filter(i => i.id !== itemId);
  saveMetadata(meta);

  return { ok: true };
}

/* ============================================================
 * 7. LIST RECYCLE BIN (AI + User)
 * ============================================================
 */
function listRecycle() {
  ensureRecycleStructure();
  return loadMetadata().items;
}

/* ============================================================
 * 8. EMPTY RECYCLE BIN (User only)
 * ============================================================
 */
function emptyRecycle() {
  ensureRecycleStructure();

  const meta = loadMetadata();

  for (const item of meta.items) {
    deleteFile(item.recyclePath);
  }

  meta.items = [];
  saveMetadata(meta);

  return { ok: true };
}

module.exports = {
  moveToRecycle,
  restoreFromRecycle,
  permanentlyDelete,
  listRecycle,
  emptyRecycle
};
