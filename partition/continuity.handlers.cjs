/* ========================================================================
   WingMan Backend File
   Path: partition/continuity.handlers.cjs
   Role: Backend continuity check + repair handlers for launcher IPC
========================================================================= */

console.log(">>> [WM-BACKEND] continuity.handlers.cjs loaded");

const fs = require("fs");
const path = require("path");
const { Paths } = require("../core/paths/paths.cjs");

// Load continuity gateway
function loadGateway() {
    const gatewayPath = path.join(
        Paths.getBlackBoxRoot(),
        "relationship",
        "state",
        "continuity.gateway.cjs"
    );

    if (!fs.existsSync(gatewayPath)) {
        throw new Error("Continuity gateway missing at: " + gatewayPath);
    }

    return require(gatewayPath);
}

/* ------------------------------------------------------------
   Check Continuity
------------------------------------------------------------ */
function checkContinuity() {
    try {
        const continuity = loadGateway();
        const state = continuity.loadAll();

        const ok =
            state &&
            state.understanding &&
            state.projectMap &&
            state.preferences;

        return {
            ok,
            state
        };
    } catch (err) {
        console.error("[continuity-check] FAILED:", err);
        return {
            ok: false,
            error: err.message
        };
    }
}

/* ------------------------------------------------------------
   Repair Continuity
------------------------------------------------------------ */
function repairContinuity() {
    try {
        const continuity = loadGateway();

        // Regenerate derived files by writing empty objects
        continuity.writeUnderstanding({});
        continuity.writeProjectMap({});
        continuity.writePreferences({});

        return { ok: true };
    } catch (err) {
        console.error("[continuity-repair] FAILED:", err);
        return {
            ok: false,
            error: err.message
        };
    }
}

module.exports = {
    checkContinuity,
    repairContinuity
};
