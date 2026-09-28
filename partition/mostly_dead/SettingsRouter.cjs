// C:/WingManBackend/router/SettingsRouter.cjs

const fs = require("fs");
const path = require("path");

// PartitionPaths is exported directly
const PartitionPaths = require("../partition/api/partition.paths.cjs");

/* ============================================================
   Secure OS-level settings (AI-inaccessible)
============================================================ */

const OS_SETTINGS_ROOT = path.join(
  process.env.LOCALAPPDATA ||
    process.env.APPDATA ||
    process.env.HOME ||
    "C:\\WingManSettings",
  "WingMan",
  "settings"
);

const OS_SETTINGS_FILE = path.join(OS_SETTINGS_ROOT, "secure.settings.json");

function loadSecureSettings() {
  try {
    if (!fs.existsSync(OS_SETTINGS_FILE)) {
      return {
        partitionRoot: "D:\\WingManPartition",
        partitionSizeMB: 512,
        developerMode: false,
        aiSetup: {
          provider: null,
          nickname: null,
          aiReady: false
        }
      };
    }

    const raw = fs.readFileSync(OS_SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed.aiSetup) {
      parsed.aiSetup = {
        provider: null,
        nickname: null,
        aiReady: false
      };
    }

    return parsed;
  } catch (err) {
    console.warn("[SettingsRouter] Failed to load secure settings, using defaults:", err);
    return {
      partitionRoot: "D:\\WingManPartition",
      partitionSizeMB: 512,
      developerMode: false,
      aiSetup: {
        provider: null,
        nickname: null,
        aiReady: false
      }
    };
  }
}

