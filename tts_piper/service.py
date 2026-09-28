from typing import Optional

from .model_loader import PiperModelLoader
from .preprocess import normalize_text
from .postprocess import finalize_audio

# Set this to whichever Piper model you want to use first.
# Example: Alan (Scottish male)
DEFAULT_PIPER_MODEL_PATH = r"C:\WingManBackend\tts_piper\piper\en_GB-alan-medium.onnx"

DEFAULT_SAMPLE_RATE = 22050

# Singleton-style loader for the process
_model_loader: Optional[PiperModelLoader] = None


def _get_loader() -> PiperModelLoader:
    global _model_loader
    if _model_loader is None:
        _model_loader = PiperModelLoader(
            model_path=DEFAULT_PIPER_MODEL_PATH,
            sample_rate=DEFAULT_SAMPLE_RATE,
        )
    return _model_loader

def generate_audio(text: str, voice_profile: str = "default") -> bytes:
    """
    Main WingMan TTS entrypoint.

    WingMan calls this function with text, and receives a WAV buffer.

    - text: raw text WingMan wants to speak
    - voice_profile: reserved for future persona tuning (ignored for now)

    Returns:
        bytes: WAV-encoded audio suitable for direct playback.
    """
    # 1. Preprocess text
    normalized = normalize_text(text)

    # 2. Run Piper inference (PCM)
    loader = _get_loader()
    pcm_bytes = loader.synthesize(normalized)

    # 3. Postprocess into WAV
    wav_bytes = finalize_audio(
        pcm_bytes,
        sample_rate=loader.sample_rate,
        num_channels=1,
        sample_width=2,
    )

    return wav_bytes
