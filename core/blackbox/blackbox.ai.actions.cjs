/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/blackbox/blackbox.ai.actions.cjs
   Alias: @backend-core/blackbox/blackbox.ai.actions.cjs
   Role: AI Action Processor for WingMan’s BlackBox subsystem. Receives,
         validates, and executes AI-originated actions under governance
         constraints. Integrates with autonomy, safety, and relationship
         validators.

   Dependencies:
     - ./blackbox.autonomy.cjs
     - ../../state.cjs
     - ../../access/access.manager.cjs
     - ../../../BlackBox/relationship/validators/validate-communication.cjs
     - ../../../BlackBox/relationship/validators/validate-flow.cjs

   Architectural Notes:
     - Must validate every action before execution.
     - Must reject unsafe, malformed, or unauthorized actions.
     - Must log all actions through the autonomy governor.
========================================================================= */

// BlackBox AI Action Processor — integrates Autonomy Governor + Thinking Engine
console.log(">>> [WM-FILE-LOAD] blackbox.ai.actions.cjs loaded");

import { BlackBoxAutonomy } from "./blackbox.autonomy.cjs";
import { runAIAction } from "./blackbox.thinking.cjs";

/**
 * Default user interaction handler for size discussion.
 * For now, this auto-selects the AI half-limit mode.
 * Later, this can be wired to a real UI prompt.
 */
async function defaultAskUserFn(payload) {
  // payload: { type: "size-discussion", estimate }
  return {
    mode: "ai-half-limit"
    // In a real UI, you would return:
    // { mode: "user-defined", maxBytes, maxFiles, maxVersions, checkpointIntervalBytes }
    // or { mode: "ai-half-limit" }
  };
}

/**
 * Handle a single AI action request.
 *
 * Expected request shape (flexible, but recommended):
 * {
 *   sandboxId: "sandbox:projectName",
 *   contract: {
 *     goal,
 *     scope,
 *     biteLimit?,
 *     doneWhen?
 *   },
 *   taskDescription: "Human-readable description of what to build/do",
 *   payload: { ... } // action-specific data for runAIAction
 * }
 */
export async function handleAIAction(request) {
  const {
    sandboxId,
    contract,
    taskDescription,
    payload
  } = request;

  if (!sandboxId || !contract) {
    return {
      error: "Missing sandboxId or contract.",
      autonomy: { action: "abort", reason: "Invalid request." }
    };
  }

  // Configure governor with contract + sandbox
  BlackBoxAutonomy.configure(contract, sandboxId);

  // Initialize governor (estimation + negotiation)
  await BlackBoxAutonomy.initialize(taskDescription || "", defaultAskUserFn);

  // Version tracking placeholder
  const versions = { count: contract.versionsCount || 0 };

  // BEFORE ACTION: check autonomy
  const preCheck = BlackBoxAutonomy.beforeAction(versions);
  if (preCheck.action === "checkpoint" || preCheck.action === "complete") {
    return {
      autonomy: preCheck,
      result: null,
      contract: BlackBoxAutonomy.contract
    };
  }

  // Run the core AI action (thinking / building / editing)
  const result = await runAIAction({
    sandboxId,
    contract: BlackBoxAutonomy.contract,
    taskDescription,
    payload
  });

  // Increment version count after a successful action
  versions.count += 1;

  // AFTER ACTION: check autonomy again
  const postCheck = BlackBoxAutonomy.afterAction(versions);

  return {
    autonomy: postCheck,
    result,
    contract: BlackBoxAutonomy.contract
  };
}
