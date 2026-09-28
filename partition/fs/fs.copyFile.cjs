// C:\WingManBackend\partition\fs\fs.copyFile.cjs
const fs = require("fs");
const { resolvePartitionPath, ensureParentFolder } = require("./fs.utils.cjs");

function copyFile(srcRelative, destRelative) {
  const srcPath = resolvePartitionPath(srcRelative);
  const destPath = resolvePartitionPath(destRelative);

  if (!fs.existsSync(srcPath)) {
    return { ok: false, error: "Source file not found", srcPath, destPath };
  }

  ensureParentFolder(destPath);
  fs.copyFileSync(srcPath, destPath);

  return { ok: true, srcPath, destPath };
}

module.exports = { copyFile };
