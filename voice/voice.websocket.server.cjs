// @app/renderer/src/WingManBackend/voice/voice.websocket.server.cjs
// Voice WebSocket Backend with Whisper STT + AI Connection Events

console.log(">>> [WM-FILE-LOAD] voice.websocket.server.cjs loaded");

const { WebSocketServer } = require("ws");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

// ⭐ Connect voice server to BlackBox
const { BlackBox } = require("../BlackBox/blackbox.runtime.cjs");

const PORT = 3001;
const SAMPLE_RATE = 48000;
const CHUNK_SIZE = 2048;
const CHUNKS_PER_BATCH = 6;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!openai.apiKey) {
  console.warn("[VoiceWS] WARNING: OPENAI_API_KEY is not set. OpenAI calls will fail.");
}

console.log(">>> RUNNING VOICE WEBSOCKET BACKEND (Whisper + BlackBox + AI-State) <<<");

const wss = new WebSocketServer({
  port: PORT,
  path: "/voice"
});

wss.on("listening", () => {
  console.log(`Voice WebSocket server listening on ws://localhost:${PORT}/voice`);
});

// ⭐ Helper: broadcast AI connection/activity state to all clients
function broadcastAIConnection(state, details = {}) {
  const payload = {
    type: "ai-connection",
    state,
    ...details
  };

  const msg = JSON.stringify(payload);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      try {
        client.send(msg);
      } catch (err) {
        console.error("[VoiceWS] Failed to broadcast ai-connection:", err);
      }
    }
  });

  console.log("[VoiceWS] AI-Connection broadcast:", payload);
}

// Per-connection state
function createSessionState() {
  return {
    sessionId: null,
    pcmChunks: [],
    totalSamples: 0,
    isTranscribing: false
  };
}

// WAV encoder: Float32 -> 16-bit PCM WAV
function float32ToWavBuffer(float32Samples, sampleRate) {
  const numSamples = float32Samples.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * 1;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let offset = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  }

  function writeUint32(value) {
    view.setUint32(offset, value, true);
    offset += 4;
  }

  function writeUint16(value) {
    view.setUint16(offset, value, true);
    offset += 2;
  }

  writeString("RIFF");
  writeUint32(36 + dataSize);
  writeString("WAVE");

  writeString("fmt ");
  writeUint32(16);
  writeUint16(1);
  writeUint16(1);
  writeUint32(sampleRate);
  writeUint32(byteRate);
  writeUint16(blockAlign);
  writeUint16(16);

  writeString("data");
  writeUint32(dataSize);

  let sampleOffset = 44;
  for (let i = 0; i < numSamples; i++) {
    let s = float32Samples[i];
    s = Math.max(-1, Math.min(1, s));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(sampleOffset, int16, true);
    sampleOffset += 2;
  }

  return Buffer.from(buffer);
}

// Voice picker based on reply tone
function pickVoiceForReply(replyText) {
  const text = (replyText || "").toLowerCase();

  if (
    text.includes("step") ||
    text.includes("walk you through") ||
    text.includes("explain")
  ) {
    return "sage";
  }

  if (
    text.includes("excited") ||
    text.includes("let's go") ||
    text.includes("this is fun")
  ) {
    return "alloy";
  }

  return "ember";
}

