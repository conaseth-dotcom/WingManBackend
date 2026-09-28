// C:\WingManBackend\core\rooms\rooms.rebuilder.cjs
// Rebuilder needs FS helpers, paths, and validator.

const { writeRoomJSONSafe } = require("./rooms.fs.cjs");
const { getRoomJSONPath } = require("./rooms.paths.cjs");
const { validateRoom } = require("./rooms.validator.cjs");

// Writes updated metadata.json to disk.
function writeMetadata(roomName, metadata) {

    const path = getRoomJSONPath(roomName, "metadata.json");

    return writeRoomJSONSafe(path, metadata);
}

// Writes updated manifest.json to disk.
function writeManifest(roomName, manifest) {

    const path = getRoomJSONPath(roomName, "manifest.json");

    return writeRoomJSONSafe(path, manifest);
}

// Writes all additional JSON files in the room.
function writeRoomFiles(roomName, files) {

    const results = [];

    for (const fileName in files) {

        const data = files[fileName];
        const path = getRoomJSONPath(roomName, fileName);

        const result = writeRoomJSONSafe(path, data);

        results.push(result);
    }

    return results;
}

// Writes metadata, manifest, and all JSON files.
function rebuildRoom(roomName, updatedRoomData) {

    // Validate before writing
    const validation = validateRoom(roomName);
    if (!validation.ok) {
        return validation;
    }

    // Write required files
    const metaResult = writeMetadata(roomName, updatedRoomData.metadata);
    const manifestResult = writeManifest(roomName, updatedRoomData.manifest);

    // Write all other JSON files
    const fileResults = writeRoomFiles(roomName, updatedRoomData.files);

    return {
        ok: true,
        metadata: metaResult,
        manifest: manifestResult,
        files: fileResults
    };
}

module.exports = {
    writeMetadata,
    writeManifest,
    writeRoomFiles,
    rebuildRoom
};
