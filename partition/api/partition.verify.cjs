/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/partition/api/partition.verify.cjs
   Role:
     Performs deep verification of trays, items, and partition structure.
     Complements partition.validator.cjs (config + basic FS checks).
     MVP-safe: no world/project/UI dependencies.
========================================================================= */

import fs from "fs";
import path from "path";

import { PartitionPaths } from "./partition.paths.cjs";
import { PartitionFS } from "./partition.fs.cjs";
import { PartitionValidator } from "./partition.validator.cjs";

/* ------------------------------------------------------------
   Verify a single tray folder
------------------------------------------------------------ */
export function verifyTray(trayId) {
  const errors = [];
  const trayFolder = PartitionPaths.getTrayFolder(trayId);

  if (!fs.existsSync(trayFolder)) {
    errors.push(`Tray ${trayId}: Folder does not exist → ${trayFolder}`);
    return { ok: false, errors };
  }

  if (!fs.statSync(trayFolder).isDirectory()) {
    errors.push(`Tray ${trayId}: Path is not a directory → ${trayFolder}`);
    return { ok: false, errors };
  }

  return { ok: true, errors };
}

/* ------------------------------------------------------------
   Verify a single tray item
------------------------------------------------------------ */
export function verifyItem(trayId, itemName) {
  const errors = [];

  const itemFolder = PartitionPaths.getItemFolder(trayId, itemName);
  const metadataPath = PartitionPaths.getMetadataPath(trayId, itemName);
  const previewFolder = PartitionPaths.getPreviewFolder(trayId, itemName);

  // Item folder must exist
  if (!fs.existsSync(itemFolder)) {
    errors.push(`Tray ${trayId}: Item folder missing → ${itemFolder}`);
    return { ok: false, errors };
  }

  // metadata.json must exist
  if (!fs.existsSync(metadataPath)) {
    errors.push(`Tray ${trayId}: Missing metadata.json → ${metadataPath}`);
  } else {
    try {
      JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    } catch (err) {
      errors.push(`Tray ${trayId}: Invalid metadata.json → ${metadataPath}`);
    }
  }

  // preview folder optional but must be a directory if present
  if (fs.existsSync(previewFolder) && !fs.statSync(previewFolder).isDirectory()) {
    errors.push(`Tray ${trayId}: preview/ exists but is not a folder → ${previewFolder}`);
  }

  return { ok: errors.length === 0, errors };
}

/* ------------------------------------------------------------
   Verify all trays and items
------------------------------------------------------------ */
export function verifyAllTrays(trays = []) {
  const errors = [];

  for (const tray of trays) {
    const trayCheck = verifyTray(tray.id);
    errors.push(...trayCheck.errors);

    if (tray.items && Array.isArray(tray.items)) {
      for (const item of tray.items) {
        const itemCheck = verifyItem(tray.id, item.name);
        errors.push(...itemCheck.errors);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/* ------------------------------------------------------------
   Verify entire partition state
------------------------------------------------------------ */
export function verifyPartitionState(trays = []) {
  const validator = PartitionValidator.validateAll(trays);
  const trayChecks = verifyAllTrays(trays);

  const allErrors = [...validator.errors, ...trayChecks.errors];

  return { ok: allErrors.length === 0, errors: allErrors };
}

/* ------------------------------------------------------------
   Grouped export
------------------------------------------------------------ */
export const PartitionVerify = {
  verifyTray,
  verifyItem,
  verifyAllTrays,
  verifyPartitionState
};

export default PartitionVerify;

/* ========================================================================
   End of File
========================================================================= */
