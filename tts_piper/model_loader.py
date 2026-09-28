import os
import subprocess
import tempfile


class PiperModelLoader:
    """
    Universal Piper model loader using the Piper CLI backend.
    This works regardless of which Python API version is installed.
    """

    def __init__(self, model_path: str, sample_rate: int = 22050):
        self.model_path = model_path
        self.sample_rate = sample_rate

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Piper model not found at: {self.model_path}")

    def synthesize(self, text: str) -> bytes:
        """
        Synthesize audio using Piper CLI and return WAV bytes.
        """

        # Create a temporary WAV file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            wav_path = tmp.name

        # Full path to Piper CLI executable
        piper_exe = r"C:\WingManBackend\piper_cli\piper_windows_amd64\piper\piper.exe"

        # Run Piper CLI
        cmd = [
            piper_exe,
            "--model", self.model_path,
            "--output", wav_path,
            "--text", text
        ]

        # Suppress CLI stdout/stderr so generate_audio() returns only bytes
        subprocess.run(
            cmd,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        # Read WAV bytes
        with open(wav_path, "rb") as f:
            wav_bytes = f.read()

        # Clean up temp file
        os.remove(wav_path)

        return wav_bytes
