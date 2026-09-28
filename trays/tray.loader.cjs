/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/trays/tray.loader.cjs
   Role:
     Load tray items from the WingMan partition.
     Backend-safe (no window, no preload APIs).
========================================================================= */

const PartitionPaths = require("file:///C:/WingManBackend/partition/api/partition.paths.cjs");
const PartitionFS = require("file:///C:/WingManBackend/partition/api/partition.fs.cjs");

console.log("[WM-PIPE] Loaded: tray.loader.cjs");

/**
 * Load all tray items for a given trayId from:
 * <partitionRoot>/user/trays/<trayId>/
 *
 * Partition root is dynamically controlled by SettingsRouter:
 *   PartitionPaths.overrideRoot(userChosenRoot)
 */
async function loadTrayItems(trayId) {
  try {
    // Dynamic, user-responsive tray folder
    const trayFolder = PartitionPaths.getTrayFolder(trayId);

    // Ensure folder exists
    await PartitionFS.ensureFolder(trayFolder);

    const entries = await PartitionFS.listFolder(trayFolder);
    const items = [];

    for (const entry of entries) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const filePath = `${trayFolder}/${entry.name}`;
        const raw = await PartitionFS.readFile(filePath);

        if (raw) {
          try {
            items.push(JSON.parse(raw));
          } catch (err) {
            console.error("[TrayLoader] Failed to parse JSON:", filePath, err);
          }
        }
      }
    }

    console.log(`[TrayLoader] Loaded ${items.length} items for ${trayId}`);
    return items;

  } catch (err) {
    console.error(`[TrayLoader] Failed to load tray items for ${trayId}:`, err);
    return [];
  }
}

module.exports = {
  loadTrayItems
};
