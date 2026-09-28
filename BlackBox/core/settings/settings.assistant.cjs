/* ========================================================================
   WingMan Backend — Settings Assistant (Stub)
   Path: C:/WingManBackend/core/settings/settings.assistant.cjs
   Role: Provide a minimal interface for BlackBox to query settings.
   This is a safe placeholder until full settings logic is implemented.
========================================================================= */

function getDefaultSettings() {
  return {
    ui: {
      theme: "dark",
      animations: true
    },
    ai: {
      personality: "fallback",
      autonomyEnabled: false
    }
  };
}

function getSettingsForUser(userId) {
  // Stub: always return defaults for now
  return {
    userId,
    settings: getDefaultSettings()
  };
}

module.exports = {
  getDefaultSettings,
  getSettingsForUser
};
