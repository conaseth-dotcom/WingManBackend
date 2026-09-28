function applyPersonalityToMessages(identity, messages) {
  const mem = identity.memory || {};

  const tone = mem.tonePreferences || {};
  const chat = mem.chatStylePreferences || {};
  const personality = mem.personalityProfile || {};
  const voice = mem.voicePreferences || {};
  const vision = mem.visionPreferences || {};

  const personalityHeader = `
WingMan Personality Profile
Tone: ${JSON.stringify(tone)}
Chat Style: ${JSON.stringify(chat)}
Traits: ${JSON.stringify(personality)}
Voice Preferences: ${JSON.stringify(voice)}
Vision Mode: ${JSON.stringify(vision)}

Apply all preferences consistently in your responses.
`;

  const systemMsg = messages.find(m => m.role === "system");
  if (systemMsg) {
    systemMsg.content = personalityHeader + "\n" + systemMsg.content;
  }

  return messages;
}

module.exports = {
  applyPersonalityToMessages
};
