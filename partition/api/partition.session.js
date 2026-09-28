/* ========================================================================
   WingMan Backend — Partition Session (Deterministic Mode)
   Path: C:/WingManBackend/partition/api/partition.session.cjs
========================================================================= */

const { PartitionPaths } = require("./partition.paths.cjs");

/* ---------------------------------------------------------------------------
   Lazy-load hooks (safe, minimal, future expansion)
--------------------------------------------------------------------------- */

async function loadTraysOnDemand() {
  return { trays: [], mounted: [] };
}

async function loadSandboxOnDemand() {
  return { projects: [] };
}

async function runSyncOnDemand() {
  return { ok: true, changes: [] };
}

async function runReviewOnDemand() {
  return { ok: true, report: [] };
}

async function loadMergeStateOnDemand() {
  return null;
}

/* ---------------------------------------------------------------------------
   SAFE Session Bootstrap — minimal, deterministic, no filesystem access
--------------------------------------------------------------------------- */

function init({ logger, systemSettings }) {
  const session = {
    ok: true,
    startedAt: new Date().toISOString(),

    // Partition subsystems are NOT loaded at startup
    trays: null,
    sandbox: null,
    sync: null,
    review: null,
    merge: null,

    // Deterministic virtual paths (no FS access)
    paths: {
      root: PartitionPaths.getPartitionRoot(),
      user: PartitionPaths.getUserRoot(),
      shared: PartitionPaths.getSharedRoot(),
      ai: PartitionPaths.getAiRoot(),
      system: PartitionPaths.getSystemRoot(),
      runtime: PartitionPaths.getRuntimeRoot(),
      overlay: PartitionPaths.getOverlayRoot()
    },

    // Lazy-load hooks
    loadTrays: loadTraysOnDemand,
    loadSandbox: loadSandboxOnDemand,
    runSync: runSyncOnDemand,
    runReview: runReviewOnDemand,
    loadMergeState: loadMergeStateOnDemand
  };

  logger.info("[PartitionSession] Minimal session initialised");
  return session;
}

module.exports = {
  init,
  PartitionSession: { init }
};
