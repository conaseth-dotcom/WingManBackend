/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/runtime/bootstrap-relationship.cjs
   Alias: @backend-blackbox/relationship/runtime/bootstrap-relationship.cjs
   Role: Bootstraps the full relationship runtime. Loads core files, applies
         normalizers, resolves aliases, and initializes the relationship model.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] bootstrap-relationship.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS import (converted from ESM)
// ---------------------------------------------------------------------------
const { relationshipContext } = require("./relationship.context.cjs");

// ---------------------------------------------------------------------------
// Bootstrap function
// ---------------------------------------------------------------------------
async function bootstrapRelationship() {
  const configPath = "../relationship/relationship.config.json";

  try {
    console.log("[WingMan] Loading relationship model...");
    await relationshipContext.initialize(configPath);

    console.log("[WingMan] Relationship model loaded successfully.");
    console.log("[WingMan] Safety mode:", relationshipContext.getSafetyMode());
  } catch (err) {
    console.error("[WingMan] Failed to bootstrap relationship model:", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  bootstrapRelationship
};
