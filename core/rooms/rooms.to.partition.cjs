// C:\WingManBackend\core\rooms\rooms.to.partition.cjs
// Migrator needs room loader, partition paths, and partition writer.

const { loadRoom } = require("./rooms.loader.full.cjs");
const { PARTITION_ROOT } = require("../partition/partition.paths.cjs");
const { writePartitionJSONSafe } = require("../partition/partition.fs.cjs");
const path = require("path");
const fs = require("fs");

// Converts room JSON structure into partition JSON structure.
function transformRoomToPartition(roomData) {

    return {
        roomName: roomData.name,
        metadata: roomData.metadata,
        manifest: roomData.manifest,
        files: roomData.files
    };
}

// Writes transformed JSON into the partition directory.
function writeRoomToPartition(roomName, transformed) {

    const targetDir = path.join(PARTITION_ROOT, "rooms", roomName);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Write metadata.json
    writePartitionJSONSafe(
        path.join(targetDir, "metadata.json"),
        transformed.metadata
    );

    // Write manifest.json
    writePartitionJSONSafe(
        path.join(targetDir, "manifest.json"),
        transformed.manifest
    );

    // Write all other files
    for (const fileName in transformed.files) {
        const fileData = transformed.files[fileName];
        writePartitionJSONSafe(
            path.join(targetDir, fileName),
            fileData
        );
    }

    return {
        ok: true,
        target: targetDir
    };
}

// Loads room → transforms → writes into partition.
function migrateRoomToPartition(roomName) {

    // Load room
    const loaded = loadRoom(roomName);
    if (!loaded.ok) {
        return loaded;
    }

    // Transform
    const transformed = transformRoomToPartition(loaded.room);

    // Write into partition
    const writeResult = writeRoomToPartition(roomName, transformed);

    return {
        ok: true,
        room: roomName,
        partition: writeResult.target
    };
}

module.exports = {
    transformRoomToPartition,
    writeRoomToPartition,
    migrateRoomToPartition
};
