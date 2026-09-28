// C:\WingManBackend\core\partition\json.writer.cjs
// Writer needs access to filesystem and path utilities.
const fs = require("fs");
const path = require("path");
const { PARTITION_ROOT } = require("./partition.loader.cjs");

// Writes validated JSON content into the correct partition folder.
function writePartitionJson(route, parsedJson) {

    // 1. Build directory path
    const dirPath = path.join(PARTITION_ROOT, route.dir);

    // 2. Ensure directory exists
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // 3. Build full file path
    const filePath = path.join(dirPath, route.filename);

    // 4. Convert JSON to string
    const jsonString = JSON.stringify(parsedJson, null, 4);

    // 5. Write file
    fs.writeFileSync(filePath, jsonString, "utf8");

    // 6. Return success
    return {
        ok: true,
        reason: "JSON written successfully",
        filePath
    };
}

// Writes markdown files (ai.continuity.notes.md) into the partition.
function writePartitionMarkdown(route, rawContent) {

    // 1. Build directory path
    const dirPath = path.join(PARTITION_ROOT, route.dir);

    // 2. Ensure directory exists
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // 3. Build full file path
    const filePath = path.join(dirPath, route.filename);

    // 4. Write markdown content
    fs.writeFileSync(filePath, rawContent, "utf8");

    // 5. Return success
    return {
        ok: true,
        reason: "Markdown written successfully",
        filePath
    };
}

module.exports = { writePartitionJson, writePartitionMarkdown };
