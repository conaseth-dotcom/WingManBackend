// C:\WingManBackend\core\partition\partition.review.cjs
// Review module needs merge logic and existing partition loader.

const { loadExistingPartitionJSON } = require("./partition.merge.cjs");
const { mergePartitionJSON } = require("./partition.merge.cjs");

// Computes a shallow diff between existing and incoming JSON.
function diffPartitionJSON(incomingJSON) {

    // Load existing partition JSON
    const existing = loadExistingPartitionJSON();

    // Prepare diff output
    const diff = {};

    // Check keys in incoming JSON
    for (const key of Object.keys(incomingJSON)) {

        if (existing[key] === undefined) {
            diff[key] = {
                status: "added",
                before: null,
                after: incomingJSON[key]
            };
        } else if (JSON.stringify(existing[key]) !== JSON.stringify(incomingJSON[key])) {
            diff[key] = {
                status: "modified",
                before: existing[key],
                after: incomingJSON[key]
            };
        }
    }

    // Check keys removed from incoming JSON
    for (const key of Object.keys(existing)) {

        if (incomingJSON[key] === undefined) {
            diff[key] = {
                status: "removed",
                before: existing[key],
                after: null
            };
        }
    }

    // Return diff
    return {
        ok: true,
        diff: diff
    };
}

// Returns a preview of what the partition would look like after merge.
function previewMergedPartition(incomingJSON) {

    // Merge incoming JSON with existing partition
    const merged = mergePartitionJSON(incomingJSON);

    if (merged.ok === false) {
        return {
            ok: false,
            reason: "Merge failed",
            errors: merged.errors
        };
    }

    // Return preview
    return {
        ok: true,
        preview: merged.output
    };
}

module.exports = { diffPartitionJSON, previewMergedPartition };
