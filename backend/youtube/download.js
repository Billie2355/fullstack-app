// Audio download, behind a swappable strategy. Produces a local .mp3 file.
// Default strategy 'ytdlp-free' uses yt-dlp + ffmpeg with cookies and a local
// bgutil PO-token provider. Switching to 'ytdlp-proxy' only changes the args below.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

function runYtDlp(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.ytDlpPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('yt-dlp timed out'));
    }, timeoutMs);
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-600)}`));
    });
  });
}

function buildArgs(url, outTemplate) {
  const args = [
    '-x', '--audio-format', 'mp3', '--audio-quality', '0',
    '--no-playlist', '--no-progress',
    '-o', outTemplate,
  ];

  if (config.strategy === 'ytdlp-proxy') {
    // Fallback A: route through a residential proxy.
    if (config.proxyUrl) args.push('--proxy', config.proxyUrl);
    if (fs.existsSync(config.cookiesPath)) args.push('--cookies', config.cookiesPath);
  } else {
    // Default free path: cookies + bgutil PO-token provider on localhost.
    if (fs.existsSync(config.cookiesPath)) args.push('--cookies', config.cookiesPath);
    args.push('--extractor-args', `youtube:getpot_bgutil_baseurl=${config.potBaseUrl}`);
  }

  args.push(url);
  return args;
}

function cleanupDir(dir) {
  if (!dir) return;
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

// Downloads one video's audio into a fresh temp dir and returns the resulting mp3.
async function downloadAudio(url) {
  fs.mkdirSync(config.tmpDir, { recursive: true });
  const jobDir = fs.mkdtempSync(path.join(config.tmpDir, 'job-'));
  const outTemplate = path.join(jobDir, '%(title)s.%(ext)s');

  logger.info(`download start [${config.strategy}] ${url}`);
  try {
    await runYtDlp(buildArgs(url, outTemplate), config.downloadTimeoutMs);
  } catch (e) {
    cleanupDir(jobDir);
    throw e;
  }

  const mp3s = fs.readdirSync(jobDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
  if (mp3s.length === 0) {
    cleanupDir(jobDir);
    throw new Error('download finished but produced no mp3');
  }
  return { filePath: path.join(jobDir, mp3s[0]), fileName: mp3s[0], jobDir };
}

module.exports = { downloadAudio, cleanupDir };
