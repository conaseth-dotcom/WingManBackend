/* ========================================================================
   WingMan Engine Core File
   Path: C:/WingMan/projects/Electron/WingManBackend/core/wingman-engine-core/core.state.cjs
   Alias: @backend-core/wingman-engine-core/core.state.cjs
   Role: Maintains internal engine state for WingMan, including runtime
         flags, subsystem readiness, and shared state synchronization.

   Dependencies:
     - ./state.shared.cjs
     - ../state.cjs

   Architectural Notes:
     - Must remain the authoritative state container for engine runtime.
     - Must not expose internal state directly; use core.bridge.cjs.
     - Must ensure deterministic state transitions and controlled updates.
========================================================================= */

export function initState() {
  window.reactChatReady = false;
  window.bufferedMessages = [];
  window.WingManSession = null;
}
