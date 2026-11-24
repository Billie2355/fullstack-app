// Google Drive upload via OAuth2 refresh token (personal Gmail).
// Uses the least-privilege 'drive.file' scope: the app can only see and manage
// files it creates itself — including the dedicated folder.
const fs = require('fs');
const { google } = require('googleapis');
const config = require('./config');
const logger = require('./logger');

function getDrive() {
  const { clientId, clientSecret, refreshToken } = config.google;
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth });
}

function readCachedFolderId() {
  try {
    if (fs.existsSync(config.folderCacheFile)) {
      const { id } = JSON.parse(fs.readFileSync(config.folderCacheFile, 'utf8'));
      return id || null;
    }
  } catch (_) {}
  return null;
}

function cacheFolderId(id) {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(config.folderCacheFile, JSON.stringify({ id }));
  } catch (_) {}
}

// Returns the id of the dedicated folder, creating it on first use.
async function ensureFolder(drive) {
  const cached = readCachedFolderId();
  if (cached) {
    try {
      const r = await drive.files.get({ fileId: cached, fields: 'id,trashed' });
      if (r.data && !r.data.trashed) return cached;
    } catch (_) {
      // folder was deleted/lost — fall through and recreate
    }
  }

  const safeName = config.driveFolderName.replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and trashed=false`;
  const list = await drive.files.list({ q, fields: 'files(id,name)', spaces: 'drive' });

  let id;
  if (list.data.files && list.data.files.length > 0) {
    id = list.data.files[0].id;
  } else {
    const created = await drive.files.create({
      requestBody: { name: config.driveFolderName, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });
    id = created.data.id;
    logger.info(`created Drive folder "${config.driveFolderName}" (${id})`);
  }
  cacheFolderId(id);
  return id;
}

async function uploadFile(localPath, name) {
  const drive = getDrive();
  const folderId = await ensureFolder(drive);
  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: 'audio/mpeg', body: fs.createReadStream(localPath) },
    fields: 'id,name',
  });
  logger.info(`uploaded "${name}" (${res.data.id})`);
  return res.data;
}

module.exports = { uploadFile };
