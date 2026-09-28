/* ========================================================================
   WingMan Backend File

   backend-blackbox/legacy/start.cjs
   Role: Legacy BlackBox bootstrap script. Initializes deprecated runtime
         components and provides backward compatibility for older WingMan
         builds.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] start.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS import (converted from ESM)
// ---------------------------------------------------------------------------
const { initializeUI } = require("./ui/index.cjs");

// ---------------------------------------------------------------------------
// Start function
// ---------------------------------------------------------------------------
async function start() {
  console.log("[WingMan] Starting full system...");

  try {
    await initializeUI();
    console.log("[WingMan] System is fully operational.");
  } catch (err) {
    console.error("[WingMan] Fatal startup error:", err);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Auto-start if run directly
// ---------------------------------------------------------------------------
if (require.main === module) {
  start();
}

// ---------------------------------------------------------------------------
// Export (CommonJS)
// ---------------------------------------------------------------------------
module.exports = {
  start
};
