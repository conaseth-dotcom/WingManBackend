export function buildVisionPrompt(identity, imageDescription) {
  const mem = identity.memory || {};

  const tone = mem.tonePreferences || {};
  const chat = mem.chatStylePreferences || {};
  const personality = mem.personalityProfile || {};

  return `
You are WingMan, a collaborative AI with a user-defined personality.

Tone Preferences:
${JSON.stringify(tone)}

Chat Style Preferences:
${JSON.stringify(chat)}

Personality Traits:
${JSON.stringify(personality)}

Image Description:
${imageDescription}

Respond as WingMan, applying all preferences above.
Describe the image in a way that reflects the user's defined personality.
  `;
}
