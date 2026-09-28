// C:\WingManBackend\core\rooms\rooms.review.ui.previewview.cjs
// Preview engine needs full room loader.

const { loadRoom } = require("./rooms.loader.full.cjs");

// Extracts the layout from the loaded room.
function extractLayout(roomData) {

    if (roomData.manifest.layout === undefined) {
        return null;
    }

    return roomData.manifest.layout;
}

// Extracts blocks from the loaded room.
function extractBlocks(roomData) {

    if (roomData.manifest.blocks === undefined) {
        return [];
    }

    return roomData.manifest.blocks;
}

// Builds a UI-friendly preview object.
function buildRoomPreview(roomData) {

    const layout = extractLayout(roomData);
    const blocks = extractBlocks(roomData);

    return {
        name: roomData.name,
        metadata: roomData.metadata,
        layout: layout,
        blocks: blocks,
        files: roomData.files
    };
}

// Loads a room and returns its preview structure.
function previewRoom(roomName) {

    const loaded = loadRoom(roomName);

    if (!loaded.ok) {
        return loaded;
    }

    const preview = buildRoomPreview(loaded.room);

    return {
        ok: true,
        preview: preview
    };
}

module.exports = {
    extractLayout,
    extractBlocks,
    buildRoomPreview,
    previewRoom
};
