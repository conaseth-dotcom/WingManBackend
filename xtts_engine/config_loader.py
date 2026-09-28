import json
import torch
import soundfile as sf
from TTS.tts.models.xtts import Xtts

MODEL_DIR = "C:/WingManBackend/models"

# Load XTTS‑v1 config
with open(f"{MODEL_DIR}/config.json", "r", encoding="utf-8") as f:
    config = json.load(f)

# Initialize XTTS‑v1 model
model = Xtts(config)

# Load XTTS‑v1 checkpoint
model.load_checkpoint(f"{MODEL_DIR}/model.pth", eval=True)

# Move to device
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)

# Generate audio
text = "Hello Constance, WingMan is alive."
audio = model.inference(
    text=text,
    speaker_wav=None,
    language="en"
)

# Save output
sf.write(
    "wingman_output.wav",
    audio.squeeze().cpu().numpy(),
    24000
)

print("✓ XTTS‑v1 synthesis complete")
