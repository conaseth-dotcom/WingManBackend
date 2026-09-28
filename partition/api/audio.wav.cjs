// audio.wav.cjs
// Corrected WAV writer with 48k → 16k resampling for Whisper compatibility

import fs from 'fs';
import path from 'path';

/**
 * Resample Float32 PCM from 48000 Hz → 16000 Hz
 */
function resampleTo16k(float32) {
  const inputRate = 48000;
  const outputRate = 16000;
  const ratio = inputRate / outputRate;

  const newLength = Math.floor(float32.length / ratio);
  const output = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    output[i] = float32[Math.floor(i * ratio)];
  }

  return output;
}

/**
 * Convert Float32 PCM (-1..1) → Int16 PCM
 */
function float32ToInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

/**
 * Write a 16kHz mono WAV file
 */
function writeWav16k(float32PCM, filePath) {
  // 1. Resample from 48k → 16k
  const pcm16k = resampleTo16k(float32PCM);

  // 2. Convert to Int16
  const pcm16 = float32ToInt16(pcm16k);

  // 3. WAV header
  const numChannels = 1;
  const sampleRate = 16000;
  const bitsPerSample = 16;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcm16.length * 2;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM header size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PCM data
  for (let i = 0; i < pcm16.length; i++) {
    buffer.writeInt16LE(pcm16[i], 44 + i * 2);
  }

  // Write file
  fs.writeFileSync(filePath, buffer);
}

export { writeWav16k };

