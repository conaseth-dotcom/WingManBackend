// tts_piper/model_loader.cjs — Piper CLI model loader for Node.js

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

class PiperModel {
  constructor(modelPath, { sampleRate = 22050 } = {}) {
    this.modelPath = modelPath;
    this.sampleRate = sampleRate;

    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`Piper model not found at: ${this.modelPath}`);
    }

    // Resolve backend root
    const backendRoot = path.resolve(__dirname, "..");

    // Piper executable (relative, portable)
    this.piperExe = path.join(
      backendRoot,
      "piper_cli",
      "piper_windows_amd64",
      "piper",
      "piper.exe"
    );

    if (!fs.existsSync(this.piperExe)) {
      throw new Error(`Piper executable not found at: ${this.piperExe}`);
    }
  }

  // ---------------------------------------------------------------------------
  // synthesize(text) → returns WAV bytes
  // ---------------------------------------------------------------------------
  synthesize(text) {
    return new Promise((resolve, reject) => {
      const tmpPath = path.join(
        path.resolve(__dirname, ".."),
        "tts_output",
        `${Date.now()}.wav`
      );

      const args = [
        "--model", this.modelPath,
        "--output_file", tmpPath,
        "--text", text
      ];

      execFile(
        this.piperExe,
        args,
        {
          windowsHide: true,
          cwd: path.dirname(this.piperExe)   // CRITICAL: ensures Piper loads its DLLs
        },
        (err) => {
          if (err) return reject(err);

          fs.readFile(tmpPath, (readErr, data) => {
            if (readErr) return reject(readErr);

            fs.unlink(tmpPath, () => {});
            resolve(data);
          });
        }
      );
    });
  }
}

module.exports = PiperModel;
