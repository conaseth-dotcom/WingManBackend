/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/partition/index.cjs
   Alias: @backend-core/partition/index.cjs
   Role: Entry point for the Partition subsystem. Provides the export
         surface for partition configuration, API, and runtime utilities.

   Dependencies:
     - ./partition.config.json
     - ./partition.api.cjs
     - ./partition.manager.cjs

   Architectural Notes:
     - Must remain a pure export surface.
     - Must not perform initialization or side effects.
     - Used by core.startup.cjs to mount the WingManPartition runtime.
========================================================================= */

export * from "./api/index.cjs";
export * from "./config/index.cjs";
export * from "./legacy/index.cjs";
