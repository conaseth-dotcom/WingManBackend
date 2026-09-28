// partition/partition.ipc.cjs — clean backend IPC for Partition FS + Recycle Bin
console.log("[PartitionIPC] ACTIVE FILE:", import.meta.url);

const PartitionManager = require("./partition.manager.cjs");

module.exports = {
  /* ------------------------------------------------------------
     Filesystem operations
  ------------------------------------------------------------ */
  handleEnsureFolder(_event, relativePath) {
    return PartitionManager.ensurePartitionFolder(relativePath);
  },

  handleWriteFile(_event, { path, data, options }) {
    return PartitionManager.writeFileToPartition(path, data, options);
  },

  handleReadFile(_event, { path, options }) {
    return PartitionManager.readFileFromPartition(path, options);
  },

  handleDeleteFile(_event, path) {
    return PartitionManager.deleteFileFromPartition(path);
  },

  handleListDirectory(_event, path) {
    return PartitionManager.listPartitionDirectory(path);
  },

  handleMoveFile(_event, { src, dest }) {
    return PartitionManager.movePartitionFile(src, dest);
  },

  handleCopyFile(_event, { src, dest }) {
    return PartitionManager.copyPartitionFile(src, dest);
  },

  /* ------------------------------------------------------------
     RECYCLE BIN OPERATIONS
     Shared AI/User recycle bin at:
     /projects/recycle_bin
  ------------------------------------------------------------ */

  // AI + User: move file into recycle bin
  handleRecycleFile(_event, { relativePath, deletedBy }) {
    return PartitionManager.recycle.moveToRecycle(relativePath, deletedBy);
  },

  // User + AI (with approval): restore file from recycle bin
  handleRestoreRecycleItem(_event, { itemId }) {
    return PartitionManager.recycle.restoreFromRecycle(itemId);
  },

  // User only: permanently delete item
  handlePermanentlyDeleteRecycleItem(_event, { itemId }) {
    return PartitionManager.recycle.permanentlyDelete(itemId);
  },

  // AI + User: list recycle bin contents
  handleListRecycleBin(_event) {
    return PartitionManager.recycle.listRecycle();
  },

  // User only: empty recycle bin
  handleEmptyRecycleBin(_event) {
    return PartitionManager.recycle.emptyRecycle();
  }
};
