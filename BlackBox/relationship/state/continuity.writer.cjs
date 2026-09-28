// D:\WingMan\WingManBackend\BlackBox\relationship\state\continuity.writer.cjs

const fs = require("fs");
const { Paths } = require("C:/WingManBackend/core/paths/paths.cjs"); // if absolute; we can later make this relative
const { loadJSON } = require("C:/WingManBackend/partition/api/storage.cjs");

function ensureFile(path, initialContent) {
  const dir = require("path").dirname(path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, JSON.stringify(initialContent || {}, null, 2));
  }
}

function writeContinuity(canonicalVirtualPath, aiAnswers) {
  const canonicalPath = Paths.resolveVirtual(canonicalVirtualPath);
  const canonical = loadJSON(canonicalPath);

  if (!canonical) {
    return {
      ok: false,
      error: "Canonical continuity file missing or unreadable.",
      canonicalPath
    };
  }

  if (!canonical.aiWriteTarget) {
    return {
      ok: false,
      error: "Canonical continuity file does not define aiWriteTarget.",
      canonicalPath
    };
  }

  const derivedPath = Paths.resolveVirtual(canonical.aiWriteTarget);

  ensureFile(derivedPath, {});

  fs.writeFileSync(derivedPath, JSON.stringify(aiAnswers, null, 2), "utf8");

  return {
    ok: true,
    canonicalPath,
    derivedPath
  };
}

module.exports = {
  writeUnderstanding(answers) {
    return writeContinuity(
      "wm://blackbox/relationship/state/ai.understanding.snapshot",
      answers
    );
  },

  writeProjectMap(answers) {
    return writeContinuity(
      "wm://blackbox/relationship/state/ai.project.map",
      answers
    );
  },

  writePreferences(answers) {
    return writeContinuity(
      "wm://blackbox/relationship/state/preferences",
      answers
    );
  }
};
