class XTTSTokenizer:
    def __init__(self):
        # XTTS‑v1 handles tokenization internally.
        # This class exists only so the engine has a consistent interface.
        pass

    def encode(self, text):
        # The XTTS model will perform its own text normalization and encoding.
        # Return the raw text so the model can process it.
        return text

    def decode(self, token_ids):
        # XTTS‑v1 does not expose a decode path.
        # Provide a placeholder for interface consistency.
        return ""
