/* ========================================================================
   WingMan Backend — Partition Review (Deterministic Lazy Mode)
   Path: C:/WingManBackend/partition/api/partition.review.cjs

   Role: SAFE Review Engine (Lazy-Loading)
         - No filesystem access at startup
         - No diffing or scanning partitions
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

function diffPartitions(sourceRoot, targetRoot) {
  return {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
    reason: "Partition diff skipped (lazy mode)."
  };
}

function runFullReview() {
  return {
    aiToShared: diffPartitions(AI_ROOT, SHARED_ROOT),
    sharedToUser: diffPartitions(SHARED_ROOT, USER_ROOT),
    reason: "Full review skipped (lazy mode)."
  };
}

/* ------------------------------------------------------------
   Public API
------------------------------------------------------------ */
module.exports = {
  diffPartitions,
  runFullReview,
  PartitionReview: {
    diffPartitions,
    runFullReview
  }
};
