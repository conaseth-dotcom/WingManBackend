// @app/renderer/src/WingManBackend/voice/voice.transport.cjs
// Transport layer for WingMan voice chat.
// Mic PCM → WebSocket → AI → audio replies → voiceEngine.
// Also forwards backend AI-connection/activity events into the frontend.

const { voiceEngine } = require("./voice.engine.cjs");

const DEFAULT_CONFIG = {
  wsUrl: "ws://localhost:5174/voice",
  reconnectDelay: 1500,
  maxReconnectAttempts: 3
};

class VoiceTransport {
  constructor() {
    this.ws = null;
    this.session = null;
    this.config = { ...DEFAULT_CONFIG };

    this.isConnected = false;
    this.reconnectAttempts = 0;

    this.onStatusChange = null;
    this.onError = null;
  }

  init(options = {}) {
    const {
      session,
      config = {},
      onStatusChange,
      onError
    } = options;

    this.session = session;
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (onStatusChange) this.onStatusChange = onStatusChange;
    if (onError) this.onError = onError;

    this.#connect();
  }

  sendAudioChunk(pcmChunk, meta = {}) {
    if (!this.isConnected || !this.ws) return;

    try {
      const payload = {
        type: "audio_chunk",
        session: this.session,
        timestamp: meta.timestamp || Date.now(),
        rms: meta.rms || 0,
        pcm: Array.from(pcmChunk)
      };

      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      this.#emitError(err);
    }
  }

  close() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.#emitStatus(false);
    this.#forwardAIConnectionState("disconnected");
  }

  #connect() {
    try {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.#emitStatus(false);

        this.ws.send(
          JSON.stringify({
            type: "session_start",
            session: this.session
          })
        );

        this.#forwardAIConnectionState("connected");
      };

      this.ws.onmessage = (event) => this.#handleMessage(event);

      this.ws.onerror = (err) => {
        this.#emitError(err);
        this.#forwardAIConnectionState("error");
      };

      this.ws.onclose = () => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.#emitStatus(false);

        this.#forwardAIConnectionState("disconnected");

        if (!wasConnected || this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.#attemptReconnect();
        }
      };
    } catch (err) {
      this.#emitError(err);
      this.#forwardAIConnectionState("error");
      this.#attemptReconnect();
    }
  }

  #attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.#emitError(new Error("Max reconnect attempts reached. Voice transport idle."));
      return;
    }

    this.reconnectAttempts++;
    this.#emitStatus(true);

    setTimeout(() => {
      this.#connect();
    }, this.config.reconnectDelay);
  }

  async #handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "audio_reply": {
          if (data.audioBase64) {
            const audioBuffer = this.#base64ToArrayBuffer(data.audioBase64);
            await voiceEngine.playReplyAudio(audioBuffer);
          }
          break;
        }

        case "text_reply": {
          console.log("[VoiceTransport] AI says:", data.text);
          break;
        }

        case "ai-connection": {
          this.#handleAIConnectionEvent(data);
          break;
        }

        case "error": {
          this.#emitError(new Error(data.message));
          this.#forwardAIConnectionState("error");
          break;
        }

        default: {
          console.warn("[VoiceTransport] Unknown message type:", data.type);
        }
      }
    } catch (err) {
      this.#emitError(err);
      this.#forwardAIConnectionState("error");
    }
  }

  #handleAIConnectionEvent(data) {
    const state = data.state || "idle";

    console.log("[VoiceTransport] AI-Connection event:", state, data);

    if (state === "connected") {
      this.isConnected = true;
      this.#emitStatus(false);
    } else if (state === "disconnected") {
      this.isConnected = false;
      this.#emitStatus(false);
    }

    this.#forwardAIConnectionState(state);
  }

  #forwardAIConnectionState(state) {
    try {
      if (typeof window !== "undefined" && typeof window.WingManSetAIActivity === "function") {
        window.WingManSetAIActivity(state);
      }

      if (typeof window !== "undefined" && typeof window.WingManLanternGlow === "function") {
        window.WingManLanternGlow(state === "thinking");
      }

      if (typeof window !== "undefined" && typeof window.WingManOnAIConnectionEvent === "function") {
        window.WingManOnAIConnectionEvent({
          state,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error("[VoiceTransport] Error forwarding AI-connection state:", err);
    }
  }

  #emitStatus(reconnecting = false) {
    if (this.onStatusChange) {
      try {
        this.onStatusChange({
          connected: this.isConnected,
          reconnecting,
          attempts: this.reconnectAttempts
        });
      } catch (err) {
        this.#emitError(err);
      }
    }
  }

  #emitError(err) {
    console.error("[VoiceTransport] Error:", err);
    if (this.onError) {
      try {
        this.onError(err);
      } catch (e) {
        console.error("[VoiceTransport] Error in onError handler:", e);
      }
    }
  }

  #base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

const voiceTransport = new VoiceTransport();

module.exports = {
  voiceTransport
};
