// ============================================================================
// WingMan AI Sandbox
// Path: ai/sandbox/ai.sandbox.cjs
//
// Role:
// - Builds the AI identity bundle
// - Builds the unified AI runtime
// - Exposes that runtime to the AI context pipeline
// - Provides a controlled interface for Partition paths
//
// Important:
// Real Partition paths are NOT invented here.
// Until the active Partition is supplied by the WingMan session/startup
// pipeline, filesystem-dependent operations fail explicitly.
// ============================================================================

console.log(">>> [WM-FILE-LOAD] ai/sandbox/ai.sandbox.cjs loaded");

const { loadAIIdentity } = require("../ai.identity.cjs");
const { buildAIRuntime } = require("../ai.runtime.cjs");


// ============================================================================
// PARTITION RESOLUTION
// ============================================================================

function resolvePartitionPaths(session) {
  if (!session || typeof session !== "object") {
    return {
      user: null,
      shared: null
    };
  }

  // These locations are intentionally conservative.
  // We will connect the authoritative launcher/backend Partition handoff
  // after that pipeline has been traced and repaired.
  const sessionPartitions =
    session.partitions && typeof session.partitions === "object"
      ? session.partitions
      : {};

  return {
    user:
      sessionPartitions.user ??
      session.activePartitionPath ??
      null,

    shared:
      sessionPartitions.shared ??
      null
  };
}


// ============================================================================
// PATH GUARD
// ============================================================================

function requirePartitionPath(partitionPath, partitionName) {
  if (
    typeof partitionPath !== "string" ||
    !partitionPath.trim()
  ) {
    throw new Error(
      `[AI Sandbox] ${partitionName} Partition path is not available. ` +
      "The active Partition has not yet been supplied to this AI session."
    );
  }

  return partitionPath;
}


// ============================================================================
// CREATE AI SANDBOX
// ============================================================================

async function createAISandbox(session) {
  if (!session || typeof session !== "object") {
    throw new Error(
      "[AI Sandbox] A valid AI session is required."
    );
  }

  // --------------------------------------------------------------------------
  // 1. Build the unified identity bundle.
  // --------------------------------------------------------------------------

  const identityBundle = await loadAIIdentity();

  if (!identityBundle) {
    throw new Error(
      "[AI Sandbox] AI identity could not be loaded."
    );
  }


  // --------------------------------------------------------------------------
  // 2. Build the unified AI runtime from that identity.
  // --------------------------------------------------------------------------

  const runtime = buildAIRuntime(identityBundle);

  if (!runtime) {
    throw new Error(
      "[AI Sandbox] AI runtime could not be built."
    );
  }


  // --------------------------------------------------------------------------
  // 3. Resolve any Partition information already attached to the session.
  //
  // Do NOT invent paths here.
  // --------------------------------------------------------------------------

  const partitionPaths =
    resolvePartitionPaths(session);


  // --------------------------------------------------------------------------
  // 4. Return the authoritative sandbox interface.
  // --------------------------------------------------------------------------

  return {
    runtime,


    // ========================================================================
    // SAFE PARTITION METADATA
    // ========================================================================

    getPartitionPaths() {
      return {
        user: partitionPaths.user,
        shared: partitionPaths.shared
      };
    },


    // ========================================================================
    // FILESYSTEM ACCESS
    //
    // These methods intentionally fail if the startup/session pipeline has
    // not supplied a real authorized Partition.
    // ========================================================================

    getUserPartitionRoot() {
      return requirePartitionPath(
        partitionPaths.user,
        "User"
      );
    },


    getSharedPartitionRoot() {
      return requirePartitionPath(
        partitionPaths.shared,
        "Shared"
      );
    },


    // ========================================================================
    // STATUS
    // ========================================================================

    getStatus() {
      return {
        runtimeReady: true,

        userPartitionAvailable:
          typeof partitionPaths.user === "string" &&
          partitionPaths.user.trim().length > 0,

        sharedPartitionAvailable:
          typeof partitionPaths.shared === "string" &&
          partitionPaths.shared.trim().length > 0
      };
    }
  };
}


// ============================================================================
// COMPATIBILITY HELPERS
//
// Keep these temporarily because older WingMan modules may still reference
// these APIs while the pipeline is being reconstructed.
// ============================================================================

async function runPipelineSandbox(input) {
  return {
    ok: true,
    input,
    note:
      "Legacy sandbox pipeline helper retained temporarily during reconstruction."
  };
}


async function buildContextSandbox(options) {
  return {
    ok: true,
    options,
    context: {},
    note:
      "Legacy sandbox context helper retained temporarily during reconstruction."
  };
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  createAISandbox,
  runPipelineSandbox,
  buildContextSandbox
};