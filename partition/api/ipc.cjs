/* ========================================================================
   WingMan Backend IPC Bridge
   Path: C:/WingManBackend/partition/api/ipc.cjs
   Role:
     Registers all IPC handlers used by preload + renderer.
     Bridges renderer → backend partition APIs.
========================================================================= */

import { ipcMain } from "electron";
import { PartitionFS } from "./partition.fs.cjs";
import { PartitionPaths } from "./partition.paths.cjs";
import { PartitionTrays } from "../../trays/partition.trays.cjs";

import fs from "fs";
import path from "path";

/* ------------------------------------------------------------
   List files in a folder
------------------------------------------------------------ */
ipcMain.handle("partition:listFiles", async (event, { path }) => {
  try {
    return await PartitionFS.listFolder(path);
  } catch (err) {
    console.error("partition:listFiles failed:", err);
    throw err;
  }
});

/* ------------------------------------------------------------
   Shallow folder read (no recursion)
------------------------------------------------------------ */
ipcMain.handle("partition:readFolderShallow", async (event, { path }) => {
  try {
    return await PartitionFS.readFolderShallow(path);
  } catch (err) {
    console.error("partition:readFolderShallow failed:", err);
    throw err;
  }
});

/* ------------------------------------------------------------
   List items inside a tray (item-level metadata)
------------------------------------------------------------ */
ipcMain.handle("partition:listTrayItems", async (event, trayId) => {
  try {
    const items = await PartitionTrays.listTrayItems(trayId);
    return items;
  } catch (err) {
    console.error("partition:listTrayItems failed:", err);
    throw err;
  }
});

/* ------------------------------------------------------------
   Read tray-level metadata (tray.json)
------------------------------------------------------------ */
ipcMain.handle("tray:readMetadata", async (event, trayId) => {
  try {
    const trayFolder = PartitionPaths.getTrayFolder(trayId);
    const metadataPath = path.join(trayFolder, "tray.json");

    if (!fs.existsSync(metadataPath)) {
      console.warn("[tray:readMetadata] No tray.json found:", metadataPath);
      return { items: [] };
    }

    const raw = fs.readFileSync(metadataPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[tray:readMetadata] Failed to read metadata:", err);
    return { items: [] };
  }
});
