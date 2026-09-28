import os
import torch
from TTS.tts.models.xtts import Xtts



class XTTSModelLoader:
    """
    Loads XTTS‑v1 model using external config.json and model.pth.
    """

    def __init__(self, model_path: str, config: dict, device: str = None):
        self.model_path = model_path
        self.config = config
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

    def _check_exists(self, path):
        if not os.path.exists(path):
            raise FileNotFoundError(f"XTTS‑v1 checkpoint missing: {path}")

    def load_all(self):
        # Validate path
        self._check_exists(self.model_path)

        # Build model from external config.json
        model = Xtts(self.config)

        # Load XTTS‑v1 checkpoint
        model.load_checkpoint(self.model_path, eval=True)

        # Move to device
        model.to(self.device)
        model.eval()

        return {
            "model": model,
            "device": self.device
        }
