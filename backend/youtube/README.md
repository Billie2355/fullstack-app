# Hidden YouTube → Drive feature

No UI. When the feature is configured and a **bare YouTube link** is submitted through
the normal "add task" field, the backend does not store a task — it downloads the audio
as MP3 and uploads it to a dedicated Google Drive folder, in the background. The link is
"swallowed": nothing appears in the task list.

Until the Google credentials below are set, the feature is dormant and a pasted link
simply becomes a normal task.

## Flow
`POST /api/tasks` → `detect.isYouTubeUrl` → (if enabled) `processJob.processYouTube`
→ `download.downloadAudio` (yt-dlp → mp3) → `drive.uploadFile` → local file deleted.

## Environment variables (loaded on the EC2 via systemd EnvironmentFile)
| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `GOOGLE_CLIENT_ID` | yes | — | OAuth2 desktop client |
| `GOOGLE_CLIENT_SECRET` | yes | — | OAuth2 desktop client |
| `GOOGLE_REFRESH_TOKEN` | yes | — | from `scripts/get-refresh-token.js` |
| `YT_DRIVE_FOLDER_NAME` | no | `שירים מיוטיוב` | created on first use |
| `YT_DATA_DIR` | no | `/home/ubuntu/youtube-feature` | logs, tmp, folder-id cache |
| `YT_COOKIES_PATH` | no | `<YT_DATA_DIR>/cookies.txt` | YouTube cookies (expire ~2 weeks) |
| `YT_POT_BASEURL` | no | `http://127.0.0.1:4416` | bgutil PO-token provider |
| `YT_DLP_PATH` | no | `yt-dlp` | path to the yt-dlp binary |
| `YT_DOWNLOAD_STRATEGY` | no | `ytdlp-free` | or `ytdlp-proxy` |
| `YT_PROXY_URL` | no | — | required when strategy is `ytdlp-proxy` |
| `YT_DOWNLOAD_TIMEOUT_MS` | no | `300000` | per download |

## Host prerequisites (installed once on the EC2, not via CI/CD)
- `ffmpeg`, `yt-dlp` (recent), a JS runtime (node/deno) for signature solving
- bgutil PO-token provider listening on `127.0.0.1:4416`
- a valid `cookies.txt` exported from a logged-in YouTube session

## Fallbacks if the free path stops working
Set `YT_DOWNLOAD_STRATEGY=ytdlp-proxy` + `YT_PROXY_URL=...` (residential proxy), or add a
new strategy in `download.js`. Nothing else changes.

Logs: `<YT_DATA_DIR>/youtube.log`.
