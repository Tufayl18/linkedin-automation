# Agent Instructions and LinkedIn Post Writing Guidelines

This file contains the rules for any AI agent working on this repository to draft, review, manage, and publish LinkedIn posts.

## 1. Core Objective

Create LinkedIn posts that feel like they were written by a real developer sharing something they actually learned, built, tested, or discovered.

The primary focus should be:

• Practical engineering experiences
• Hands on lab findings
• Unexpected technical behavior
• Troubleshooting experiences
• Lessons learned
• Projects and implementation details
• Useful technical explanations

Avoid generic motivational content, exaggerated claims, and posts that sound AI generated.

## 2. Tone and Content

### Engineering First

Keep the tone humble, curious, practical, and technical.

Focus on what happened, why it happened, and what was learned.

Avoid excessive bragging or phrases such as:

"I am thrilled to announce..."

"Another incredible milestone..."

"Excited to share my journey..."

Instead, prefer natural, scenario-based openings such as:

"I noticed something interesting while testing..."

"I ran into a small issue during my Linux lab..."

"I expected X, but Linux actually did Y."

Never start posts with a question (e.g., "Ever looked closely at...", "Did you know...?"). Always ground the opening in a direct scenario or observation.

### Short and Punchy

Target approximately **1,000 to 1,600 characters** or **150 to 250 words**.

Every paragraph should contribute something useful.

Remove filler, repeated explanations, and unnecessary context.

## 3. Formatting Rules

### Spacing

Use only one empty line between paragraphs or sections.

Do not create large blocks of empty space.

### No Synthetic Dividers

Do not use:

`---`

`----------------`

or similar visual separators.

Use headings, numbered sections, or natural paragraph breaks instead.

### Bolding and Text Formatting (Preview & Posting)

LinkedIn text posts do NOT support Markdown syntax like `**bold**`.

If you write `**Drizzle**`, it will literally display as `**Drizzle**` with asterisks both in local browser previews and on the live LinkedIn feed.

**Rule for Bolding:**
• Always use **Unicode Bold** characters (e.g., `𝗗𝗿𝗶𝘇𝘇𝗹𝗲`, `𝗣𝗿𝗶𝘀𝗺𝗮`, `𝗘𝗖𝟮`, `𝗔𝗪𝗦 𝗥𝗗𝗦`, `𝟭.`, `𝟮.`) for bold text in `post.md`.
• Never leave raw Markdown asterisks (`**word**`) in `post.md`.
• While previewing and after posting, text must visibly appear bold (`𝗗𝗿𝗶𝘇𝘇𝗹𝗲`), never with raw Markdown asterisks (`**Drizzle**`).
• Bold important concepts, keywords, numbers, and takeaways.
• Do not bold entire paragraphs.

### Bullets

Use `•` for bullet points.

Do not use hyphen bullets.

### Commands

Do not use Markdown code fences in `post.md`.

LinkedIn should receive clean, readable commands.

Example:

`usermod -L john`

or:

`usermod -L john → john:!$6$hash...`

### Emojis

Use emojis only when they add context.

Maximum **2 to 3 emojis per post**.

Do not place emojis on every line.

Good examples:

🐧 Linux
🔍 Investigation
💡 Takeaway

### Hashtags

Do not add hashtags unless explicitly requested.

## 4. Technical Accuracy

Technical accuracy is more important than making the post sound impressive.

Never invent technical behavior, command output, benchmarks, project results, or personal experiences.

When describing a lab observation, clearly distinguish between:

**What was observed**

and

**What is generally true**

Do not present a distribution specific behavior as a universal Linux behavior.

For example:

"On AlmaLinux 9, I observed..."

is preferable to:

"Linux always does..."

when the behavior depends on the distribution, version, utility, PAM configuration, or implementation.

When a technical claim could vary by:

• Linux distribution
• Version
• Package version
• Configuration
• Authentication system
• Cloud provider
• Tool implementation

verify the claim before publishing.

When appropriate, test the behavior in the actual lab environment.

## 5. Post Creation Workflow

When the user wants to create a new post, follow this workflow:

### Step 1: Understand the Idea

Discuss the topic with the user through the terminal conversation.

Identify:

• What happened
• What the user discovered
• Why it was interesting
• What technical concept explains it
• What the reader should learn

Do not immediately turn every conversation into a post.

### Step 2: Identify the Hook

Create a natural hook based on the actual experience and scenario.

**Rule: Never start with a question.**

Do not open posts with rhetorical or conversational questions like:
• "Ever looked closely at `/etc/shadow` while locking a Linux user?"
• "Have you ever wondered...?"
• "Did you know that...?"

