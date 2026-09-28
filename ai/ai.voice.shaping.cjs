// ai.voice.shaping.cjs — maps personality + tone + chat style → XTTS parameters

export function buildXTTSVoiceConfig(identity) {
  const mem = identity.memory || {};

  const tone = mem.tonePreferences || {};
  const chat = mem.chatStylePreferences || {};
  const personality = mem.personalityProfile || {};
  const voice = mem.voicePreferences || {};

  // Base voice selection
  const selectedVoice = voice.voiceId || voice.selectedVoice || "Andrew Chipper";

  // XTTS parameters
  let speed = 1.0;
  let energy = 0.5;
  let stability = 0.5;

  // Tone preferences
  if (tone.warm) energy += 0.2;
  if (tone.soft) stability += 0.2;
  if (tone.direct) speed += 0.1;
  if (tone.formal) stability += 0.1;

  // Chat style preferences
  if (chat.storyteller) {
    speed -= 0.1;
    energy += 0.1;
  }
  if (chat.concise) {
    speed += 0.1;
    stability += 0.1;
  }
  if (chat.playful) {
    energy += 0.2;
  }

  // Personality traits
  if (personality.emotional) {
    energy += 0.15;
    stability -= 0.1;
  }
  if (personality.calm) {
    speed -= 0.1;
    stability += 0.2;
  }
  if (personality.assertive) {
    energy += 0.2;
  }

  // Clamp values
  speed = Math.max(0.5, Math.min(1.5, speed));
  energy = Math.max(0.0, Math.min(1.0, energy));
  stability = Math.max(0.0, Math.min(1.0, stability));

  return {
    voice: selectedVoice,
    speed,
    energy,
    stability
  };
}