function saveSecureSettings(settings) {
  try {
    if (!fs.existsSync(OS_SETTINGS_ROOT)) {
      fs.mkdirSync(OS_SETTINGS_ROOT, { recursive: true });
    }
    fs.writeFileSync(OS_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
    console.log("[SettingsRouter] Saved secure settings.");
  } catch (err) {
    console.error("[SettingsRouter] Failed to save secure settings:", err);
  }
}

/* ============================================================
   Partition runtime settings (AI-accessible)
============================================================ */

const DEFAULT_RUNTIME_SETTINGS_PATH =
  "/default/partition/runtime/user.runtime.settings.json";

let RUNTIME_SETTINGS_PATH = DEFAULT_RUNTIME_SETTINGS_PATH;

function loadPartitionSettings() {
  try {
    const raw = fs.readFileSync(RUNTIME_SETTINGS_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[SettingsRouter] No partition settings found, creating defaults.");

    return {
      sttMode: "streaming",
      assistantVoice: "wingman-default",
      assistantVoiceSpeed: 1.0,
      assistantVoiceTone: "warm",
      micDevice: "default",
      voiceBoost: 1.0,
      softVoiceMode: false,
      speakerFocus: false,

      audio: {},
      stt: {},
      appearance: {},
      onboarding: {}
      // ❌ aiSetup removed from partition runtime
    };
  }
}

function savePartitionSettings(settings) {
  try {
    const runtimeDir = path.dirname(RUNTIME_SETTINGS_PATH);
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }

    fs.writeFileSync(RUNTIME_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
    console.log("[SettingsRouter] Saved partition settings.");
  } catch (err) {
    console.error("[SettingsRouter] Failed to save partition settings:", err);
  }
}

/* ============================================================
   Initialize settings
============================================================ */

let secureSettings = loadSecureSettings();
let partitionSettings = loadPartitionSettings();

// PartitionPaths only knows the partition root (secure)
PartitionPaths.overrideRoot(secureSettings.partitionRoot);

RUNTIME_SETTINGS_PATH = path.join(
  PartitionPaths.getRuntimeRoot(),
  "user.runtime.settings.json"
);

/* ============================================================
   SettingsRouter — public API
============================================================ */

const SettingsRouter = {
  route(action, payload) {
    console.log("[SettingsRouter] route:", action, payload);

    switch (action) {
      /* --------------------------------------------------------
         LOAD ALL SETTINGS
      -------------------------------------------------------- */
      case "load-all": {
        const user = {
          storage: {
            root: secureSettings.partitionRoot,
            sizeMB: secureSettings.partitionSizeMB
          },
          developer: {
            developerMode: secureSettings.developerMode
          },
          audio: partitionSettings.audio || {},
          stt: partitionSettings.stt || {},
          appearance: partitionSettings.appearance || {},
          onboarding: partitionSettings.onboarding || {},
          aiSetup: secureSettings.aiSetup || {
            provider: null,
            nickname: null,
            aiReady: false
          }
        };

        return {
          ok: true,
          user,
          provider: {}
        };
      }

      /* --------------------------------------------------------
         SAVE ALL SETTINGS
      -------------------------------------------------------- */
      case "save-all": {
        const {
          audio = {},
          stt = {},
          storage = {},
          developer = {},
          appearance = {},
          onboarding = {},
          aiSetup = {}
        } = payload || {};

        // Secure settings
        if (storage.root) {
          secureSettings.partitionRoot = storage.root;
          PartitionPaths.overrideRoot(storage.root);
          RUNTIME_SETTINGS_PATH = path.join(
            PartitionPaths.getRuntimeRoot(),
            "user.runtime.settings.json"
          );
        }

        if (storage.sizeMB) {
          secureSettings.partitionSizeMB = storage.sizeMB;
        }

        if (typeof developer.developerMode === "boolean") {
          secureSettings.developerMode = developer.developerMode;
        }

        // ⭐ HERE is where the user's AI preference data is saved
        secureSettings.aiSetup = {
          provider: aiSetup.provider ?? secureSettings.aiSetup?.provider ?? null,
          nickname: aiSetup.nickname ?? secureSettings.aiSetup?.nickname ?? null,
          aiReady:
            typeof aiSetup.aiReady === "boolean"
              ? aiSetup.aiReady
              : secureSettings.aiSetup?.aiReady ?? false
        };

        saveSecureSettings(secureSettings);

        // Partition settings (runtime only)
        partitionSettings.audio = audio;
        partitionSettings.stt = stt;
        partitionSettings.appearance = appearance;
        partitionSettings.onboarding = onboarding;

        savePartitionSettings(partitionSettings);

        return { ok: true };
      }

      /* --------------------------------------------------------
         Individual setters
      -------------------------------------------------------- */
      case "set-stt-mode":
        partitionSettings.sttMode = payload;
        break;

      case "set-assistant-voice":
        partitionSettings.assistantVoice = payload;
        break;

      case "set-assistant-voice-speed":
        partitionSettings.assistantVoiceSpeed = payload;
        break;

      case "set-assistant-voice-tone":
        partitionSettings.assistantVoiceTone = payload;
        break;

      case "set-mic-device":
        partitionSettings.micDevice = payload;
        break;

      case "set-voice-boost":
        partitionSettings.voiceBoost = payload;
        break;

      case "set-soft-voice-mode":
        partitionSettings.softVoiceMode = payload;
        break;

      case "set-speaker-focus":
        partitionSettings.speakerFocus = payload;
        break;

      case "set-partition-root":
        secureSettings.partitionRoot = payload;
        saveSecureSettings(secureSettings);

        PartitionPaths.overrideRoot(payload);
        RUNTIME_SETTINGS_PATH = path.join(
          PartitionPaths.getRuntimeRoot(),
          "user.runtime.settings.json"
        );
        break;

      case "set-partition-size":
        secureSettings.partitionSizeMB = payload;
        saveSecureSettings(secureSettings);
        break;

      default:
        console.error("[SettingsRouter] Unknown settings action:", action);
        return { ok: false, reason: "unknown-action" };
    }

    savePartitionSettings(partitionSettings);
    return { ok: true };
  }
};

module.exports = { SettingsRouter };
