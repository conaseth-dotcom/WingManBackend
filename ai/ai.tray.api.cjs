// ========================================================================
// WingMan Backend — AI Tray Access API (MVP REQUIRED)
// Path: C:/WingManBackend/ai/ai.tray.api.cjs
// ========================================================================

import { PartitionFS } from "../partition/api/partition.fs.cjs";
import { PartitionPaths } from "../partition/api/partition.paths.cjs";
import { enforceAIPermissions } from "../partition/security/partition.security.cjs";
import * as path from "path";

/* ------------------------------------------------------------
   Helper: hide trays from AI completely
------------------------------------------------------------ */
function hideFromAI() {
  return { ok: false, reason: "not-found" }; 
  // AI should think the tray does not exist
}

/* ------------------------------------------------------------
   Load tray.json safely for AI
------------------------------------------------------------ */
export async function getTrayMetadata(trayId) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  const metaPath = path.join(trayFolder, "tray.json");

  const raw = await PartitionFS.readFile(metaPath);
  if (!raw) return hideFromAI();

  let meta;
  try {
    meta = JSON.parse(raw);
  } catch {
    return hideFromAI();
  }

  // ⭐ AI permission enforcement
  const perm = enforceAIPermissions(meta, "read");
  if (!perm.ok) {
    if (perm.reason === "ai-hidden") return hideFromAI();
    return perm;
  }

  return { ok: true, meta };
}

/* ------------------------------------------------------------
   Load tray.index.json safely for AI
------------------------------------------------------------ */
export async function getTrayIndex(trayId, projectName) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  const projectFolder = path.join(trayFolder, projectName);
  const metaPath = path.join(projectFolder, "tray.json");

  const rawMeta = await PartitionFS.readFile(metaPath);
  if (!rawMeta) return hideFromAI();

  let meta;
  try {
    meta = JSON.parse(rawMeta);
  } catch {
    return hideFromAI();
  }

  // ⭐ AI permission enforcement
  const perm = enforceAIPermissions(meta, "read");
  if (!perm.ok) {
    if (perm.reason === "ai-hidden") return hideFromAI();
    return perm;
  }

  const indexPath = path.join(projectFolder, "tray.index.json");
  const rawIndex = await PartitionFS.readFile(indexPath);
  if (!rawIndex) return hideFromAI();

  let index;
  try {
    index = JSON.parse(rawIndex);
  } catch {
    return hideFromAI();
  }

  return { ok: true, index };
}

/* ------------------------------------------------------------
   AI-safe file read
------------------------------------------------------------ */
export async function aiReadFile(trayId, projectName, filePath) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  const projectFolder = path.join(trayFolder, projectName);
  const metaPath = path.join(projectFolder, "tray.json");

  const rawMeta = await PartitionFS.readFile(metaPath);
  if (!rawMeta) return hideFromAI();

  let meta;
  try {
    meta = JSON.parse(rawMeta);
  } catch {
    return hideFromAI();
  }

  // ⭐ AI permission enforcement
  const perm = enforceAIPermissions(meta, "read");
  if (!perm.ok) {
    if (perm.reason === "ai-hidden") return hideFromAI();
    return perm;
  }

  const content = await PartitionFS.readFile(filePath);
  return { ok: true, content };
}

/* ------------------------------------------------------------
   AI-safe file write
------------------------------------------------------------ */
export async function aiWriteFile(trayId, projectName, filePath, data) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  const projectFolder = path.join(trayFolder, projectName);
  const metaPath = path.join(projectFolder, "tray.json");

  const rawMeta = await PartitionFS.readFile(metaPath);
  if (!rawMeta) return hideFromAI();

  let meta;
  try {
    meta = JSON.parse(rawMeta);
  } catch {
    return hideFromAI();
  }

  // ⭐ AI permission enforcement
  const perm = enforceAIPermissions(meta, "write");
  if (!perm.ok) {
    if (perm.reason === "ai-hidden") return hideFromAI();
    return perm;
  }

  const result = await PartitionFS.writeFile(filePath, data);
  return { ok: true, result };
}

/* ------------------------------------------------------------
   Grouped export
------------------------------------------------------------ */
export const AITrayAPI = {
  getTrayMetadata,
  getTrayIndex,
  aiReadFile,
  aiWriteFile
};

export default AITrayAPI;
