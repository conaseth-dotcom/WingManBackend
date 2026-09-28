#!/usr/bin/env bash
# =============================================================================
# render-build.sh â€” WingMan Backend build script for Render.com (Linux/amd64)
# Render build command: chmod +x ./render-build.sh && ./render-build.sh
# =============================================================================
set -euo pipefail

echo "================================================================"
echo " WingMan Backend â€” Render Build"
echo "================================================================"

# â”€â”€ 2. Piper Linux binary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
PIPER_VERSION="2023.11.14-2"
PIPER_DIR="./tts_piper"
PIPER_BIN="${PIPER_DIR}/piper"

mkdir -p "${PIPER_DIR}/models"

[ -d "${PIPER_BIN}" ] && { echo "[BUILD] Removing Windows piper dir (not usable on Linux)..."; rm -rf "${PIPER_BIN}"; }
if [ ! -f "${PIPER_BIN}" ]; then
  echo "[BUILD] Downloading Piper Linux binary v${PIPER_VERSION}..."
  curl -L --fail --show-error \
    "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_x86_64.tar.gz" \
    -o /tmp/piper_linux.tar.gz

  tar -xzf /tmp/piper_linux.tar.gz -C /tmp/

  # Copy binary + ALL shared libraries (.so files) â€” Piper ships libespeak-ng + libonnxruntime
  cp -r /tmp/piper/. "${PIPER_DIR}/"
  chmod +x "${PIPER_BIN}"
  rm -rf /tmp/piper_linux.tar.gz /tmp/piper
  echo "[BUILD] Piper binary ready â†’ ${PIPER_BIN}"
else
  echo "[BUILD] Piper binary already present, skipping."
fi

# â”€â”€ 3. Voice model (en_US-lessac-medium) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
MODEL_ONNX="${PIPER_DIR}/models/en_US-lessac-medium.onnx"
MODEL_JSON="${MODEL_ONNX}.json"
HF_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium"

if [ ! -f "${MODEL_ONNX}" ]; then
  echo "[BUILD] Downloading en_US-lessac-medium voice model..."
  curl -L --fail --show-error "${HF_BASE}/en_US-lessac-medium.onnx" -o "${MODEL_ONNX}"
  curl -L --fail --show-error "${HF_BASE}/en_US-lessac-medium.onnx.json" -o "${MODEL_JSON}"
  echo "[BUILD] Voice model ready â†’ ${MODEL_ONNX}"
else
  echo "[BUILD] Voice model already present, skipping."
fi

# â”€â”€ 4. Sanity checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ls -lh "${PIPER_BIN}" || { echo "[ERROR] Piper binary missing!"; exit 1; }
ls -lh "${MODEL_ONNX}" || { echo "[ERROR] Voice model missing!"; exit 1; }

echo "================================================================"
echo " WingMan Build Complete"
echo "================================================================"
