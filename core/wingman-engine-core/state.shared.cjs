/* ========================================================================
   WingMan Engine Core Shared State (Backend Version, ESM)
   Location: C:/WingManBackend/core/wingman-engine-core/state.shared.cjs
   Role: Shared state primitives for backend engine core.
   ========================================================================= */

export const WM = {
  // React readiness
  reactReady: false,

  // Buffered messages waiting for React
  messageQueue: [],

  // Session info
  session: null,

  // Fullscreen permission callback
  awaitingFullscreen: null,

  // Microphone stream
  micStream: null,

  // Debug flag
  debug: true
};

// Helper: queue a message
export function queueMessage(tab, message) {
  WM.messageQueue.push({ tab, message });
}

// Helper: flush queued messages
export function flushMessageQueue(dispatch) {
  for (const msg of WM.messageQueue) {
    dispatch(msg.tab, msg.message);
  }
  WM.messageQueue.length = 0;
}

export default {
  WM,
  queueMessage,
  flushMessageQueue
};
