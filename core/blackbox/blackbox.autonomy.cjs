/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/blackbox/blackbox.autonomy.cjs
   Alias: @backend-core/blackbox/blackbox.autonomy.cjs
   Role: Implements the Autonomy Governor for WingMan’s BlackBox subsystem.
         Regulates AI autonomy levels, timing windows, permission checks,
         and safe activation of autonomous behaviors.

   Dependencies:
     - ./blackbox.ai.actions.cjs
     - ../../state.cjs
     - ../../access/access.manager.cjs
     - ../../../BlackBox/relationship/validators/validate-priorities.cjs

   Architectural Notes:
     - Must enforce strict autonomy ceilings based on access rules.
     - Must remain deterministic and side‑effect controlled.
     - All autonomous actions must route through the AI Action Processor.
========================================================================= */

// BlackBox Autonomy Governor — Bite Limits, Scope Control, Checkpoints
console.log(">>> [WM-FILE-LOAD] blackbox.autonomy.cjs loaded");

/**
 * Autonomy Governor
 * Evaluates whether an AI task should continue, stop, or trigger a checkpoint.
 *
 * Responsibilities:
 *  - Enforce bite limits (bytes, files, versions)
 *  - Detect Definition-of-Done completion
 *  - Detect scope drift
 *  - Generate checkpoint reports
 *  - Handle AI estimation + negotiation
 *  - Provide integration hooks for AI action loop
 */

export class AutonomyGovernor {
  constructor() {
    this.contract = null; // task contract (goal, scope, biteLimit, doneWhen)
    this.sandboxId = null;
    this.initialized = false;
  }

  /* ------------------------------------------------------------
     Load task contract + sandbox reference
  ------------------------------------------------------------ */
  configure(contract, sandboxId) {
    this.contract = contract;
    this.sandboxId = sandboxId;
  }

  /* ------------------------------------------------------------
     INITIALIZATION PHASE
     Called once before the AI begins building.
------------------------------------------------------------ */
  async initialize(taskDescription, askUserFn) {
    if (!this.contract) {
      throw new Error("AutonomyGovernor: No contract loaded.");
    }

    // Only run once
    if (this.initialized) return;

    // Run estimation + negotiation
    await this.estimateAndNegotiate(taskDescription, askUserFn);

    this.initialized = true;
  }

  /* ------------------------------------------------------------
     Build Size Estimation Phase
     Called before the AI begins building anything.
------------------------------------------------------------ */
  async estimateAndNegotiate(taskDescription, askUserFn) {
    // 1. Ask the AI to estimate build size
    const estimate = await this.estimateBuildSize(taskDescription);

    // 2. Ask the user if they want to discuss size
    const userResponse = await askUserFn({
      type: "size-discussion",
      estimate
    });

    // 3. User wants to discuss size → they set the limit
    if (userResponse?.mode === "user-defined") {
      this.contract.biteLimit = {
        maxBytes: userResponse.maxBytes,
        maxFiles: userResponse.maxFiles,
        maxVersions: userResponse.maxVersions,
        checkpointIntervalBytes: userResponse.checkpointIntervalBytes
      };
      return;
    }

    // 4. User says "whatever, just build it"
    if (userResponse?.mode === "ai-half-limit") {
      const halfBytes = Math.floor(estimate.estimatedBytes / 2);
      const halfFiles = Math.floor(estimate.estimatedFiles / 2);
      const halfVersions = Math.floor(estimate.estimatedVersions / 2);

      this.contract.biteLimit = {
        maxBytes: halfBytes,
        maxFiles: halfFiles,
        maxVersions: halfVersions,
        checkpointIntervalBytes: halfBytes
      };
      return;
    }

    // 5. Default fallback (use full estimate)
    this.contract.biteLimit = {
      maxBytes: estimate.estimatedBytes,
      maxFiles: estimate.estimatedFiles,
      maxVersions: estimate.estimatedVersions,
      checkpointIntervalBytes: estimate.estimatedBytes
    };
  }

