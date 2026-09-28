/* ========================================================================
   WingMan Backend — Partition Validator (Deterministic Mode)
   Path: C:/WingManBackend/partition/api/partition.validator.cjs
========================================================================= */

const fs   = require("fs");
const path = require("path");
const { PartitionPaths } = require("./partition.paths.cjs");

/* ------------------------------------------------------------
   Validate that a directory exists
------------------------------------------------------------ */
function validateDirectory(label, dirPath, errors) {
  if (!fs.existsSync(dirPath)) {
    errors.push(`${label}: Path does not exist → ${dirPath}`);
    return false;
  }

  if (!fs.statSync(dirPath).isDirectory()) {
    errors.push(`${label}: Path is not a directory → ${dirPath}`);
    return false;
  }

  return true;
}

/* ------------------------------------------------------------
   Validate partition root + required subfolders
------------------------------------------------------------ */
function validatePartitionRoot() {
  const errors = [];

  const root = PartitionPaths.getPartitionRoot();

  validateDirectory("Partition root", root, errors);
  validateDirectory("User partition", PartitionPaths.getUserRoot(), errors);
  validateDirectory("Shared partition", PartitionPaths.getSharedRoot(), errors);
  validateDirectory("AI partition", PartitionPaths.getAiRoot(), errors);
  validateDirectory("System partition", PartitionPaths.getSystemRoot(), errors);
  validateDirectory("Runtime partition", PartitionPaths.getRuntimeRoot(), errors);
  validateDirectory("Overlay partition", PartitionPaths.getOverlayRoot(), errors);

  return { ok: errors.length === 0, errors };
}

/* ------------------------------------------------------------
   Validate trays (modern)
------------------------------------------------------------ */
function validateTrays(trays) {
  const errors = [];

  for (const tray of trays) {
    if (!tray.id) {
      errors.push("Tray missing id.");
      continue;
    }

    const trayFolder = PartitionPaths.getTrayFolder(tray.id);
    validateDirectory(`Tray ${tray.id}`, trayFolder, errors);
  }

  return { ok: errors.length === 0, errors };
}

/* ------------------------------------------------------------
   Validate a single tray item (modern)
------------------------------------------------------------ */
function validateItem(trayId, metadata) {
  const errors = [];

  if (!metadata) {
    errors.push(`Tray ${trayId}: Missing item metadata.`);
    return { ok: false, errors };
  }

  const requiredFields = ["name", "filename", "sourcePath", "type"];
  for (const field of requiredFields) {
    if (!metadata[field]) {
      errors.push(`Tray ${trayId}: Item metadata missing required field: ${field}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/* ------------------------------------------------------------
   Validate everything
------------------------------------------------------------ */
function validateAll(trays = []) {
  const rootValidation = validatePartitionRoot();
  const trayValidation = validateTrays(trays);

  const allErrors = [
    ...rootValidation.errors,
    ...trayValidation.errors
  ];

  return { ok: allErrors.length === 0, errors: allErrors };
}

module.exports = {
  validatePartitionRoot,
  validateTrays,
  validateItem,
  validateAll,
  PartitionValidator: {
    validatePartitionRoot,
    validateTrays,
    validateItem,
    validateAll
  }
};
