// ============================================================================
// CHAPTER 1 — Imports & Constructor
// ============================================================================

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

export class TrayConductor {
  constructor() {
    this.events = new EventEmitter();
  }

  emit(phase, data = {}) {
    const payload = { phase, ...data };
    console.log("[TrayConductor] emit:", payload);
    this.events.emit("progress", payload);
  }

  // ========================================================================
  // CHAPTER 2 — Step Verifier Wrapper (Guarantees Sequential Execution)
  // ========================================================================
  async runStep(name, fn, meta) {
    console.log(`\n[${name}] START`);

    try {
      const result = await fn.call(this, meta);
      console.log(`[${name}] END — completed successfully`);
      return result;
    } catch (err) {
      console.error(`[${name}] FAIL —`, err);
      throw err;
    }
  }

  // ========================================================================
  // CHAPTER 3 — Pipeline Entry (Sequential, Verified)
  // ========================================================================
  async add(meta) {
    console.log("[TrayConductor] add() called with:", meta);

    // Ensure destPath exists (item folder inside tray folder)
    meta.destPath = path.join(meta.trayFolder, meta.filename);

    // Detect file vs directory at sourcePath
    const stats = fs.statSync(meta.sourcePath);
    meta.isFile = stats.isFile();
    meta.isDirectory = stats.isDirectory();

    await this.runStep("START", this.phaseStart, meta);

    if (meta.isFile) {
      // FILE DROP PIPELINE
      await this.runStep("COPY_FILE", this.phaseCopyFile, meta);
      await this.runStep("PERSIST", this.phasePersist, meta);
      await this.runStep("INDEX_FILE", this.phaseIndexFile, meta);
    } else {
      // FOLDER DROP PIPELINE (existing behavior)
      await this.runStep("SCAN", this.phaseScan, meta);
      await this.runStep("COPY", this.phaseCopy, meta);
      await this.runStep("VERIFY", this.phaseVerify, meta);
      await this.runStep("PERSIST", this.phasePersist, meta);
      await this.runStep("INDEX", this.phaseIndex, meta);
      await this.runStep("INTEGRITY", this.phaseIntegrity, meta);
    }

    return this.phaseComplete(meta);
  }

  // ========================================================================
  // CHAPTER 4 — PHASE: START
  // ========================================================================
  async phaseStart(meta) {
    this.emit("start", { meta });
  }

