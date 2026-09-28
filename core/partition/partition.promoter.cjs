// C:\WingManBackend\core\partition\partition.promoter.cjs
// Promoter needs validator, writer, merge logic, and rebuilder safety.

const { partitionIsMissing, rebuildPartition } = require("./partition.rebuilder.cjs");
const validatePartitionJSON = require("./json.validator.partition.cjs");
const writePartitionJSON = require("./json.writer.cjs");
const mergePartitionJSON = require("./partition.merge.cjs");

// Promotes validated JSON into the partition.
function promotePartitionJSON(inputJSON) {

    // 1. If partition is missing, rebuild it first
    if (partitionIsMissing() === true) {
        rebuildPartition();
    }

    // 2. Validate incoming JSON
    const validation = validatePartitionJSON(inputJSON);

    if (validation.ok === false) {
        return {
            ok: false,
            reason: "Validation failed",
            errors: validation.errors
        };
    }

    // 3. Merge incoming JSON with existing partition data
    const merged = mergePartitionJSON(validation.cleaned);

    if (merged.ok === false) {
        return {
            ok: false,
            reason: "Merge failed",
            errors: merged.errors
        };
    }

    // 4. Write merged JSON into the partition
    const writeResult = writePartitionJSON(merged.output);

    if (writeResult.ok === false) {
        return {
            ok: false,
            reason: "Write failed",
            errors: writeResult.errors
        };
    }

    // 5. Return success
    return {
        ok: true,
        reason: "Partition updated successfully",
        promoted: true
    };
}

module.exports = { promotePartitionJSON };
