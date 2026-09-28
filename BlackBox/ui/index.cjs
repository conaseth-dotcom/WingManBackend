/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/BlackBox/ui/index.cjs
   Alias: @backend-blackbox/ui/index.cjs
   Role: Entry point for WingMan UI command dispatch. Routes backend-issued
         UI commands to the appropriate handlers.
========================================================================= */

const { startConsoleInterface } = require("./console-interface.cjs");

async function initializeUI() {
  console.log("[WingMan] Initializing UI subsystem...");

  await startConsoleInterface();

  console.log("[WingMan] UI subsystem active.");
}

module.exports = {
  initializeUI
};
