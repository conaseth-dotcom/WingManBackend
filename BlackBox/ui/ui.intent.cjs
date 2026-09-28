/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/ui/ui.intent.cjs
   Alias: @backend-blackbox/ui/ui.intent.cjs
   Role: Interprets backend intent signals and converts them into UI command
         structures. Handles mapping between AI intent and UI behavior.

   Dependencies:
     - ./ui.commands.cjs
     - ../relationship/runtime/relationship.context.cjs

   Architectural Notes:
     - Must preserve AI intent without altering meaning.
     - Must enforce safety and non-intrusive UI behavior.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] ui.intent.cjs loaded");

/**
 * Detect UI intent from a user message.
 *
 * @param {string} userMessage
 * @returns {string|null} Intent type
 */
function detectUIIntent(userMessage) {
  const text = userMessage.toLowerCase();

  if (text.includes("show me") || text.includes("visualize")) {
    return "visual";
  }

  if (text.includes("layout") || text.includes("design")) {
    return "design";
  }

  if (text.includes("options") || text.includes("alternatives")) {
    return "options";
  }

  if (text.includes("diagram") || text.includes("flow")) {
    return "diagram";
  }

  return null;
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  detectUIIntent
};
