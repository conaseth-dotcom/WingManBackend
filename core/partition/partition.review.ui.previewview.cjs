// C:\WingManBackend\core\partition\partition.review.ui.previewview.cjs
// Previewview needs the raw preview generator.

const { previewMergedPartition } = require("./partition.review.cjs");

// Converts a preview key/value pair into a UI-friendly object.
function formatPreviewEntry(key, value) {
    return {
        key: key,
        value: value,
        type: typeof value === "object" && value !== null ? "object" : "value"
    };
}

// Converts the preview object into a UI-friendly array.
function buildUIPreview(incomingJSON) {

    // Generate raw preview
    const raw = previewMergedPartition(incomingJSON);

    if (raw.ok === false) {
        return raw;
    }

    const uiList = [];

    // Convert each preview entry
    for (const key of Object.keys(raw.preview)) {

        const value = raw.preview[key];
        const formatted = formatPreviewEntry(key, value);

        uiList.push(formatted);
    }

    // Return UI list
    return {
        ok: true,
        ui: uiList
    };
}

module.exports = { buildUIPreview };
