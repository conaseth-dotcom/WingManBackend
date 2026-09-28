/* ========================================================================
   WingMan Backend File
   Alias: @backend-blackbox/blackbox.runtime.cjs
   Role: BlackBox runtime engine. Coordinates subsystem initialization,
         manages lifecycle, and executes autonomy cycles.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] blackbox.runtime.cjs loaded");

// ---------------------------------------------------------------------------
// Correct CommonJS imports (all .cjs, no .default)
// ---------------------------------------------------------------------------
const { BlackBoxGate } = require("./blackbox.gateway.cjs");
const { BlackBoxAutonomy } = require("./blackbox.autonomy.cjs");
const RelationshipEngine = require("./relationship/runtime/index.cjs");
const MessageRouter = require("./message/message-router.cjs");
const { BlackBoxThinking } = require("./blackbox.thinking.cjs");
const { loadPermissions } = require("../core/settings/permissions.cjs");

// ---------------------------------------------------------------------------
// BlackBox Runtime
// ---------------------------------------------------------------------------
class BlackBoxRuntime {
  constructor() {
    this.engine = null;
    this.router = null;
    this.ready = false;
    this.thinkingTimer = null;
  }

  // ------------------------------------------------------------
  // Initialize BlackBox
  // ------------------------------------------------------------
  async initialize() {
    if (this.ready) return;

    // RelationshipEngine now exports { runtime, initializeWingManRuntime }
    this.engine = RelationshipEngine.runtime;
    this.router = new MessageRouter(this.engine);

    this.ready = true;
    console.log("[BlackBox] Runtime initialized.");

    this.startThinkingHeartbeat();
  }

  // ------------------------------------------------------------
  // Thinking heartbeat
  // ------------------------------------------------------------
  startThinkingHeartbeat() {
    if (this.thinkingTimer) return;
    this.thinkingTimer = setInterval(() => {
      BlackBoxThinking.maybeEnqueue();
    }, 60 * 1000);
  }

  // ------------------------------------------------------------
  // Manual thinking trigger
  // ------------------------------------------------------------
  requestThinkingCycle() {
    BlackBoxThinking.maybeEnqueue();
  }

  // ------------------------------------------------------------
  // Handle user messages
  // ------------------------------------------------------------
  async handleUserMessage(text) {
    BlackBoxAutonomy.notifyUserActivity();

    if (!this.ready) await this.initialize();

    const response = await this.router.routeUserMessage(text, BlackBoxGate);

    this.requestThinkingCycle();
    return response;
  }

  // ------------------------------------------------------------
  // Autonomous task enqueue
  // ------------------------------------------------------------
  enqueueAutonomousTask(taskFn, description = "Autonomous Task") {
    BlackBoxAutonomy.enqueue(taskFn, description);
  }

  // ------------------------------------------------------------
  // Expose safe gateway + autonomy
  // ------------------------------------------------------------
  getGateway() {
    return BlackBoxGate;
  }

  getAutonomy() {
    return BlackBoxAutonomy;
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
module.exports = { BlackBox: new BlackBoxRuntime() };
