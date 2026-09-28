// ./partition/blackbox.rebuilder.cjs

const fs = require("fs");
const path = require("path");
const { Paths } = require("../core/paths/paths.cjs");
const canonical = require("./blackbox.canonical.cjs");
const diagnostics = require("./diagnostics.cjs");

console.log(">>> [WM-FILE-LOAD] blackbox.rebuilder.cjs loaded");

function writeFileSafe(targetPath, content) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(targetPath, content, "utf8");
}

function rebuildBlackBox() {
  const results = [];

  for (const entry of canonical.files) {
    const targetPath = Paths.resolveVirtual(entry.path);

    try {
      // Write canonical JSON/Markdown/etc.
      if (entry.type === "json") {
        writeFileSafe(targetPath, JSON.stringify(entry.content, null, 2));
      } else if (entry.type === "text") {
        writeFileSafe(targetPath, entry.content);
      } else {
        // Fallback: treat as text
        writeFileSafe(targetPath, String(entry.content));
      }

      // NEW: if this canonical file defines an aiWriteTarget,
      // ensure the derived continuity file exists (but do NOT overwrite it)
      if (entry.content && entry.content.aiWriteTarget) {
        const derivedPath = Paths.resolveVirtual(entry.content.aiWriteTarget);

        if (!fs.existsSync(derivedPath)) {
          writeFileSafe(derivedPath, JSON.stringify({}, null, 2));
        }
      }

      results.push({
        alias: entry.alias,
        path: entry.path,
        targetPath,
        ok: true
      });
    } catch (err) {
      results.push({
        alias: entry.alias,
        path: entry.path,
        targetPath,
        ok: false,
        error: err.message
      });
    }
  }

  const rebuildResult = {
    ok: errors.length === 0,
    rebuiltFiles,
    skippedFiles,
    errors
  };

  // NEW — build + save diagnostics report
  const report = diagnostics.buildFailureReport(null, rebuildResult);
  diagnostics.saveFailureReport(report);

  return rebuildResult;

}

module.exports = { rebuildBlackBox };
