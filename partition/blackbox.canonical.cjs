// D:\WingMan\WingManBackend\partition\blackbox.canonical.cjs
// Canonical originals for rebuilding the WingMan BlackBox.
// Every entry corresponds to a file that can be reconstructed if missing.

module.exports = [

    //
    // ────────────────────────────────────────────────
    // CAREPACKAGE IDENTITY LAYER
    // ────────────────────────────────────────────────
    //
    {
        dir: "relationship/meta",
        filename: "carepackage.info.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/carepackage.info/1.1.0",
            "name": "WingMan Carepackage",
            "version": "1.1.0",
            "description": "Canonical carepackage identity for WingMan AI."
        }
    },
    {
        dir: "relationship/meta",
        filename: "delivery.instructions.md",
        type: "markdown",
        content: "# WingMan Carepackage Delivery Instructions\n\nThis file describes how the carepackage is delivered into the AI partition."
    },
    {
        dir: "relationship/meta",
        filename: "manifest.snapshot.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/carepackage.manifest-snapshot/1.1.0",
            "files": []
        }
    },
    {
        dir: "relationship/meta",
        filename: "version.snapshot.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/carepackage.version-snapshot/1.1.0",
            "version": "1.1.0"
        }
    },

    //
    // ────────────────────────────────────────────────
    // RELATIONSHIP ENGINE (CONSTITUTIONAL)
    // ────────────────────────────────────────────────
    //
    {
        dir: "relationship",
        filename: "ethics.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.ethics/1.1.0", "rules": [] }
    },
    {
        dir: "relationship",
        filename: "communication.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.communication/1.1.0", "rules": [] }
    },
    {
        dir: "relationship",
        filename: "collaboration.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.collaboration/1.0.0", "rules": [] }
    },
    {
        dir: "relationship",
        filename: "flow.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.flow/1.1.0", "rules": [] }
    },
    {
        dir: "relationship",
        filename: "memory.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.memory/1.1.0", "rules": [] }
    },
    {
        dir: "relationship",
        filename: "priorities.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.priorities/1.1.0", "rules": [] }
    },
    {
        dir: "relationship",
        filename: "onboarding.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.onboarding/1.0.0", "steps": [] }
    },
    {
        dir: "relationship",
        filename: "initialization.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.initialization/1.1.0", "steps": [] }
    },
    {
        dir: "relationship",
        filename: "profile.json",
        type: "json",
        content: { "$schema": "wm://schemas/relationship.profile/1.1.0", "traits": [] }
    },
    {
        dir: "relationship",
        filename: "relationship.index.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/relationship.index/1.1.0",
            "version": "1.1.0",
            "model": {
                "ethics": [],
                "priorities": [],
                "advocacy": [],
                "stability": [],
                "initialization": [],
                "onboarding": [],
                "profile": [],
                "communication": [],
                "collaboration": [],
                "flow": [],
                "memory": []
            }
        }
    },
    {
        dir: "relationship",
        filename: "relationship.engine.config.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/relationship.engine.config/1.1.0",
            "version": "1.1.0"
        }
    },

    //
    // ────────────────────────────────────────────────
    // CONTINUITY LAYER
    // ────────────────────────────────────────────────
    //
    {
        dir: "relationship/state",
        filename: "ai.project.map.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/ai.project.map/1.1.0",
            "projects": []
        }
    },
    {
        dir: "relationship/state",
        filename: "ai.understanding.snapshot.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/ai.understanding.snapshot/1.1.0",
            "understanding": {}
        }
    },
    {
        dir: "relationship/state",
        filename: "preferences.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/preferences.state/1.1.0",
            "preferences": {}
        }
    },

    //
    // ────────────────────────────────────────────────
    // ACCESS LAYER
    // ────────────────────────────────────────────────
    //
    {
        dir: "core/access",
        filename: "access.rules.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/access.rules/1.1.0",
            "version": "1.1.0",
            "ai.enter": {
                "minLevel": 6,
                "description": "Allow AI to enter WingMan DMZ."
            }
        }
    },

    //
    // ────────────────────────────────────────────────
    // PROJECT IDENTITY
    // ────────────────────────────────────────────────
    //
    {
        dir: "relationship/meta",
        filename: "project.manifest.json",
        type: "json",
        content: {
            "$schema": "wm://schemas/project.manifest/1.1.0",
            "name": "WingMan",
            "version": "1.1.0"
        }
    },

    //
    // ────────────────────────────────────────────────
    // UI SCHEMAS
    // ────────────────────────────────────────────────
    //
    {
        dir: "ui",
        filename: "WM.UI.Command.Fullscreen.schema.json",
        type: "json",
        content: {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "WingMan Fullscreen Command",
            "type": "object"
        }
    },
    {
        dir: "ui",
        filename: "WM.UI.Command.NotebookView.schema.json",
        type: "json",
        content: {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "WingMan Notebook Viewer Command",
            "type": "object"
        }
    },

    //
    // ────────────────────────────────────────────────
    // AI ENTRY PROTOCOL + README
    // ────────────────────────────────────────────────
    //
    {
        dir: "relationship/meta",
        filename: "ai.entry.protocol.md",
        type: "markdown",
        content: "# AI Entry Protocol\n\nDefines how WingMan enters the DMZ."
    },
    {
        dir: "relationship/core",
        filename: "AI-README.md",
        type: "markdown",
        content: "# WingMan AI README\n\nCanonical orientation document for WingMan AI."
    }
];
