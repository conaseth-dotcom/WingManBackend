// C:\WingManBackend\core\partition\json.validator.partition.cjs
// Validator needs access to JSON parsing and routing.
const { routeVirtualPath } = require("./partition.router.cjs");

// Defines expected structure for each partition JSON file.
const SCHEMA_MAP = {
    "wm://system/identity": {
        requiredFields: ["id", "name", "version"],
        optionalFields: ["description", "tags"]
    },
    "wm://settings/user": {
        requiredFields: ["theme", "fontSize", "notifications"],
        optionalFields: ["shortcuts", "layout"]
    },
    "wm://runtime/session": {
        requiredFields: ["sessionId", "startedAt", "lastActive"],
        optionalFields: ["activeProject", "notes"]
    },
    "wm://shared/context": {
        requiredFields: ["projects", "recentFiles"],
        optionalFields: ["favorites", "tags"]
    }
};

// Validates JSON syntax, routing, and schema shape.
function validatePartitionJson(virtualPath, rawContent) {

    // 1. Check routing
    const route = routeVirtualPath(virtualPath);

    if (!route.ok) {
        return {
            ok: false,
            reason: "Invalid virtual path",
            errors: ["Router rejected virtual path."]
        };
    }

    // 2. Check type (must be JSON, not markdown)
    if (route.type !== "json") {
        return {
            ok: false,
            reason: "Type mismatch",
            errors: ["Expected JSON, but route type is not json."]
        };
    }

    // 3. Parse JSON
    let parsed;
    try {
        parsed = JSON.parse(rawContent);
    } catch (error) {
        return {
            ok: false,
            reason: "Invalid JSON syntax",
            errors: ["JSON.parse failed.", error.message]
        };
    }

    // 4. Schema lookup
    if (!SCHEMA_MAP.hasOwnProperty(virtualPath)) {
        return {
            ok: false,
            reason: "No schema defined",
            errors: ["No schema found for virtual path."]
        };
    }

    const schema = SCHEMA_MAP[virtualPath];

    // 5. Required fields check
    const missing = [];

    for (const field of schema.requiredFields) {
        if (parsed[field] === undefined) {
            missing.push(field);
        }
    }

    if (missing.length > 0) {
        return {
            ok: false,
            reason: "Missing required fields",
            errors: ["Missing: " + missing.join(", ")]
        };
    }

    // 6. Success
    return {
        ok: true,
        reason: "Valid partition JSON",
        errors: [],
        parsed,
        route
    };
}

module.exports = { validatePartitionJson };
