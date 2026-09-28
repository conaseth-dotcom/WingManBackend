// C:\WingManBackend\core\rooms\rooms.session.cjs
// Session needs the full room loader and validator.

const { loadRoom } = require("./rooms.loader.full.cjs");
const { validateRoom } = require("./rooms.validator.cjs");

// In-memory session state for room operations.
const ROOM_SESSION = {
    roomName: null,
    roomData: null,
    validation: null,
    timestamp: null
};

// Loads a room and stores it in session.
function loadRoomIntoSession(roomName) {

    const loaded = loadRoom(roomName);

    if (!loaded.ok) {
        return loaded;
    }

    ROOM_SESSION.roomName = roomName;
    ROOM_SESSION.roomData = loaded.room;
    ROOM_SESSION.timestamp = Date.now();

    return {
        ok: true,
        room: ROOM_SESSION.roomData
    };
}

// Validates the room currently stored in session.
function validateSessionRoom() {

    if (ROOM_SESSION.roomName === null) {
        return { ok: false, error: "No room loaded in session" };
    }

    const result = validateRoom(ROOM_SESSION.roomName);

    ROOM_SESSION.validation = result;

    return result;
}

module.exports = {
    ROOM_SESSION,
    loadRoomIntoSession,
    validateSessionRoom
};
