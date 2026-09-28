// C:\WingManBackend\partition\fs\fs.readFile.cjs
const fs = require("fs");
const { resolvePartitionPath } = require("./fs.utils.cjs");

function readFile(relativePath, options = {}) {
  const filePath = resolvePartitionPath(relativePath);
  const { encoding = "utf8", binary = false } = options;

  if (!fs.existsSync(filePath)) {
    return { ok: false, error: "File not found", path: filePath };
  }

  const data = binary
    ? fs.readFileSync(filePath)
    : fs.readFileSync(filePath, { encoding });

  return { ok: true, path: filePath, data };
}

module.exports = { readFile };
