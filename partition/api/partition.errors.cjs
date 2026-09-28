/* ========================================================================
   WingMan Backend — Modern Error Handler (ESM)
   MVP-SAFE VERSION: No top-level filesystem operations.
========================================================================= */

console.log("[PartitionErrors] Loaded from:", import.meta.url);

import * as PartitionFS from "./partition.fs.cjs";
import * as PartitionPaths from "./partition.paths.cjs";
import * as PartitionLogger from "./partition.logger.cjs";

/* ------------------------------------------------------------
   Resolve error log file path (but DO NOT touch the filesystem)
------------------------------------------------------------ */
const ERROR_DIR = `${PartitionPaths.partitionRoot}/system/errors`;
const ERROR_FILE = `${ERROR_DIR}/backend-errors.json`;

/* ------------------------------------------------------------
   Ensure folder exists ONLY when actually logging an error
------------------------------------------------------------ */
async function ensureErrorFolder() {
  await PartitionFS.ensureFolder(ERROR_DIR);
}

/* ------------------------------------------------------------
   Record an error (lazy, safe)
------------------------------------------------------------ */
export async function recordError(err, context = "") {
  await ensureErrorFolder();

  await PartitionLogger.log("error", `Backend error in ${context}`, {
    message: err.message,
    stack: err.stack
  });

  let errors = [];
  const existing = await PartitionFS.readFile(ERROR_FILE);

  if (existing) {
    try { errors = JSON.parse(existing); }
    catch { errors = []; }
  }

  const entry = {
    context,
    message: err.message,
    stack: err.stack,
    time: Date.now()
  };

  errors.push(entry);

  await PartitionFS.writeFile(ERROR_FILE, JSON.stringify(errors, null, 2));

  return { ok: false, context, message: err.message };
}

/* ------------------------------------------------------------
   Simple log wrapper
------------------------------------------------------------ */
export async function log(entry) {
  await ensureErrorFolder();
  return PartitionLogger.log("error", entry.type || "error", entry);
}

export const PartitionErrors = { recordError, log };
export default PartitionErrors;
