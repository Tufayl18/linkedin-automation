import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { POSTS_DIR, getPostDetails, colors } from './utils.js';
import { lintPost, printLintReport } from './linter.js';
import { getFoldCutoff } from './preview.js';

export async function reviewPost(folderName) {
  const postFolder = path.isAbsolute(folderName) ? folderName : path.join(POSTS_DIR, folderName);
  const baseName = path.basename(postFolder);

  if (!fsSync.existsSync(postFolder)) {
    console.log(`\n${colors.red}[Error] Post folder '${folderName}' does not exist.${colors.reset}\n`);
    return false;
  }

  const details = await getPostDetails(folderName);
  const readmePath = path.join(postFolder, 'README.md');
  const postPath = path.join(postFolder, 'post.md');
  const imagesDir = path.join(postFolder, 'images');

  let statusBadge = `${colors.yellow}🟡 DRAFT (Needs content in post.md)${colors.reset}`;
  if (details.status === 'PUBLISHED') {
    const pubDate = details.meta.publishedAt ? new Date(details.meta.publishedAt).toLocaleString() : 'Yes';
    statusBadge = `${colors.green}${colors.bold}🚀 PUBLISHED${colors.reset} ${colors.dim}(on ${pubDate} | ID: ${details.meta.postId || 'N/A'})${colors.reset}`;
  } else if (details.status === 'READY') {
    statusBadge = `${colors.green}${colors.bold}🟢 READY TO PUBLISH${colors.reset}`;
  }

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  📋 LINKEDIN POST REVIEW: ${colors.yellow}${baseName}${colors.reset}`);
  console.log(`  📊 Status: ${statusBadge}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  // 1. Post Content
  let postContent = '';
  if (fsSync.existsSync(postPath)) {
    postContent = (await fs.readFile(postPath, 'utf-8')).trim();
    const charCount = postContent.length;
    const wordCount = postContent.split(/\s+/).filter(Boolean).length;

    console.log(`\n${colors.bold}📝 Full Post Body (${charCount} characters / ${wordCount} words):${colors.reset}`);
    console.log(`${colors.dim}------------------------------------------------------------------${colors.reset}`);
    console.log(postContent);
    console.log(`${colors.dim}------------------------------------------------------------------${colors.reset}`);

    // "Above the Fold" / "...see more" analysis
    if (postContent.length > 0) {
      const { mobileAboveFold, desktopAboveFold } = getFoldCutoff(postContent);
      console.log(`\n${colors.bold}${colors.cyan}📱 Feed Hook Truncation Preview ("...see more" cut-off):${colors.reset}`);
      console.log(`  ${colors.yellow}• Mobile App Fold (~First 3 lines):${colors.reset}`);
      console.log(`    ${colors.dim}"${mobileAboveFold.replace(/\n/g, ' ')}... ${colors.cyan}[...see more]${colors.dim}"${colors.reset}`);
      console.log(`  ${colors.yellow}• Desktop Web Fold (~First 5 lines):${colors.reset}`);
      console.log(`    ${colors.dim}"${desktopAboveFold.replace(/\n/g, ' ')}... ${colors.cyan}[...see more]${colors.dim}"${colors.reset}`);
    }
  } else {
    console.log(`\n${colors.yellow}[!] No post.md found in this folder.${colors.reset}`);
  }

  // 2. Attached Images
  console.log(`\n${colors.bold}🖼️  Attached Images:${colors.reset}`);
  if (fsSync.existsSync(imagesDir)) {
    const files = await fs.readdir(imagesDir);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const imageFiles = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase()));

    if (imageFiles.length === 0) {
      console.log(`  ${colors.dim}(No images in images/ folder - this will be a text-only post)${colors.reset}`);
    } else {
      for (const img of imageFiles) {
        const stat = await fs.stat(path.join(imagesDir, img));
        const sizeKB = (stat.size / 1024).toFixed(1);
        console.log(`  ${colors.green}✔ ${img}${colors.reset} (${sizeKB} KB)`);
      }
    }
  } else {
    console.log(`  ${colors.dim}(No images directory found)${colors.reset}`);
  }

  // 3. Quality & Rule Linter Check
  const lintReport = await lintPost(folderName);
  printLintReport(lintReport, baseName);

  // 4. Strategy / README.md
  if (fsSync.existsSync(readmePath)) {
    console.log(`${colors.bold}📖 Post Strategy (from README.md):${colors.reset}`);
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    const previewLines = readmeContent.split('\n').slice(0, 10).join('\n');
    console.log(`${colors.dim}${previewLines}${colors.reset}`);
    if (readmeContent.split('\n').length > 10) {
      console.log(`${colors.dim}... [see README.md for full strategy notes]${colors.reset}`);
    }
  }

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  return lintReport.passed;
}
