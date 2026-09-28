// C:\WingManBackend\core\rooms\rooms.promote.cjs
// Promotion engine needs FS, paths, and validator.

const fs = require("fs");
const path = require("path");
const { validateRoom } = require("./rooms.validator.cjs");
const { getRoomDir } = require("./rooms.paths.cjs");
const { ROOMS_ROOT } = require("./rooms.loader.cjs");

// Ensures the promoted room directory exists.
function ensurePromoteDir(roomName) {

    const dirPath = path.join(ROOMS_ROOT, roomName);

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    return dirPath;
}

// Copies all JSON files from the room's working directory into the promoted directory.
function copyRoomFiles(roomName) {

    const sourceDir = getRoomDir(roomName);
    const targetDir = ensurePromoteDir(roomName);

    const entries = fs.readdirSync(sourceDir);
    const results = [];

    for (const entry of entries) {

        if (entry.endsWith(".json")) {

            const src = path.join(sourceDir, entry);
            const dest = path.join(targetDir, entry);

            fs.copyFileSync(src, dest);

            results.push({
                file: entry,
                from: src,
                to: dest
            });
        }
    }

    return results;
}

// Validates and promotes the room into the active environment.
function promoteRoom(roomName) {

    // Validate before promoting
    const validation = validateRoom(roomName);
    if (!validation.ok) {
        return validation;
    }

    // Copy all JSON files
    const fileResults = copyRoomFiles(roomName);

    return {
        ok: true,
        promoted: roomName,
        files: fileResults
    };
}

module.exports = {
    ensurePromoteDir,
    copyRoomFiles,
    promoteRoom
};
