// One-time LOCAL helper to obtain a Google OAuth2 refresh token for Drive uploads.
// Run this on your own computer (where a browser is available), NOT on the EC2.
//
// Prereqs:
//   1. A Desktop-app OAuth client created in Google Cloud (see the setup guide).
//      Download its JSON and save it next to this script as "oauth-client.json".
//   2. From backend/: `npm install`  (installs googleapis)
//
// Run:  node scripts/get-refresh-token.js
// Then open the printed URL, approve, and copy the REFRESH TOKEN it prints.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const PORT = 5858;
const REDIRECT_URI = `http://localhost:${PORT}`;

const clientFile = process.argv[2] || path.join(__dirname, 'oauth-client.json');
if (!fs.existsSync(clientFile)) {
  console.error(`Missing OAuth client file: ${clientFile}`);
  console.error('Download it from Google Cloud (Desktop app credentials) and save it there.');
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(clientFile, 'utf8'));
const c = creds.installed || creds.web;
if (!c || !c.client_id || !c.client_secret) {
  console.error('Unrecognized OAuth client file format.');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(c.client_id, c.client_secret, REDIRECT_URI);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',   // required to receive a refresh token
  prompt: 'consent',        // force a refresh token even on re-auth
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, REDIRECT_URI);
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400); res.end('No authorization code received.');
      return;
    }
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Done. You can close this tab and return to the terminal.');

    console.log('\n==================  COPY THESE  ==================');
    console.log('GOOGLE_CLIENT_ID=' + c.client_id);
    console.log('GOOGLE_CLIENT_SECRET=' + c.client_secret);
    if (tokens.refresh_token) {
      console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    } else {
      console.log('GOOGLE_REFRESH_TOKEN=(none returned!)');
      console.log('Revoke access at https://myaccount.google.com/permissions and run again.');
    }
    console.log('==================================================\n');
  } catch (e) {
    res.writeHead(500); res.end('Error: ' + e.message);
    console.error(e);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log('\nOpen this URL in your browser and approve access:\n');
  console.log(authUrl + '\n');
  console.log('(If you see an "unverified app" screen, click Advanced -> Go to ... — expected for a personal app.)\n');
});
