/* ========================================================================
   WingMan Backend — Modern Copy Preview (ESM)
   Path: C:/WingManBackend/partition/api/partition.copyPreview.cjs
   Role:
     - Scan a folder before copying
     - Count files, folders, and total size
     - Emit scan phases for progress reporting
========================================================================= */

import fs from "fs/promises";
import path from "path";
import { PartitionLogger } from "./partition.logger.cjs";

/* ------------------------------------------------------------
   Recursively scan a folder with progress
------------------------------------------------------------ */
async function walk(dir, stats, progressCallback) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      stats.folderCount++;

      // Optional scan-progress event for folders
      if (progressCallback) {
        progressCallback({
          phase: "scan-progress",
          currentPath: full,
          fileCount: stats.fileCount,
          folderCount: stats.folderCount,
          totalSize: stats.totalSize
        });
      }

      await walk(full, stats, progressCallback);
    } else {
      stats.fileCount++;

      try {
        const fileStat = await fs.stat(full);
        stats.totalSize += fileStat.size;
      } catch {
        // Skip unreadable files
      }

      // Optional scan-progress event for files
      if (progressCallback) {
        progressCallback({
          phase: "scan-progress",
          currentPath: full,
          fileCount: stats.fileCount,
          folderCount: stats.folderCount,
          totalSize: stats.totalSize
        });
      }
    }
  }
}

/* ------------------------------------------------------------
   Public API: scanFolder
   - Optional progressCallback for phase reporting
------------------------------------------------------------ */
export async function scanFolder(src, progressCallback) {
  const stats = {
    src,
    fileCount: 0,
    folderCount: 0,
    totalSize: 0
  };

  // scan-start
  console.log("[PartitionCopyPreview] scan-start:", src);
  if (progressCallback) {
    progressCallback({
      phase: "scan-start",
      src
    });
  }

  try {
    await walk(src, stats, progressCallback);

    // scan-complete
    console.log("[PartitionCopyPreview] scan-complete:", src, stats);
    if (progressCallback) {
      progressCallback({
        phase: "scan-complete",
        src,
        fileCount: stats.fileCount,
        folderCount: stats.folderCount,
        totalSize: stats.totalSize
      });
    }

    await PartitionLogger.log("copy-preview", "Folder scan complete", stats);

    return stats;
  } catch (err) {
    console.error("[PartitionCopyPreview] scan error:", src, err);

    await PartitionLogger.log("error", "Copy preview failed", {
      src,
      message: err.message,
      stack: err.stack
    });

    if (progressCallback) {
      progressCallback({
        phase: "scan-error",
        src,
        message: err.message
      });
    }

    return {
      ok: false,
      src,
      error: err.message
    };
  }
}

/* ------------------------------------------------------------
   Grouped export
------------------------------------------------------------ */
export const PartitionCopyPreview = { scanFolder };
export default PartitionCopyPreview;
