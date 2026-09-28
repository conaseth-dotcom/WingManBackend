/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/ui/ui.commands.cjs
   Alias: @backend-blackbox/ui/ui.commands.cjs
   Role: Defines the set of UI commands that WingManBackend can send to the
         renderer. Includes fullscreen and future UI command types.

   Architectural Notes:
     - Must enforce schema validation before emitting commands.
     - Must remain extensible for future UI command types.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] ui.commands.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const { createFullscreenCommand } = require("./WM.UI.Command.Fullscreen.cjs");

/**
 * Create a fullscreen UI command using the validated schema factory.
 *
 * @param {string} html - HTML content to display fullscreen.
 * @param {object} options - Optional fields: title, mode, metadata.
 * @returns {object} Fullscreen command object.
 */
function showFullscreen(html, options = {}) {
  return createFullscreenCommand(html, options);
}

// ---------------------------------------------------------------------------
// CommonJS exports
// ---------------------------------------------------------------------------
module.exports = {
  showFullscreen
};
