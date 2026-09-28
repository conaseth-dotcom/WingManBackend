/* ========================================================================
   WingMan Backend File
   Alias: @backend-blackbox/blackbox.gateway.cjs
   Role: IPC gateway for BlackBox. Handles communication between renderer
         and backend, routing messages to autonomy, AI, and relationship
         subsystems.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] blackbox.gateway.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports
// ---------------------------------------------------------------------------
const { detectUIIntent } = require("./ui/ui.intent.cjs");
const { showFullscreen } = require("./ui/ui.commands.cjs");
const { loadPermissions } = require("./core/settings/permissions.cjs");
const { handleAIAction } = require("./blackbox.ai.actions.cjs");
const { getSandboxStats } = require("../autonomy/sandbox.stats.cjs");
const { recordSandboxCheckpoint } = require("../autonomy/sandbox.checkpoints.cjs");

// ---------------------------------------------------------------------------
// Gateway Class
// ---------------------------------------------------------------------------
class BlackBoxGateway {
  constructor() {
    this.permissions = loadPermissions() || {};
  }

  // ------------------------------------------------------------
  // Permission system 
  // ------------------------------------------------------------
  hasPermission(action) {
    return !!this.permissions[action];
  }

  ensurePermission(action) {
    if (!this.hasPermission(action)) {
      return { valid: false, reason: `Permission '${action}' denied.` };
    }
    return { valid: true };
  }

  // ------------------------------------------------------------
  // AI ACTION BRIDGE
  // ------------------------------------------------------------
  async handleAIAction(request) {
    const check = this.ensurePermission("ai-actions");
    if (!check.valid) {
      return { error: "Permission denied.", reason: check.reason };
    }
    return await handleAIAction(request);
  }

  // ------------------------------------------------------------
  // AUTONOMY — Sandbox Stats
  // ------------------------------------------------------------
  getSandboxStats(sandboxId) {
    const check = this.ensurePermission("ai-autonomy");
    if (!check.valid) {
      return { error: "Permission denied.", reason: check.reason };
    }
    return getSandboxStats(sandboxId);
  }

  recordCheckpoint(sandboxId, report) {
    const check = this.ensurePermission("ai-autonomy");
    if (!check.valid) {
      return { error: "Permission denied.", reason: check.reason };
    }
    return recordSandboxCheckpoint(sandboxId, report);
  }

  // ------------------------------------------------------------
  // SETTINGS
  // ------------------------------------------------------------
  getSettings() {
    return this.permissions;
  }
}

// ---------------------------------------------------------------------------
// Export (CommonJS)
// ---------------------------------------------------------------------------
module.exports = { BlackBoxGate: new BlackBoxGateway() };
