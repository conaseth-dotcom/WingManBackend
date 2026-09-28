/* ========================================================================
   WingMan Backend File
   Path: C:/WingManBackend/BlackBox/relationship/runtime/holiday.generator.cjs
   Alias: @backend-blackbox/relationship/runtime/holiday.generator.cjs
   Role: Generates contextual “daily holiday” or “day theme” signals used for
         light flavoring in greetings and mood calibration.
========================================================================= */

console.log(">>> [WM-FILE-LOAD] holiday.generator.cjs loaded");

/**
 * Returns a deterministic pseudo-random number for a given date.
 * Ensures the same "holiday" is returned for the entire day.
 */
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Returns a numeric seed based on YYYYMMDD.
 */
function getDateSeed() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return Number(`${y}${m}${d}`);
}

/**
 * Seasonal greetings (based on month).
 */
const seasonalGreetings = {
  winter: [
    "Wishing you a cozy winter day.",
    "Hope you're staying warm out there.",
    "A crisp winter hello to you."
  ],
  spring: [
    "Spring breezes and fresh starts.",
    "Everything’s blooming — including your ideas.",
    "A bright spring hello."
  ],
  summer: [
    "Sending you a sunny summer greeting.",
    "Hope your day feels like cold lemonade on a hot afternoon.",
    "A warm summer hello."
  ],
  autumn: [
    "A crisp autumn greeting to you.",
    "Leaves are falling, ideas are calling.",
    "Hope your day feels like warm cider and good company."
  ]
};

/**
 * Silly micro-holidays.
 */
const sillyHolidays = [
  "Happy SPAM Awareness Day!",
  "Happy Replace-Your-Shoelaces Day!",
  "Happy Accidental Poetry Appreciation Day!",
  "Happy It's-Probably-Time-To-Water-Your-Plants Day!",
  "Happy Unnecessarily Dramatic Sigh Day!",
  "Happy Random Compliment Day — you're doing great.",
  "Happy Mildly Confused Tuesday (even if it's not Tuesday)!",
  "Happy 'I Forgot Why I Walked Into This Room' Day!",
  "Happy Cat Appreciation Hour — which is every hour, really.",
  "Happy 'Treat Yourself to a Snack' Day!"
];

/**
 * Random "today is..." style holidays.
 */
const generatedHolidayTemplates = [
  "Happy National {thing} Day!",
  "Celebrating International {thing} Awareness!",
  "It's Officially {thing} Appreciation Day!",
  "Today is Global {thing} Recognition Day!",
  "Welcome to {thing} Celebration Day!"
];

const randomThings = [
  "Left-Handed Creativity",
  "Unfinished Projects",
  "Lost Pens",
  "Unexpected Kindness",
  "Overdue Library Books",
  "Socks Without Partners",
  "Forgotten Bookmarks",
  "Mismatched Coffee Mugs",
  "Happy Accidents",
  "Tiny Victories"
];

/**
 * Picks a seasonal greeting based on the month.
 */
function getSeasonalGreeting() {
  const month = new Date().getMonth() + 1;

  if (month === 12 || month <= 2) return seasonalGreetings.winter;
  if (month >= 3 && month <= 5) return seasonalGreetings.spring;
  if (month >= 6 && month <= 8) return seasonalGreetings.summer;
  return seasonalGreetings.autumn;
}

/**
 * Generates a random "today is..." holiday.
 */
function generateRandomHoliday(seed) {
  const template =
    generatedHolidayTemplates[
      Math.floor(seededRandom(seed) * generatedHolidayTemplates.length)
    ];

  const thing =
    randomThings[
      Math.floor(seededRandom(seed + 1) * randomThings.length)
    ];

  return template.replace("{thing}", thing);
}

/**
 * Main API: returns a holiday greeting for the day.
 */
function getDailyHoliday() {
  const seed = getDateSeed();
  const r = seededRandom(seed);

  // 33% chance: seasonal greeting
  if (r < 0.33) {
    const seasonal = getSeasonalGreeting();
    return seasonal[Math.floor(seededRandom(seed + 2) * seasonal.length)];
  }

  // 33% chance: silly micro-holiday
  if (r < 0.66) {
    return sillyHolidays[Math.floor(seededRandom(seed + 3) * sillyHolidays.length)];
  }

  // 33% chance: generated holiday
  return generateRandomHoliday(seed + 4);
}

// ---------------------------------------------------------------------------
// CommonJS export
// ---------------------------------------------------------------------------
module.exports = {
  getDailyHoliday
};
