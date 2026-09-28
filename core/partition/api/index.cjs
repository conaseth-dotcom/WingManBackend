/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/partition/api/index.cjs
   Alias: @backend-core/partition/api/index.cjs
   Role: Entry point for the Partition API subsystem. Re-exports sandbox,
         trays, versioning, and related partition utilities.

   Dependencies:
     - ./sandbox.cjs
     - ./trays.cjs
     - ./versioning.cjs

   Architectural Notes:
     - Must remain a pure export surface.
     - Must not perform initialization or side effects.
     - Used by core/partition/index.cjs to expose the full API surface.
========================================================================= */

export * from "./trays.cjs";
export * from "./sandbox.cjs";
export * from "./versioning.cjs";
