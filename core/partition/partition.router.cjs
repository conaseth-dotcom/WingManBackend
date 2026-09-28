// C:\WingManBackend\core\partition\partition.router.cjs
// Router needs access to path utilities.
const path = require("path");

// Routing table: maps virtual paths to real directories and filenames.
const ROUTE_TABLE = {
    "wm://ai/continuity": {
        dir: "ai",
        filename: "ai.continuity.notes.md",
        type: "markdown"
    },
    "wm://system/identity": {
        dir: "system",
        filename: "system.identity.json",
        type: "json"
    },
    "wm://settings/user": {
        dir: "settings",
        filename: "settings.user.json",
        type: "json"
    },
    "wm://runtime/session": {
        dir: "runtime",
        filename: "runtime.session.json",
        type: "json"
    },
    "wm://shared/context": {
        dir: "shared",
        filename: "shared.context.json",
        type: "json"
    }
};

// Router: returns routing instructions for a given virtual path.
function routeVirtualPath(virtualPath) {

    // Reject unknown virtual paths
    if (!ROUTE_TABLE.hasOwnProperty(virtualPath)) {
        return {
            ok: false,
            reason: "Unknown virtual path",
            dir: null,
            filename: null,
            type: null
        };
    }

    // Retrieve routing info
    const entry = ROUTE_TABLE[virtualPath];

    // Return routing instructions
    return {
        ok: true,
        dir: entry.dir,
        filename: entry.filename,
        type: entry.type
    };
}

module.exports = { routeVirtualPath };
