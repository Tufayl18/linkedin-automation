import http from 'node:http';
import { exec } from 'node:child_process';
import { loadEnv, saveEnv, colors } from './utils.js';

const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

function openBrowser(url) {
  const cmd = process.platform === 'darwin'
    ? `open "${url}"`
    : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) {
      console.log(`[!] Please open this URL manually in your browser:\n${url}`);
    }
  });
}

export async function runAuth() {
  const env = loadEnv();
  const clientId = env.LINKEDIN_CLIENT_ID;
  const clientSecret = env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log(`\n${colors.red}${colors.bold}Error: Missing LinkedIn App credentials in .env${colors.reset}`);
    console.log(`Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to linkedin-automation/.env\n`);
    console.log(`${colors.cyan}Setup Steps:${colors.reset}`);
    console.log(`1. Go to ${colors.bold}https://www.linkedin.com/developers/apps${colors.reset}`);
    console.log(`2. Create a free app & add product: ${colors.bold}'Share on LinkedIn'${colors.reset} and ${colors.bold}'Sign In with LinkedIn using OpenID Connect'${colors.reset}`);
    console.log(`3. Under Auth -> Authorized redirect URLs, add: ${colors.green}${REDIRECT_URI}${colors.reset}`);
    console.log(`4. Copy Client ID and Secret into .env and rerun this command.\n`);
    return;
  }

  const scopes = 'openid profile email w_member_social';
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;

  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.green}${colors.bold} LinkedIn OAuth 2.0 Authorization ${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}\n`);
  console.log(`Opening browser for authorization...`);
  openBrowser(authUrl);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error_description') || url.searchParams.get('error');

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body style="font-family:sans-serif;text-align:center;padding:40px;"><h2>Authentication Successful!</h2><p>You can close this tab and return to your terminal.</p></body></html>');
          
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
          server.close();
          console.log(`\n${colors.cyan}[+] Authorization code received. Exchanging for Access Token...${colors.reset}`);

          try {
            const tokenParams = new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: REDIRECT_URI,
              client_id: clientId,
              client_secret: clientSecret
            });

            const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: tokenParams.toString()
            });

            if (!tokenRes.ok) {
              const errTxt = await tokenRes.text();
              throw new Error(`Token exchange failed: ${tokenRes.status} ${errTxt}`);
            }

            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;

            // Fetch user profile
            let personUrn = '';
            const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (userinfoRes.ok) {
              const userInfo = await userinfoRes.json();
              personUrn = `urn:li:person:${userInfo.sub}`;
              console.log(`${colors.green}[✓] Logged in as: ${userInfo.name} (${personUrn})${colors.reset}`);
            } else {
              const meRes = await fetch('https://api.linkedin.com/v2/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });
              if (meRes.ok) {
                const meData = await meRes.json();
                personUrn = `urn:li:person:${meData.id}`;
              }
            }

            saveEnv({
              LINKEDIN_ACCESS_TOKEN: accessToken,
              LINKEDIN_PERSON_URN: personUrn
            });

            console.log(`${colors.green}${colors.bold}[✓] Successfully authenticated and saved token to .env!${colors.reset}\n`);
            resolve();
          } catch (err) {
            console.error(`${colors.red}[Error] ${err.message}${colors.reset}`);
            reject(err);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authentication Failed</h1><p>${error}</p>`);
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
          server.close();
          reject(new Error(error));
        }
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`\n${colors.red}[Error] Port ${PORT} is already in use by another application.${colors.reset}`);
        console.log(`Please free port ${PORT} or close the running process, then run: ${colors.green}npm run auth${colors.reset}\n`);
      } else {
        console.error(`\n${colors.red}[Error] Server error: ${err.message}${colors.reset}\n`);
      }
      reject(err);
    });

    server.listen(PORT, () => {
      console.log(`Waiting for authorization callback on ${colors.yellow}${REDIRECT_URI}${colors.reset} ...`);
    });
  });
}
