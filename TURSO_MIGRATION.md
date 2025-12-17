# Turso Database - Complete Migration

This project uses [Turso](https://turso.tech/) (libSQL) as the primary database for all questions.

## Architecture (Static Site - GitHub Pages)

```
┌─────────────────────────────────────────────────────────────┐
│                    BUILD TIME (GitHub Actions)               │
├─────────────────────────────────────────────────────────────┤
│  1. fetch-questions-for-build.js                            │
│     - Connects to Turso DB (read-only)                      │
│     - Generates static JSON files in client/public/data/    │
│                                                              │
│  2. vite build                                               │
│     - Bundles React app with static JSON                    │
│     - Outputs to dist/public/                               │
│                                                              │
│  3. Deploy to GitHub Pages                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RUNTIME (GitHub Pages)                    │
├─────────────────────────────────────────────────────────────┤
│  Static Site (No Server)                                     │
│  - Loads JSON from /data/{channel}.json                     │
│  - All data embedded at build time                          │
│  - Client-side filtering and search                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    BOT WORKFLOWS (GitHub Actions)            │
├─────────────────────────────────────────────────────────────┤
│  - generate-question.js       │  - Uses read-write creds     │
│  - improve-question.js        │  - Writes directly to DB     │
│  - eli5-bot.js, etc.          │  - Triggers deploy after     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Turso Database                            │
│              libsql://your-db.turso.io                       │
│                                                              │
│  ┌─────────────┐    ┌──────────────────┐    ┌────────────┐ │
│  │  questions  │    │ channel_mappings │    │ bot_state  │ │
│  └─────────────┘    └──────────────────┘    └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Static Data Files (Generated at Build Time)

| File | Description |
|------|-------------|
| `/data/channels.json` | List of all channels with stats |
| `/data/{channel}.json` | Questions, subchannels, companies for each channel |
| `/data/all-questions.json` | Search index with minimal question data |
| `/data/stats.json` | Overall statistics |

## Environment Variables

| Variable | Purpose | Usage |
|----------|---------|-------|
| `TURSO_DATABASE_URL` | Database URL (read-write) | GitHub Actions, migrations |
| `TURSO_AUTH_TOKEN` | Auth token (read-write) | GitHub Actions, migrations |
| `TURSO_DATABASE_URL_RO` | Database URL (read-only) | Website serving |
| `TURSO_AUTH_TOKEN_RO` | Auth token (read-only) | Website serving |

## Build Process

1. **Fetch Data**: `node script/fetch-questions-for-build.js`
   - Connects to Turso using read-only credentials
   - Generates static JSON files in `client/public/data/`

2. **Build Site**: `vite build`
   - Bundles React app
   - Copies static data files to output

3. **Deploy**: Push to GitHub Pages

## GitHub Actions Setup

Add these secrets to your repository (Settings → Secrets → Actions):

- `TURSO_DATABASE_URL` - Your Turso database URL
- `TURSO_AUTH_TOKEN` - Your read-write auth token

All bot workflows automatically use these credentials.

## Scripts

All scripts now use the database directly. No local JSON files are used.

| Script | Purpose |
|--------|---------|
| `migrate-questions-to-turso.js` | Initial migration from JSON to Turso |
| `generate-question.js` | Generate new questions (writes to DB) |
| `improve-question.js` | Improve existing questions (writes to DB) |
| `add-random-question.js` | Add user-submitted questions (writes to DB) |
| `eli5-bot.js` | Add ELI5 explanations (writes to DB) |
| `add-videos.js` | Add YouTube videos (writes to DB) |
| `mermaid-bot.js` | Add/improve diagrams (writes to DB) |
| `company-bot.js` | Add company data (writes to DB) |
| `deduplicate-questions.js` | Remove duplicate questions (writes to DB) |
| `remap-questions.js` | Remap questions to channels (writes to DB) |
| `generate-rss.js` | Generate RSS feed (reads from DB) |
| `generate-sitemap.js` | Generate sitemap (static channels) |
| `motivation-bot.js` | Generate quotes (uses local quotes file) |

## Database Schema

### questions table
```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  diagram TEXT,
  difficulty TEXT NOT NULL,
  tags TEXT,           -- JSON array
  channel TEXT NOT NULL,
  sub_channel TEXT NOT NULL,
  source_url TEXT,
  videos TEXT,         -- JSON object
  companies TEXT,      -- JSON array
  eli5 TEXT,
  last_updated TEXT,
  created_at TEXT
);
```

### channel_mappings table
```sql
CREATE TABLE channel_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT NOT NULL,
  sub_channel TEXT NOT NULL,
  question_id TEXT NOT NULL REFERENCES questions(id)
);
```

### bot_state table
```sql
CREATE TABLE bot_state (
  bot_name TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);
```

Used by bots to track their processing state (e.g., last processed index).

## Local Development

1. Copy `.env.example` to `.env`
2. Add your Turso credentials
3. Run `pnpm dev` to start the dev server

The client will fetch questions from the API endpoints.
