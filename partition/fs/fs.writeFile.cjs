// C:\WingManBackend\partition\fs\fs.writeFile.cjs
const fs = require("fs");
const { resolvePartitionPath, ensureParentFolder } = require("./fs.utils.cjs");

function writeFile(relativePath, data, options = {}) {
  const filePath = resolvePartitionPath(relativePath);
  ensureParentFolder(filePath);

  const { encoding = "utf8", binary = false } = options;

  if (binary) {
    fs.writeFileSync(filePath, data);
  } else {
    fs.writeFileSync(filePath, data, { encoding });
  }

  return { ok: true, path: filePath };
}

module.exports = { writeFile };
