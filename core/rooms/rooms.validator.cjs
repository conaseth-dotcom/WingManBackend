// C:\WingManBackend\core\rooms\rooms.validator.cjs
// Validator needs filesystem and path helpers.

const fs = require("fs");
const { readRoomJSONSafe } = require("./rooms.fs.cjs");
const { getRoomDir, getRoomMetadataPath, getRoomManifestPath } = require("./rooms.paths.cjs");

// Validates the room's metadata.json file.
function validateRoomMetadata(roomName) {

    const path = getRoomMetadataPath(roomName);
    const json = readRoomJSONSafe(path);

    if (json === null) {
        return { ok: false, error: "Missing or invalid metadata.json" };
    }

    if (json.name === undefined) {
        return { ok: false, error: "metadata.json missing 'name' field" };
    }

    if (json.version === undefined) {
        return { ok: false, error: "metadata.json missing 'version' field" };
    }

    return { ok: true, metadata: json };
}

// Validates the room's manifest.json file.
function validateRoomManifest(roomName) {

    const path = getRoomManifestPath(roomName);
    const json = readRoomJSONSafe(path);

    if (json === null) {
        return { ok: false, error: "Missing or invalid manifest.json" };
    }

    if (json.layout === undefined) {
        return { ok: false, error: "manifest.json missing 'layout' field" };
    }

    if (json.blocks === undefined) {
        return { ok: false, error: "manifest.json missing 'blocks' field" };
    }

    return { ok: true, manifest: json };
}

// Ensures the room directory exists and contains required files.
function validateRoomStructure(roomName) {

    const dir = getRoomDir(roomName);

    if (!fs.existsSync(dir)) {
        return { ok: false, error: "Room directory does not exist" };
    }

    const metadataPath = getRoomMetadataPath(roomName);
    const manifestPath = getRoomManifestPath(roomName);

    if (!fs.existsSync(metadataPath)) {
        return { ok: false, error: "Room missing metadata.json" };
    }

    if (!fs.existsSync(manifestPath)) {
        return { ok: false, error: "Room missing manifest.json" };
    }

    return { ok: true };
}

// Runs all validation steps for a room.
function validateRoom(roomName) {

    const structure = validateRoomStructure(roomName);
    if (!structure.ok) {
        return structure;
    }

    const metadata = validateRoomMetadata(roomName);
    if (!metadata.ok) {
        return metadata;
    }

    const manifest = validateRoomManifest(roomName);
    if (!manifest.ok) {
        return manifest;
    }

    return {
        ok: true,
        metadata: metadata.metadata,
        manifest: manifest.manifest
    };
}

module.exports = {
    validateRoom,
    validateRoomMetadata,
    validateRoomManifest,
    validateRoomStructure
};
