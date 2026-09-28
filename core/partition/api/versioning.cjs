/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/partition/api/versioning.cjs
   Alias: @backend-core/partition/api/versioning.cjs
   Role: Provides versioning utilities for WingManPartition data, including
         snapshot identifiers, revision tracking, and compatibility checks.

   Dependencies:
     - ../../state.cjs
     - ./sandbox.cjs

   Architectural Notes:
     - Must ensure version identifiers are deterministic.
     - Must not modify application-level versioning metadata.
     - Used by trays.cjs and other partition APIs for safe data evolution.
========================================================================= */

export function getCurrentVersion() {
  return "0.0.1-dev";
}
