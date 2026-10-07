// /partition/paths/paths.cjs
// WingMan Path + Filesystem Utilities — Final Partition Layout
//
// Root structure:
//   <partitionRoot>/projects
//   <partitionRoot>/metaData
//
// Inside metaData:
//   ai/
//   data/
//   overlay/
//   runtime/
//       partition.meta.json
//       user.runtime.settings.json
//   settings/
//       user/
//           user-settings.json
//           test.json
//       ai/
//   system/
//       logs/
//       errors/
//   shared/
//
// Inside projects:
//   <partitionRoot>/projects/ai/<projectName>/...

const fs = require("fs");
const path = require("path");

function normalizePath(p) {
  if (!p) return "";
  return path.resolve(p).replace(/\\/g, "/").replace(/\/+$/, "");
}

// ------------------------------------------------------------
// Load Settings (dynamic partition root)
// ------------------------------------------------------------
// ------------------------------------------------------------
// Load Settings (dynamic partition root)
// ------------------------------------------------------------
function loadSettings() {
  try {
    // Prefer launcher-provided settings file if present
    const settingsPath =
      process.env.WINGMAN_SETTINGS_PATH ||
      path.join(process.cwd(), "settings", "settings.json");

    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, "utf8");
      return JSON.parse(raw);
    }

    return {}; // safe fallback
  } catch {
    return {}; // safe fallback
  }
}

const settings = loadSettings();

// ------------------------------------------------------------
// Partition Root Resolution (NO absolute paths)
// ------------------------------------------------------------

// Launcher always sets this when spawning backend
const envRoot = process.env.WINGMAN_PARTITION_ROOT;

// If settings.json contains a partitionRoot, use it
const settingsRoot = settings.partitionRoot;

// Final fallback if nothing else is available
const DEFAULT_ROOT = path.join(process.cwd(), "WingManPartition");

// Final resolved root
const PARTITION_ROOT = normalizePath(
  envRoot ??
  settingsRoot ??
  DEFAULT_ROOT
);


// ------------------------------------------------------------
// Core roots
// ------------------------------------------------------------

function getPartitionRoot() {
  return PARTITION_ROOT;
}

function getProjectsRoot() {
  return normalizePath(`${PARTITION_ROOT}/projects`);
}

function getMetaDataRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData`);
}

// ------------------------------------------------------------
// Runtime metadata
// ------------------------------------------------------------

function getRuntimeRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/runtime`);
}

function getPartitionMetaFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/runtime/partition.meta.json`);
}

function getUserRuntimeSettingsFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/runtime/user.runtime.settings.json`);
}

// ------------------------------------------------------------
// AI metadata
// ------------------------------------------------------------

function getAiRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai`);
}

function getAiRuntimeFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/aiRuntime.json`);
}

function getAiContextFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/aiContext.json`);
}

function getAiIdentityFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/aiIdentity.json`);
}

function getAiMemoryFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/aiMemory.json`);
}

function getAiPersonalityFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/aiPersonality.json`);
}

function getAiPipelineFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/aiPipeline.json`);
}

function getAiPreferencesFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/aiPreferences.json`);
}

function getUserHistoryRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/user history`);
}

function getUserHistoryFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/user history/user history.json`);
}

function getUserAiRelationshipRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/user-AI relationship`);
}

function getUserAiRelationshipFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/ai/user-AI relationship/user-AI relationship.json`);
}

// ------------------------------------------------------------
// Settings metadata
// ------------------------------------------------------------

function getSettingsRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/settings`);
}

function getUserSettingsRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/settings/user`);
}

function getUserSettingsFile() {
  return normalizePath(`${PARTITION_ROOT}/metaData/settings/user/user-settings.json`);
}

function getAiSettingsRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/settings/ai`);
}

// ------------------------------------------------------------
// System metadata
// ------------------------------------------------------------

function getSystemRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/system`);
}

function getSystemLogsRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/system/logs`);
}

function getSystemErrorsRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/system/errors`);
}

// ------------------------------------------------------------
// Shared / overlay / data
// ------------------------------------------------------------

function getSharedRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/shared`);
}

function getOverlayRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/overlay`);
}

function getDataRoot() {
  return normalizePath(`${PARTITION_ROOT}/metaData/data`);
}

// ------------------------------------------------------------
// Project‑scoped AI workspace
//   <partitionRoot>/projects/ai/<projectName>/...
// ------------------------------------------------------------

function getProjectsAiRoot() {
  return normalizePath(`${PARTITION_ROOT}/projects/ai`);
}

function getProjectAiFolder(projectName) {
  return normalizePath(`${PARTITION_ROOT}/projects/ai/${projectName}`);
}

// ------------------------------------------------------------
// Primary export bundle
// ------------------------------------------------------------
const Paths = {
  normalizePath,
  ensureDir,
  copyFileSafe,
  listFilesRecursive,

  getPartitionRoot,
  getProjectsRoot,
  getMetaDataRoot,

  getRuntimeRoot,
  getPartitionMetaFile,
  getUserRuntimeSettingsFile,

  getAiRoot,
  getAiRuntimeFile,
  getAiContextFile,
  getAiIdentityFile,
  getAiMemoryFile,
  getAiPersonalityFile,
  getAiPipelineFile,
  getAiPreferencesFile,
  getUserHistoryRoot,
  getUserHistoryFile,
  getUserAiRelationshipRoot,
  getUserAiRelationshipFile,

  getSettingsRoot,
  getUserSettingsRoot,
  getUserSettingsFile,
  getAiSettingsRoot,

  getSystemRoot,
  getSystemLogsRoot,
  getSystemErrorsRoot,

  getSharedRoot,
  getOverlayRoot,
  getDataRoot,

  getProjectsAiRoot,
  getProjectAiFolder,
};

module.exports = {
  normalizePath,
  ensureDir,
  copyFileSafe,
  listFilesRecursive,

  getPartitionRoot,
  getProjectsRoot,
  getMetaDataRoot,

  getRuntimeRoot,
  getPartitionMetaFile,
  getUserRuntimeSettingsFile,

  getAiRoot,
  getAiRuntimeFile,
  getAiContextFile,
  getAiIdentityFile,
  getAiMemoryFile,
  getAiPersonalityFile,
  getAiPipelineFile,
  getAiPreferencesFile,
  getUserHistoryRoot,
  getUserHistoryFile,
  getUserAiRelationshipRoot,
  getUserAiRelationshipFile,

  getSettingsRoot,
  getUserSettingsRoot,
  getUserSettingsFile,
  getAiSettingsRoot,

  getSystemRoot,
  getSystemLogsRoot,
  getSystemErrorsRoot,

  getSharedRoot,
  getOverlayRoot,
  getDataRoot,

  getProjectsAiRoot,
  getProjectAiFolder,

  Paths,
  PartitionPaths: Paths
};
