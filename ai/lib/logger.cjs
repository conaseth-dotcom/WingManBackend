'use strict';

const ts = () => new Date().toISOString();

const fmt = (lvl, msg, meta) =>
  `[${ts()}] [${lvl.toUpperCase()}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;

module.exports = {
  info:  (m, x) => console.log(fmt('info',  m, x)),
  warn:  (m, x) => console.warn(fmt('warn',  m, x)),
  error: (m, x) => console.error(fmt('error', m, x)),
  debug: (m, x) => console.debug(fmt('debug', m, x)),
};
