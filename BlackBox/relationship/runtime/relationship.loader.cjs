/* ========================================================================
   WingMan Backend File
   Path: "C:/WingManBackend/BlackBox/relationship/runtime/relationship.loader.cjs"
   Role:
     Loads relationship config JSON and builds the unified relationship model.
     This version is hardened against incorrect working directories and
     duplicate backend folders.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] relationship-loader.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const fs = require("fs/promises");
const path = require("path");
const { loadRelationshipModel } = require("../index.cjs");

/* ------------------------------------------------------------
   Resolve REAL backend root
   (Prevents Node from accidentally resolving into the stray
    C:/WingManBackend/WingManBackend/ folder.)
------------------------------------------------------------ */

const BACKEND_ROOT = "C:/WingManBackend";

// ⭐ Removed duplicate __dirname declaration
// CommonJS already provides __dirname automatically.

/* ------------------------------------------------------------
   Load Relationship Config
------------------------------------------------------------ */
async function loadRelationshipConfig(configURL) {
  if (!configURL) {
    throw new Error("loadRelationshipConfig: configURL is required");
  }

  let filePath;

  try {
    // Convert file:// URL → real path
    if (typeof configURL === "string" && configURL.startsWith("file://")) {
      filePath = new URL(configURL);
      filePath = filePath.pathname;
    } else {
      filePath = configURL;
    }

    // Force resolution inside the REAL backend root
    filePath = path.resolve(
      BACKEND_ROOT,
      "BlackBox/relationship/relationship.config.json"
    );

    // Read JSON
    const jsonText = await fs.readFile(filePath, "utf8");
    const rawModules = JSON.parse(jsonText);

    // Build relationship model
    return loadRelationshipModel(rawModules);

  } catch (err) {
    console.error("Failed to load relationship config:", err);
    throw new Error("Could not load relationship configuration file");
  }
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  loadRelationshipConfig
};
