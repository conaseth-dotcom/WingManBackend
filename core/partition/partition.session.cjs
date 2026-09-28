// C:\WingManBackend\core\partition\partition.session.cjs
// Session needs diff, preview, and validator helpers.

const { diffPartitionJSON, previewMergedPartition } = require("./partition.review.cjs");
const { validatePartitionJSON } = require("./json.validator.partition.cjs");

// In-memory session state for partition operations.
const SESSION = {
    incoming: null,
    diff: null,
    preview: null,
    validation: null,
    timestamp: null
};

// Stores incoming JSON and updates timestamp.
function loadIncomingJSON(json) {

    SESSION.incoming = json;
    SESSION.timestamp = Date.now();

    return {
        ok: true,
        incoming: SESSION.incoming
    };
}

// Computes diff and stores it in session.
function computeSessionDiff() {

    const result = diffPartitionJSON(SESSION.incoming);

    SESSION.diff = result;

    return result;
}

// Computes preview and stores it in session.
function computeSessionPreview() {

    const result = previewMergedPartition(SESSION.incoming);

    SESSION.preview = result;

    return result;
}

// Validates incoming JSON and stores result.
function validateSessionJSON() {

    const result = validatePartitionJSON(SESSION.incoming);

    SESSION.validation = result;

    return result;
}

module.exports = {
    SESSION,
    loadIncomingJSON,
    computeSessionDiff,
    computeSessionPreview,
    validateSessionJSON
};
