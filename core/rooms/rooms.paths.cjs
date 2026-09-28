// C:\WingManBackend\core\rooms\rooms.paths.cjs
// Path helpers for room directories and files.

const path = require("path");
const { ROOMS_ROOT } = require("./rooms.loader.cjs");

// Returns the absolute path to a room directory.
function getRoomDir(roomName) {
    return path.join(ROOMS_ROOT, roomName);
}

// Returns the absolute path to a JSON file inside a room.
function getRoomJSONPath(roomName, fileName) {
    return path.join(ROOMS_ROOT, roomName, fileName);
}

// Returns the path to the room's metadata file.
function getRoomMetadataPath(roomName) {
    return path.join(ROOMS_ROOT, roomName, "metadata.json");
}

// Returns the path to the room's manifest file.
function getRoomManifestPath(roomName) {
    return path.join(ROOMS_ROOT, roomName, "manifest.json");
}

module.exports = {
    getRoomDir,
    getRoomJSONPath,
    getRoomMetadataPath,
    getRoomManifestPath
};
