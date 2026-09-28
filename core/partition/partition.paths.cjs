// C:\WingManBackend\core\partition\partition.paths.cjs

'use strict';

const path = require('path');

/**
 * Partition path resolver.
 * Provides canonical paths for all partition directories.
 */

function resolvePartitionRoot(root) {
  return root || process.env.WINGMAN_PARTITION;
}

function partitionDir(root) {
  return resolvePartitionRoot(root);
}

function metaDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData');
}

function systemDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData', 'system');
}

function systemLogsDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData', 'system', 'logs');
}

function systemErrorsDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData', 'system', 'errors');
}

function dataDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData', 'data');
}

function overlayDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData', 'overlay');
}

function runtimeDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData', 'runtime');
}

function settingsDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData', 'settings');
}

function sharedDir(root) {
  return path.join(resolvePartitionRoot(root), 'metaData', 'shared');
}

module.exports = {
  resolvePartitionRoot,
  partitionDir,
  metaDir,
  systemDir,
  systemLogsDir,
  systemErrorsDir,
  dataDir,
  overlayDir,
  runtimeDir,
  settingsDir,
  sharedDir
};
