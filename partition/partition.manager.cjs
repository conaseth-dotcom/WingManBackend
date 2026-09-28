/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/partition/partition.manager.cjs
   Alias: @backend/partition.manager.cjs

   Role: Partition lifecycle manager — now fully implemented.

   Responsibilities:
     - Mount partition root deterministically
     - Ensure root folder exists
     - Ensure metadata file exists (new location: metaData/runtime)
     - Validate partition health
     - Measure usage
     - Resize partition (metadata + enforcement)
     - Provide safe backend APIs for IPC
     - Provide full filesystem API (write/read/delete/list/move/copy)
     - Integrate Advocacy Engine for feasibility checks
========================================================================= */

const fs = require("fs");
const path = require("path");

console.log(">>> [WM-FILE-LOAD] partition.manager.cjs loaded");

/* ------------------------------------------------------------
   Filesystem subsystem
------------------------------------------------------------ */
const { writeFile } = require("./fs/fs.writeFile.cjs");
const { readFile } = require("./fs/fs.readFile.cjs");
const { deleteFile } = require("./fs/fs.deleteFile.cjs");
const { listDirectory } = require("./fs/fs.listDirectory.cjs");
const { ensureFolder } = require("./fs/fs.ensureFolder.cjs");
const { moveFile } = require("./fs/fs.moveFile.cjs");
const { copyFile } = require("./fs/fs.copyFile.cjs");

const { Paths } = require("./paths/paths.cjs");
const { loadJSON, saveJSON } = require("./api/storage.cjs");

// Advocacy Engine
const AdvocacyEngine = require("C:/WingManBackend/BlackBox/core/aiAdvocacy/advocacy.engine.cjs");

module.exports = {
  /* ------------------------------------------------------------
     INIT — called once at backend startup
  ------------------------------------------------------------ */
  init({ logger, systemSettings }) {
    try {
      const { partitionRoot, partitionSizeMB, version } = systemSettings;

      this.root = partitionRoot;
      this.sizeMB = partitionSizeMB;
      this.version = version;

      this.ensureRoot(logger);
      this.ensureMetadata(logger);

      logger.info(
        `[Partition] Mounted at ${partitionRoot} (${partitionSizeMB} MB)`
      );

      return {
        root: partitionRoot,
        sizeMB: partitionSizeMB,
        metaPath: this.getMetaPath()
      };
    } catch (err) {
      logger.error("[Partition] Manager init failed", { err: err.message });
      return false;
    }
  },

  shutdown() {
    return true;
  },

  /* ------------------------------------------------------------
     Helpers
  ------------------------------------------------------------ */
  getMetaPath() {
    return Paths.getPartitionMetaFile(); // NEW LOCATION
  },

  ensureRoot(logger) {
    if (!fs.existsSync(this.root)) {
      logger?.info?.(`[Partition] Root missing — creating: ${this.root}`);
      fs.mkdirSync(this.root, { recursive: true });
    }

    // Ensure new metadata structure exists
    Paths.ensureDir(Paths.getMetaDataRoot());
    Paths.ensureDir(Paths.getRuntimeRoot());
  },

  ensureMetadata(logger) {
    const metaPath = this.getMetaPath();

    if (!fs.existsSync(metaPath)) {
      logger?.info?.("[Partition] Metadata missing — creating default metadata");

      const meta = {
        version: this.version,
        sizeMB: this.sizeMB,
        createdAt: new Date().toISOString()
      };

      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }
  },

  loadMetadata() {
    const metaPath = this.getMetaPath();
    try {
      return JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch (err) {
      return null;
    }
  },

  saveMetadata(meta) {
    const metaPath = this.getMetaPath();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  },

  /* ------------------------------------------------------------
     VALIDATE — ensure partition is healthy
  ------------------------------------------------------------ */
  validate() {
    const errors = [];

    if (!this.root) {
      errors.push("Partition root not set.");
    }

    if (!fs.existsSync(this.root)) {
      errors.push("Partition root does not exist.");
    }

    const meta = this.loadMetadata();
    if (!meta) {
      errors.push("Metadata file is missing or unreadable.");
    } else {
      if (!meta.sizeMB || meta.sizeMB <= 0) {
        errors.push("Metadata sizeMB is invalid.");
      }
      if (!meta.version) {
        errors.push("Metadata version is missing.");
      }
    }

    return {
      ok: errors.length === 0,
      errors
    };
  },

  /* ------------------------------------------------------------
     USAGE — calculate total MB used inside partition
  ------------------------------------------------------------ */
  getUsage() {
    const walk = (dir) => {
      let total = 0;
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);

        if (stat.isDirectory()) {
          total += walk(full);
        } else {
          total += stat.size;
        }
      }

      return total;
    };

    const bytes = walk(this.root);
    const mb = Math.round(bytes / (1024 * 1024));

    return mb;
  },

  /* ------------------------------------------------------------
     RESIZE — update metadata + enforce size limit
     Now includes Advocacy Engine feasibility checks
  ------------------------------------------------------------ */
  resize(newSizeMB) {
    // Advocacy check
    const usageMB = this.getUsage();
    const availableMB = this.sizeMB - usageMB;

    const { feasibility, explanation } = AdvocacyEngine.checkAndAdvocate({
      storageUsageMB: usageMB,
      storageAvailableMB: availableMB,
      taskRequirements: { minStorageMB: newSizeMB }
    });

    if (!feasibility.feasible) {
      return {
        ok: false,
        error: explanation.message,
        suggestExpansion: explanation.suggestExpansion
      };
    }

    // Normal resize logic
    if (!newSizeMB || newSizeMB <= 0) {
      return { ok: false, error: "Invalid sizeMB" };
    }

    const meta = this.loadMetadata();
    if (!meta) {
      return { ok: false, error: "Metadata missing" };
    }

    meta.sizeMB = newSizeMB;
    this.saveMetadata(meta);

    this.sizeMB = newSizeMB;

    return {
      ok: true,
      sizeMB: newSizeMB,
      message: `Partition resized to ${newSizeMB} MB`
    };
  },

  /* ------------------------------------------------------------
     JSON OBJECT HELPERS (existing behavior)
  ------------------------------------------------------------ */
  loadPartitionObject(id, base) {
    const file = Paths.getPartitionFile(id);
    const data = loadJSON(file, base);
    return { ok: true, data };
  },

  savePartitionObject(id, data) {
    const file = Paths.getPartitionFile(id);
    saveJSON(file, data);
    return { ok: true };
  },

  /* ------------------------------------------------------------
     FILESYSTEM API (new)
  ------------------------------------------------------------ */
  writeFileToPartition(relativePath, data, options) {
    return writeFile(relativePath, data, options);
  },

  readFileFromPartition(relativePath, options) {
    return readFile(relativePath, options);
  },

  deleteFileFromPartition(relativePath) {
    return deleteFile(relativePath);
  },

  listPartitionDirectory(relativePath) {
    return listDirectory(relativePath);
  },

  ensurePartitionFolder(relativePath) {
    return ensureFolder(relativePath);
  },

  movePartitionFile(srcRelative, destRelative) {
    return moveFile(srcRelative, destRelative);
  },

  copyPartitionFile(srcRelative, destRelative) {
    return copyFile(srcRelative, destRelative);
  }
};
