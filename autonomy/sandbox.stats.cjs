// C:/WingManBackend/autonomy/sandbox.stats.cjs

const fs = require("fs");
const path = require("path");

// Root of all sandbox partitions
const SANDBOX_ROOT = "C:/WingManBackend/sandbox";

function getSandboxStats(sandboxId) {
  try {
    const root = path.join(SANDBOX_ROOT, sandboxId);

    if (!fs.existsSync(root)) {
      return { bytes: 0, files: 0, versions: 0 };
    }

    let bytes = 0;
    let files = 0;

    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          const stat = fs.statSync(full);
          bytes += stat.size;
          files += 1;
        }
      }
    }

    walk(root);

    // Version count = number of checkpoint files
    const versions = fs.existsSync(path.join(root, "checkpoints"))
      ? fs.readdirSync(path.join(root, "checkpoints")).length
      : 0;

    return { bytes, files, versions };

  } catch (err) {
    console.error("[SandboxStats] Failed:", err);
    return { bytes: 0, files: 0, versions: 0 };
  }
}

module.exports = { getSandboxStats };
