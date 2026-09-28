// tts_piper/service.cjs — Unified Piper TTS Engine (CommonJS)

const fs = require("fs");
const path = require("path");

// Piper ONNX runtime wrapper (your CJS loader)
const PiperModel = require("./model_loader.cjs");

class PiperService {
  constructor({ voice, sampleRate }) {
    this.voice = voice;
    this.sampleRate = sampleRate;

    // Resolve backend root (WingManBackend/)
    const backendRoot = path.resolve(__dirname, "..");

    // Piper model directory (relative, portable)
    this.voiceDir = path.join(
      backendRoot,
      "piper_cli",
      "piper_windows_amd64",
      "piper",
      "models"
    );

    // ONNX model path
    this.modelPath = path.join(this.voiceDir, `${voice}.onnx`);

    // Load ONNX model
    this.model = new PiperModel(this.modelPath, { sampleRate });
  }

  // ---------------------------------------------------------------------------
  // speak(text) → returns WAV bytes
  // ---------------------------------------------------------------------------
  async speak(text) {
    const pcmData = await this.model.synthesize(text);
    return this._pcmToWav(pcmData, this.sampleRate);
  }

  // ---------------------------------------------------------------------------
  // stream(text, onChunk) → yields PCM chunks
  // ---------------------------------------------------------------------------
  async stream(text, onChunk) {
    await this.model.synthesizeStream(text, chunk => {
      const wavChunk = this._pcmToWav(chunk, this.sampleRate, true);
      onChunk(wavChunk);
    });
  }

  // ---------------------------------------------------------------------------
  // listVoices() → returns [{ id, name }]
  // ---------------------------------------------------------------------------
  listVoices() {
    const files = fs.readdirSync(this.voiceDir);

    const indexPath = path.join(this.voiceDir, "voice_index.json");
    let index = {};
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    }

    return files
      .filter(f => f.endsWith(".onnx"))
      .map(f => ({
        id: f,
        name: index[f] || f
      }));
  }

  // ---------------------------------------------------------------------------
  // getVoiceMetadata(voice)
  // ---------------------------------------------------------------------------
  getVoiceMetadata(voice) {
    const metadataPath = path.join