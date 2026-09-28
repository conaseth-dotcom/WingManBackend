// tray.ipc.cjs — clean backend IPC for Tray subsystem

import { ipcMain } from "electron";
import * as PartitionFS from "../partition/api/partition.fs.cjs";
import * as PartitionPaths from "../partition/api/partition.paths.cjs";
import * as TrayFS from "./tray.fs.cjs";

export function initTrayIPC() {

  /* Add item to tray */
  ipcMain.handle("partition:addToTray", async (_event, trayId, payload) => {
    return TrayFS.addToTray(trayId, payload);
  });

  /* Sync tray metadata */
  ipcMain.handle("partition:syncTray", async (_event, trayId) => {
    return TrayFS.syncTray(trayId);
  });

  /* Load all trays */
  ipcMain.handle("partition:loadAllTrays", async () => {
    return TrayFS.loadAllTrays();
  });

  /* List items inside a tray */
  ipcMain.handle("partition:listTrayItems", async (_event, trayId) => {
    return TrayFS.listTrayItems(trayId);
  });

  /* Read tray metadata */
  ipcMain.handle("tray:readMetadata", async (_event, trayId) => {
    return TrayFS.readTrayMetadata(trayId);
  });
}
