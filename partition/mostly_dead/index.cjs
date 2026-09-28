/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/WingManBackend/partition/index.cjs
   Alias: @backend/partition/index.cjs
   Role: Entry point for the WingManPartition runtime. Loads partition
         configuration, validates partition paths, and exposes the mounted
         partition surface to backend subsystems.

   Architectural Notes:
     - Must not perform direct file I/O; delegate to partition API modules.
     - Must ensure partition paths remain isolated from WingMan application files.
     - Used by core.startup.cjs to mount the partition during backend boot.
========================================================================= */

import { PartitionFS } from "./partition.fs.cjs";
import { PartitionPaths } from "./partition.paths.cjs";
import { PartitionTrays } from "./partition.trays.cjs";

/**
 * This API is exposed globally so the UI, AI, hitbox system,
 * tray system, and radial map can all interact with the
 * partition sandbox through a single, safe interface.
 */

window.WingManPartitionAPI = {
  /* ------------------------------------------------------------
     Filesystem operations
     ------------------------------------------------------------ */
  ensureFolder: PartitionFS.ensureFolder,
  writeFile: PartitionFS.writeFile,
  readFile: PartitionFS.readFile,
  deleteFile: PartitionFS.deleteFile,
  moveFile: PartitionFS.moveFile,
  listFolder: PartitionFS.listFolder,

  /* ------------------------------------------------------------
     Path resolver
     ------------------------------------------------------------ */
  resolvePath: PartitionPaths.resolvePath,
  getTrayFolder: PartitionPaths.getTrayFolder,

  /* ------------------------------------------------------------
     Tray pipeline
     ------------------------------------------------------------ */
  addToTray: PartitionTrays.addToTray,
  listTrayItems: PartitionTrays.listTrayItems,
  syncTray: PartitionTrays.syncTray,

  /* ------------------------------------------------------------
     Radial map hooks (UI will attach these)
     ------------------------------------------------------------ */
  focusInRadial: null
};

console.log("[WingManPartitionAPI] Ready.");
