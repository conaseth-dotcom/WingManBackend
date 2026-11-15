/* ========================================================================
   WingMan Backend — Partition Validator (Deterministic Mode)
   Path: C:/WingManBackend/partition/api/partition.validator.cjs
========================================================================= */

const fs   = require("fs");
const path = require("path");
const PartitionPaths = require("./partition.paths.cjs");

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
   Validate everything
------------------------------------------------------------ */
function validateAll() {
  return validatePartitionRoot();
}
module.exports = {
  validatePartitionRoot,
  validateAll,
  PartitionValidator: {
    validatePartitionRoot,
    validateAll
  }
};