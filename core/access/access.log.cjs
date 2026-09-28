/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/access/access.log.cjs
   Alias: @backend-core/access/access.log.cjs
   Role: Provides logging utilities for access-related events, including
         permission checks, rule evaluations, and access violations.

   Dependencies:
     - ./access.levels.cjs
     - ./access.rules.json

   Architectural Notes:
     - Must never log sensitive or personal data.
     - Logs must be structured and machine-readable.
     - Should integrate with core/state.cjs for session context.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] access.log.cjs loaded");

export function logAccessEvent(type, payload = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[ACCESS] ${timestamp} ${type}`, payload);
}
