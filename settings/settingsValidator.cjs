// settingsValidator.cjs — Validates new partition roots for WingMan (ESM)

import fs from "fs";
import path from "path";

/**
 * Check if a path exists and is a directory
 */
function validateExists(dir) {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if directory is writable
 */
function validateWritable(dir) {
  try {
    const testFile = path.join(dir, "__wm_write_test.tmp");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check free disk space (minimum 100MB recommended)
 */
function validateFreeSpace(dir) {
  try {
    const { free } = fs.statfsSync(dir); // Node 20+ API
    const MIN_BYTES = 100 * 1024 * 1024; // 100MB
    return free > MIN_BYTES;
  } catch {
    return false;
  }
}

/**
 * Validate folder structure (trays, voice, rooms, sandbox)
 */
function validateStructure(dir) {
  const required = [
    "trays",
    "voice",
    "rooms",
    "sandbox"
  ];

  try {
    for (const folder of required) {
      const full = path.join(dir, folder);
      if (!fs.existsSync(full)) {
        // Missing folders are OK — migration tool will create them
        continue;
      }
      if (!fs.statSync(full).isDirectory()) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Main validator
 */
export function validatePartitionRoot(newRoot) {
  const normalized = path.resolve(newRoot);

  const results = {
    path: normalized,
    exists: validateExists(normalized),
    writable: false,
    freeSpace: false,
    structure: false,
    ok: false,
    errors: []
  };

  if (!results.exists) {
    results.errors.push("Path does not exist.");
    return results;
  }

  results.writable = validateWritable(normalized);
  if (!results.writable) {
    results.errors.push("Directory is not writable.");
  }

  results.freeSpace = validateFreeSpace(normalized);
  if (!results.freeSpace) {
    results.errors.push("Insufficient free disk space.");
  }

  results.structure = validateStructure(normalized);
  if (!results.structure) {
    results.errors.push("Folder structure is invalid.");
  }

  results.ok =
    results.exists &&
    results.writable &&
    results.freeSpace &&
    results.structure;

  return results;
}