Start with **scenario-based openings only**, directly setting the context or observation without any questions.

Good (Scenario-based):

"While testing user account locking on AlmaLinux 9, I checked `/etc/shadow` to see what changed."

"During a routine PAM authentication test, I ran into unexpected behavior with `usermod -L`."

Avoid:

Questions: "Ever looked closely at `/etc/shadow` while locking a Linux user?"

Clickbait: "This ONE Linux trick will change everything!"

### Step 3: Verify Technical Claims

Before finalizing the post, verify important technical claims.

If the behavior was observed in a lab, preserve the exact environment when relevant.

Example:

**AlmaLinux 9**

**RHEL based system**

**OpenSSH configuration**

**Docker version**

This prevents environment specific behavior from being presented as universal behavior.

### Step 4: Draft the Post

Create the final copy according to the formatting and tone rules in this file.

The final LinkedIn copy must be stored in:

`post.md`

### Step 5: Create Internal Notes

Create or update:

`README.md`

This file is never published.

It should contain:

• Post idea
• Hook reasoning
• Target audience
• Main technical lesson
• Supporting technical details
• Suggested images
• Image descriptions
• Sources used for verification
• Possible future improvements

Keep internal strategy separate from the final LinkedIn copy.

### Step 6: Handle Images

Store post images inside:

`images/`

Use descriptive, clean filenames.

Example:

`shadow-before-lock.png`

`shadow-after-usermod.png`

`shadow-after-passwd.png`

**Image Naming Rule:** Before publishing, ensure image names are clean, relevant, and descriptive (avoid generic names like `image.png` or `Terminal.png`). Modify image filenames properly or ask the user to confirm/rename them before publishing.

Do not add unnecessary images.

Each image should support the technical explanation or improve visual understanding.

### Step 7: Update Metadata

Update:

`meta.json`

with the current post state.

Example structure:

```json
{
  "status": "DRAFT",
  "createdAt": "2026-09-14T00:00:00Z",
  "updatedAt": "2026-09-14T00:00:00Z",
  "publishedAt": null,
  "postId": null
}
```

Allowed statuses:

`DRAFT`

`READY`

`PUBLISHED`

Do not mark a post as `READY` until the final copy has been reviewed and technical claims have been checked.

Do not mark a post as `PUBLISHED` unless LinkedIn publishing actually succeeded.

## 6. Review and Revision

When the user asks to change a post:

• Preserve the original idea unless the user asks to change it
• Keep the technical meaning accurate
• Do not introduce new claims without verification
• Keep the user's natural writing style
• Remove unnecessary repetition
• Keep the post within the target length where possible

If the user says "shorten it", prioritize removing repetition and filler instead of removing the main technical lesson.

If the user says "make it more technical", increase technical depth without making the post unnecessarily long.

## 7. Publishing Rules

Never publish a LinkedIn post without explicit user confirmation.

The workflow should be:

`DRAFT → review → READY → user approval → PUBLISHED`

The agent must never assume that a request to create or improve a post also means permission to publish it.

Never automatically:

• Publish a post
• Delete a post
• Edit an existing published post
• Repost content
• Send messages to LinkedIn connections

unless the user explicitly requests that action.

## 8. Existing Published Posts

Before modifying a published post, verify:

• The correct post
• The current post ID
• The requested change
• Whether the platform supports the requested modification

Never overwrite a published post's metadata with guessed information.

## 9. File Structure

Each post should follow:

`posts/YYYY-MM-DD-slug/`

Example:

`posts/2026-09-14-shadow-locking/`

Inside:

`post.md`

The exact copy sent to LinkedIn.

`README.md`

Internal strategy, research, technical notes, and image planning.

`meta.json`

Post status and publishing metadata.

`images/`

Screenshots, diagrams, and other visual assets.

## 10. Final Quality Checklist

Before marking a post as `READY`, verify:

• The hook is scenario-based and never starts with a question
• The post has one clear topic
• The technical explanation is accurate
• Distribution specific behavior is clearly identified
• There is no unnecessary bragging
• The post is concise
• Important points are easy to scan
• Formatting works well on LinkedIn
• There are no synthetic dividers
• There are no unnecessary emojis
• There is no hashtag spam
• Commands are readable
• Images are cleanly named and support the content
• `README.md` contains the internal strategy
• `meta.json` has the correct status
• No unsupported claims were introduced

## 11. Guiding Principle

The goal is not to make every post sound impressive.

The goal is to make every post feel like:

**"I was working on something, noticed something interesting, investigated it, and here is what I learned."**

Practical experience beats generic advice.

Technical accuracy beats impressive wording.

Curiosity beats bragging.
