// C:\WingManBackend\core\partition\partition.merge.cjs
// Merge logic needs access to filesystem and partition loader.
const fs = require("fs");
const path = require("path");
const { PARTITION_ROOT } = require("./partition.loader.cjs");

// Loads existing JSON from the partition.
function loadExistingPartitionJSON() {

    const output = {};

    // Read all directories and files under PARTITION_ROOT
    const dirs = fs.readdirSync(PARTITION_ROOT);

    for (const dir of dirs) {

        const dirPath = path.join(PARTITION_ROOT, dir);
        const files = fs.readdirSync(dirPath);

        for (const file of files) {

            const filePath = path.join(dirPath, file);
            const raw = fs.readFileSync(filePath, "utf8");

            if (file.endsWith(".json")) {
                const parsed = JSON.parse(raw);
                output[dir] = parsed;
            }
        }
    }

    return output;
}

// Merges incoming JSON with existing partition JSON.
function mergePartitionJSON(incomingJSON) {

    // 1. Load existing partition JSON
    const existing = loadExistingPartitionJSON();

    // 2. Create merged output
    const merged = {};

    // 3. Merge keys
    for (const key of Object.keys(incomingJSON)) {

        if (existing[key] !== undefined) {
            // Shallow merge for now
            merged[key] = {
                ...existing[key],
                ...incomingJSON[key]
            };
        } else {
            merged[key] = incomingJSON[key];
        }
    }

    // 4. Return merged result
    return {
        ok: true,
        output: merged
    };
}

module.exports = { mergePartitionJSON };
