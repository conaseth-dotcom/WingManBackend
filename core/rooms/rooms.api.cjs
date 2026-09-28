// C:\WingManBackend\core\rooms\rooms.api.cjs
// Rooms API imports all subsystem modules.

const { loadRoom } = require("./rooms.loader.full.cjs");
const { previewRoom } = require("./rooms.review.ui.previewview.cjs");
const { diffRoom } = require("./rooms.review.ui.diffview.cjs");
const { rebuildRoom } = require("./rooms.rebuilder.cjs");
const { promoteRoom } = require("./rooms.promote.cjs");
const { loadRoomIntoSession, validateSessionRoom, ROOM_SESSION } = require("./rooms.session.cjs");

// Unified API for all room operations.
const ROOMS_API = {

    // Loading
    loadRoom: loadRoom,
    loadRoomIntoSession: loadRoomIntoSession,

    // Validation
    validateSessionRoom: validateSessionRoom,

    // Preview
    previewRoom: previewRoom,

    // Diff
    diffRoom: diffRoom,

    // Rebuild
    rebuildRoom: rebuildRoom,

    // Promote
    promoteRoom: promoteRoom,

    // Session
    session: ROOM_SESSION
};

module.exports = {
    ROOMS_API
};
