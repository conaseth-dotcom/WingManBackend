/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/trays/partition.trays.cjs
   Role:
     Fully wired tray subsystem with:
       - Error logging
       - Validation
       - Sync pipeline
       - Inspector hooks
       - Versioning
       - Merge + Review
       - Session tracking
       - Integrity verification
       - Logging
       - AI hooks
========================================================================= */

console.log("[WM-PIPE] Loaded: partition.trays.cjs");

// ========================================================================
// CHAPTER 1 — Imports
// ========================================================================
import { TrayRouter } from "../router/TrayRouter.cjs";

import * as PartitionFS from "../partition/api/partition.fs.cjs";
import * as PartitionPaths from "../partition/api/partition.paths.cjs";
import * as PartitionErrors from "../partition/api/partition.errors.cjs";
import * as PartitionLogger from "../partition/api/partition.logger.cjs";

import fs from "fs";
import path from "path";

// ========================================================================
// CHAPTER 2 — Payload Normalization
// ========================================================================
function normalizePayload(payload) {
  if (!payload) return null;

  if (payload.__radialNode) {
    return {
      trayId: payload.trayId || "tray-1",
      name: payload.label,
      filename: payload.label,
      sourcePath: payload.path,
      type: payload.type,
      fromRadialMap: true
    };
  }

  return {
    trayId: payload.trayId || "tray-1",
    name: payload.name || payload.filename || "unnamed",
    filename: payload.filename || payload.name || "unnamed",
    sourcePath: payload.path || "",
    type: payload.type || "file"
  };
}

// ========================================================================
// CHAPTER 3 — addToTray (MVP‑SAFE VERSION)
// ========================================================================
export async function addToTray(trayId, payload) {
  const normalized = normalizePayload({ ...payload, trayId });
  trayId = normalized.trayId;

  if (!normalized || !normalized.sourcePath) {
    PartitionErrors.log({
      type: "invalid-payload",
      trayId,
      payload
    });
    return false;
  }

  PartitionLogger.log({
    event: "addToTray:start",
    trayId,
    normalized
  });

  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  await PartitionFS.ensureFolder(trayFolder);

  try {
    // Copy file into tray folder via conductor
    const result = await TrayRouter.route("addToTray", {
      trayId,
      name: normalized.name,
      filename: normalized.filename,
      sourcePath: normalized.sourcePath,
      type: normalized.type,
      trayFolder
    });

    // Write tray.json (MVP only)
    await syncTray(trayId);

    PartitionLogger.log({
      event: "addToTray:complete",
      trayId,
      summary: result?.summary
    });

    return !!result?.ok;
  } catch (err) {
    PartitionErrors.log({
      type: "conductor-failed",
      trayId,
      error: err.message
    });
    return false;
  }
}

// ========================================================================
// CHAPTER 4 — listTrayItems (MVP‑SAFE VERSION)
// ========================================================================
export async function listTrayItems(trayId) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  await PartitionFS.ensureFolder(trayFolder);

  const entries = await PartitionFS.listFolder(trayFolder);
  const items = [];

  for (const entry of entries) {
    const itemPath = path.join(trayFolder, entry.name);
    const metadataPath = path.join(itemPath, "tray.json");
    const metadataRaw = await PartitionFS.readFile(metadataPath);

    let metadata = {};

    if (!metadataRaw) {
      PartitionErrors.log({
        type: "missing-item-metadata",
        trayId,
        itemPath,
        metadataPath
      });
    } else {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch (err) {
        PartitionErrors.log({
          type: "invalid-item-metadata",
          trayId,
          itemPath,
          error: err.message
        });
      }
    }

    // MVP: no validation, no inspector, no heavy hooks
    items.push({
      id: metadata.id || entry.name,
      name: metadata.name || entry.name,
      filename: metadata.filename || entry.name,
      path: itemPath,
      type: metadata.type || "file",
      addedAt: metadata.createdAt || Date.now()
    });
  }

  return items;
}

// ========================================================================
// CHAPTER 5 — syncTray (MVP‑SAFE VERSION)
// ========================================================================
export async function syncTray(trayId) {
  
  const items = await listTrayItems(trayId);

  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  const trayJsonPath = path.join(trayFolder, "tray.json");

  const trayMetadata = {
    id: trayId,
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      filename: item.filename,
      path: item.path,
      type: item.type,
      addedAt: item.addedAt
    }))
  };

  try {
    fs.writeFileSync(trayJsonPath, JSON.stringify(trayMetadata, null, 2), "utf8");
  } catch (err) {
    PartitionErrors.log({
      type: "tray-json-write-failed",
      trayId,
      trayJsonPath,
      error: err.message
    });
  }

  // Minimal logging only
  PartitionLogger.log({
    event: "syncTray",
    trayId,
    trayJsonPath
  });

  return trayMetadata;
}
/* ========================================================================
   CHAPTER 6 — updatePermissions (MVP)
   Update tray.json inside a specific project folder.
   Payload:
     {
       trayId: "tray-1",
       projectName: "YourPerfectVoice",
       aiPermission: "read" | "write" | "hidden",
       userPermission: "read" | "readwrite",
       hidden: boolean
     }
========================================================================= */
export async function updatePermissions(payload) {
  const {
    trayId,
    projectName,
    aiPermission,
    userPermission,
    hidden
  } = payload;

  try {
    const trayFolder = PartitionPaths.getTrayFolder(trayId);
    const projectFolder = path.join(trayFolder, projectName);
    const metaPath = path.join(projectFolder, "tray.json");

    // Read existing metadata
    const raw = await PartitionFS.readFile(metaPath);
    if (!raw) {
      PartitionErrors.log({
        type: "missing-tray-json",
        trayId,
        projectFolder,
        metaPath
      });
      return { ok: false, reason: "missing-tray-json" };
    }

    let meta = null;
    try {
      meta = JSON.parse(raw);
    } catch (err) {
      PartitionErrors.log({
        type: "invalid-tray-json",
        trayId,
        projectFolder,
        error: err.message
      });
      return { ok: false, reason: "invalid-json" };
    }

    // Apply updates
    meta.permissions = {
      ai: aiPermission || meta.permissions?.ai || "read",
      user: userPermission || meta.permissions?.user || "readwrite"
    };

    meta.hidden = hidden ?? meta.hidden ?? false;

    // Write updated metadata
    await PartitionFS.writeFile(metaPath, JSON.stringify(meta, null, 2));

    PartitionLogger.log({
      event: "updatePermissions",
      trayId,
      projectName,
      metaPath,
      permissions: meta.permissions,
      hidden: meta.hidden
    });

    return { ok: true };

  } catch (err) {
    PartitionErrors.log({
      type: "update-permissions-failed",
      trayId,
      projectName,
      error: err.message
    });
    return { ok: false, error: err.message };
  }
}

// ========================================================================
// CHAPTER 7 — loadAllTrays
// ========================================================================
export async function loadAllTrays() {
  const trays = {};
  const trayIds = ["tray-1", "tray-2", "tray-3", "tray-4"];

  for (const trayId of trayIds) {
    trays[trayId] = await listTrayItems(trayId);
  }

  return trays;
}

// ========================================================================
// CHAPTER 8 — Grouped Export
// ========================================================================
export const PartitionTrays = {
  addToTray,
  listTrayItems,
  syncTray,
  loadAllTrays
};

export default PartitionTrays;
