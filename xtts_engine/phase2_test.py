from xtts_engine.tokenizer_loader import XTTSTokenizer
from xtts_engine.config_loader import XTTSConfig

CONFIG_PATH = "C:/WingManBackend/models/config.json"


def test_tokenizer():
    print("Testing XTTS‑v1 tokenizer stub...")

    tokenizer = XTTSTokenizer()
    print("✓ tokenizer stub initialized")

    cfg = XTTSConfig(CONFIG_PATH)
    data = cfg.load()
    print("✓ config.json loaded")
    print("Config keys:", list(data.keys()))

    test_sentence = "Hello WingMan, Phase 2!"
    encoded = tokenizer.encode(test_sentence)

    print("Encoded (raw text passed through):", encoded)
    print("Decoded (stub):", tokenizer.decode(encoded))

    print("\n✓ Phase 2 complete")


if __name__ == "__main__":
    test_tokenizer()
