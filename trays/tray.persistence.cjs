// C:/WingManBackend/trays/tray.persistence.cjs
// Persist tray items into the WingMan partition using PartitionFS.

console.log("[WM-PIPE] Loaded: tray.persistence.cjs");

// Correct ESM imports — NO aliases
import * as PartitionPaths from "file:///C:/WingManBackend/partition/api/partition.paths.cjs";
import * as PartitionFS from "file:///C:/WingManBackend/partition/api/partition.fs.cjs";

/**
 * Persist a tray item to the WingManOS partition.
 * Each tray item becomes a JSON file inside:
 * D:/WingManPartition/user/trays/<trayId>/<itemId>.json
 */
export async function persistTrayItem(trayId, item) {
  try {
    const trayFolder = PartitionPaths.getTrayFolder(trayId);

    await PartitionFS.ensureFolder(trayFolder);

    const filePath = `${trayFolder}/${item.id}.json`;

    await PartitionFS.writeFile(filePath, JSON.stringify(item, null, 2));

    console.log(`[TrayPersistence] Saved tray item ${item.id} to ${filePath}`);
  } catch (err) {
    console.error("[TrayPersistence] Failed to save tray item:", err);
  }
}
