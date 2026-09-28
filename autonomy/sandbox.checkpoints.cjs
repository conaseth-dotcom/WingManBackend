// C:/WingManBackend/autonomy/sandbox.checkpoints.cjs

const fs = require("fs");
const path = require("path");

const SANDBOX_ROOT = "C:/WingManBackend/sandbox";

function recordSandboxCheckpoint(sandboxId, report) {
  try {
    const checkpointDir = path.join(SANDBOX_ROOT, sandboxId, "checkpoints");

    if (!fs.existsSync(checkpointDir)) {
      fs.mkdirSync(checkpointDir, { recursive: true });
    }

    const filename = `${Date.now()}-checkpoint.json`;
    const fullPath = path.join(checkpointDir, filename);

    fs.writeFileSync(fullPath, JSON.stringify(report, null, 2), "utf8");

    return { ok: true, path: fullPath };

  } catch (err) {
    console.error("[SandboxCheckpoint] Failed:", err);
    return { ok: false, error: err.message };
  }
}

module.exports = { recordSandboxCheckpoint };
