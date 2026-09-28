/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/state/history.cjs
   Alias: @backend-blackbox/relationship/state/history.cjs
   Role: Maintains session-level history for the relationship runtime. Tracks
         ephemeral events, transitions, and continuity signals.

   Dependencies:
     - fs/promises
     - path
     - uuid
     - ./ai.project.map.json
     - ./ai.understanding.snapshot.json

   Architectural Notes:
     - History is session-only; must not persist across sessions.
     - Must remain minimal, deterministic, and safe.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] utils/history.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const fs = require("fs/promises");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// ---------------------------------------------
// Ensure history file exists
// ---------------------------------------------
async function ensureHistoryFile(historyFile, blackboxPath) {
  try {
    await fs.access(historyFile);
  } catch {
    // Ensure BlackBox exists
    try {
      await fs.access(blackboxPath);
    } catch {
      await fs.mkdir(blackboxPath, { recursive: true });
    }

    // Create empty history
    await fs.writeFile(historyFile, "[]", "utf8");
  }
}

// ---------------------------------------------
// Append entry to history log
// ---------------------------------------------
async function logHistory(historyFile, entry) {
  try {
    const raw = await fs.readFile(historyFile, "utf8");
    const list = JSON.parse(raw);

    list.push({
      id: uuidv4(),
      timestamp: Date.now(),
      ...entry,
    });

    await fs.writeFile(historyFile, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write history:", err);
  }
}

// ---------------------------------------------------------------------------
// CommonJS exports
// ---------------------------------------------------------------------------
module.exports = {
  ensureHistoryFile,
  logHistory
};
