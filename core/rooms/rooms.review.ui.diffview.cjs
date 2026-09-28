// C:\WingManBackend\core\rooms\rooms.review.ui.diffview.cjs
// Diff engine needs JSON loading helpers.

const { readRoomJSONSafe } = require("./rooms.fs.cjs");
const { getRoomJSONPath } = require("./rooms.paths.cjs");

// Compares two JSON objects and returns added/removed/changed keys.
function diffJSONObjects(oldObj, newObj) {

    const diff = {
        added: [],
        removed: [],
        changed: []
    };

    // Keys in newObj but not oldObj
    for (const key in newObj) {
        if (!(key in oldObj)) {
            diff.added.push(key);
        }
    }

    // Keys in oldObj but not newObj
    for (const key in oldObj) {
        if (!(key in newObj)) {
            diff.removed.push(key);
        }
    }

    // Keys present in both but with different values
    for (const key in newObj) {
        if (key in oldObj && newObj[key] !== oldObj[key]) {
            diff.changed.push(key);
        }
    }

    return diff;
}

// Compares old and new versions of a single JSON file.
function diffRoomFile(roomName, fileName, oldData) {

    const newPath = getRoomJSONPath(roomName, fileName);
    const newData = readRoomJSONSafe(newPath);

    if (newData === null) {
        return {
            file: fileName,
            error: "File missing or unreadable",
            diff: null
        };
    }

    const diff = diffJSONObjects(oldData, newData);

    return {
        file: fileName,
        diff: diff
    };
}

// Compares old room JSON files with the current room files.
function diffRoom(roomName, oldRoomFiles) {

    const results = [];

    for (const fileName in oldRoomFiles) {

        const oldData = oldRoomFiles[fileName];

        const result = diffRoomFile(roomName, fileName, oldData);

        results.push(result);
    }

    return {
        ok: true,
        diffs: results
    };
}

module.exports = {
    diffJSONObjects,
    diffRoomFile,
    diffRoom
};
