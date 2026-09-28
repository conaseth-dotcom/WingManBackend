/* ========================================================================
   WingMan Backend File

   Alias: @backend-blackbox/message/index.cjs
   Role: Message subsystem entry point. Initializes message router and
         exposes message API surface to BlackBox runtime and gateway.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] message/index.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const { MessageRouter } = require("./message-router.cjs");
const { startWingManApp } = require("../app.cjs");

let router = null;

// ---------------------------------------------------------------------------
// Initialize Message System
// ---------------------------------------------------------------------------
async function initializeMessageSystem() {
  console.log("[WingMan] Initializing message system...");

  // 1. Start the main app controller
  const appController = await startWingManApp();

  // 2. Create the message router
  router = new MessageRouter(appController);

  console.log("[WingMan] Message system ready.");
  return router;
}

// ---------------------------------------------------------------------------
// Get Router
// ---------------------------------------------------------------------------
function getMessageRouter() {
  if (!router) {
    throw new Error("Message system not initialized");
  }
  return router;
}

// ---------------------------------------------------------------------------
// Convenience wrapper for sending messages
// ---------------------------------------------------------------------------
async function sendMessageToWingMan(message) {
  if (!router) {
    throw new Error("Message system not initialized");
  }
  return router.route(message);
}

// ---------------------------------------------------------------------------
// Export (CommonJS)
// ---------------------------------------------------------------------------
module.exports = {
  initializeMessageSystem,
  getMessageRouter,
  sendMessageToWingMan
};
