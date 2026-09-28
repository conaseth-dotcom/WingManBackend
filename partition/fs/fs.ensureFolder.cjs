// C:\WingManBackend\partition\fs\fs.ensureFolder.cjs
const fs = require("fs");
const { resolvePartitionPath } = require("./fs.utils.cjs");

function ensureFolder(relativePath) {
  const dirPath = resolvePartitionPath(relativePath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  return { ok: true, path: dirPath };
}

module.exports = { ensureFolder };
