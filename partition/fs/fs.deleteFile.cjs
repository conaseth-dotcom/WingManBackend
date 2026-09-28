// C:\WingManBackend\partition\fs\fs.deleteFile.cjs
const fs = require("fs");
const { resolvePartitionPath } = require("./fs.utils.cjs");

function deleteFile(relativePath) {
  const filePath = resolvePartitionPath(relativePath);

  if (!fs.existsSync(filePath)) {
    return { ok: false, error: "File not found", path: filePath };
  }

  fs.unlinkSync(filePath);
  return { ok: true, path: filePath };
}

module.exports = { deleteFile };
