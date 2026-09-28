console.log("[WM-DEBUG] PARTITION_ROOT from env:", process.env.PARTITION_ROOT);

module.exports = {
  PORT: process.env.PORT || 4000,
  HOST: process.env.HOST || '0.0.0.0',
  ENV: process.env.NODE_ENV || 'production',

  PARTITION_ROOT: process.env.PARTITION_ROOT,
};
