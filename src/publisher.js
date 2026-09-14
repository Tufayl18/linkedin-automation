import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { loadEnv, POSTS_DIR, getPostDetails, savePostMeta, colors } from './utils.js';

async function uploadImage(accessToken, personUrn, imagePath) {
  const filename = path.basename(imagePath);
  console.log(`${colors.cyan}[*] Uploading image: ${filename}...${colors.reset}`);

  const registerUrl = 'https://api.linkedin.com/v2/assets?action=registerUpload';
  const registerPayload = {
    registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
      owner: personUrn,
      serviceRelationships: [
        {
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent'
        }
      ]
    }
  };

  const regRes = await fetch(registerUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(registerPayload)
  });

  if (!regRes.ok) {
    const txt = await regRes.text();
    throw new Error(`Image registration failed (${regRes.status}): ${txt}`);
  }

  const regData = await regRes.json();
  const uploadUrl = regData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetUrn = regData.value.asset;

  const fileBuffer = await fs.readFile(imagePath);
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream'
    },
    body: fileBuffer
  });

  if (!uploadRes.ok) {
    const txt = await uploadRes.text();
    throw new Error(`Image binary upload failed (${uploadRes.status}): ${txt}`);
  }

  console.log(`${colors.green}[✓] Image uploaded successfully (Asset: ${assetUrn})${colors.reset}`);
  return assetUrn;
}

export async function publishPost(folderName) {
  const env = loadEnv();
  const accessToken = env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    console.log(`\n${colors.red}[Error] You are not authenticated yet.${colors.reset}`);
    console.log(`Please run: ${colors.green}node src/cli.js auth${colors.reset} to connect your LinkedIn account.\n`);
    return false;
  }

  const postFolder = path.isAbsolute(folderName) ? folderName : path.join(POSTS_DIR, folderName);
  const postFile = path.join(postFolder, 'post.md');
  const readmeFile = path.join(postFolder, 'README.md');
  const imagesDir = path.join(postFolder, 'images');

  if (!fsSync.existsSync(postFile)) {
    console.log(`\n${colors.red}[Error] post.md not found in ${postFolder}${colors.reset}\n`);
    return false;
  }

  const postContent = (await fs.readFile(postFile, 'utf-8')).trim();
  if (!postContent) {
    console.log(`\n${colors.red}[Error] post.md is empty!${colors.reset}\n`);
    return false;
  }

  // Look for images
  const mediaElements = [];
  if (fsSync.existsSync(imagesDir)) {
    const files = await fs.readdir(imagesDir);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const imageFiles = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase()));

    for (const img of imageFiles) {
      const fullImgPath = path.join(imagesDir, img);
      const assetUrn = await uploadImage(accessToken, personUrn, fullImgPath);
      mediaElements.push({
        status: 'READY',
        description: { text: img },
        media: assetUrn,
        title: { text: img }
      });
    }
  }

  const shareMediaCategory = mediaElements.length > 0 ? 'IMAGE' : 'NONE';
  const ugcUrl = 'https://api.linkedin.com/v2/ugcPosts';

  const payload = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: postContent
        },
        shareMediaCategory: shareMediaCategory,
        media: mediaElements
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  };

  console.log(`\n${colors.cyan}[*] Publishing to LinkedIn...${colors.reset}`);

  const res = await fetch(ugcUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`\n${colors.red}[Error] LinkedIn API error (${res.status}):${colors.reset}\n${err}\n`);
    return false;
  }

  const data = await res.json();
  const postId = data.id || 'N/A';
  const publishedAt = new Date().toISOString();

  // Save published status to meta.json
  savePostMeta(folderName, {
    status: 'PUBLISHED',
    publishedAt: publishedAt,
    postId: postId
  });

  // Update README.md status if it exists
  if (fsSync.existsSync(readmeFile)) {
    try {
      let readme = await fs.readFile(readmeFile, 'utf-8');
      const statusNote = `> **Status:** 🚀 PUBLISHED on ${new Date(publishedAt).toLocaleString()} (Post ID: \`${postId}\`)\n\n`;
      if (!readme.includes('🚀 PUBLISHED')) {
        readme = statusNote + readme;
        await fs.writeFile(readmeFile, readme, 'utf-8');
      }
    } catch {
      // ignore readme write error
    }
  }

  console.log(`\n${colors.green}====================================================${colors.reset}`);
  console.log(`${colors.green}${colors.bold} [✓] POST SUCCESSFULLY PUBLISHED TO LINKEDIN! ${colors.reset}`);
  console.log(` ${colors.bold}Post ID:${colors.reset} ${colors.yellow}${postId}${colors.reset}`);
  console.log(` ${colors.bold}Status:${colors.reset}  ${colors.green}Saved as PUBLISHED in post tracker${colors.reset}`);
  console.log(`${colors.green}====================================================${colors.reset}\n`);

  return true;
}

