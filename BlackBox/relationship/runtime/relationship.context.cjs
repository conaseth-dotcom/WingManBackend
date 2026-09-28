/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/BlackBox/relationship/runtime/relationship.context.cjs
   Alias: @backend-blackbox/relationship/runtime/relationship.context.cjs
   Role: Holds the active relationship model in memory. Provides accessors for
         mood, profile, communication, collaboration, flow, memory, and ethics.

   Dependencies:
     - ./relationship.loader.cjs

   Architectural Notes:
     - Must expose safe getters; never expose raw internal structures.
     - Must enforce priority hierarchy on all lookups.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] relationship.context.cjs loaded");

// ---------------------------------------------------------------------------
// CommonJS imports (converted from ESM)
// ---------------------------------------------------------------------------
const { loadRelationshipConfig } = require("./relationship.loader.cjs");

class RelationshipContext {
  constructor() {
    this.relationship = null;
    this.loaded = false;
    this.error = null;
  }

  async initialize(configPath) {
    try {
      this.relationship = await loadRelationshipConfig(configPath);
      this.loaded = true;
      this.error = null;
    } catch (err) {
      console.error("RelationshipContext initialization failed:", err);
      this.relationship = null;
      this.loaded = false;
      this.error = err;
      throw err;
    }
  }

  isLoaded() {
    return this.loaded === true && !!this.relationship;
  }

  getModel() {
    if (!this.isLoaded()) {
      throw new Error("RelationshipContext: relationship model not loaded");
    }
    return this.relationship;
  }

  getRuntime() {
    if (!this.isLoaded()) {
      throw new Error("RelationshipContext: relationship model not loaded");
    }
    return this.relationship.runtime;
  }

  getSafetyMode() {
    if (!this.isLoaded()) return "standard";
    return this.relationship.meta?.safety_mode ?? "standard";
  }

  getTone() {
    return this.getRuntime().getTone();
  }

  getWorkStyle() {
    return this.getRuntime().getWorkStyle();
  }

  getInitializationBehavior() {
    return this.getRuntime().getInitializationBehavior();
  }

  getOnboardingDisclosures() {
    return this.getRuntime().getOnboardingDisclosures();
  }
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  relationshipContext: new RelationshipContext()
};
