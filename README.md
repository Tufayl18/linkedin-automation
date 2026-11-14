# 🚀 LinkedIn Automation CLI

A zero-dependency, terminal-driven tool to draft, organize, review, lint, preview, and publish posts directly to your personal LinkedIn feed using official LinkedIn REST APIs.

> **AI-Agnostic & Manual Friendly:** Built in pure Node.js (ESM). You can brainstorm and draft posts using **any AI tool** (Antigravity, Claude Code, Cursor, Aider, Copilot, ChatGPT) or manage everything **100% manually**. AI post writing rules and style constraints are defined in [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md).

---

## ⚡ Quick Setup (One-Time)

1. **Prerequisites:** Node.js v18+ (`node -v`).
2. **Create LinkedIn App:**
   - Create a free company page on [LinkedIn](https://www.linkedin.com/company/setup/new/).
   - Create an app on [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) linked to your page.
   - Under **Products**, request access to:
     - `Share on LinkedIn` (enables publishing)
     - `Sign In with LinkedIn using OpenID Connect` (enables auth)
   - Under **Auth** $\rightarrow$ **Authorized redirect URLs**, add: `http://localhost:8080/callback`
3. **Configure `.env`:**
   ```bash
   cp .env.example .env
   ```
   Add your `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`.
4. **Authenticate:**
   ```bash
   npm run auth
   ```
   Logs in via browser and automatically saves your access token to `.env`.

   > **Note on Token Expiration (60 Days):** LinkedIn OAuth access tokens expire after **60 days**. If you ever see an `EXPIRED_ACCESS_TOKEN` (HTTP 401 / code `65602`) error, simply rerun `npm run auth` to refresh your token.

---

## 🔄 Daily Workflow

```
1. Create Draft ───► 2. Write & Edit ───► 3. Lint & Review ───► 4. Visual Preview ───► 5. Publish
   npm run new          Edit post.md         npm run lint          npm run preview       npm run publish
                        (Manual or AI)       npm run review        (Mobile/Desktop)      (Live Feed)
```

1. **Scaffold a new post:**
   ```bash
   npm run new -- "Your Post Topic"
   ```
   *(Or simply `npm start` and choose option 1).*

2. **Draft & Refine Copy:**
   - **`post.md`**: The actual LinkedIn copy + hashtags (this gets published).
   - **`README.md`**: Strategy notes, hooks, and target audience (internal only).
   - **`images/`**: Optional folder for screenshots/images (`.png`, `.jpg`, `.webp`).

3. **Check Status, Review & Lint:**
   ```bash
   npm run status   # View status dashboard of all posts
   npm run lint     # Validates compliance with AGENTS.md (bullets, spacing, emojis, dividers)
   npm run review   # Terminal review with fold truncation ("...see more" cut-off)
   ```

4. **Visual Web Card Preview:**
   ```bash
   npm run preview  # Opens realistic LinkedIn card mockup in browser (Desktop & Mobile view)
   ```

5. **Publish to LinkedIn:**
   ```bash
   npm run publish
   ```
   Uploads images, runs duplicate & lint safety guards, and publishes live to your feed.

---

## 📁 Post Folder Structure

Each post lives in its own directory under `posts/`:

```text
posts/2026-09-14-my-topic/
├── meta.json    # Status tracker (DRAFT, READY, PUBLISHED, timestamp, postId)
├── README.md    # Post strategy & planning notes (not published)
├── post.md      # The exact copy & hashtags sent to LinkedIn
└── images/      # Media attachments (.png, .jpg, .webp)
```

### Post Lifecycle States:
- 🟡 **`DRAFT / EMPTY`**: `post.md` is empty or has boilerplate placeholder text.
- 🟢 **`READY TO POST`**: `post.md` is written and ready for publishing.
- 🚀 **`PUBLISHED`**: Already published to LinkedIn (safe guard blocks duplicate republish unless forced).

---

## ⌨️ CLI Command Reference

| Command | Description |
| :--- | :--- |
| `npm start` | Interactive menu with live post count summary |
| `npm run status` | Shows the **Status Dashboard** of all drafts, ready, and published posts |
| `npm run new` | Scaffolds a new post folder bundle (`npm run new -- "title"`) |
| `npm run lint` | 🛡️ Lints `post.md` against [`AGENTS.md`](./AGENTS.md) rules (dividers, bullets, emojis, length) |
| `npm run review` | 📋 Previews layout, character counts, fold truncation, images, and strategy |
| `npm run preview` | 🔍 Opens interactive **Desktop/Mobile LinkedIn Card Mockup** in browser |
| `npm run publish` | 🚀 Uploads media, applies duplicate check, and publishes live |
| `npm run auth` | 🔑 1-click LinkedIn OAuth 2.0 browser login |

---

## 🔑 Token Management & Refreshing (60-Day Expiry)

LinkedIn OAuth access tokens automatically expire after **60 days**.

### Identifying an Expired Token
When your token expires, running `npm run publish` will fail with:
```text
[Fatal Error] Image registration failed (401): {"status":401,"serviceErrorCode":65602,"code":"EXPIRED_ACCESS_TOKEN","message":"The token used in the request has expired"}
```

### How to Refresh:
Simply rerun the auth command in your terminal:
```bash
npm run auth
```
1. It starts a temporary local server on port `8080` and opens LinkedIn's authorization prompt in your browser.
2. Click **Allow**.
3. The callback server automatically exchanges the authorization code for a fresh 60-day access token and updates `.env`.
4. Rerun `npm run publish` to proceed with publishing your post.
