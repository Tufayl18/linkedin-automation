import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { POSTS_DIR, getPostDetails, loadEnv, colors } from './utils.js';

const PREVIEW_PORT = 8081;

function openBrowser(url) {
  const cmd = process.platform === 'darwin'
    ? `open "${url}"`
    : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

// Calculate the above-the-fold cutoff for terminal display
export function getFoldCutoff(content) {
  const lines = content.split('\n');
  
  // Mobile cutoff: approx first 3 non-empty lines or 180 chars
  let mobileLines = [];
  let count = 0;
  for (const line of lines) {
    mobileLines.push(line);
    if (line.trim().length > 0) count++;
    if (count >= 3) break;
  }

  // Desktop cutoff: approx first 5 non-empty lines or 300 chars
  let desktopLines = [];
  count = 0;
  for (const line of lines) {
    desktopLines.push(line);
    if (line.trim().length > 0) count++;
    if (count >= 5) break;
  }

  return {
    mobileAboveFold: mobileLines.join('\n'),
    desktopAboveFold: desktopLines.join('\n'),
    full: content
  };
}

// Generate the HTML for the LinkedIn Feed Preview card
function generatePreviewHtml(folderName, postContent, imageList, authorName) {
  const safeContent = postContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const imagesHtml = imageList.map(img => `
    <div class="img-wrapper">
      <img src="/image/${encodeURIComponent(img)}" alt="${img}" />
      <div class="img-caption">${img}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkedIn Post Preview - ${folderName}</title>
  <style>
    :root {
      --bg: #f3f2ef;
      --card-bg: #ffffff;
      --text: #191919;
      --text-sub: rgba(0, 0, 0, 0.6);
      --link: #0a66c2;
      --border: #e0e0e0;
      --card-radius: 8px;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #000000;
        --card-bg: #1b1f23;
        --text: #ffffff;
        --text-sub: rgba(255, 255, 255, 0.7);
        --link: #70b5f9;
        --border: #383e45;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px 15px;
    }
    .header {
      width: 100%;
      max-width: 600px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 600;
    }
    .view-toggle {
      display: flex;
      gap: 8px;
      background: var(--card-bg);
      padding: 4px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .view-btn {
      background: transparent;
      border: none;
      color: var(--text-sub);
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
    }
    .view-btn.active {
      background: var(--link);
      color: #fff;
    }
    .container {
      width: 100%;
      max-width: 580px;
      transition: max-width 0.2s ease;
    }
    .container.mobile-mode {
      max-width: 380px;
    }
    .linkedin-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--card-radius);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .author-header {
      display: flex;
      align-items: center;
      padding: 14px 16px 8px 16px;
      gap: 12px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #0a66c2;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 20px;
      flex-shrink: 0;
    }
    .author-info {
      flex: 1;
      min-width: 0;
    }
    .author-name {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.2;
    }
    .author-title {
      font-size: 12px;
      color: var(--text-sub);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .post-time {
      font-size: 12px;
      color: var(--text-sub);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }
    .post-body {
      padding: 8px 16px 14px 16px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .collapsed-text {
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .mobile-mode .collapsed-text {
      -webkit-line-clamp: 3;
    }
    .see-more-btn {
      color: var(--text-sub);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: inline-block;
      margin-top: 4px;
    }
    .see-more-btn:hover {
      color: var(--link);
      text-decoration: underline;
    }
    .images-container {
      margin-top: 8px;
      border-top: 1px solid var(--border);
      background: #000;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .img-wrapper {
      position: relative;
    }
    .img-wrapper img {
      width: 100%;
      height: auto;
      display: block;
    }
    .img-caption {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0,0,0,0.65);
      color: #fff;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .post-footer {
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-around;
      color: var(--text-sub);
      font-size: 13px;
      font-weight: 600;
    }
    .footer-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    .footer-action:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    .stats-badge {
      margin-top: 16px;
      font-size: 12px;
      color: var(--text-sub);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 LinkedIn Post Preview</h1>
    <div class="view-toggle">
      <button class="view-btn active" onclick="setView('desktop')">💻 Desktop</button>
      <button class="view-btn" onclick="setView('mobile')">📱 Mobile</button>
    </div>
  </div>

  <div class="container" id="previewContainer">
    <div class="linkedin-card">
      <div class="author-header">
        <div class="avatar">${(authorName || 'U')[0].toUpperCase()}</div>
        <div class="author-info">
          <div class="author-name">${authorName || 'Your Name'}</div>
          <div class="author-title">DevOps / Cloud Engineer • Linux & Infrastructure</div>
          <div class="post-time">Just now • 🌐</div>
        </div>
      </div>

      <div class="post-body">
        <div id="contentBlock" class="collapsed-text">${safeContent}</div>
        <div id="seeMoreBtn" class="see-more-btn" onclick="toggleExpand()">...see more</div>
      </div>

      ${imagesHtml ? `<div class="images-container">${imagesHtml}</div>` : ''}

      <div class="post-footer">
        <div class="footer-action">👍 Like</div>
        <div class="footer-action">💬 Comment</div>
        <div class="footer-action">🔁 Repost</div>
        <div class="footer-action">✈️ Send</div>
      </div>
    </div>

    <div class="stats-badge">
      ⚡ Post Length: ${postContent.length} chars • ${postContent.split(/\s+/).filter(Boolean).length} words • ${imageList.length} image(s)
    </div>
  </div>

  <script>
    let isExpanded = false;
    function toggleExpand() {
      const block = document.getElementById('contentBlock');
      const btn = document.getElementById('seeMoreBtn');
      isExpanded = !isExpanded;
      if (isExpanded) {
        block.classList.remove('collapsed-text');
        btn.innerText = 'see less';
      } else {
        block.classList.add('collapsed-text');
        btn.innerText = '...see more';
      }
    }

    function setView(mode) {
      const container = document.getElementById('previewContainer');
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      if (mode === 'mobile') {
        container.classList.add('mobile-mode');
        event.target.classList.add('active');
      } else {
        container.classList.remove('mobile-mode');
        event.target.classList.add('active');
      }
    }
  </script>
</body>
</html>`;
}

// Start temporary local preview server and open in browser
export async function startPreviewServer(folderName) {
  const postFolder = path.isAbsolute(folderName) ? folderName : path.join(POSTS_DIR, folderName);
  const baseName = path.basename(postFolder);
  const postFile = path.join(postFolder, 'post.md');
  const imagesDir = path.join(postFolder, 'images');

  if (!fsSync.existsSync(postFolder) || !fsSync.existsSync(postFile)) {
    console.log(`\n${colors.red}[Error] Post '${folderName}' or post.md not found.${colors.reset}\n`);
    return;
  }

  const postContent = (await fs.readFile(postFile, 'utf-8')).trim();
  const env = loadEnv();
  const authorName = env.LINKEDIN_PERSON_NAME || 'You';

  let imageList = [];
  if (fsSync.existsSync(imagesDir)) {
    const files = await fs.readdir(imagesDir);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    imageList = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase()));
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PREVIEW_PORT}`);

    if (url.pathname.startsWith('/image/')) {
      const filename = decodeURIComponent(url.pathname.replace('/image/', ''));
      const filePath = path.join(imagesDir, filename);
      if (fsSync.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
        res.end(await fs.readFile(filePath));
        return;
      }
    }

    // Dynamically re-read postContent and images on each request so browser refreshes immediately show file changes
    let currentPostContent = '';
    if (fsSync.existsSync(postFile)) {
      currentPostContent = (await fs.readFile(postFile, 'utf-8')).trim();
    }
    let currentImageList = [];
    if (fsSync.existsSync(imagesDir)) {
      const files = await fs.readdir(imagesDir);
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      currentImageList = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase()));
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generatePreviewHtml(baseName, currentPostContent, currentImageList, authorName));
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`${colors.yellow}[*] Preview server already open at http://localhost:${PREVIEW_PORT}${colors.reset}`);
      openBrowser(`http://localhost:${PREVIEW_PORT}`);
    } else {
      console.error(`Preview error: ${err.message}`);
    }
  });

  server.listen(PREVIEW_PORT, () => {
    const previewUrl = `http://localhost:${PREVIEW_PORT}`;
    console.log(`\n${colors.green}${colors.bold}[✓] Visual Web Preview running at: ${colors.cyan}${previewUrl}${colors.reset}`);
    console.log(`${colors.dim}(Press Ctrl+C in CLI when done or continue browsing)${colors.reset}\n`);
    openBrowser(previewUrl);
  });
}
