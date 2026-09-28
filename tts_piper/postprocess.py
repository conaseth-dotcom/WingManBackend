# C:\WingManBackend\tts_piper\postprocess.py

import io
import wave
from typing import Optional


def pcm_to_wav(
    pcm_bytes: bytes,
    sample_rate: int = 22050,
    num_channels: int = 1,
    sample_width: int = 2,
) -> bytes:
    """
    Wrap raw PCM bytes in a WAV container.

    - sample_width: 2 bytes = 16-bit PCM
    - num_channels: 1 = mono
    """
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(num_channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)

    return buffer.getvalue()


def finalize_audio(
    pcm_bytes: bytes,
    sample_rate: int = 22050,
    num_channels: int = 1,
    sample_width: int = 2,
) -> bytes:
    """
    High-level postprocess step.

    For now:
    - wrap PCM in WAV
    - later: we can add normalization, trimming, etc.
    """
    return pcm_to_wav(
        pcm_bytes,
        sample_rate=sample_rate,
        num_channels=num_channels,
        sample_width=sample_width,
    )
