// migratePartition.cjs — Safely migrate WingMan partition (Final Layout)
//
// Root structure:
//   <oldRoot>/projects
//   <oldRoot>/metaData
//   <oldRoot>/partition.meta.json
//
// Migration moves:
//   - metaData/          (AI continuity, preferences, voice, embeddings, etc.)
//   - partition.meta.json
//
// Migration does NOT move:
//   - projects/          (user projects stay where they are)

import fs from "fs";
import path from "path";
import { readSettings, writeSettings } from "../settings/settingsWriter.cjs";
import { validatePartitionRoot } from "../settings/settingsValidator.cjs";

/**
 * Copy a folder recursively
 */
function copyFolder(src, dest) {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyFolder(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Main migration function
 */
export async function migratePartition(newRoot) {
  const settings = readSettings();
  const oldRoot = settings?.partitionRoot;

  if (!oldRoot) {
    return { ok: false, error: "Old partition root not found in settings.json." };
  }

  // Validate new root
  const validation = validatePartitionRoot(newRoot);
  if (!validation.ok) {
    return { ok: false, error: validation.errors.join("; ") };
  }

  // Ensure new root exists
  if (!fs.existsSync(newRoot)) {
    fs.mkdirSync(newRoot, { recursive: true });
  }

  // Paths in old + new partition
  const oldMetaData = path.join(oldRoot, "metaData");
  const newMetaData = path.join(newRoot, "metaData");

  const oldMetaFile = path.join(oldRoot, "partition.meta.json");
  const newMetaFile = path.join(newRoot, "partition.meta.json");

  try {
    // 1) Copy metaData (AI continuity, preferences, voice, embeddings, etc.)
    copyFolder(oldMetaData, newMetaData);

    // 2) Copy partition.meta.json (header / version / schema)
    if (fs.existsSync(oldMetaFile)) {
      fs.copyFileSync(oldMetaFile, newMetaFile);
    }

  } catch (err) {
    return { ok: false, error: "Migration failed: " + err.message };
  }

  // Update settings.json with new partition root
  const updated = writeSettings({
    partitionRoot: newRoot,
    version: settings?.version ?? 1
  });

  if (!updated.ok) {
    return { ok: false, error: "Failed to update settings.json: " + updated.error };
  }

  return {
    ok: true,
    oldRoot,
    newRoot,
    message: "Partition migrated successfully (metaData + partition.meta.json)."
  };
}
