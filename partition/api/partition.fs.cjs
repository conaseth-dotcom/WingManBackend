/* ========================================================================
   WingMan Backend — Partition FS (Unified Deterministic + Lazy Mode)
   Path: C:/WingManBackend/partition/api/partition.fs.cjs

   Role:
     - Provide a stable, safe FS API surface
     - Lazy Mode: no real filesystem access unless explicitly requested
     - Deterministic Mode: backend can perform real FS operations safely
     - Prevent renderer crashes from undefined helpers
     - Used by partition.manager, partition.api, and sandbox modules
========================================================================= */

const fs = require("fs");
const path = require("path");

/* ------------------------------------------------------------
   MODE CONTROL
   Lazy Mode = default (no real FS access)
   Deterministic Mode = backend explicitly enables real FS ops
------------------------------------------------------------ */

let REAL_FS_ENABLED = false;

function enableRealFS() {
  REAL_FS_ENABLED = true;
  return { ok: true, mode: "deterministic" };
}

/* ------------------------------------------------------------
   INTERNAL SAFE HELPERS
------------------------------------------------------------ */

function safeEnsureDir(dir) {
  if (!REAL_FS_ENABLED) {
    return { ok: true, dir, reason: "ensureDir skipped (lazy mode)" };
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return { ok: true, dir };
}

function safeWriteFile(file, data) {
  if (!REAL_FS_ENABLED) {
    return {
      ok: true,
      file,
      bytes: typeof data === "string" ? data.length : 0,
      reason: "writeFile skipped (lazy mode)"
    };
  }

  const dir = path.dirname(file);
  safeEnsureDir(dir);
  fs.writeFileSync(file, data);
  return { ok: true, file };
}

function safeReadFile(file) {
  if (!REAL_FS_ENABLED) {
    return {
      ok: true,
      file,
      data: null,
      reason: "readFile skipped (lazy mode)"
    };
  }

  if (!fs.existsSync(file)) {
    return { ok: false, file, error: "File does not exist" };
  }

  return { ok: true, file, data: fs.readFileSync(file) };
}

function safeReadJSON(file, fallback = {}) {
  if (!REAL_FS_ENABLED) {
    return fallback;
  }

  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function safeWriteJSON(file, data) {
  if (!REAL_FS_ENABLED) {
    return {
      ok: true,
      file,
      reason: "writeJSON skipped (lazy mode)"
    };
  }

  const dir = path.dirname(file);
  safeEnsureDir(dir);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return { ok: true, file };
}

function safeListFolder(dir) {
  if (!REAL_FS_ENABLED) {
    return {
      ok: true,
      dir,
      entries: [],
      reason: "listFolder skipped (lazy mode)"
    };
  }

  if (!fs.existsSync(dir)) {
    return { ok: false, dir, error: "Folder does not exist" };
  }

  return { ok: true, dir, entries: fs.readdirSync(dir) };
}

function safeCopyRecursive(src, dest, progressCallback) {
  if (!REAL_FS_ENABLED) {
    if (progressCallback) {
      progressCallback({
        phase: "copy-skipped",
        src,
        dest,
        reason: "copyRecursive skipped (lazy mode)"
      });
    }
    return { ok: true, src, dest, totalFiles: 0 };
  }

  let count = 0;

  const walk = (currentSrc, currentDest) => {
    safeEnsureDir(currentDest);

    const items = fs.readdirSync(currentSrc);
    for (const item of items) {
      const srcPath = path.join(currentSrc, item);
      const destPath = path.join(currentDest, item);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        walk(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
        count++;
        progressCallback?.({
          phase: "copy-progress",
          src: srcPath,
          dest: destPath,
          count
        });
      }
    }
  };

  walk(src, dest);

  return { ok: true, src, dest, totalFiles: count };
}

/* ------------------------------------------------------------
   PUBLIC API SURFACE
------------------------------------------------------------ */

module.exports = {
  // Mode control
  enableRealFS,

  // Safe operations
  ensureFolder: safeEnsureDir,
  writeFile: safeWriteFile,
  readFile: safeReadFile,
  readJSON: safeReadJSON,
  writeJSON: safeWriteJSON,
  listFolder: safeListFolder,
  copyRecursive: safeCopyRecursive,

  // Namespace export
  PartitionFS: {
    ensureFolder: safeEnsureDir,
    writeFile: safeWriteFile,
    readFile: safeReadFile,
    readJSON: safeReadJSON,
    writeJSON: safeWriteJSON,
    listFolder: safeListFolder,
    copyRecursive: safeCopyRecursive
  }
};
