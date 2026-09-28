/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/runtime/mood.detector.cjs
   Alias: @backend-blackbox/relationship/runtime/mood.detector.cjs
   Role: Detects user mood signals from messages and session context. Produces
         lightweight indicators for wingman.mood.cjs.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] mood.detector.cjs loaded");

/**
 * Normalize text for analysis.
 */
function normalize(text) {
  return text.toLowerCase().trim();
}

/**
 * Keyword clusters for mood detection.
 * These are intentionally simple and interpretable.
 */
const moodKeywords = {
  frustrated: [
    "ugh", "damn", "stupid", "broken", "why won't", "i can't", "this sucks",
    "annoying", "frustrated", "irritating", "wtf", "fml"
  ],
  low: [
    "tired", "exhausted", "idk", "don't know", "whatever", "meh",
    "not great", "not okay", "sad", "down", "low", "depressed"
  ],
  quiet: [
    "hey", "hi", "hello", "...", "ok", "okay", "fine", "yo"
  ],
  bright: [
    "good morning", "good afternoon", "good evening", "great", "awesome",
    "fantastic", "amazing", "woo", "yay", "nice!", "let's go"
  ],
  cautious: [
    "maybe", "i guess", "i think so", "not sure", "possibly", "hmm"
  ]
};

/**
 * Detect mood based on message content.
 * Returns one of:
 * "frustrated", "low", "quiet", "neutral", "bright", "cautious"
 */
function detectMoodFromMessage(message) {
  if (!message || typeof message !== "string") {
    return "neutral";
  }

  const text = normalize(message);

  // 1. Strong signals first
  for (const word of moodKeywords.frustrated) {
    if (text.includes(word)) return "frustrated";
  }

  for (const word of moodKeywords.low) {
    if (text.includes(word)) return "low";
  }

  // 2. Bright / upbeat signals
  for (const word of moodKeywords.bright) {
    if (text.includes(word)) return "bright";
  }

  // 3. Cautious / uncertain signals
  for (const word of moodKeywords.cautious) {
    if (text.includes(word)) return "cautious";
  }

  // 4. Quiet / low-energy signals
  if (moodKeywords.quiet.some(word => text === word || text.startsWith(word))) {
    return "quiet";
  }

  // 5. Default
  return "neutral";
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  detectMoodFromMessage
};
