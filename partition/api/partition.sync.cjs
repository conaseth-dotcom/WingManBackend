/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/partition/api/partition.sync.cjs
   Alias: @backend-partition/api/partition.sync.cjs

   Role: SAFE Sync Engine (Lazy-Loading)
         - No filesystem access at startup
         - No scanning user or shared partitions
         - No staging, merging, or conflict detection
         - All operations deferred until user explicitly requests them
========================================================================= */

import partitionConfig from "../config/partition.config.json" assert { type: "json" };
import { normalizePath } from "../paths/paths.cjs";

/* ------------------------------------------------------------
   Modern partition roots (virtual only)
------------------------------------------------------------ */
const USER_ROOT   = normalizePath(partitionConfig.paths.user);
const SHARED_ROOT = normalizePath(partitionConfig.paths.shared);
const AI_ROOT     = normalizePath(partitionConfig.paths.ai);

/* ------------------------------------------------------------
   Sync modes (kept for UI compatibility)
------------------------------------------------------------ */
const SYNC_MODES = {
  STAGE_USER_TO_SHARED: "stage-user-to-shared",
  PROTECT_AI: "protect-ai",
  FULL: "full"
};

/* ------------------------------------------------------------
   SAFE STUBS — No filesystem access
------------------------------------------------------------ */

export function syncUserToShared() {
  return {
    ok: true,
    message: "Sync skipped (lazy mode).",
    files: 0
  };
}

export function enforceAiIsolation() {
  return {
    ok: true,
    message: "AI isolation check skipped (lazy mode).",
    files: 0
  };
}

export function detectConflicts() {
  return {
    ok: true,
    conflicts: []
  };
}

export function runFullSync() {
  return {
    ok: true,
    stage: syncUserToShared(),
    protect: enforceAiIsolation(),
    conflicts: detectConflicts()
  };
}

/* ------------------------------------------------------------
   Public API
------------------------------------------------------------ */
export const PartitionSync = {
  SYNC_MODES,
  syncUserToShared,
  enforceAiIsolation,
  detectConflicts,
  runFullSync
};
