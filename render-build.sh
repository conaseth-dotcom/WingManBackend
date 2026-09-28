#!/usr/bin/env bash
# =============================================================================
# render-build.sh — WingMan Backend build script for Render.com (Linux/amd64)
# Render build command: chmod +x ./render-build.sh && ./render-build.sh
# =============================================================================
set -euo pipefail

echo "================================================================"
echo " WingMan Backend — Render Build"
echo "================================================================"

# ── 2. Piper Linux binary ───────────────────────────────────────────────────
PIPER_VERSION="2023.11.14-2"
PIPER_DIR="./tts_piper"
PIPER_BIN="${PIPER_DIR}/piper"

mkdir -p "${PIPER_DIR}/models"

if [ ! -f "${PIPER_BIN}" ]; then
  echo "[BUILD] Downloading Piper Linux binary v${PIPER_VERSION}..."
  curl -L --fail --show-error \
    "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_x86_64.tar.gz" \
    -o /tmp/piper_linux.tar.gz

  tar -xzf /tmp/piper_linux.tar.gz -C /tmp/

  # Copy binary + ALL shared libraries (.so files) — Piper ships libespeak-ng + libonnxruntime
  cp -r /tmp/piper/. "${PIPER_DIR}/"
  chmod +x "${PIPER_BIN}"
  rm -rf /tmp/piper_linux.tar.gz /tmp/piper
  echo "[BUILD] Piper binary ready → ${PIPER_BIN}"
else
  echo "[BUILD] Piper binary already present, skipping."
fi

# ── 3. Voice model (en_US-lessac-medium) ────────────────────────────────────
MODEL_ONNX="${PIPER_DIR}/models/en_US-lessac-medium.onnx"
MODEL_JSON="${MODEL_ONNX}.json"
HF_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium"

if [ ! -f "${MODEL_ONNX}" ]; then
  echo "[BUILD] Downloading en_US-lessac-medium voice model..."
  curl -L --fail --show-error "${HF_BASE}/en_US-lessac-medium.onnx" -o "${MODEL_ONNX}"
  curl -L --fail --show-error "${HF_BASE}/en_US-lessac-medium.onnx.json" -o "${MODEL_JSON}"
  echo "[BUILD] Voice model ready → ${MODEL_ONNX}"
else
  echo "[BUILD] Voice model already present, skipping."
fi

# ── 4. Sanity checks ────────────────────────────────────────────────────────
ls -lh "${PIPER_BIN}" || { echo "[ERROR] Piper binary missing!"; exit 1; }
ls -lh "${MODEL_ONNX}" || { echo "[ERROR] Voice model missing!"; exit 1; }

echo "================================================================"
echo " WingMan Build Complete"
echo "================================================================"
