import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');
export const POSTS_DIR = path.join(ROOT_DIR, 'posts');
export const ENV_FILE = path.join(ROOT_DIR, '.env');

// ANSI Color formatting
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

export function loadEnv() {
  const env = {};
  if (fsSync.existsSync(ENV_FILE)) {
    const content = fsSync.readFileSync(ENV_FILE, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...rest] = trimmed.split('=');
        env[k.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return env;
}

export function saveEnv(updates) {
  const current = loadEnv();
  const merged = { ...current, ...updates };
  let lines = [];
  
  if (fsSync.existsSync(ENV_FILE)) {
    const raw = fsSync.readFileSync(ENV_FILE, 'utf-8').split('\n');
    const seenKeys = new Set();
    for (const line of raw) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k] = trimmed.split('=');
        const key = k.trim();
        if (key in merged) {
          lines.push(`${key}=${merged[key]}`);
          seenKeys.add(key);
          continue;
        }
      }
      lines.push(line);
    }
    for (const [k, v] of Object.entries(merged)) {
      if (!seenKeys.has(k)) {
        lines.push(`${k}=${v}`);
      }
    }
  } else {
    for (const [k, v] of Object.entries(merged)) {
      lines.push(`${k}=${v}`);
    }
  }
  
  fsSync.writeFileSync(ENV_FILE, lines.join('\n').trim() + '\n', 'utf-8');
}

export function getPostMeta(folderName) {
  const postFolder = path.isAbsolute(folderName) ? folderName : path.join(POSTS_DIR, folderName);
  const metaPath = path.join(postFolder, 'meta.json');
  
  let meta = {
    title: folderName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' '),
    createdAt: null,
    status: 'DRAFT',
    publishedAt: null,
    postId: null
  };

  if (fsSync.existsSync(metaPath)) {
    try {
      meta = { ...meta, ...JSON.parse(fsSync.readFileSync(metaPath, 'utf-8')) };
    } catch {
      // ignore parse error, fallback to default
    }
  }

  // Determine dynamic status
  if (meta.publishedAt || meta.status === 'PUBLISHED') {
    meta.status = 'PUBLISHED';
  } else {
    const postPath = path.join(postFolder, 'post.md');
    if (fsSync.existsSync(postPath)) {
      const content = fsSync.readFileSync(postPath, 'utf-8').trim();
      const isPlaceholder = !content || content.includes('Here is your draft post content for') || content.includes('Edit this file (`post.md`)');
      meta.status = isPlaceholder ? 'DRAFT' : 'READY';
    } else {
      meta.status = 'DRAFT';
    }
  }

  return meta;
}

export function savePostMeta(folderName, updates) {
  const postFolder = path.isAbsolute(folderName) ? folderName : path.join(POSTS_DIR, folderName);
  const metaPath = path.join(postFolder, 'meta.json');
  const current = getPostMeta(folderName);
  const merged = { ...current, ...updates };

  if (fsSync.existsSync(postFolder)) {
    fsSync.writeFileSync(metaPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  }
  return merged;
}

export async function getPostDetails(folderName) {
  const postFolder = path.isAbsolute(folderName) ? folderName : path.join(POSTS_DIR, folderName);
  const meta = getPostMeta(folderName);
  const postPath = path.join(postFolder, 'post.md');
  const imagesDir = path.join(postFolder, 'images');

  let charCount = 0;
  let wordCount = 0;
  let isPlaceholder = true;

  if (fsSync.existsSync(postPath)) {
    const content = (await fs.readFile(postPath, 'utf-8')).trim();
    charCount = content.length;
    wordCount = content.split(/\s+/).filter(Boolean).length;
    isPlaceholder = !content || content.includes('Here is your draft post content for') || content.includes('Edit this file (`post.md`)');
  }

  let imageCount = 0;
  if (fsSync.existsSync(imagesDir)) {
    const files = await fs.readdir(imagesDir);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    imageCount = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase())).length;
  }

  return {
    folderName: path.basename(postFolder),
    path: postFolder,
    meta,
    status: meta.status,
    charCount,
    wordCount,
    isPlaceholder,
    imageCount
  };
}

export async function getPostFolders() {
  if (!fsSync.existsSync(POSTS_DIR)) {
    await fs.mkdir(POSTS_DIR, { recursive: true });
    return [];
  }
  const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name).sort().reverse();
}

export async function getAllPostsDetails() {
  const folders = await getPostFolders();
  const details = [];
  for (const folder of folders) {
    details.push(await getPostDetails(folder));
  }
  return details;
}

