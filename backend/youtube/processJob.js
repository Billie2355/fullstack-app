// Orchestrates one capture end-to-end: download -> upload -> cleanup.
// Runs in the background (fire-and-forget) so the HTTP request returns immediately.
// Never throws to the caller; all outcomes go to the log file.
const { downloadAudio, cleanupDir } = require('./download');
const { uploadFile } = require('./drive');
const logger = require('./logger');

async function processYouTube(url) {
  let jobDir;
  try {
    const result = await downloadAudio(url);
    jobDir = result.jobDir;
    await uploadFile(result.filePath, result.fileName);
    logger.info(`done: ${url}`);
  } catch (e) {
    logger.error(`failed ${url}: ${e.message}`);
  } finally {
    cleanupDir(jobDir);
  }
}

module.exports = { processYouTube };
