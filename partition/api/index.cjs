/* ========================================================================
   WingMan Partition API — MVP-SAFE Index
   Path: C:/WingManBackend/partition/api/index.cjs
   Role:
     Minimal export surface for MVP.
     Only exposes FS, Paths, Errors, Logger.
========================================================================= */

// Core FS + Paths
const PartitionFS = require("./partition.fs.cjs");
const PartitionPaths = require("./partition.paths.cjs");

// Logging + Errors
const PartitionLogger = require("./partition.logger.cjs");
const PartitionErrors = require("./partition.errors.cjs");

// Export surface (MVP only)
module.exports = {
  PartitionFS,
  PartitionPaths,
  PartitionLogger,
  PartitionErrors
};
