function loadVoicePacks() {
  return {
    narrator: {
      name: "Narrator Pack",
      description: "Warm, storytelling voices for narration and long-form responses.",
      voices: [
        "xtts:assistant",
        "xtts:friendly",
        "bark:expressive"
      ]
    },

    noir: {
      name: "Noir Detective Pack",
      description: "Smoky, gritty voices with dramatic tone.",
      voices: [
        "bark:expressive",
        "piper:male"
      ]
    },

    cartoon: {
      name: "Cartoon Pack",
      description: "Playful, exaggerated voices for humorous replies.",
      voices: [
        "chatterbox:fast",
        "bark:expressive"
      ]
    },

    calm: {
      name: "Calm Pack",
      description: "Soft, soothing voices for relaxed conversation.",
      voices: [
        "xtts:friendly",
        "piper:female"
      ]
    }
  };
}

module.exports = { loadVoicePacks };
