/* ========================================================================
   WingMan Backend — Modern Tray Inspector (ESM)
   Path: C:/WingManBackend/partition/api/partition.trayInspector.cjs
   Role:
     - Inspect tray folders in the new metadata.json-based architecture
     - Validate item folders, metadata, and structure
     - Provide a clean diagnostic report for debugging
========================================================================= */

import { PartitionFS } from "./partition.fs.cjs";
import { PartitionPaths } from "./partition.paths.cjs";

/* ------------------------------------------------------------
   Inspect a single tray
------------------------------------------------------------ */
export async function inspectTray(trayId) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);

  // Ensure tray folder exists
  const trayExists = await PartitionFS.ensureFolder(trayFolder);

  if (!trayExists) {
    return {
      trayId,
      trayFolder,
      trayExists: false,
      reason: "tray-folder-missing"
    };
  }

  // List item folders
  const entries = await PartitionFS.listFolder(trayFolder);
  const items = [];
  const problems = [];

  for (const entry of entries) {
    const itemPath = `${trayFolder}/${entry.name}`;
    const metadataPath = `${itemPath}/tray.json`;

    const metadataRaw = await PartitionFS.readFile(metadataPath);

    if (!metadataRaw) {
      problems.push({
        item: entry.name,
        issue: "missing-metadata",
        metadataPath
      });
      continue;
    }

    let metadata = null;
    try {
      metadata = JSON.parse(metadataRaw);
    } catch (err) {
      problems.push({
        item: entry.name,
        issue: "invalid-json",
        metadataPath,
        error: err.message
      });
      continue;
    }

    items.push({
      id: metadata.id || entry.name,
      name: metadata.name || entry.name,
      filename: metadata.filename || entry.name,
      type: metadata.type || "file",
      path: itemPath,
      metadataPath,
      addedAt: metadata.addedAt || null,
      from: metadata.from || null,
      permissions: metadata.permissions || ["read"],
      description: metadata.description || "",
      originalPath: metadata.originalPath || null
    });
  }

  return {
    trayId,
    trayFolder,
    trayExists: true,
    itemCount: items.length,
    items,
    problems
  };
}

/* ------------------------------------------------------------
   Grouped export
------------------------------------------------------------ */
export const TrayInspector = {
  inspectTray
};

export default TrayInspector;
