function buildMemorySummaryPrompt(identity, memoryItems) {
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

Task:
Summarize the following memory items in a way that reflects the user's defined personality.
Keep the summary consistent with their tone and chat style.

Memory Items:
${JSON.stringify(memoryItems, null, 2)}

Respond as WingMan.
  `;
}

module.exports = {
  buildMemorySummaryPrompt
};
