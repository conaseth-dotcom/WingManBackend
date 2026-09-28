// C:\WingManBackend\core\rooms\rooms.fs.cjs
// Filesystem helpers for room operations.

const fs = require("fs");
const path = require("path");
const { ROOMS_ROOT } = require("./rooms.loader.cjs");

// Ensures a room directory exists, creating it if needed.
function ensureRoomDir(roomName) {

    const dirPath = path.join(ROOMS_ROOT, roomName);

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    return dirPath;
}

// Reads JSON safely, returning null on error.
function readRoomJSONSafe(filePath) {

    if (!fs.existsSync(filePath)) {
        return null;
    }

    const raw = fs.readFileSync(filePath, "utf8");

    try {
        const parsed = JSON.parse(raw);
        return parsed;
    } catch (error) {
        return null;
    }
}

// Writes JSON safely with pretty formatting.
function writeRoomJSONSafe(filePath, data) {

    const jsonString = JSON.stringify(data, null, 4);

    fs.writeFileSync(filePath, jsonString, "utf8");

    return {
        ok: true,
        path: filePath
    };
}

// Returns a list of room directories inside the rooms root.
function listRooms() {

    const entries = fs.readdirSync(ROOMS_ROOT);
    const dirs = [];

    for (const entry of entries) {

        const fullPath = path.join(ROOMS_ROOT, entry);

        if (fs.statSync(fullPath).isDirectory()) {
            dirs.push(entry);
        }
    }

    return dirs;
}

module.exports = {
    ensureRoomDir,
    readRoomJSONSafe,
    writeRoomJSONSafe,
    listRooms
};
