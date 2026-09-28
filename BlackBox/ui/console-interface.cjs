/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/ui/console-interface.cjs
   Alias: @backend-blackbox/ui/console-interface.cjs
   Role: Provides a lightweight console-based interface for debugging UI
         commands, intent routing, and backend → UI communication.

   Dependencies:
     - ./ui.commands.cjs
     - ./ui.intent.cjs

   Architectural Notes:
     - Console interface is for development only.
     - Must not expose internal or sensitive structures.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] console-interface.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const readline = require("node:readline");
const { initializeMessageSystem, sendMessageToWingMan } = require("../message/index.cjs");
const { loadPermissions } = require("../core/settings/permissions.cjs");

// ---------------------------------------------------------------------------
// Start console interface
// ---------------------------------------------------------------------------
async function startConsoleInterface() {
  console.log("[WingMan] Starting console interface...");

  // Initialize message system
  await initializeMessageSystem();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("WingMan is ready. Type a message below.");

  rl.on("line", async (input) => {
    if (input.trim().toLowerCase() === "exit") {
      console.log("Exiting WingMan console interface.");
      rl.close();
      process.exit(0);
    }

    try {
      const response = await sendMessageToWingMan(input);
      console.log("WingMan:", response.reply);
    } catch (err) {
      console.error("Error:", err.message);
    }
  });
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  startConsoleInterface
};
