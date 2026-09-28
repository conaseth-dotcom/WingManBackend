// tray.fs.cjs — pure filesystem logic for Tray subsystem

import * as PartitionFS from "../partition/api/partition.fs.cjs";
import * as PartitionPaths from "../partition/api/partition.paths.cjs";

export async function addToTray(trayId, payload) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  const filePath = `${trayFolder}/${payload.id}.json`;
  await PartitionFS.writeFile(filePath, JSON.stringify(payload, null, 2));
  return { ok: true };
}

export async function syncTray(trayId) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  return PartitionFS.readFolderTree(trayFolder);
}

export async function loadAllTrays() {
  const root = PartitionPaths.getTrayFolder("root");
  return PartitionFS.readFolderTree(root);
}

export async function listTrayItems(trayId) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  return PartitionFS.listFiles(trayFolder);
}

export async function readTrayMetadata(trayId) {
  const trayFolder = PartitionPaths.getTrayFolder(trayId);
  const metadataPath = `${trayFolder}/metadata.json`;
  return PartitionFS.readFile(metadataPath);
}
