from xtts_engine.config_loader import XTTSConfig
from xtts_engine.model_loader import XTTSModelLoader

CONFIG_PATH = "C:/WingManBackend/models/config.json"
MODEL_PATH = "C:/WingManBackend/models/model.pth"


def test_config():
    print("Testing XTTS‑v1 Config...")
    cfg = XTTSConfig(CONFIG_PATH)
    data = cfg.load()
    print("✓ config.json loaded")
    print("Config keys:", list(data.keys()))


def test_model():
    print("\nTesting XTTS‑v1 ModelLoader...")

    # Load config first
    cfg = XTTSConfig(CONFIG_PATH)
    config_dict = cfg.load()

    # Pass config dict to loader
    loader = XTTSModelLoader(
        model_path=MODEL_PATH,
        config=config_dict
    )

    models = loader.load_all()
    print("✓ XTTS‑v1 model loaded")
    print("Device:", models["device"])
    print("Model type:", type(models["model"]))


if __name__ == "__main__":
    test_config()
    test_model()
    print("\n✓ Phase 1 complete")
