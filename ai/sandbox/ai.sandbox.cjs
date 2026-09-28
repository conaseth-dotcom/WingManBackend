// ============================================================================
// AI Sandbox (Full Minimal Stub)
// ----------------------------------------------------------------------------
// This file satisfies all required sandbox APIs used by:
//   - ai.pipeline.cjs
//   - ai.context.builder.cjs
//   - ai.identity.cjs
//   - ai.memory.loader.cjs
//
// It provides safe no-op implementations so the AI stack can boot normally.
// You can expand this later when you add real sandbox behavior.
// ============================================================================

const path = require("path");

// Fake partition roots (safe, non-filesystem)
const SHARED_ROOT = "sandbox://shared";
const USER_ROOT   = "sandbox://user";

module.exports = {
  // Called by ai.pipeline.cjs
  async runPipelineSandbox(input) {
    return {
      ok: true,
      input,
      note: "Sandbox pipeline executed (stub)."
    };
  },

  // Called by ai.context.builder.cjs
  async buildContextSandbox(options) {
    return {
      ok: true,
      options,
      context: {},
      note: "Sandbox context builder executed (stub)."
    };
  },

  // Required by ai.pipeline.cjs → placeFile()
  getSharedPartitionRoot() {
    return SHARED_ROOT;
  },

  getUserPartitionRoot() {
    return USER_ROOT;
  },

  // Required by identity + memory loaders
  getPartitionPaths() {
    return {
      shared: SHARED_ROOT,
      user: USER_ROOT
    };
  },

  // Required by ai.pipeline.cjs → createAISandbox()
  async createAISandbox(session) {
    return {
      getSharedPartitionRoot: () => SHARED_ROOT,
      getUserPartitionRoot: () => USER_ROOT,
      getPartitionPaths: () => ({
        shared: SHARED_ROOT,
        user: USER_ROOT
      })
    };
  }
};
