// Tiny file logger. The feature has no UI, so a log file is the only way to see
// what happened. Writes to config.logFile and mirrors to the service's stdout/journal.
const fs = require('fs');
const config = require('./config');

function write(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.appendFileSync(config.logFile, line + '\n');
  } catch (_) {
    // best-effort logging; never crash the request path over a log write
  }
  (level === 'ERROR' ? console.error : console.log)(line);
}

module.exports = {
  info: (msg) => write('INFO', msg),
  error: (msg) => write('ERROR', msg),
};
