// C:\WingManBackend\core\ai\wingman.ai.entry.cjs
// AI entrypoint needs partition loader, rooms API, and carepackage loader.

const { loadPartition } = require("../partition/partition.loader.full.cjs");
const { ROOMS_API } = require("../rooms/rooms.api.cjs");
const { loadCarepackage } = require("../../ai/carepackage/carepackage.loader.cjs");

// Loads partition, rooms, carepackage, canon, continuity.
function loadWingManEnvironment() {

    // Load partition
    const partition = loadPartition();
    if (!partition.ok) {
        return { ok: false, error: "Partition failed to load", details: partition };
    }

    // Load rooms (API already handles loading)
    const rooms = ROOMS_API;

    // Load carepackage
    const carepackage = loadCarepackage();
    if (!carepackage.ok) {
        return { ok: false, error: "Carepackage failed to load", details: carepackage };
    }

    // Load canon
    const canon = loadCanon();
    if (!canon.ok) {
        return { ok: false, error: "Canon failed to load", details: canon };
    }

    // Load continuity
    const continuity = loadContinuity();
    if (!continuity.ok) {
        return { ok: false, error: "Continuity failed to load", details: continuity };
    }

    return {
        ok: true,
        partition: partition,
        rooms: rooms,
        carepackage: carepackage,
        
    };
}

// Assembles the AI's working context.
function buildAIContext(env) {

    return {
        partition: env.partition.data,
        rooms: env.rooms,
        carepackage: env.carepackage.data,
        
    };
}

// Loads WingMan → builds AI context → returns ready-to-use environment.
function enterWingMan() {

    const env = loadWingManEnvironment();
    if (!env.ok) {
        return env;
    }

    const context = buildAIContext(env);

    return {
        ok: true,
        context: context
    };
}

module.exports = {
    loadWingManEnvironment,
    buildAIContext,
    enterWingMan
};
