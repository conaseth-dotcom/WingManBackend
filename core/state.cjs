// C:\WingManBackend\core\state.cjs
console.log("[WM-DEBUG] PARTITION_ROOT from env:", process.env.PARTITION_ROOT);

module.exports = {
  PORT: process.env.PORT || 4000,
  HOST: process.env.HOST || '0.0.0.0',
  ENV: process.env.NODE_ENV || 'production',

  // Audio stack ports
  XTTS_PORT: process.env.XTTS_PORT || 8020,
  WHISPER_PORT: process.env.WHISPER_PORT || 9000,

  // The missing cornerstone
  PARTITION_ROOT: process.env.PARTITION_ROOT,
};
