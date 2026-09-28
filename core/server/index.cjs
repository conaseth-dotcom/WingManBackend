/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/server/index.cjs
   Alias: @backend-core/server/index.cjs
   Role: Entry point for the Server subsystem. Re-exports server.cjs and
         route initialization utilities for use by core.startup.cjs.

   Dependencies:
     - ./server.cjs
     - ./routes

   Architectural Notes:
     - Must remain a pure export surface.
     - Must not initialize the server directly.
     - Used by core.startup.cjs to bootstrap the backend runtime.
========================================================================= */

export { startServer } from "./server.cjs";
export { stopServer } from "./server.cjs";
export { restartServer } from "./server.cjs";
