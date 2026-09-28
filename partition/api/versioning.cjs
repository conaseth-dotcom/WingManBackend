/* ========================================================================
   WingMan Backend File
   Path: C:/WingMan/projects/Electron/WingManBackend/partition/api/versioning.cjs
   Alias: @backend-partition/api/versioning.cjs
   Role: Versioning utilities for sandbox metadata.
========================================================================= */

const CHECKPOINTS = {};

/* ------------------------------------------------------------
   Create a checkpoint for a sandbox project
   ------------------------------------------------------------ */
export function createCheckpoint(sandboxId, snapshot) {
  if (!CHECKPOINTS[sandboxId]) CHECKPOINTS[sandboxId] = [];

  const cp = {
    id: `${sandboxId}:cp:${CHECKPOINTS[sandboxId].length + 1}`,
    createdAt: new Date().toISOString(),
    snapshot
  };

  CHECKPOINTS[sandboxId].push(cp);
  return cp;
}

/* ------------------------------------------------------------
   List checkpoints for a sandbox project
   ------------------------------------------------------------ */
export function listCheckpoints(sandboxId) {
  return CHECKPOINTS[sandboxId] || [];
}

/* ------------------------------------------------------------
   Placeholder rollback (metadata only)
   ------------------------------------------------------------ */
export function rollback(sandboxId, checkpointId) {
  const cps = CHECKPOINTS[sandboxId];
  if (!cps) throw new Error(`No checkpoints for sandbox: ${sandboxId}`);

  const target = cps.find(c => c.id === checkpointId);
  if (!target) throw new Error(`Checkpoint not found: ${checkpointId}`);

  console.warn("rollback not yet wired to file storage; metadata only:", target);
  return target;
}

export const PartitionVersioning = {
  createCheckpoint,
  listCheckpoints,
  rollback
};
