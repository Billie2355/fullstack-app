// Central configuration for the hidden YouTube -> Drive feature.
// Everything is driven by environment variables so no secret ever lives in the repo.
// On the EC2 these are loaded by systemd via EnvironmentFile=/home/ubuntu/youtube-feature/secrets.env
const path = require('path');

const DATA_DIR = process.env.YT_DATA_DIR || '/home/ubuntu/youtube-feature';

const config = {
  // Where runtime state lives (logs, temp downloads, cached folder id). Outside the repo.
  dataDir: DATA_DIR,
  tmpDir: path.join(DATA_DIR, 'tmp'),
  logFile: path.join(DATA_DIR, 'youtube.log'),
  folderCacheFile: path.join(DATA_DIR, 'drive-folder.json'),

  // Dedicated Drive folder the app creates on first use.
  driveFolderName: process.env.YT_DRIVE_FOLDER_NAME || 'שירים מיוטיוב',

  // Download tooling.
  ytDlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
  cookiesPath: process.env.YT_COOKIES_PATH || path.join(DATA_DIR, 'cookies.txt'),
  potBaseUrl: process.env.YT_POT_BASEURL || 'http://127.0.0.1:4416',
  downloadTimeoutMs: Number(process.env.YT_DOWNLOAD_TIMEOUT_MS || 300000),

  // Swappable download strategy: 'ytdlp-free' (default), 'ytdlp-proxy'.
  // If the free path stops working against YouTube, set YT_DOWNLOAD_STRATEGY=ytdlp-proxy
  // and YT_PROXY_URL=... — no other code changes needed.
  strategy: process.env.YT_DOWNLOAD_STRATEGY || 'ytdlp-free',
  proxyUrl: process.env.YT_PROXY_URL || null,

  // Google OAuth2 (personal Gmail, refresh-token flow).
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
};

// The feature stays dormant until Drive credentials are present. Before setup,
// a pasted YouTube link just becomes a normal task (nothing silently vanishes).
config.enabled = () =>
  Boolean(config.google.clientId && config.google.clientSecret && config.google.refreshToken);

module.exports = config;
