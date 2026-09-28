// D:\WingMan\WingManBackend\partition\partition.integrity.checker.cjs

const fs = require("fs");
const path = require("path");
const { rebuildBlackBox } = require("./blackbox.rebuilder.cjs");
const { Paths } = require("../core/paths/paths.cjs");
const diagnostics = require("./diagnostics.cjs");

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function checkFileExists(localPath) {
  return fs.existsSync(localPath);
}

function runIntegrityCheck(manifestPath) {
  const manifest = loadJSON(manifestPath);

  if (!manifest) {
    return {
      ok: false,
      criticalFailures: 1,
      reason: "Partition manifest could not be loaded.",
      manifestPath
    };
  }

  let results = [];
  let criticalFailures = 0;

  for (const entry of manifest.requiredFiles) {
    const exists = checkFileExists(entry.localPath);

    // If this is a derived continuity file, we IGNORE it:
    // derived files are allowed to be missing or regenerated.
    if (entry.alias && entry.alias.includes("continuity/derived")) {
      results.push({
        alias: entry.alias,
        path: entry.path,
        localPath: entry.localPath,
        required: entry.required,
        exists,
        ignored: true
      });
      continue;
    }

    results.push({
      alias: entry.alias,
      path: entry.path,
      localPath: entry.localPath,
      required: entry.required,
      exists
    });

    if (entry.required && !exists) {
      criticalFailures++;
    }
  }

  if (criticalFailures === 0) {
    const report = diagnostics.buildFailureReport(
      { ok: true, criticalFailures: 0, results },
      null
    );
    diagnostics.saveFailureReport(report);

    return {
      ok: true,
      criticalFailures: 0,
      reason: "Integrity verified.",
      results
    };
  }


  const rebuildResult = rebuildBlackBox();

  results = [];
  criticalFailures = 0;

  for (const entry of manifest.requiredFiles) {
    const exists = checkFileExists(entry.localPath);

    if (entry.alias && entry.alias.includes("continuity/derived")) {
      results.push({
        alias: entry.alias,
        path: entry.path,
        localPath: entry.localPath,
        required: entry.required,
        exists,
        ignored: true
      });
      continue;
    }

    results.push({
      alias: entry.alias,
      path: entry.path,
      localPath: entry.localPath,
      required: entry.required,
      exists
    });

    if (entry.required && !exists) {
      criticalFailures++;
    }
  }

  const finalResult = {
    ok: criticalFailures === 0,
    criticalFailures,
    reason:
      criticalFailures === 0
        ? "Integrity restored via BlackBox rebuild."
        : "Integrity check failed even after rebuild.",
    rebuildResult,
    results
  };

  const report = diagnostics.buildFailureReport(null, finalResult);
  diagnostics.saveFailureReport(report);

  return finalResult;

}

module.exports = { runIntegrityCheck };
