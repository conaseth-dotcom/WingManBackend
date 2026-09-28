/* ========================================================================
   WingMan Engine Core (Backend Version, ESM)
   Location: C:/WingManBackend/core/wingman-engine-core/core.bridge.cjs
   Role: Backend-side message queue + IPC dispatch to renderer
   ========================================================================= */

import { WM, queueMessage } from "./state.shared.cjs";
import { ipcMain, BrowserWindow } from "electron";

/**
 * Initialize backend → renderer bridge
 * This version does NOT touch DOM or React directly.
 * It only sets up IPC handlers for preload to forward messages.
 */
export function initBridge() {
  console.log("[WingMan] Backend bridge initialized.");

  // Renderer will notify preload when React is ready.
  ipcMain.on("engine:react-ready", () => {
    console.log("[WingMan] React is ready — flushing queued messages…");

    for (const msg of WM.messageQueue) {
      sendToReact(msg.tab, msg.message);
    }

    WM.messageQueue.length = 0;
    WM.reactReady = true;
  });
}

/**
 * Unified WingMan → React message sender
 * Backend sends messages to preload via IPC.
 */
export function sendToReact(tab, message) {
  if (!WM.reactReady) {
    console.log("[WingMan] React not ready — queueing message:", { tab, message });
    queueMessage(tab, message);
    return;
  }

  const payload = { tab, message };
  const windows = BrowserWindow.getAllWindows();

  if (windows.length > 0) {
    windows[0].webContents.send("engine:message", payload);
  }
}

export default {
  initBridge,
  sendToReact
};
