/* ========================================================================
WingMan Backend File
Alias: @backend-blackbox/blackbox.thinking.cjs
Role: Reflection and thinking cycle engine. Manages timing, permissions,
      note writing, and autonomous triggers.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] blackbox.thinking.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports
// ---------------------------------------------------------------------------
const { BlackBoxGate } = require("./blackbox.gateway.cjs");
const { BlackBoxAutonomy } = require("./blackbox.autonomy.cjs");
const { loadPermissions } = require("./core/settings/permissions.cjs");

// ---------------------------------------------------------------------------
// Thinking Loop
// ---------------------------------------------------------------------------
class ThinkingLoop {
  constructor() {
    this.lastRunAt = 0;
  }

  // ------------------------------------------------------------
  // Resolve interval from settings (minutes → ms)
  // ------------------------------------------------------------
  getIntervalMs() {
    let minutes = 10;
    try {
      const settings = BlackBoxGate.getSettings?.() || {};
      if (typeof settings.thinkingLoopIntervalMinutes === "number") {
        minutes = settings.thinkingLoopIntervalMinutes;
      }
    } catch {
      minutes = 10;
    }

    if (minutes < 5) minutes = 5;
    if (minutes > 30) minutes = 30;

    return minutes * 60 * 1000;
  }

  // ------------------------------------------------------------
  // Maybe enqueue a thinking cycle
  // ------------------------------------------------------------
  maybeEnqueue() {
    const now = Date.now();
    const intervalMs = this.getIntervalMs();

    if (now - this.lastRunAt < intervalMs) return;

    this.lastRunAt = now;

    BlackBoxAutonomy.enqueue(
      async (gate) => this.runThinkingCycle(gate),
      "Thinking Loop Reflection"
    );
  }

  // ------------------------------------------------------------
  // Lightweight summarization helper
  // ------------------------------------------------------------
  summarizeNotes(notes) {
    if (!notes || notes.length === 0) {
      return "No recent notes available for reflection.";
    }

    const titles = notes.map(n => n.title || "Untitled");
    const sample = notes[0];

    return [
      `Recent activity count: ${notes.length}`,
      `Most recent note: "${sample.title}"`,
      `Recent titles: ${titles.join(", ")}`,
      `Reflection generated at ${new Date().toISOString()}`
    ].join("\n");
  }

  // ------------------------------------------------------------
  // Thinking cycle 
  // ------------------------------------------------------------
  async runThinkingCycle(gate) {
    let settings = {};

    try {
      settings = gate.getSettings?.() || {};
    } catch {
      settings = {};
    }

    if (settings.enableThinkingLoop === false) {
      return { skipped: true, reason: "Thinking loop disabled in settings." };
    }

    // Permission: read notes
    const readCheck = gate.ensurePermission("read-notes");
    if (!readCheck.valid) {
      return { skipped: true, reason: "No read permission." };
    }

    // Read recent notes
    let recent = [];
    try {
      recent = gate.readRecentNotes(5) || [];
    } catch {
      recent = [];
    }

    const reflection = this.summarizeNotes(recent);

    // Permission: write notes
    const writeCheck = gate.ensurePermission("create-notes");
    if (!writeCheck.valid) {
      return { skipped: true, reason: "No write permission." };
    }

    const result = gate.createNote(
      "Thinking Loop Reflection",
      reflection
    );

    return { ok: true, note: result };
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
module.exports = { BlackBoxThinking: new ThinkingLoop() };
