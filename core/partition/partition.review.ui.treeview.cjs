// C:\WingManBackend\core\partition\partition.review.ui.treeview.cjs
// Treeview needs filesystem helpers and path helpers.

const fs = require("fs");
const { listPartitionDirs, readJSONSafe } = require("./partition.fs.cjs");
const { getPartitionDir, getPartitionJSONPath } = require("./partition.paths.cjs");

// Builds a tree node representing a directory and its JSON files.
function buildDirNode(dirName) {

    const dirPath = getPartitionDir(dirName);
    const files = fs.readdirSync(dirPath);

    const children = [];

    for (const file of files) {

        if (file.endsWith(".json")) {

            const filePath = getPartitionJSONPath(dirName, file);
            const json = readJSONSafe(filePath);

            children.push({
                type: "file",
                name: file,
                path: filePath,
                content: json
            });
        }
    }

    return {
        type: "directory",
        name: dirName,
        path: dirPath,
        children: children
    };
}

// Builds a full hierarchical tree of the partition.
function buildPartitionTree() {

    const dirs = listPartitionDirs();
    const tree = [];

    for (const dirName of dirs) {
        const node = buildDirNode(dirName);
        tree.push(node);
    }

    return {
        ok: true,
        tree: tree
    };
}

module.exports = { buildPartitionTree };
