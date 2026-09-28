/* ========================================================================
   WingMan Backend File
   
   Alias: @backend-access/WingManPartitionAPI.cjs
   Role: Partition access API for backend systems. Handles partition-level
         permissions, routing, and secure partition interactions.

   Dependencies:
     - access.manager.cjs
     - access.levels.cjs
     - access.rules.json

   Change Log:
     - [2026-07-02] Initial header added.

   Architectural Notes:
     - Used by renderer partition subsystem.
     - Must remain synchronous-safe for Electron IPC.
========================================================================= */

console.log("[WingManPartitionAPI] Initializing…");

window.WingManPartitionAPI = {
  async addToTray(trayId, trayItem) {
    return window.electronAPI.invoke("tray:add", { trayId, trayItem });
  },

  async listTrayItems(trayId) {
    return window.electronAPI.invoke("tray:list", { trayId });
  },

  async removeTrayItem(trayId, itemName) {
    return window.electronAPI.invoke("tray:remove", { trayId, itemName });
  },

  async syncTray(trayId) {
    return window.electronAPI.invoke("tray:sync", { trayId });
  }
};

console.log("[WingManPartitionAPI] Ready.");
