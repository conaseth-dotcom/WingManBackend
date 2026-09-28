/* ========================================================================
   WingMan Backend — Modern Logger (ESM, MVP-safe)
   No top-level filesystem operations.
========================================================================= */

import { PartitionFS } from "./partition.fs.cjs";
import { PartitionPaths } from "./partition.paths.cjs";

/* Just compute the path; don't touch the FS yet */
const LOG_ROOT = `${PartitionPaths.getSystemRoot()}/logs`;
async function ensureLogFolder() {
  await PartitionFS.ensureFolder(LOG_ROOT);
}

/* ------------------------------------------------------------
   Write a structured log entry (lazy, safe)
------------------------------------------------------------ */
export async function log(channel, message, data = null) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, channel, message, data };

  console.log(`[Backend:${channel}] ${message}`, data || "");

  await ensureLogFolder();

  const filePath = `${LOG_ROOT}/${channel}.log`;
  const line = JSON.stringify(entry) + "\n";

  // PartitionFS.writeFile already ensures parent folder; no append flag needed
  const existing = await PartitionFS.readFile(filePath);
  const content = existing ? existing + line : line;

  await PartitionFS.writeFile(filePath, content);

  return entry;
}

/* ------------------------------------------------------------
   Grouped export
------------------------------------------------------------ */
export const PartitionLogger = { log };
export default PartitionLogger;
