// C:\WingManBackend\core\partition\partition.loader.cjs
// The floor is NOT lava.
const fs = require("fs");
const path = require("path");

const PARTITION_ROOT = "D:/WingManPartition/metaData";
const VIRTUAL_PREFIX = "wm://";

const PARTITION_MAP = {
    "ai.continuity.notes": {
        dir: "ai",
        filename: "ai.continuity.notes.md",
        virtual: "wm://ai/continuity"
    },
    "system.identity": {
        dir: "system",
        filename: "system.identity.json",
        virtual: "wm://system/identity"
    },
    "settings.user": {
        dir: "settings",
        filename: "settings.user.json",
        virtual: "wm://settings/user"
    },
    "runtime.session": {
        dir: "runtime",
        filename: "runtime.session.json",
        virtual: "wm://runtime/session"
    },
    "shared.context": {
        dir: "shared",
        filename: "shared.context.json",
        virtual: "wm://shared/context"
    }
};

function loadPartition() {
    const result = {};

    for (const key in PARTITION_MAP) {
        const entry = PARTITION_MAP[key];
        const realPath = path.join(PARTITION_ROOT, entry.dir, entry.filename);
        const content = fs.readFileSync(realPath, "utf8");
        result[entry.virtual] = content;
    }

    return result;
}

module.exports = { loadPartition };
