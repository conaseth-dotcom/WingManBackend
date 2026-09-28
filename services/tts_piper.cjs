// services/tts_piper.cjs — Backend wrapper for PiperService

const PiperService = require("../tts_piper/service.cjs");

class TtsPiper {
  constructor({ tts, partitionRoot }) {
    this.config = tts;

    this.engine = new PiperService({
      voice: tts.defaultVoice,
      sampleRate: tts.sampleRate,
      partitionRoot
    });
  }

  async speak(text) {
    return this.engine.speak(text);
  }

  async stream(text, onChunk) {
    return this.engine.stream(text, onChunk);
  }

  listVoices() {
    return this.engine.listVoices();
  }

  getVoiceMetadata(voice) {
    return this.engine.getVoiceMetadata(voice);
  }
}

module.exports = TtsPiper;