  /* ------------------------------------------------------------
     Ask the AI model to estimate build size
     (Placeholder until BlackBoxThinking is wired in)
------------------------------------------------------------ */
  async estimateBuildSize(taskDescription) {
    // Placeholder: real implementation will call BlackBoxThinking
    return {
      estimatedBytes: 300 * 1024 * 1024, // 300 MB
      estimatedFiles: 20,
      estimatedVersions: 3
    };
  }

  /* ------------------------------------------------------------
     BEFORE ACTION CHECK
     Called before each AI action step
------------------------------------------------------------ */
  beforeAction(versions = { count: 0 }) {
    return this.evaluate(versions);
  }

  /* ------------------------------------------------------------
     AFTER ACTION CHECK
     Called after each AI action step
------------------------------------------------------------ */
  afterAction(versions = { count: 0 }) {
    return this.evaluate(versions);
  }

  /* ------------------------------------------------------------
     Main evaluation entry point
     Called before/after each AI action step
  ------------------------------------------------------------ */
  evaluate(versions = { count: 0 }) {
    if (!this.contract || !this.sandboxId) {
      return { action: "continue" };
    }

    const stats = getSandboxStats(this.sandboxId);
    const bite = this.contract.biteLimit || {};

    // 1. Bite Limit: Max Bytes
    if (bite.maxBytes && stats.bytes >= bite.maxBytes) {
      return this.triggerCheckpoint("maxBytes", stats, versions);
    }

    // 2. Bite Limit: Max Files
    if (bite.maxFiles && stats.files >= bite.maxFiles) {
      return this.triggerCheckpoint("maxFiles", stats, versions);
    }

    // 3. Bite Limit: Max Versions
    if (bite.maxVersions && versions.count >= bite.maxVersions) {
      return this.triggerCheckpoint("maxVersions", stats, versions);
    }

    // 4. Definition of Done
    if (this.isDone()) {
      return {
        action: "complete",
        reason: "Definition of Done satisfied.",
        contract: this.contract
      };
    }

    // 5. No issues → continue
    return { action: "continue" };
  }

  /* ------------------------------------------------------------
     Definition-of-Done evaluation
------------------------------------------------------------ */
  isDone() {
    if (!this.contract.doneWhen) return false;

    return this.contract.doneWhen.every(flag => flag === true);
  }

  /* ------------------------------------------------------------
     Generate a checkpoint report + log it
  ------------------------------------------------------------ */
  triggerCheckpoint(type, stats, versions) {
    const report = this.generateCheckpointReport(type, stats, versions);

    // Log checkpoint to sandbox metadata
    recordSandboxCheckpoint(this.sandboxId, report);

    return {
      action: "checkpoint",
      checkpointType: type,
      report
    };
  }

  /* ------------------------------------------------------------
     Build a structured checkpoint report
  ------------------------------------------------------------ */
  generateCheckpointReport(type, stats, versions) {
    return {
      triggeredBy: type,
      timestamp: new Date().toISOString(),

      sandbox: {
        bytes: stats.bytes,
        files: stats.files,
        versions: versions.count
      },

      contract: {
        goal: this.contract.goal,
        scope: this.contract.scope,
        biteLimit: this.contract.biteLimit
      },

      summary: this.summarizeProgress(),
      remaining: this.estimateRemainingWork(),
      estimatedBitesRemaining: this.estimateRemainingBites(stats)
    };
  }

  /* ------------------------------------------------------------
     Placeholder: AI-generated progress summary
  ------------------------------------------------------------ */
  summarizeProgress() {
    return "AI has reached a bite limit. Current progress summary will be generated by the AI model.";
  }

  /* ------------------------------------------------------------
     Placeholder: AI-generated remaining work estimate
  ------------------------------------------------------------ */
  estimateRemainingWork() {
    return ["Remaining tasks will be listed by the AI model."];
  }

  /* ------------------------------------------------------------
     Estimate remaining bites based on current size
  ------------------------------------------------------------ */
  estimateRemainingBites(stats) {
    const max = this.contract.biteLimit?.maxBytes;
    if (!max) return null;

    const remaining = max - stats.bytes;
    const biteSize = this.contract.biteLimit.checkpointIntervalBytes || max;

    return Math.ceil(remaining / biteSize);
  }
}

export const BlackBoxAutonomy = new AutonomyGovernor();