// Concatenate Float32Array chunks
function concatFloat32Arrays(chunks, totalSamples) {
  const out = new Float32Array(totalSamples);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

wss.on("connection", (socket, req) => {
  console.log("[VoiceWS] Client connected:", req.url);

  const state = createSessionState();

  broadcastAIConnection("connected", { sessionId: state.sessionId });
  broadcastAIConnection("idle", { sessionId: state.sessionId });

  socket.on("message", async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.error("[VoiceWS] Invalid JSON message:", err);
      try {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Invalid JSON in WebSocket message."
          })
        );
      } catch {}
      broadcastAIConnection("error", { message: "invalid_json" });
      return;
    }

    switch (msg.type) {
      case "session_start": {
        state.sessionId = msg.session?.sessionId ?? null;
        console.log("[VoiceWS] Session start:", state.sessionId);

        broadcastAIConnection("connected", { sessionId: state.sessionId });
        broadcastAIConnection("listening", { sessionId: state.sessionId });

        socket.send(
          JSON.stringify({
            type: "text_reply",
            text: "Voice session established.",
            voice: "alloy"
          })
        );
        break;
      }

      case "audio_chunk": {
        const pcmArray = Array.isArray(msg.pcm) ? msg.pcm : [];
        const pcmChunk = new Float32Array(pcmArray);
        const rms = msg.rms ?? 0;

        console.log("[VoiceWS] Audio chunk received:", {
          sessionId: state.sessionId,
          rms,
          samples: pcmChunk.length
        });

        broadcastAIConnection("listening", {
          sessionId: state.sessionId,
          rms
        });

        state.pcmChunks.push(pcmChunk);
        state.totalSamples += pcmChunk.length;

        const neededSamples = CHUNKS_PER_BATCH * CHUNK_SIZE;

        if (
          state.totalSamples >= neededSamples &&
          !state.isTranscribing &&
          openai.apiKey
        ) {
          state.isTranscribing = true;

          const float32Batch = concatFloat32Arrays(
            state.pcmChunks,
            state.totalSamples
          );

          state.pcmChunks = [];
          state.totalSamples = 0;

          const wavBuffer = float32ToWavBuffer(float32Batch, SAMPLE_RATE);

          const tmpFile = path.join(
            process.cwd(),
            `wm-audio-${Date.now()}-${Math.random()
              .toString(16)
              .slice(2)}.wav`
          );

          try {
            broadcastAIConnection("thinking", { sessionId: state.sessionId });

            fs.writeFileSync(tmpFile, wavBuffer);

            const transcription = await openai.audio.transcriptions.create({
              file: fs.createReadStream(tmpFile),
              model: "whisper-1"
            });

            const text = transcription?.text?.trim() || "";
            console.log("[VoiceWS] Whisper text:", text || "<empty>");

            if (text) {
              const reply = await BlackBox.handleUserMessage(text);

              const chosenVoice = pickVoiceForReply(reply);

              try {
                const audioResponse = await openai.audio.speech.create({
                  model: "gpt-4o-mini-tts",
                  voice: chosenVoice,
                  input: reply
                });

                const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
                const audioBase64 = audioBuffer.toString("base64");

                socket.send(
                  JSON.stringify({
                    type: "audio_reply",
                    audioBase64
                  })
                );
              } catch (ttsErr) {
                console.error("[VoiceWS] TTS error:", ttsErr);
              }

              broadcastAIConnection("speaking", {
                sessionId: state.sessionId,
                textLength: reply?.length || 0
              });

              socket.send(
                JSON.stringify({
                  type: "text_reply",
                  text: reply,
                  voice: chosenVoice
                })
              );

              broadcastAIConnection("idle", { sessionId: state.sessionId });
            } else {
              broadcastAIConnection("listening", { sessionId: state.sessionId });
            }
          } catch (err) {
            console.error("[VoiceWS] STT/Chat error:", err);

            broadcastAIConnection("error", {
              sessionId: state.sessionId,
              message: "stt_or_chat_error"
            });

            socket.send(
              JSON.stringify({
                type: "text_reply",
                text:
                  "I tried to listen and respond, but something went wrong in my speech processing.",
                voice: "sage"
              })
            );

            broadcastAIConnection("idle", { sessionId: state.sessionId });
          } finally {
            state.isTranscribing = false;
            try {
              fs.unlink(tmpFile, () => {});
            } catch {}
          }
        }

        break;
      }

      default: {
        console.log("[VoiceWS] Unknown message type:", msg.type);
        break;
      }
    }
  });

  socket.on("close", () => {
    console.log("[VoiceWS] Client disconnected.");

    broadcastAIConnection("disconnected", { sessionId: state.sessionId });
  });

  socket.on("error", (err) => {
    console.error("[VoiceWS] Socket error:", err);

    broadcastAIConnection("error", {
      sessionId: state.sessionId,
      message: "socket_error"
    });
  });
});

wss.on("error", (err) => {
  console.error("[VoiceWS] Server error:", err);

  broadcastAIConnection("error", {
    message: "server_error"
  });
});
