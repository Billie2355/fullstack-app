// Detects whether a task title is (only) a YouTube link, and extracts the video id.
// Accepts the common clean forms, with or without scheme / www / m / music, and with
// trailing query params (?si=, &list=, &t=, etc.). An id is 11 url-safe chars.
const PATTERNS = [
  /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([\w-]{11})(?:[&#][^\s]*)?$/i,
  /^(?:https?:\/\/)?(?:www\.|m\.)?youtu\.be\/([\w-]{11})(?:[?#][^\s]*)?$/i,
  /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([\w-]{11})(?:[?#][^\s]*)?$/i,
  /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/live\/([\w-]{11})(?:[?#][^\s]*)?$/i,
];

function parseYouTube(text) {
  if (!text || typeof text !== 'string') return null;
  const s = text.trim();
  for (const re of PATTERNS) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

function isYouTubeUrl(text) {
  return parseYouTube(text) !== null;
}

module.exports = { isYouTubeUrl, parseYouTube };
