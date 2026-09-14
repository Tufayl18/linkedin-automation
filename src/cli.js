#!/usr/bin/env node

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { runAuth } from './auth.js';
import { reviewPost } from './review.js';
import { publishPost } from './publisher.js';
import { lintPost, printLintReport } from './linter.js';
import { startPreviewServer } from './preview.js';
import {
  getPostFolders,
  getPostDetails,
  getAllPostsDetails,
  savePostMeta,
  POSTS_DIR,
  colors
} from './utils.js';

async function promptUser(query) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(query);
  rl.close();
  return answer.trim();
}

function getTodayString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

async function scaffoldNewPost(titleInput) {
  let title = titleInput;
  if (!title) {
    title = await promptUser(`${colors.cyan}Enter a short title or topic for the post (e.g. learning-linux): ${colors.reset}`);
  }

  if (!title) {
    console.log(`${colors.red}[!] Post creation cancelled.${colors.reset}`);
    return;
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const folderName = `${getTodayString()}-${slug}`;
  const targetDir = path.join(POSTS_DIR, folderName);
  const imagesDir = path.join(targetDir, 'images');

  if (fsSync.existsSync(targetDir)) {
    console.log(`${colors.yellow}[!] Post folder '${folderName}' already exists.${colors.reset}`);
    return folderName;
  }

  await fs.mkdir(imagesDir, { recursive: true });

  const initialReadme = `# Post Strategy & Internal Notes: ${title}

## 💡 Post Idea
- Brief summary of what was tested, discovered, or solved.

## 🪝 Hook Reasoning
- Why this hook catches the target reader's curiosity without clickbait.

## 🎯 Target Audience
- Developers, System Administrators, DevOps Aspirants, Cloud Engineers

## 🧠 Main Technical Lesson
- The core technical takeaway or realization.

## 🔍 Supporting Technical Details & Environment
- **Environment:** (e.g., AlmaLinux 9, RHEL, Docker v24)
- **Key Concepts:** Commands, files, or configs involved.

## 🖼️ Suggested Images & Descriptions
- **Image Names:** (Use clean names, e.g. \`shadow-locking-almalinux.png\`)
- **Description:** What the image shows and why it helps visual understanding.

## 📚 Verification & Sources
- Lab observations, man pages, official docs, RFCs.

## 🚀 Possible Future Improvements / Follow-ups
- Related topics or deeper dives to explore later.
`;

  const initialPost = `Here is your draft post content for "${title}".

Edit this file (\`post.md\`) directly with your finalized text and hashtags!

#DevOps #Linux #CloudEngineering #CareerGrowth
`;

  await fs.writeFile(path.join(targetDir, 'README.md'), initialReadme, 'utf-8');
  await fs.writeFile(path.join(targetDir, 'post.md'), initialPost, 'utf-8');

  // Initialize meta.json tracker
  savePostMeta(folderName, {
    title: title,
    createdAt: new Date().toISOString(),
    status: 'DRAFT',
    publishedAt: null,
    postId: null
  });

  console.log(`\n${colors.green}${colors.bold}[✓] Post workspace created successfully!${colors.reset}`);
  console.log(`📂 Location: ${colors.cyan}${targetDir}${colors.reset}`);
  console.log(`   ├── meta.json   ${colors.dim}(Status & publishing tracker)${colors.reset}`);
  console.log(`   ├── README.md   ${colors.dim}(Strategy, hooks, and outline)${colors.reset}`);
  console.log(`   ├── post.md     ${colors.dim}(The actual LinkedIn copy)${colors.reset}`);
  console.log(`   └── images/     ${colors.dim}(Put your screenshots/graphics here)${colors.reset}\n`);

  return folderName;
}

async function renderDashboard() {
  const posts = await getAllPostsDetails();

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  📊 LINKEDIN POSTS DASHBOARD & STATUS TRACKER${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  if (posts.length === 0) {
    console.log(`\n  ${colors.dim}No posts found in posts/ folder. Run 'node src/cli.js new' to create one.${colors.reset}\n`);
    return [];
  }

  let readyCount = 0;
  let draftCount = 0;
  let publishedCount = 0;

  console.log();
  posts.forEach((p, idx) => {
    let tag = '';
    let details = '';

    if (p.status === 'PUBLISHED') {
      publishedCount++;
      const pubDate = p.meta.publishedAt ? new Date(p.meta.publishedAt).toLocaleDateString() : 'Yes';
      tag = `${colors.bgGreen} PUBLISHED ${colors.reset}`;
      details = `${colors.dim}(Published on ${pubDate} | ID: ${p.meta.postId || 'N/A'})${colors.reset}`;
    } else if (p.status === 'READY') {
      readyCount++;
      tag = `${colors.green}${colors.bold}[READY TO POST]${colors.reset}`;
      const imgTxt = p.imageCount > 0 ? `, 🖼️  ${p.imageCount} image(s)` : '';
      details = `${colors.cyan}(${p.charCount} chars, ${p.wordCount} words${imgTxt})${colors.reset}`;
    } else {
      draftCount++;
      tag = `${colors.yellow}[DRAFT / EMPTY]${colors.reset}`;
      details = `${colors.dim}(post.md needs content)${colors.reset}`;
    }

    console.log(`  ${colors.bold}${idx + 1}.${colors.reset} ${tag} ${colors.bold}${p.folderName}${colors.reset}`);
    console.log(`     └── ${details}`);
  });

  console.log(`\n${colors.blue}────────────────────────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`  ${colors.bold}Summary:${colors.reset} 🟢 ${colors.green}${readyCount} Ready to Publish${colors.reset}  |  🟡 ${colors.yellow}${draftCount} Drafts in progress${colors.reset}  |  🚀 ${colors.cyan}${publishedCount} Published${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  return posts;
}

async function handlePublishFlow(targetInput) {
  let target = targetInput;
  const posts = await getAllPostsDetails();

  if (posts.length === 0) {
    console.log(`${colors.yellow}No posts available to publish.${colors.reset}`);
    return;
  }

  if (!target) {
    // Check if there are ready posts
    const readyPosts = posts.filter(p => p.status === 'READY');
    if (readyPosts.length > 0) {
      target = readyPosts[0].folderName;
    } else {
      target = posts[0].folderName;
    }
  }

  const postDetail = await getPostDetails(target);

  // Review & Lint first
  const valid = await reviewPost(target);
  if (!valid) {
    const override = await promptUser(`${colors.yellow}Linter found critical errors. Proceed with publishing anyway? (y/N): ${colors.reset}`);
    if (override.toLowerCase() !== 'y' && override.toLowerCase() !== 'yes') {
      console.log(`${colors.dim}Publishing aborted. Please fix errors first.${colors.reset}\n`);
      return;
    }
  }

  // Duplicate publish guard
  if (postDetail.status === 'PUBLISHED') {
    const pubDate = postDetail.meta.publishedAt ? new Date(postDetail.meta.publishedAt).toLocaleString() : 'previously';
    console.log(`${colors.red}${colors.bold}⚠️  WARNING: THIS POST WAS ALREADY PUBLISHED!${colors.reset}`);
    console.log(`  Published at: ${colors.yellow}${pubDate}${colors.reset}`);
    console.log(`  Post ID:      ${colors.yellow}${postDetail.meta.postId || 'N/A'}${colors.reset}\n`);
    
    const forceConfirm = await promptUser(`${colors.red}Are you sure you want to FORCE RE-PUBLISH this post again? (type 'yes' to confirm): ${colors.reset}`);
    if (forceConfirm.toLowerCase() !== 'yes') {
      console.log(`${colors.dim}Publishing aborted to prevent accidental duplicate post.${colors.reset}\n`);
      return;
    }
  } else if (postDetail.status === 'DRAFT') {
    console.log(`${colors.yellow}${colors.bold}⚠️  NOTE: post.md appears to be empty or contains placeholder text.${colors.reset}`);
    console.log(`  Make sure you edited post.md with your final LinkedIn copy before publishing.\n`);
    
    const draftConfirm = await promptUser(`${colors.yellow}Proceed anyway? (y/N): ${colors.reset}`);
    if (draftConfirm.toLowerCase() !== 'y' && draftConfirm.toLowerCase() !== 'yes') {
      console.log(`${colors.dim}Publishing cancelled. Edit post.md and try again.${colors.reset}\n`);
      return;
    }
  } else {
    const confirm = await promptUser(`${colors.bold}${colors.green}Ready to publish this post live to LinkedIn? (y/N): ${colors.reset}`);
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log(`${colors.dim}Publishing cancelled.${colors.reset}\n`);
      return;
    }
  }

  await publishPost(target);
}

async function selectPostFolder(folders, actionLabel) {
  if (folders.length === 0) {
    console.log(`${colors.yellow}No posts found in posts/ folder.${colors.reset}`);
    return null;
  }
  await renderDashboard();
  const num = await promptUser(`${colors.cyan}Enter post number to ${actionLabel} [1-${folders.length}] (default 1): ${colors.reset}`);
  const idx = parseInt(num, 10) ? parseInt(num, 10) - 1 : 0;
  return folders[idx] || folders[0];
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'menu';

  switch (command) {
    case 'auth':
      await runAuth();
      break;

    case 'new':
      await scaffoldNewPost(args.slice(1).join(' '));
      break;

    case 'status':
      await renderDashboard();
      break;

    case 'lint': {
      let target = args[1];
      const folders = await getPostFolders();
      if (!target) {
        target = await selectPostFolder(folders, 'lint');
        if (!target) break;
      }
      const report = await lintPost(target);
      printLintReport(report, target);
      break;
    }

    case 'preview': {
      let target = args[1];
      const folders = await getPostFolders();
      if (!target) {
        target = await selectPostFolder(folders, 'preview');
        if (!target) break;
      }
      await startPreviewServer(target);
      break;
    }

    case 'review': {
      let target = args[1];
      const folders = await getPostFolders();
      if (!target) {
        target = await selectPostFolder(folders, 'review');
        if (!target) break;
      }
      await reviewPost(target);
      break;
    }

    case 'publish': {
      await handlePublishFlow(args[1]);
      break;
    }

    case 'menu':
    default: {
      const posts = await getAllPostsDetails();
      const readyCount = posts.filter(p => p.status === 'READY').length;
      const draftCount = posts.filter(p => p.status === 'DRAFT').length;
      const pubCount = posts.filter(p => p.status === 'PUBLISHED').length;

      console.log(`\n${colors.bgBlue}${colors.bold}  LINKEDIN POST AUTOMATION CLI  ${colors.reset}`);
      console.log(`  ${colors.dim}Status: 🟢 ${readyCount} Ready to post | 🟡 ${draftCount} Drafts | 🚀 ${pubCount} Published${colors.reset}\n`);
      console.log(`  ${colors.green}1.${colors.reset} 📝 Create new post draft        (${colors.dim}npm run new${colors.reset})`);
      console.log(`  ${colors.green}2.${colors.reset} 📊 Post Status Dashboard        (${colors.dim}npm run status${colors.reset})`);
      console.log(`  ${colors.green}3.${colors.reset} 📋 Review post draft in CLI      (${colors.dim}npm run review${colors.reset})`);
      console.log(`  ${colors.green}4.${colors.reset} 🛡️  Lint & check AGENTS.md rules  (${colors.dim}npm run lint${colors.reset})`);
      console.log(`  ${colors.green}5.${colors.reset} 🔍 Visual Feed Browser Preview  (${colors.dim}npm run preview${colors.reset})`);
      console.log(`  ${colors.green}6.${colors.reset} 🚀 Publish a post               (${colors.dim}npm run publish${colors.reset})`);
      console.log(`  ${colors.green}7.${colors.reset} 🔑 Authenticate LinkedIn         (${colors.dim}npm run auth${colors.reset})`);
      console.log(`  ${colors.green}0.${colors.reset} 🚪 Exit\n`);

      const choice = await promptUser(`${colors.cyan}Select an option (0-7): ${colors.reset}`);
      const folders = await getPostFolders();

      if (choice === '1') {
        await scaffoldNewPost();
      } else if (choice === '2') {
        await renderDashboard();
      } else if (choice === '3') {
        const target = await selectPostFolder(folders, 'review');
        if (target) await reviewPost(target);
      } else if (choice === '4') {
        const target = await selectPostFolder(folders, 'lint');
        if (target) {
          const report = await lintPost(target);
          printLintReport(report, target);
        }
      } else if (choice === '5') {
        const target = await selectPostFolder(folders, 'preview');
        if (target) await startPreviewServer(target);
      } else if (choice === '6') {
        const target = await selectPostFolder(folders, 'publish');
        if (target) await handlePublishFlow(target);
      } else if (choice === '7') {
        await runAuth();
      }
      break;
    }
  }
}

main().catch(err => {
  console.error(`\n${colors.red}[Fatal Error] ${err.message}${colors.reset}\n`);
  process.exit(1);
});
