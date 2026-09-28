// C:\WingManBackend\ai\sandbox.cjs
/* ========================================================================
   WingMan Backend File

   Alias: @backend-ai/ai.sandbox.cjs
   Role: Secure sandbox environment for AI execution. Restricts access,
         enforces safety boundaries, and isolates runtime operations.

   Architectural Notes:
     - Sandbox must remain isolated from filesystem and network.
     - Partition API provides controlled access to user/shared storage.
========================================================================= */

import { PartitionPaths } from "../partition/api/partition.paths.cjs";
import { PartitionReview } from "../partition/api/partition.review.cjs";
import { PartitionMerge } from "../partition/api/partition.merge.cjs";

// ---------------------------------------------------------------------------
// Sandbox Builder
// ---------------------------------------------------------------------------
export async function createAISandbox(session) {
  const runtime = await buildAIRuntime(session);

  const sandbox = {
    runtime,

    getPartitions() {
      return { ...runtime.session.partitions };
    },

    // Safety: AI never sees real filesystem paths directly
    getUserPartitionRoot() {
      return PartitionPaths.userRoot();
    },

    getSharedPartitionRoot() {
      return PartitionPaths.sharedRoot();
    },

    // Diff & review helpers
    diffSharedAndUser() {
      return PartitionReview.diff();
    },

    // Merge helpers (still require human approval at higher level)
    mergeSelected(relativePaths, options = {}) {
      return PartitionMerge.mergeSelectedFiles(relativePaths, options);
    },

    mergeAllChanges(options = {}) {
      return PartitionMerge.mergeAllChanges(options);
    }
  };

  return sandbox;
}

export default { createAISandbox };

// ============================================================================
// End of File
// ============================================================================