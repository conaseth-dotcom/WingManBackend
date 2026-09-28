/* ========================================================================
   WingMan Backend File
   
   Alias: @backend-access/access.api.cjs
   Role: Main access API surface. Exposes session creation, access-level
         utilities, and backend entry points to renderer modules.

   Dependencies:
     - access.manager.cjs
     - access.levels.cjs
     - access.log.cjs

   Change Log:
     - [2026-07-02] Initial header added.

   Architectural Notes:
     - Called by multiple UI subsystems.
     - Must remain stable; do not rename without updating Vite aliases.
========================================================================= */

const API_BASE = "http://localhost:5174"; // adjust if needed

/**
 * Request a new user session from the backend.
 */
async function requestNewSession() {
  const res = await fetch(`${API_BASE}/session/start`, {
    method: "POST"
  });

  if (!res.ok) {
    throw new Error(`Failed to start session: ${res.status}`);
  }

  return res.json(); // { sessionId, expiresAt }
}

/**
 * Enter a session using a sessionId.
 */
async function requestEnterSession(sessionId) {
  const res = await fetch(`${API_BASE}/session/enter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, clientId: "wingman-ui" })
  });

  if (!res.ok) {
    throw new Error(`Failed to enter session: ${res.status}`);
  }

  return res.json();
}

/**
 * High-level helper: start + enter session in one call.
 */
export async function enterWingManWithSession() {
  // 1) Ask backend to create a session
  const { sessionId, expiresAt } = await requestNewSession();

  // 2) Use that sessionId to enter the session
  const session = await requestEnterSession(sessionId);

  // Backend will call window.WingManSetSession(session) internally.
  return {
    ...session,
    expiresAt
  };
}
