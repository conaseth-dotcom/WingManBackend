// C:\WingManBackend\core\rooms\rooms.loader.full.cjs
// Full room loader needs FS, paths, and validator.

const fs = require("fs");
const { readRoomJSONSafe } = require("./rooms.fs.cjs");
const {
    getRoomDir,
    getRoomJSONPath,
    getRoomMetadataPath,
    getRoomManifestPath
} = require("./rooms.paths.cjs");
const { validateRoom } = require("./rooms.validator.cjs");

// Loads every .json file inside the room directory.
function loadRoomJSONFiles(roomName) {

    const dir = getRoomDir(roomName);
    const entries = fs.readdirSync(dir);
    const jsonFiles = {};

    for (const entry of entries) {

        if (entry.endsWith(".json")) {

            const filePath = getRoomJSONPath(roomName, entry);
            const json = readRoomJSONSafe(filePath);

            jsonFiles[entry] = json;
        }
    }

    return jsonFiles;
}

// Loads metadata.json (required).
function loadRoomMetadata(roomName) {

    const path = getRoomMetadataPath(roomName);
    const json = readRoomJSONSafe(path);

    return json;
}

// Loads manifest.json (required).
function loadRoomManifest(roomName) {

    const path = getRoomManifestPath(roomName);
    const json = readRoomJSONSafe(path);

    return json;
}

// Loads the entire room, including metadata, manifest, and all JSON files.
function loadRoom(roomName) {

    // Validate room first
    const validation = validateRoom(roomName);
    if (!validation.ok) {
        return validation;
    }

    // Load required files
    const metadata = loadRoomMetadata(roomName);
    const manifest = loadRoomManifest(roomName);

    // Load all JSON files
    const files = loadRoomJSONFiles(roomName);

    // Return full room object
    return {
        ok: true,
        room: {
            name: roomName,
            metadata: metadata,
            manifest: manifest,
            files: files
        }
    };
}

module.exports = {
    loadRoom,
    loadRoomMetadata,
    loadRoomManifest,
    loadRoomJSONFiles
};
