/* ========================================================================
WingMan Backend File Alias: @backend-blackbox/app.cjs
Role: BlackBox application wrapper. Coordinates initialization order,
binds UI hooks, and exposes the BlackBox API surface.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] app.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const { initializeWingManRuntime } =
  require("../BlackBox/relationship/runtime/index.cjs");

const { relationshipContext } =
  require("../BlackBox/relationship/runtime/relationship.context.cjs");

// ---------------------------------------------------------------------------
// Start WingMan Application
// ---------------------------------------------------------------------------
async function startWingManApp() {
  console.log("[WingMan] Launching application controller...");

  // 1. Initialize the runtime (loads relationship model)
  await initializeWingManRuntime();

  // 2. Access the relationship model
  const relationship = relationshipContext.getModel();

  console.log("[WingMan] Relationship model active.");
  console.log("[WingMan] Tone:", relationship.runtime.getTone());
  console.log("[WingMan] Work style:", relationship.runtime.getWorkStyle());
  console.log("[WingMan] Safety mode:", relationship.meta.safety_mode);

  // 3. Return an app controller object
  return {
    relationship,

    getTone() {
      return relationship.runtime.getTone();
    },

    getWorkStyle() {
      return relationship.runtime.getWorkStyle();
    },

    getSafetyMode() {
      return relationship.meta.safety_mode;
    },

    // Placeholder for future message routing
    async handleUserMessage(message) {
      console.log("[WingMan] Received message:", message);

      return {
        reply: `WingMan (tone: ${relationship.runtime.getTone()}) heard you.`,
        meta: {
          tone: relationship.runtime.getTone(),
          work_style: relationship.runtime.getWorkStyle(),
          safety_mode: relationship.meta.safety_mode
        }
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Optional auto-start if run directly
// ---------------------------------------------------------------------------
if (require.main === module) {
  startWingManApp()
    .then(() => console.log("[WingMan] App controller ready."))
    .catch(err => {
      console.error("[WingMan] Fatal error in app controller:", err);
      process.exit(1);
    });
}

// ---------------------------------------------------------------------------
// Export (CommonJS)
// ---------------------------------------------------------------------------
module.exports = {
  startWingManApp
};
