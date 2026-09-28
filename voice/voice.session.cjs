// @app/renderer/src/WingManBackend/voice/voice.session.cjs
// Session manager for WingMan voice chat.
import { voiceEngine } from "./voice.engine.cjs";
import { voiceTransport } from "./voice.transport.cjs";

class VoiceSession {
  constructor() {
    this.session = null;

    // UI hooks
    this.onSessionReady = null;
    this.onStatusChange = null;
    this.onError = null;

    this.isInitialized = false;
  }

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  /**
   * Initialize the session manager.
   * @param {object} options
   * @param {function} [options.onSessionReady]
   * @param {function} [options.onStatusChange]
   * @param {function} [options.onError]
   */
  init(options = {}) {
    const { onSessionReady, onStatusChange, onError } = options;

    if (onSessionReady) this.onSessionReady = onSessionReady;
    if (onStatusChange) this.onStatusChange = onStatusChange;
    if (onError) this.onError = onError;

    this.isInitialized = true;
  }

  /**
   * Receive a session object from the backend.
   * @param {object} session - { sessionId, validated?, world? }
   */
  async setSession(session) {
    if (!this.isInitialized) {
      console.warn("[VoiceSession] init() was not called before setSession(). Auto-initializing.");
      this.isInitialized = true;
    }

    this.session = session;

    // Notify UI
    if (this.onSessionReady) {
      try {
        this.onSessionReady(session);
      } catch (err) {
        this.#emitError(err);
      }
    }

    // Hand session to voice engine
    voiceEngine.setSession(session);

    // Start voice engine (logic only; mic is started separately)
    await voiceEngine.init({
      session,
      onVoiceChunk: (chunk, meta) => {
        // Forward audio chunks to transport
        voiceTransport.sendAudioChunk(chunk, meta);
      },
      onStateChange: (state) => {
        this.#emitStatus({
          ...state,
          connected: voiceTransport.isConnected
        });
      },
      onError: (err) => this.#emitError(err)
    });

    // Start transport (WebSocket)
    voiceTransport.init({
      session,
      onStatusChange: (status) => {
        this.#emitStatus({
          ...status,
          isListening: voiceEngine.isListening,
          isSpeaking: voiceEngine.isSpeaking
        });
      },
      onError: (err) => this.#emitError(err)
    });
  }

  /**
   * Get the current session.
   */
  getSession() {
    return this.session;
  }

  /**
   * Shut down everything.
   */
  async destroy() {
    try {
      voiceTransport.close();
      await voiceEngine.destroy();
    } catch (err) {
      this.#emitError(err);
    }
  }

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------

  #emitStatus(status) {
    if (this.onStatusChange) {
      try {
        this.onStatusChange(status);
      } catch (err) {
        this.#emitError(err);
      }
    }
  }

  #emitError(err) {
    console.error("[VoiceSession] Error:", err);
    if (this.onError) {
      try {
        this.onError(err);
      } catch (e) {
        console.error("[VoiceSession] Error in onError handler:", e);
      }
    }
  }
}

// Export singleton
export const voiceSession = new VoiceSession();
