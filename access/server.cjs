/* ========================================================================
   WINGMAN ACCESS SUBSYSTEM SERVER (INTERNAL)
   File: C:\WingManBackend\access\server.cjs
   Alias: @backend-access/server.cjs

   PURPOSE:
     - INTERNAL ACCESS SUBSYSTEM ONLY.
     - Handles session entry logic and IPC bindings.
     - Does NOT handle AI providers.
     - Does NOT handle /ai/chat.
     - Does NOT run the main backend server.
     - Used by Electron preload/backend-access modules.

   NOTES:
     - This server is NOT the main backend.
     - This server does NOT communicate with OpenAI.
     - This server does NOT run on port 5174.
     - Only manages WingMan's internal access/session logic.
========================================================================= */

const BASE_URL = "http://localhost:5174";

async function connectAIProvider() {
  try {
    const res = await fetch(`${BASE_URL}/ai/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.warn("[UI] /ai/connect failed:", data.error || res.statusText);
    } else {
      console.log("[UI] AI provider connected.");
    }
  } catch (err) {
    console.error("[UI] /ai/connect error:", err);
  }
}

export async function startSession() {
  // Ensure AI provider is connected before we ever call /ai/chat
  await connectAIProvider();

  const res = await fetch(`${BASE_URL}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`startSession failed with status ${res.status}`);
  }

  const data = await res.json();
  return data; // { sessionId, expiresAt, ok: true }
}

export async function enterSession({ sessionId }) {
  const res = await fetch(`${BASE_URL}/session/enter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `enterSession failed with status ${res.status}`);
  }

  const data = await res.json();
  return data; // { ok, sessionId, accessLevel, message }
}
