/* ========================================================================
   WingMan Backend File
   
   Alias: @backend-ai/ai.persistence.cjs
   Role: Global AI persistence layer. Stores AI notes, memory, and long-term
         state across sessions.

   Dependencies:
     - message.store.cjs

   Change Log:
     - [2026-07-02] Header added.

   Architectural Notes:
     - Used by renderer paper subsystem (persistAiNote).
========================================================================= */


const PARTITION_ROOT = "D:/WingManPartition/user";

/**
 * Resolve the full path for a tray folder.
 * Example: tray-1 → D:/WingManPartition/user/tray-1
 */
function getTrayFolder(trayId) {
  return `${PARTITION_ROOT}/${trayId}`;
}

/**
 * Save a tray item (file or folder) into the tray folder.
 * This is called by the drag-drop pipeline.
 *
 * @param {string} trayId
 * @param {Object} item - Must contain:
 *   - name
 *   - type ("file" or "folder")
 *   - data (Buffer/string for files)
 */
async function addToTray(trayId, item) {
  try {
    const trayFolder = getTrayFolder(trayId);

    // Ensure tray folder exists (it should already exist in your architecture)
    await window.WingManFS.ensureFolder(trayFolder);

    const itemPath = `${trayFolder}/${item.name}`;

    if (item.type === "folder") {
      await window.WingManFS.ensureFolder(itemPath);
      console.log(`[TrayPersistence] Created folder: ${itemPath}`);
      return { ok: true, path: itemPath };
    }

    if (item.type === "file") {
      await window.WingManFS.writeFile(itemPath, item.data || "");
      console.log(`[TrayPersistence] Saved file: ${itemPath}`);
      return { ok: true, path: itemPath };
    }

    console.warn("[TrayPersistence] Unknown item type:", item.type);
    return { ok: false };

  } catch (err) {
    console.error("[TrayPersistence] Failed to save tray item:", err);
    return { ok: false, error: err };
  }
}

/**
 * Sync tray contents from disk into memory.
 * Called after saving an item.
 *
 * @param {string} trayId
 */
async function syncTray(trayId) {
  try {
    const trayFolder = getTrayFolder(trayId);

    // Read all items in the tray folder
    const entries = await window.WingManFS.readFolder(trayFolder);

    const syncedItems = [];

    for (const entry of entries) {
      const fullPath = `${trayFolder}/${entry}`;

      // Determine if entry is a file or folder
      const isFolder = await window.WingManFS.isFolder(fullPath);

      if (isFolder) {
        syncedItems.push({
          name: entry,
          type: "folder",
          trayId,
          path: fullPath
        });
      } else {
        const data = await window.WingManFS.readFile(fullPath);
        syncedItems.push({
          name: entry,
          type: "file",
          trayId,
          path: fullPath,
          data
        });
      }
    }

    console.log(`[TrayPersistence] Synced ${syncedItems.length} items from ${trayId}`);
    return syncedItems;

  } catch (err) {
    console.error("[TrayPersistence] Failed to sync tray:", err);
    return [];
  }
}

// ------------------------------------------------------------
// Expose API to UI
// ------------------------------------------------------------
window.WingManPartitionAPI = {
  addToTray,
  syncTray
};

console.log("[TrayPersistence] Ready.");