  // ========================================================================
  // CHAPTER 5 — PHASE: SCAN (Recursive, FOLDER ONLY)
  // ========================================================================
  async phaseScan(meta) {
    const rootFolder = meta?.sourcePath;

    if (!rootFolder) {
      this.emit("error", { reason: "missing-source-path" });
      throw new Error("SCAN HALT: missing sourcePath");
    }

    let fileCount = 0;
    let totalSize = 0;

    const walk = (folderPath) => {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === ".vs") continue;

        const fullPath = path.join(folderPath, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          fileCount++;
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
        }
      }
    };

    try {
      walk(rootFolder);

      meta.fileCount = fileCount;
      meta.totalSize = totalSize;

      this.emit("scan", {
        fileCount,
        totalSize,
        folderPath: rootFolder
      });

    } catch (err) {
      this.emit("error", {
        reason: "scan-failed",
        message: err.message
      });
      throw new Error("SCAN HALT: " + err.message);
    }
  }

  // ========================================================================
  // CHAPTER 6 — PHASE: COPY (Robocopy-based, FOLDER ONLY)
  // ========================================================================
  async phaseCopy(meta) {
    const srcRoot = meta?.sourcePath;
    const destRoot = meta?.destPath;

    if (!srcRoot || !destRoot) {
      this.emit("error", { reason: "missing-copy-paths" });
      throw new Error("COPY HALT: missing sourcePath or destPath");
    }

    try {
      if (!fs.existsSync(destRoot)) {
        fs.mkdirSync(destRoot, { recursive: true });
      }

      const total = meta.fileCount || 0;

      this.emit("copy-start", {
        fileCount: total,
        destFolder: destRoot
      });

      const args = [
        srcRoot,
        destRoot,
        "/E",
        "/COPY:DAT",
        "/R:0",
        "/W:0",
        "/NFL",
        "/NDL",
        "/NP"
      ];

      await new Promise((resolve, reject) => {
        const robocopy = spawn("robocopy", args, { shell: true });

        let copied = 0;

        robocopy.stdout.on("data", data => {
          const text = data.toString();

          copied++;
          const percent = total > 0
            ? Math.min(100, Math.round((copied / total) * 100))
            : 0;

          this.emit("copy-progress", {
            copied,
            total,
            percent,
            message: text.trim()
          });
        });

        robocopy.stderr.on("data", data => {
          console.error("Robocopy error:", data.toString());
        });

        robocopy.on("close", code => {
          if (code >= 8) {
            this.emit("error", {
              reason: "robocopy-failed",
              code
            });
            reject(new Error(`COPY HALT: Robocopy failed with code ${code}`));
          } else {
            resolve();
          }
        });
      });

      this.emit("copy", {
        copied: meta.fileCount || 0,
        total,
        destFolder: destRoot
      });

    } catch (err) {
      this.emit("error", {
        reason: "copy-failed",
        message: err.message
      });
      throw new Error("COPY HALT: " + err.message);
    }
  }

  // ========================================================================
  // CHAPTER 6.5 — PHASE: COPY_FILE (Single file)
  // ========================================================================
  async phaseCopyFile(meta) {
    const src = meta?.sourcePath;
    const destFolder = meta?.destPath;

    if (!src || !destFolder) {
      this.emit("error", { reason: "missing-copy-file-paths" });
      throw new Error("COPY_FILE HALT: missing sourcePath or destPath");
    }

    try {
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      const destFile = path.join(destFolder, meta.filename);
      fs.copyFileSync(src, destFile);

      const stats = fs.statSync(src);
      meta.fileCount = 1;
      meta.totalSize = stats.size;

      this.emit("copy-file", {
        trayId: meta.trayId,
        src,
        destFile,
        size: stats.size
      });

    } catch (err) {
      this.emit("error", {
        reason: "copy-file-failed",
        message: err.message
      });
      throw new Error("COPY_FILE HALT: " + err.message);
    }
  }

  // ========================================================================
  // CHAPTER 7 — PHASE: VERIFY (Recursive, FOLDER ONLY)
  // ========================================================================
  async phaseVerify(meta) {
    const srcFolder = meta?.sourcePath;
    const destFolder = meta?.destPath;

    if (!srcFolder || !destFolder) {
      this.emit("error", { reason: "missing-verify-paths" });
      throw new Error("VERIFY HALT: missing sourcePath or destPath");
    }

    const srcFiles = {};
    const destFiles = {};

    const walk = (root, folder, map) => {
      const entries = fs.readdirSync(folder, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === ".vs") continue;
        if (entry.name === "tray.json") continue;
        if (entry.name === "tray.index.json") continue;

        const fullPath = path.join(folder, entry.name);
        const relPath = path.relative(root, fullPath);

        if (entry.isDirectory()) {
          walk(root, fullPath, map);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          map[relPath] = stats.size;
        }
      }
    };

    try {
      walk(srcFolder, srcFolder, srcFiles);
      walk(destFolder, destFolder, destFiles);

      const srcKeys = Object.keys(srcFiles);
      const destKeys = Object.keys(destFiles);

      if (srcKeys.length !== destKeys.length) {
        this.emit("error", {
          reason: "verify-count-mismatch",
          srcCount: srcKeys.length,
          destCount: destKeys.length
        });
        throw new Error("VERIFY HALT: file count mismatch");
      }

      let verified = 0;

      this.emit("verify-start", {
        total: srcKeys.length
      });

      for (const relPath of srcKeys) {
        const srcSize = srcFiles[relPath];
        const destSize = destFiles[relPath];

        if (destSize === undefined) {
          this.emit("error", {
            reason: "verify-missing-file",
            file: relPath
          });
          throw new Error("VERIFY HALT: missing file " + relPath);
        }

        if (srcSize !== destSize) {
          this.emit("error", {
            reason: "verify-size-mismatch",
            file: relPath,
            srcSize,
            destSize
          });
          throw new Error("VERIFY HALT: size mismatch for " + relPath);
        }

        verified++;
        const percent = Math.round((verified / srcKeys.length) * 100);

        this.emit("verify-progress", {
          verified,
          total: srcKeys.length,
          percent,
          file: relPath
        });
      }

      this.emit("verify", {
        verified,
        total: srcKeys.length
      });

    } catch (err) {
      this.emit("error", {
        reason: "verify-failed",
        message: err.message
      });
      throw new Error("VERIFY HALT: " + err.message);
    }
  }

  // ========================================================================
  // CHAPTER 8 — PHASE: PERSIST (Write tray.json)
  // ========================================================================
  async phasePersist(meta) {
  const destFolder = meta?.destPath;

  if (!destFolder) {
    this.emit("error", { reason: "missing-persist-path" });
    throw new Error("PERSIST HALT: missing destPath");
  }

  try {
    const trayMeta = {
      trayId: meta.trayId,
      name: meta.name,
      createdAt: Date.now(),
      fileCount: meta.fileCount,
      totalSize: meta.totalSize,
      sourcePath: meta.sourcePath,
      destPath: destFolder,
      type: meta.type || (meta.isDirectory ? "folder" : "file"),

      // ⭐ NEW: Permissions (MVP)
      permissions: {
        ai: meta.aiPermission || "read",
        user: meta.userPermission || "readwrite"
      },

      // ⭐ NEW: Hidden flag (MVP)
      hidden: meta.hidden || false
    };

    const metaFile = path.join(destFolder, "tray.json");
    fs.writeFileSync(metaFile, JSON.stringify(trayMeta, null, 2));

    meta.persistedMeta = trayMeta;

    this.emit("persist", {
      trayMeta,
      metaFile
    });

  } catch (err) {
    this.emit("error", {
      reason: "persist-failed",
      message: err.message
    });
    throw new Error("PERSIST HALT: " + err.message);
  }
}

  // ========================================================================
  // CHAPTER 9 — PHASE: INDEX (Recursive, FOLDER ONLY)
  // ========================================================================
  async phaseIndex(meta) {
    const destFolder = meta?.destPath;

    if (!destFolder) {
      this.emit("error", { reason: "missing-index-path" });
      throw new Error("INDEX HALT: missing destPath");
    }

    try {
      const files = [];

      const walk = (folder) => {
        const entries = fs.readdirSync(folder, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name === ".vs") continue;
          if (entry.name === "tray.json") continue;
          if (entry.name === "tray.index.json") continue;

          const fullPath = path.join(folder, entry.name);

          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile()) {
            const stats = fs.statSync(fullPath);

            files.push({
              name: entry.name,
              size: stats.size,
              path: fullPath
            });
          }
        }
      };

      walk(destFolder);

      const index = {
        trayId: meta.trayId,
        fileCount: files.length,
        files
      };

      const indexFile = path.join(destFolder, "tray.index.json");
      fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));

      meta.index = index;

      this.emit("index", {
        index,
        indexFile
      });

    } catch (err) {
      this.emit("error", {
        reason: "index-failed",
        message: err.message
      });
      throw new Error("INDEX HALT: " + err.message);
    }
  }

  // ========================================================================
  // CHAPTER 9.5 — PHASE: INDEX_FILE (Single file)
  // ========================================================================
  async phaseIndexFile(meta) {
    const destFolder = meta?.destPath;

    if (!destFolder) {
      this.emit("error", { reason: "missing-index-file-path" });
      throw new Error("INDEX_FILE HALT: missing destPath");
    }

    try {
      const destFile = path.join(destFolder, meta.filename);
      const stats = fs.statSync(destFile);

      const files = [
        {
          name: meta.filename,
          size: stats.size,
          path: destFile
        }
      ];

      const index = {
        trayId: meta.trayId,
        fileCount: files.length,
        files
      };

      const indexFile = path.join(destFolder, "tray.index.json");
      fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));

      meta.index = index;

      this.emit("index-file", {
        index,
        indexFile
      });

    } catch (err) {
      this.emit("error", {
        reason: "index-file-failed",
        message: err.message
      });
      throw new Error("INDEX_FILE HALT: " + err.message);
    }
  }

  // ========================================================================
  // CHAPTER 11 — PHASE: INTEGRITY (Final Scan + Auto-Repair, Recursive)
  // ========================================================================
  async phaseIntegrity(meta) {
    const srcFolder = meta?.sourcePath;
    const destFolder = meta?.destPath;

    if (!srcFolder || !destFolder) {
      this.emit("error", { reason: "missing-integrity-paths" });
      throw new Error("INTEGRITY HALT: missing sourcePath or destPath");
    }

    this.emit("integrity-start", {
      trayId: meta.trayId,
      srcFolder,
      destFolder
    });

    const srcFiles = {};
    const destFiles = {};

    const walk = (root, folder, map, isDest = false) => {
      const entries = fs.readdirSync(folder, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === ".vs") continue;
        if (isDest && (entry.name === "tray.json" || entry.name === "tray.index.json")) {
          continue;
        }

        const fullPath = path.join(folder, entry.name);
        const relPath = path.relative(root, fullPath);

        if (entry.isDirectory()) {
          walk(root, fullPath, map, isDest);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          map[relPath] = stats.size;
        }
      }
    };

    try {
      walk(srcFolder, srcFolder, srcFiles, false);
      walk(destFolder, destFolder, destFiles, true);

      const patch = {
        missing: [],
        extra: [],
        corrupted: []
      };

      for (const relPath of Object.keys(srcFiles)) {
        const srcSize = srcFiles[relPath];
        const destSize = destFiles[relPath];

        if (destSize === undefined) {
          patch.missing.push(relPath);
        } else if (srcSize !== destSize) {
          patch.corrupted.push(relPath);
        }
      }

      for (const relPath of Object.keys(destFiles)) {
        if (srcFiles[relPath] === undefined) {
          patch.extra.push(relPath);
        }
      }

      this.emit("integrity-patch-plan", patch);

      for (const relPath of patch.missing) {
        fs.copyFileSync(
          path.join(srcFolder, relPath),
          path.join(destFolder, relPath)
        );
      }

      for (const relPath of patch.corrupted) {
        fs.copyFileSync(
          path.join(srcFolder, relPath),
          path.join(destFolder, relPath)
        );
      }

      for (const relPath of patch.extra) {
        fs.unlinkSync(path.join(destFolder, relPath));
      }

      const finalSrc = {};
      const finalDest = {};
      walk(srcFolder, srcFolder, finalSrc, false);
      walk(destFolder, destFolder, finalDest, true);

      const srcKeys = Object.keys(finalSrc);
      const destKeys = Object.keys(finalDest);

      if (srcKeys.length !== destKeys.length) {
        this.emit("integrity-failed", {
          srcCount: srcKeys.length,
          destCount: destKeys.length
        });
        throw new Error("INTEGRITY HALT: final count mismatch");
      }

      this.emit("integrity-ok", {
        repaired: patch
      });

    } catch (err) {
      this.emit("error", {
        reason: "integrity-failed",
        message: err.message
      });
      throw new Error("INTEGRITY HALT: " + err.message);
    }
  }

  // ========================================================================
  // CHAPTER 12 — PHASE: COMPLETE
  // ========================================================================
  phaseComplete(meta) {
    const summary = {
      trayId: meta.trayId,
      name: meta.name,
      fileCount: meta.fileCount,
      totalSize: meta.totalSize,
      destPath: meta.destPath,
      meta: meta.persistedMeta,
      index: meta.index,

      // ⭐ NEW: Permissions + Hidden flag (MVP)
      permissions: meta.persistedMeta?.permissions || {
        ai: "read",
        user: "readwrite"
      },

      hidden: meta.persistedMeta?.hidden || false
    };

    this.emit("complete", summary);

    return {
      ok: true,
      summary
    };
}
}
