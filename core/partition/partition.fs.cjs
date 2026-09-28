// C:\WingManBackend\core\partition\partition.paths.cjs
// Centralized path helpers for partition operations.

const path = require("path");
const { PARTITION_ROOT } = require("./partition.loader.cjs");

// Returns the full directory path inside the partition.
function getPartitionDir(dirName) {
    const dirPath = path.join(PARTITION_ROOT, dirName);
    return dirPath;
}

// Returns the full JSON file path inside a partition directory.
function getPartitionJSONPath(dirName, filename) {
    const dirPath = getPartitionDir(dirName);
    const filePath = path.join(dirPath, filename);
    return filePath;
}

// Returns the full Markdown file path inside a partition directory.
function getPartitionMarkdownPath(dirName, filename) {
    const dirPath = getPartitionDir(dirName);
    const filePath = path.join(dirPath, filename);
    return filePath;
}

module.exports = {
    getPartitionDir,
    getPartitionJSONPath,
    getPartitionMarkdownPath
};
