// C:\WingManBackend\core\partition\partition.review.ui.diffview.cjs
// UI diffview needs the raw diff generator.

const { diffPartitionJSON } = require("./partition.review.cjs");

// Converts a raw diff entry into a UI-friendly object.
function formatDiffEntry(key, entry) {

    const uiEntry = {
        key: key,
        status: entry.status,
        before: entry.before,
        after: entry.after,
        icon: null,
        color: null,
        summary: null
    };

    if (entry.status === "added") {
        uiEntry.icon = "➕";
        uiEntry.color = "green";
        uiEntry.summary = "Added";
    }

    if (entry.status === "modified") {
        uiEntry.icon = "✏️";
        uiEntry.color = "yellow";
        uiEntry.summary = "Modified";
    }

    if (entry.status === "removed") {
        uiEntry.icon = "❌";
        uiEntry.color = "red";
        uiEntry.summary = "Removed";
    }

    return uiEntry;
}

// Converts the entire diff object into a UI-friendly array.
function buildUIDiff(incomingJSON) {

    // Generate raw diff
    const raw = diffPartitionJSON(incomingJSON);

    if (raw.ok === false) {
        return raw;
    }

    const uiList = [];

    // Convert each diff entry
    for (const key of Object.keys(raw.diff)) {

        const entry = raw.diff[key];
        const formatted = formatDiffEntry(key, entry);

        uiList.push(formatted);
    }

    // Return UI list
    return {
        ok: true,
        ui: uiList
    };
}

module.exports = { buildUIDiff };
