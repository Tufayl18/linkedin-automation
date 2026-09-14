import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { POSTS_DIR, colors } from './utils.js';

// Common generic AI buzzwords & bragging phrases to flag
const FORBIDDEN_PHRASES = [
  'thrilled to announce',
  'excited to share',
  'incredible milestone',
  'proud to present',
  'delve into',
  'game changer',
  'testament to',
  'unlock the power',
  "in today's fast-paced world",
  'without further ado',
  'super excited',
  'esteemed colleagues',
  'embark on a journey',
  'in conclusion',
  'humbled and honored',
  'game-changing'
];

const GENERIC_IMAGE_NAMES = [
  'image.png',
  'image.jpg',
  'terminal.png',
  'screenshot.png',
  'untitled.png',
  'img.png',
  'photo.png',
  'capture.png'
];

export async function lintPost(folderName) {
  const postFolder = path.isAbsolute(folderName) ? folderName : path.join(POSTS_DIR, folderName);
  const baseName = path.basename(postFolder);
  const postFile = path.join(postFolder, 'post.md');
  const imagesDir = path.join(postFolder, 'images');

  const errors = [];
  const warnings = [];
  const suggestions = [];

  if (!fsSync.existsSync(postFolder)) {
    return {
      passed: false,
      errors: [`Post directory not found: ${postFolder}`],
      warnings: [],
      suggestions: [],
      stats: null
    };
  }

  if (!fsSync.existsSync(postFile)) {
    return {
      passed: false,
      errors: [`Missing post.md file in ${baseName}`],
      warnings: [],
      suggestions: [],
      stats: null
    };
  }

  const rawContent = await fs.readFile(postFile, 'utf-8');
  const content = rawContent.trim();

  // 1. Empty or Boilerplate check
  if (!content) {
    errors.push('post.md is empty.');
    return { passed: false, errors, warnings, suggestions, stats: { charCount: 0, wordCount: 0, emojiCount: 0, imageCount: 0 } };
  }

  if (content.includes('Here is your draft post content for') || content.includes('Edit this file (`post.md`)')) {
    errors.push('post.md still contains initial scaffolding boilerplate placeholder text.');
  }

  // 2. Metrics (words, chars, emojis)
  const charCount = content.length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  
  // Count emojis using Unicode property regex
  const emojiMatches = content.match(/\p{Extended_Pictographic}/gu) || [];
  const emojiCount = emojiMatches.length;

  // Word count targets (150 - 250 words is ideal per AGENTS.md)
  if (wordCount < 100) {
    warnings.push(`Post is very short (${wordCount} words). Target is 150–250 words (1,000–1,600 characters).`);
  } else if (wordCount > 300) {
    warnings.push(`Post is long (${wordCount} words). Consider trimming filler to stay under ~250 words.`);
  }

  // Character count targets
  if (charCount > 2200) {
    warnings.push(`Character count is high (${charCount} chars). Target is 1,000–1,600 characters for optimal retention.`);
  }

  // 3. Synthetic Dividers Check (AGENTS.md: Do not use --- or ------ visual dividers)
  const lines = rawContent.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^(\-{3,}|\={3,}|\_{3,}|\*{3,})$/.test(trimmed)) {
      errors.push(`Line ${idx + 1}: Synthetic divider found ("${trimmed}"). AGENTS.md prohibits '---' or visual line separators in post.md.`);
    }
  });

  // 4. Markdown Code Fences Check
  if (content.includes('```')) {
    warnings.push('Markdown code fences (```) detected. LinkedIn text posts do not format markdown code blocks. Use clean inline commands or images instead.');
  }

  // 5. Hyphen Bullets Check (AGENTS.md: Use '•' for bullet points instead of '-')
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      warnings.push(`Line ${idx + 1}: Hyphen/Asterisk bullet used ("${trimmed.slice(0, 15)}..."). AGENTS.md recommends using '•' bullets.`);
    }
  });

  // 6. Excessive Empty Spacing (AGENTS.md: Max 1 empty line between sections)
  if (/\n\s*\n\s*\n/.test(rawContent)) {
    warnings.push('Multiple consecutive blank lines detected. Keep exactly one empty line between paragraphs.');
  }

  // 7. Emoji Limits (AGENTS.md: Max 2 to 3 emojis per post)
  if (emojiCount > 4) {
    warnings.push(`High emoji count (${emojiCount} emojis detected). AGENTS.md recommends a maximum of 2–3 emojis per post.`);
  }

  // 8. AI Buzzwords & Bragging Tone Check
  const lowerContent = content.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lowerContent.includes(phrase)) {
      warnings.push(`Buzzword / bragging tone detected: "${phrase}". Keep the tone humble and engineering-focused.`);
    }
  }

  // 9. Hashtags Check
  const hashtagMatches = content.match(/#[a-zA-Z0-9_]+/g) || [];
  if (hashtagMatches.length > 5) {
    warnings.push(`High hashtag count (${hashtagMatches.length} hashtags). AGENTS.md advises against hashtag spam.`);
  }

  // 10. Image Validation
  let imageCount = 0;
  if (fsSync.existsSync(imagesDir)) {
    const files = await fs.readdir(imagesDir);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const imageFiles = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase()));
    imageCount = imageFiles.length;

    for (const img of imageFiles) {
      if (GENERIC_IMAGE_NAMES.includes(img.toLowerCase())) {
        warnings.push(`Generic image filename: 'images/${img}'. Rename to a descriptive name (e.g. 'shadow-locking-almalinux.png') before publishing.`);
      }
    }
  }

  const passed = errors.length === 0;

  return {
    passed,
    errors,
    warnings,
    suggestions,
    stats: {
      charCount,
      wordCount,
      emojiCount,
      imageCount,
      hashtagCount: hashtagMatches.length
    }
  };
}

export function printLintReport(report, folderName) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  🛡️  QUALITY & RULE LINTER: ${colors.yellow}${folderName}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  if (report.stats) {
    console.log(`  📊 Length: ${colors.bold}${report.stats.wordCount} words${colors.reset} | ${colors.bold}${report.stats.charCount} characters${colors.reset}`);
    console.log(`  🎯 Emojis: ${colors.bold}${report.stats.emojiCount}${colors.reset} (ideal: 2-3) | 🖼️  Images: ${colors.bold}${report.stats.imageCount}${colors.reset} | 🏷️  Hashtags: ${colors.bold}${report.stats.hashtagCount}${colors.reset}\n`);
  }

  if (report.errors.length === 0 && report.warnings.length === 0) {
    console.log(`  ${colors.green}${colors.bold}✔ ALL CHECKS PASSED!${colors.reset} Post strictly complies with AGENTS.md rules.\n`);
    return true;
  }

  if (report.errors.length > 0) {
    console.log(`  ${colors.red}${colors.bold}❌ ERRORS (${report.errors.length}) - Must fix before publishing:${colors.reset}`);
    report.errors.forEach(err => console.log(`     ${colors.red}• ${err}${colors.reset}`));
    console.log();
  }

  if (report.warnings.length > 0) {
    console.log(`  ${colors.yellow}${colors.bold}⚠️  WARNINGS & STYLE SUGGESTIONS (${report.warnings.length}):${colors.reset}`);
    report.warnings.forEach(warn => console.log(`     ${colors.yellow}• ${warn}${colors.reset}`));
    console.log();
  }

  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  return report.passed;
}
