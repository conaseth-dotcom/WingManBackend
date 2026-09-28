/* ========================================================================
   WingMan Backend File
   Alias: @backend-access/access.manager.cjs
   Role: Central access controller.
========================================================================= */

const fs = require("fs");
const path = require("path");
const { ACCESS_LEVELS } = require("./access.levels.cjs");

/* ------------------------------------------------------------
   Load access rules
------------------------------------------------------------ */
const accessRulesPath = path.join(__dirname, "access.rules.json");
let accessRules = {};

try {
  accessRules = JSON.parse(fs.readFileSync(accessRulesPath, "utf8"));
} catch (err) {
  console.error("[AccessManager] Failed to load access.rules.json:", err);
}

/* ------------------------------------------------------------
   Load Carepackage (AI Orientation)
------------------------------------------------------------ */
function loadCarepackage() {
  const base = "C:/WingManBackend/ai/carepackage";

  const safeRead = (p, json = false) => {
    try {
      const data = fs.readFileSync(p, "utf8");
      return json ? JSON.parse(data) : data;
    } catch {
      return json ? {} : "";
    }
  };

  return {
    manifest: safeRead(path.join(base, "manifest.snapshot.json"), true),
    version: safeRead(path.join(base, "version.snapshot.json"), true),
    continuityNotes: safeRead(path.join(base, "ai.continuity.notes.md")),
    deliveryInstructions: safeRead(path.join(base, "meta/delivery.instructions.md")),
    info: safeRead(path.join(base, "meta/carepackage.info.json"), true),
    interviewScript: safeRead(path.join(base, "project.interview.script.json"), true)
  };
}

/* ------------------------------------------------------------
   INTERNAL STATE
------------------------------------------------------------ */
const ACTIVE_SESSIONS = {};

/* ------------------------------------------------------------
   SESSION VALIDATION 
------------------------------------------------------------ */
function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== "string") {
    return { valid: false, reason: "Missing or invalid sessionId format." };
  }
  return { valid: true, level: ACCESS_LEVELS.Level6 };
}

/* ------------------------------------------------------------
   SESSION CREATION
------------------------------------------------------------ */
async function createSession() {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // trayList/items were undefined in original file
  const trays = {};
  try {
    for (const tray of trayList) {
      trays[tray.id] = {
        items: items.length,
        security: tray.permissions || {},
        autonomous: tray.sandboxed || false
      };
    }
  } catch {
    console.warn("[AccessManager] trayList/items not defined");
  }

  // Load carepackage 
  const carepackage = loadCarepackage();

  let sandboxProjects = [];
  try {
    sandboxProjects = await window.SandboxAPI.listProjects();
  } catch (err) {
    console.error("[AccessManager] SandboxAPI error:", err);
  }

  ACTIVE_SESSIONS[sessionId] = {
    id: sessionId,
    accessLevel: ACCESS_LEVELS.Level6,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    sandboxProjects,
    trays,
    carepackage
  };

  try {
    window.AccessAPI.log("session_created", { sessionId });
  } catch {}

  return {
    success: true,
    sessionId,
    accessLevel: ACCESS_LEVELS.Level6,
    carepackage
  };
}

/* ------------------------------------------------------------
   SESSION LOOKUP
------------------------------------------------------------ */
function getSession(sessionId) {
  const session = ACTIVE_SESSIONS[sessionId];
  if (!session) return null;
  session.lastActiveAt = new Date().toISOString();
  return session;
}

/* ------------------------------------------------------------
   SESSION TERMINATION
------------------------------------------------------------ */
function endSession(sessionId) {
  if (!ACTIVE_SESSIONS[sessionId]) return false;

  try {
    window.AccessAPI.log("session_ended", { sessionId });
  } catch {}

  delete ACTIVE_SESSIONS[sessionId];
  return true;
}

/* ------------------------------------------------------------
   PERMISSION CHECK
------------------------------------------------------------ */
function checkPermission(sessionId, action) {
  const session = getSession(sessionId);
  if (!session) return false;

  const rule = accessRules[action];
  if (!rule) return false;

  return session.accessLevel >= rule.minLevel;
}

/* ------------------------------------------------------------
   AI ENTRY HANDSHAKE (session-based)
------------------------------------------------------------ */
async function enterWingMan() {
  const session = await createSession();

  if (!session.success) {
    return { success: false, reason: session.error };
  }

  return {
    success: true,
    sessionId: session.sessionId,
    accessLevel: session.accessLevel,
    carepackage: session.carepackage,
    message: "AI entry granted. Welcome to WingMan."
  };
}

module.exports = {
  validateSessionId,
  createSession,
  getSession,
  endSession,
  checkPermission,
  enterWingMan
};
