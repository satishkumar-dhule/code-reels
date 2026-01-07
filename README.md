<p align="center">
  <img src="docs/screenshots/home-desktop.png" alt="Code Reels" width="100%" />
</p>

<h1 align="center">🎬 Code Reels</h1>

<p align="center">
  <strong>Interview prep that actually works</strong><br/>
  Swipe-based learning • AI-powered content • Semantic search
</p>

<p align="center">
  <a href="https://open-interview.github.io/">🚀 Try it now</a> •
  <a href="#features">Features</a> •
  <a href="#ai-pipeline">AI Pipeline</a> •
  <a href="#getting-started">Get Started</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/open-interview/open-interview?style=for-the-badge&logo=github&color=yellow" alt="Stars" />
  <img src="https://img.shields.io/badge/questions-1000+-blue?style=for-the-badge" alt="Questions" />
  <img src="https://img.shields.io/badge/AI_Powered-Vector_DB-purple?style=for-the-badge" alt="AI" />
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📱 **Swipe Learning** | TikTok-style cards. One concept per swipe. |
| 🎤 **Voice Practice** | AI interviewer with real-time feedback |
| 🧠 **Spaced Repetition** | Science-backed review scheduling |
| 🔍 **Semantic Search** | Vector DB powered similarity matching |
| 💻 **Coding Challenges** | In-browser editor with Python & JS |
| 🎯 **30+ Topics** | System Design → AI/ML → DevOps |
| 🏆 **Gamification** | Credits, badges, streaks |
| 📊 **Adaptive Learning** | Personalized paths based on performance |

---

## 🤖 AI Pipeline

Fully automated content generation and quality control:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI CONTENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Creator Bot ──► Quality Gate ──► Vector DB ──► Live Content   │
│       │              │               │                          │
│       │         ┌────┴────┐    ┌─────┴─────┐                   │
│       │         │ Checks: │    │ Features: │                   │
│       │         │ • Dups  │    │ • Embed   │                   │
│       │         │ • Fit   │    │ • Search  │                   │
│       │         │ • Score │    │ • Similar │                   │
│       │         └─────────┘    └───────────┘                   │
│       │                                                         │
│       └──► Verifier Bot ──► Processor Bot ──► Improved Content │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Vector Database Integration

Questions are indexed in **Qdrant** for semantic operations:

| Operation | Use Case |
|-----------|----------|
| `vector:sync` | Index all questions to Qdrant |
| `vector:search` | Semantic search across content |
| `vector:duplicates` | Find near-duplicate questions |
| `vector:similar` | Pre-compute similar questions |
| `vector:stats` | Collection statistics |

### ML Decision Service

Local ML models (via OpenCode) make decisions on:
- **Duplicate detection** — Exact, near, and semantic duplicates
- **Channel fit** — Does question belong in this topic?
- **Quality scoring** — Content quality assessment

---

## 🏗️ Architecture

```
├── client/                 # React 19 + TypeScript + Tailwind
│   ├── src/
│   │   ├── pages/         # Route components
│   │   ├── components/    # Reusable UI
│   │   ├── hooks/         # Custom hooks (adaptive learning, SRS)
│   │   └── lib/           # Utilities
│   └── public/data/       # Static JSON (GitHub Pages)
│
├── script/                 # Build-time automation
│   ├── ai/
│   │   ├── graphs/        # LangGraph pipelines
│   │   ├── services/      # Vector DB, ML decisions
│   │   └── providers/     # Qdrant, embeddings
│   └── bots/              # Creator, verifier, processor
│
└── server/                 # Express (dev only)
```

### Key Technologies

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind, Framer Motion |
| Search | Pagefind (static), Qdrant (semantic) |
| AI | LangGraph, TF-IDF embeddings, OpenCode |
| Database | Turso (SQLite edge), Qdrant Cloud |
| Deploy | GitHub Pages (static) |

---

## 🚀 Getting Started

### Use Online
**[open-interview.github.io](https://open-interview.github.io/)** — No signup needed.

### Run Locally

```bash
git clone https://github.com/open-interview/open-interview.git
cd open-interview
pnpm install
pnpm dev
```

### Environment Setup

```bash
cp .env.example .env
```

Required for AI features:
```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
QDRANT_URL=https://...qdrant.io:6333
QDRANT_API_KEY=...
```

---

## 📦 Scripts

### Development
| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (port 5001) |
| `pnpm build:static` | Build for GitHub Pages |
| `pnpm test` | Run Playwright E2E tests |

### Vector DB
| Command | Description |
|---------|-------------|
| `pnpm vector:init` | Initialize Qdrant collection |
| `pnpm vector:sync` | Sync all questions to vector DB |
| `pnpm vector:search "query"` | Semantic search |
| `pnpm vector:similar` | Generate similar questions JSON |
| `pnpm vector:test` | Run integration tests |

### Content Generation
| Command | Description |
|---------|-------------|
| `node script/generate-question.js` | Generate new questions |
| `node script/generate-blog.js` | Generate blog posts |
| `node script/bots/verifier-bot.js` | Verify content quality |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate questions |
| `→` | Reveal answer |
| `Esc` | Go back |
| `Cmd+K` | Search |
| `T` | Toggle theme |

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Interactive mode
pnpm test:ui

# Specific test file
pnpm test e2e/home.spec.ts
```

Tests cover:
- Navigation & responsiveness
- Question viewing & filtering
- Voice interview flow
- Credits & gamification
- SRS review sessions

---

## 📊 Topics

| Category | Topics |
|----------|--------|
| 🏗️ Engineering | System Design, Algorithms, Frontend, Backend, Database |
| ☁️ Cloud | AWS, Kubernetes, Terraform, DevOps, SRE |
| 🤖 AI/ML | Machine Learning, GenAI, LLMOps, NLP, Computer Vision |
| 📱 Mobile | iOS, Android, React Native |
| 🧪 Testing | Unit, E2E, API, Performance |
| 👥 Soft Skills | Behavioral, Engineering Management |

---

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

Areas of interest:
- New questions & topics
- UI/UX improvements
- AI pipeline enhancements
- Test coverage

---

## 📜 License

MIT — Use it however you want.

---

<p align="center">
  <strong>Built for devs, by devs 💜</strong><br/>
  <sub>Star us if this helped you prep!</sub>
</p>
