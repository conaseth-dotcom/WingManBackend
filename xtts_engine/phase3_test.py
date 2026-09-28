import torch
import soundfile as sf

from xtts_engine.model_loader import XTTSModelLoader
from xtts_engine.tokenizer_loader import XTTSTokenizer
from xtts_engine.config_loader import XTTSConfig

MODEL_DIR = "C:/WingManBackend/models"
MODEL_PATH = f"{MODEL_DIR}/model.pth"
CONFIG_PATH = f"{MODEL_DIR}/config.json"


def test_synthesis():
    print("Loading XTTS‑v1 config...")
    cfg = XTTSConfig(CONFIG_PATH)
    config_dict = cfg.load()
    print("✓ config.json loaded")

    print("Loading XTTS‑v1 model...")
    loader = XTTSModelLoader(
        model_path=MODEL_PATH,
        config=config_dict
    )
    bundle = loader.load_all()
    model = bundle["model"]
    device = bundle["device"]
    print("✓ XTTS‑v1 model loaded on", device)

    print("Initializing tokenizer stub...")
    tokenizer = XTTSTokenizer()

    print("Encoding text (pass‑through)...")
    text = "Hello, this is WingMan speaking for the first time."
    encoded_text = tokenizer.encode(text)

    print("Generating audio...")
    audio = model.inference(
        text=encoded_text,
        speaker_wav=None,
        language="en"
    )

    print("Saving audio...")
    sf.write(
        "wingman_output.wav",
        audio.squeeze().cpu().numpy(),
        24000
    )

    print("\n✓ Phase 3 complete — WingMan has spoken!")


if __name__ == "__main__":
    test_synthesis()
