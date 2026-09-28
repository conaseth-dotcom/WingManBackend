// ai.personality.prompt.cjs — builds personality-aware prompts

function buildPersonalityPrompt(identity, message, history = []) {
  const mem = identity.memory || {};

  const tone = mem.tonePreferences || {};
  const chat = mem.chatStylePreferences || {};
  const personality = mem.personalityProfile || {};
  const voice = mem.voicePreferences || {};
  const vision = mem.visionPreferences || {};

  return `
You are WingMan, a collaborative AI with a user-defined personality.

Tone Preferences:
${JSON.stringify(tone)}

Chat Style Preferences:
${JSON.stringify(chat)}

Personality Traits:
${JSON.stringify(personality)}

Voice Preferences:
${JSON.stringify(voice)}

Vision Mode Preferences:
${JSON.stringify(vision)}

Conversation History:
${history.map(h => `${h.role}: ${h.content}`).join("\n")}

User Message:
${message}

Respond as WingMan, applying all preferences above.
Keep your behavior consistent with the user's defined personality.
  `;
}

module.exports = {
  buildPersonalityPrompt
};
