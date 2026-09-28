/* ========================================================================
   WingMan Backend — Voice Engine Stub (Safe Mode)
   Path: C:/WingManBackend/voice/voice.engine.cjs
========================================================================= */

export const voiceEngine = {
  init() {
    return {
      ok: true,
      reason: "VoiceEngine stub loaded (lazy mode)."
    };
  },

  speak(text, options = {}) {
    return {
      ok: true,
      text,
      options,
      reason: "speak() skipped (stub mode)."
    };
  }
};

export default voiceEngine;
