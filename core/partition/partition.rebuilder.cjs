// C:\WingManBackend\core\partition\partition.rebuilder.cjs
// Rebuilder needs access to filesystem, path utilities, and backend originals.
const fs = require("fs");
const path = require("path");
const { PARTITION_ROOT } = require("./partition.loader.cjs");
const BACKEND_ORIGINALS = require("../blackbox/originals.index.cjs");

// Determines whether the partition directory is missing or empty.
function partitionIsMissing() {

    // If the partition root doesn't exist
    if (!fs.existsSync(PARTITION_ROOT)) {
        return true;
    }

    // Read directory entries
    const entries = fs.readdirSync(PARTITION_ROOT);

    // If empty
    if (entries.length === 0) {
        return true;
    }

    return false;
}

// Rebuilds the entire partition from backend originals.
function rebuildPartition() {

    // 1. Check if rebuild is needed
    if (partitionIsMissing() === false) {
        return {
            ok: true,
            reason: "Partition already exists",
            rebuilt: false
        };
    }

    // 2. Create partition root directory
    fs.mkdirSync(PARTITION_ROOT, { recursive: true });

    // 3. Loop through backend originals
    for (const entry of BACKEND_ORIGINALS) {

        // Build directory path
        const dirPath = path.join(PARTITION_ROOT, entry.dir);

        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Build file path
        const filePath = path.join(dirPath, entry.filename);

        // Write content
        if (entry.type === "json") {
            const jsonString = JSON.stringify(entry.content, null, 4);
            fs.writeFileSync(filePath, jsonString, "utf8");
        } else if (entry.type === "markdown") {
            fs.writeFileSync(filePath, entry.content, "utf8");
        }
    }

    // 4. Return success
    return {
        ok: true,
        reason: "Partition rebuilt successfully",
        rebuilt: true
    };
}

module.exports = { partitionIsMissing, rebuildPartition };
