// C:\WingManBackend\partition\fs\fs.listDirectory.cjs
const fs = require("fs");
const path = require("path");
const { resolvePartitionPath } = require("./fs.utils.cjs");

function listDirectory(relativePath = ".") {
  const dirPath = resolvePartitionPath(relativePath);

  if (!fs.existsSync(dirPath)) {
    return { ok: false, error: "Directory not found", path: dirPath, items: [] };
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  const items = entries.map((entry) => ({
    name: entry.name,
    isFile: entry.isFile(),
    isDirectory: entry.isDirectory(),
    path: path.join(relativePath, entry.name)
  }));

  return { ok: true, path: dirPath, items };
}

module.exports = { listDirectory };
