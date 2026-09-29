// C:\WingManBackend\core\partition\json.writer.cjs
// Writer needs access to filesystem and path utilities.
const fs = require("fs");
const path = require("path");
const { PARTITION_ROOT } = require("./partition.loader.cjs");

// Writes markdown files (ai.continuity.notes.md) into the partition.
function writePartitionMarkdown(route, rawContent) {

    const dirPath = path.join(PARTITION_ROOT, route.dir);

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, route.filename);

    fs.writeFileSync(filePath, rawContent, "utf8");

    return {
        ok: true,
        reason: "Markdown written successfully",
        filePath
    };
}

module.exports = { writePartitionMarkdown };
