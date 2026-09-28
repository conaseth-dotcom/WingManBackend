# C:\WingManBackend\tts_piper\preprocess.py

from typing import Dict


def normalize_text(text: str, options: Dict | None = None) -> str:
    """
    Basic WingMan-specific text normalization.

    For now:
    - strip leading/trailing whitespace
    - collapse multiple spaces
    - ensure text ends with punctuation if it looks like a sentence
    """
    if options is None:
        options = {}

    t = text.strip()

    # Collapse multiple spaces
    while "  " in t:
        t = t.replace("  ", " ")

    # Add a period if it looks like a sentence and has no terminal punctuation
    if t and t[-1] not in ".!?":
        t += "."

    return t
