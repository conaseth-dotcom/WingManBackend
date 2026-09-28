/* ========================================================================
   WingMan Backend File
   Path: partition/diagnostics.cjs
   Role: System-level diagnostics and failure reporting. Collects integrity
         and rebuild results, plus continuity state, into a single payload.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] partition/diagnostics.cjs loaded");

const fs = require("fs");
const path = require("path");
const { Paths } = require("../core/paths/paths.cjs");

// Continuity Gateway (relationship subsystem)
const continuity = require("../BlackBox/relationship/state/continuity.gateway.cjs");

// Optional: version info (if you have a version module)
let backendVersion = "unknown";
try {
  backendVersion = require("../core/system/version.cjs");
} catch {
  // version module not available; keep "unknown"
}

/* ------------------------------------------------------------
   Build a failure report payload
------------------------------------------------------------ */
function buildFailureReport(integrityResult, rebuildResult) {
  const continuityState = continuity.loadAll();

  return {
    timestamp: new Date().toISOString(),
    backendVersion,
    partitionRoot: Paths.getPartitionRoot
      ? Paths.getPartitionRoot()
      : null,
    blackboxRoot: Paths.getBlackBoxRoot
      ? Paths.getBlackBoxRoot()
      : null,

    integrity: integrityResult || null,
    rebuild: rebuildResult || null,

    continuity: {
      understanding: continuityState.understanding,
      projectMap: continuityState.projectMap,
      preferences: continuityState.preferences
    }
  };
}

/* ------------------------------------------------------------
   Persist failure report to disk (optional)
------------------------------------------------------------ */
function saveFailureReport(report, filename = "wingman.failure.report.json") {
  try {
    const diagnosticsDir = path.join(Paths.getPartitionRoot(), "diagnostics");

    if (!fs.existsSync(diagnosticsDir)) {
      fs.mkdirSync(diagnosticsDir, { recursive: true });
    }

    const target = path.join(diagnosticsDir, filename);
    fs.writeFileSync(target, JSON.stringify(report, null, 2), "utf8");

    console.log(">>> [WM-DIAGNOSTICS] Failure report saved to:", target);
    return { ok: true, path: target };
  } catch (err) {
    console.error(">>> [WM-DIAGNOSTICS] Failed to save failure report:", err);
    return { ok: false, error: err.message };
  }
}

/* ------------------------------------------------------------
   Public API
------------------------------------------------------------ */
module.exports = {
  buildFailureReport,
  saveFailureReport
};
