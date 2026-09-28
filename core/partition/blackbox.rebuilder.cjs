// C:\WingManBackend\core\partition\blackbox.rebuilder.cjs
// Don't Dream it, Be it... Tim Curry 1946-2026

const fs = require("fs");
const path = require("path");
const { BLACKBOX_ROOT } = require("./blackbox.loader.cjs");
const CANONICAL_ORIGINALS = require("./canonical.index.cjs");

// Determines whether the BlackBox directory is missing or empty.
function blackboxIsMissing() {

    // If the BlackBox root doesn't exist
    if (!fs.existsSync(BLACKBOX_ROOT)) {
        return true;
    }

    // Read directory entries
    const entries = fs.readdirSync(BLACKBOX_ROOT);

    // If empty
    if (entries.length === 0) {
        return true;
    }

    return false;
}

// Rebuilds the entire BlackBox from canonical originals.
function rebuildBlackBox() {

    // 1. Check if rebuild is needed
    if (blackboxIsMissing() === false) {
        return {
            ok: true,
            reason: "BlackBox already exists",
            rebuilt: false
        };
    }

    // 2. Create BlackBox root directory
    fs.mkdirSync(BLACKBOX_ROOT, { recursive: true });

    // 3. Loop through canonical originals
    for (const entry of CANONICAL_ORIGINALS) {

        // Build directory path
        const dirPath = path.join(BLACKBOX_ROOT, entry.dir);

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
        reason: "BlackBox rebuilt successfully",
        rebuilt: true
    };
}

module.exports = { blackboxIsMissing, rebuildBlackBox };
