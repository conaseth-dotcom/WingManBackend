// C:\WingManBackend\core\partition\json.validator.partition.cjs
// Basic schema + structural validation for partition JSON.

function validatePartitionJSON(json) {

    const result = {
        ok: true,
        errors: [],
        warnings: []
    };

    // Must be an object
    if (typeof json !== "object" || json === null || Array.isArray(json)) {
        result.ok = false;
        result.errors.push("Partition JSON must be a non-null object.");
        return result;
    }

    // Required top-level fields
    const requiredFields = ["id", "name", "version", "modules"];

    for (const field of requiredFields) {
        if (!(field in json)) {
            result.ok = false;
            result.errors.push(`Missing required field: '${field}'.`);
        }
    }

    // Type checks
    if (json.id && typeof json.id !== "string") {
        result.ok = false;
        result.errors.push("Field 'id' must be a string.");
    }

    if (json.name && typeof json.name !== "string") {
        result.ok = false;
        result.errors.push("Field 'name' must be a string.");
    }

    if (json.version && typeof json.version !== "string") {
        result.ok = false;
        result.errors.push("Field 'version' must be a string.");
    }

    // Modules must be an array
    if (json.modules && !Array.isArray(json.modules)) {
        result.ok = false;
        result.errors.push("Field 'modules' must be an array.");
    }

    // Optional: validate each module structure
    if (Array.isArray(json.modules)) {
        json.modules.forEach((mod, index) => {
            if (typeof mod !== "object" || mod === null) {
                result.ok = false;
                result.errors.push(`Module at index ${index} must be an object.`);
                return;
            }

            if (!mod.id || typeof mod.id !== "string") {
                result.ok = false;
                result.errors.push(`Module at index ${index} missing valid 'id'.`);
            }

            if (!mod.type || typeof mod.type !== "string") {
                result.ok = false;
                result.errors.push(`Module at index ${index} missing valid 'type'.`);
            }
        });
    }

    return result;
}

module.exports = {
    validatePartitionJSON
};
