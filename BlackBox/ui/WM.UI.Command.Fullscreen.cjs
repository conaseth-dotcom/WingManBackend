// ============================================================================
// WingMan Backend – BlackBox UI Subsystem (CommonJS Version)
// File: WM.UI.Command.Fullscreen.cjs
// ============================================================================

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

// Resolve schema path
const schemaPath = path.join(
  process.cwd(),
  "BlackBox",
  "ui",
  "WM.UI.Command.Fullscreen.schema.json"
);

// Create Ajv instance
const ajv = new Ajv({
  allErrors: true,
  strictSchema: false,
  validateSchema: false
});

// Load schema
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);

/**
 * Creates a fullscreen UI command object.
 *
 * @param {string} html - HTML content to display.
 * @param {object} options - Optional fields: title, mode, metadata.
 * @returns {object} Validated fullscreen command.
 */
function createFullscreenCommand(html, options = {}) {
  const command = {
    role: "ai",
    type: "fullscreen_request",
    html,
    ...options
  };

  const valid = validate(command);

  if (!valid) {
    console.error("Fullscreen command validation failed:", validate.errors);
    throw new Error("Invalid fullscreen command");
  }

  return command;
}

module.exports = { createFullscreenCommand };
