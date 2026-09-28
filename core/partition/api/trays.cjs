/* ========================================================================
   WingMan Backend — Legacy Tray API (Disabled for MVP)
   Path: C:/WingManBackend/WingManBackend/core/partition/api/trays.cjs
   Role:
     This module previously auto-created large directory structures on D:
     and caused severe heap explosions at startup.
     For MVP, it is fully disabled.
========================================================================= */

console.log("[WM-PIPE] Loaded: legacy trays.cjs (MVP-disabled)");

export function listTrays() {
  return [];
}

export function getTray() {
  return null;
}

export function mountTray() {
  return null;
}

export function refreshTray() {
  return [];
}

export function getTrayItems() {
  return [];
}

export function setTraySandboxed() {
  return null;
}

export function cycleSecurity() {
  return null;
}

export default {
  listTrays,
  getTray,
  mountTray,
  refreshTray,
  getTrayItems,
  setTraySandboxed,
  cycleSecurity
};
