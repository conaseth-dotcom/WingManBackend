// C:\WingManBackend\partition\fs\fs.utils.cjs
const fs = require("fs");
const path = require("path");
const { Paths } = require("../paths/paths.cjs");

function resolvePartitionPath(relativePath) {
  const root = Paths.getPartitionRoot();
  return path.resolve(root, relativePath);
}

function ensureParentFolder(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  resolvePartitionPath,
  ensureParentFolder
};
