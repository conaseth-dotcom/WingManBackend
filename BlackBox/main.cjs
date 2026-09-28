/* ========================================================================
   WingMan Backend File

   Alias: @backend-blackbox/main.cjs
   Role: Primary BlackBox entry point. Initializes autonomy, message routing,
         AI actions, and relationship subsystems.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] main.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS import (converted from ESM)
// ---------------------------------------------------------------------------
const { BlackBox } = require("./blackbox.runtime.cjs");

// ---------------------------------------------------------------------------
// Start function
// ---------------------------------------------------------------------------
async function start() {
  console.log("[WingMan] Starting application...");

  try {
    await BlackBox.initialize();
    console.log("[WingMan] Application startup complete.");
  } catch (err) {
    console.error("[WingMan] Startup failed:", err);
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
