/* ========================================================================
   WingMan Backend File
   Path: C:\WingManBackend\BlackBox\relationship\runtime\relationship.legacy.cjs
   Alias: @backend-blackbox/relationship/runtime/relationship.legacy.cjs
   Role: Provides compatibility utilities for older WingMan relationship
         formats. Converts legacy structures into validatedical modern format.

   Dependencies:
     - ./relationship.loader.cjs

   Architectural Notes:
     - Must remain isolated from main runtime logic.
     - Must never override validatedical structures.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] relationship.legacy.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const { loadRelationshipSystem } = require("./relationship.loader.cjs");

// ---------------------------------------------------------------------------
// Load legacy relationship system
// ---------------------------------------------------------------------------
module.exports = loadRelationshipSystem();
