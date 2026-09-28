/* ========================================================================
   WingMan Backend — Partition Merge (Deterministic Lazy Mode)
   Path: C:/WingManBackend/partition/api/partition.merge.cjs

   Role: SAFE Merge Engine (Lazy-Loading)
         - No filesystem access at startup
         - No diffing, promoting, or deleting files
         - All operations deferred until user explicitly requests them
========================================================================= */

const { PartitionPaths } = require("./partition.paths.cjs");

/* ------------------------------------------------------------
   Deterministic partition roots (metadata only)
------------------------------------------------------------ */
const USER_ROOT   = PartitionPaths.getUserRoot();
const SHARED_ROOT = PartitionPaths.getSharedRoot();
const AI_ROOT     = PartitionPaths.getAiRoot();

/* ------------------------------------------------------------
   SAFE STUBS — No filesystem access
------------------------------------------------------------ */

function promoteFile(relPath, sourceRoot, targetRoot, options = {}) {
  return {
    status: "skipped",
    relPath,
    reason: "Merge skipped (lazy mode)."
  };
}

function applyDiff(diff, sourceRoot, targetRoot, options = {}) {
  return {
    promoted: [],
    skipped: [],
    removed: [],
    errors: [],
    reason: "Diff application skipped (lazy mode)."
  };
}

function mergeSharedToUser(options = {}) {
  return {
    ok: true,
    promoted: [],
    skipped: [],
    removed: [],
    errors: [],
    reason: "Shared → User merge skipped (lazy mode)."
  };
}

function mergeAiToShared(options = {}) {
  return {
    ok: true,
    promoted: [],
    skipped: [],
    removed: [],
    errors: [],
    reason: "AI → Shared merge skipped (lazy mode)."
  };
}

function runFullMerge(options = {}) {
  return {
    ok: true,
    aiToShared: mergeAiToShared(options),
    sharedToUser: mergeSharedToUser(options),
    reason: "Full merge skipped (lazy mode)."
  };
}

/* ------------------------------------------------------------
   Public API
------------------------------------------------------------ */
module.exports = {
  promoteFile,
  applyDiff,
  mergeSharedToUser,
  mergeAiToShared,
  runFullMerge,
  PartitionMerge: {
    promoteFile,
    applyDiff,
    mergeSharedToUser,
    mergeAiToShared,
    runFullMerge
  }
};
