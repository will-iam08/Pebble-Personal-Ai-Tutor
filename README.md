<div align="center">

# Pebble — Personal AI Study Tutor

**Your personal AI academic tutor and virtual study companion that lives in your Chrome Side Panel.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](./chrome-extension/manifest.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-React%2019-3178C6?logo=typescript&logoColor=white)](./package.json)
[![CI](https://github.com/will-iam08/Pebble-Personal-Ai-Tutor/actions/workflows/ci.yml/badge.svg)](https://github.com/will-iam08/Pebble-Personal-Ai-Tutor/actions/workflows/ci.yml)

[Features](#-features) • [Supported AI Models](#-supported-ai-models) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Roadmap](#-roadmap) • [Contributing](#-contributing)

</div>

---

## What is Pebble?

Pebble turns any webpage, lecture PDF, or set of class notes into an interactive study session right beside what you're reading. Instead of copy-pasting chapters into a generic chat window, Pebble extracts your study material into structured summaries, exam-style quizzes with AI grading, flashcards, a vocabulary bank, and grounded tutor Q&A — all paired with **Pebble**, a cozy study companion pet that levels up as you learn.

---

## Features

### Multi-Source Study Reader
- **Active Tab Extraction:** Pulls clean article/textbook content from your current Chrome tab while stripping navigation, ads, and boilerplate.
- **PDF & Notes Support:** Upload lecture slide PDFs directly (native PDF reading on Gemini & Claude) or paste raw study notes.
- **Web Sandbox Mode:** Includes a built-in simulated Chrome browser with sample university course readings for local development and testing.

### AI Academic Study Tools
- **Structured Lecture Summaries:** Generates a crisp TL;DR, difficulty rating, key concepts, formulas/formal definitions, and common exam traps with tips to avoid them.
- **Interactive Quizzes & AI Grading:** Builds 5–10 multiple-choice, short-answer, or mixed questions with step-by-step explanations and conceptual grading for written responses.
- **Study Tips & Active-Recall Flashcards:** Produces tailored study strategies, mnemonics/memory hooks, and flippable flashcards with hints.
- **Grounded Tutor Chat:** Ask follow-up questions anchored directly to your loaded reading or PDF.
- **Vocabulary Bank:** Collect terms from summaries, chat, or manually; generate plain-language definitions, analogies, and memory cues; track mastered terms.
- **Study Exports:** Download summaries, tutor chats, or combined study packs as Markdown (`.md`) or plain text (`.txt`).

### Virtual Companion & Focus Tools
- **Study Companion Pet:** Earn XP and Study Treats as you study. Evolve Pebble through 4 stages (**Seedling → Sproutling → Leafkin → Scholar**), unlock accessories on the interactive pet habitat canvas, and keep Pebble fed and happy.
- **Pomodoro Timer & Focus Mode:** Built-in focus/break timer with sound effects, light/dark themes, and distraction-free focus view.
- **Daily Missions, Streaks & Analytics:** Track 7-day study time, quiz accuracy charts, daily streaks, and unlockable achievements.
- **Gentle Check-In Reminders:** Optional Chrome desktop notifications via `chrome.alarms` & `chrome.notifications`.

---

## Supported AI Models

Pebble is **Bring Your Own Key (BYOK)** — your API keys stay strictly in local browser storage and requests go directly from your browser to your chosen provider.

| Provider | Cost / Tier | Native PDF Upload | Highlights |
| :--- | :--- | :---: | :--- |
| **Google Gemini** | Free tier available | Yes | Default `gemini-2.5-flash` via [Google AI Studio](https://aistudio.google.com/apikey) |
| **OpenRouter** | Free (`:free`) & paid models | No | Access `openrouter/free`, Llama 3.3, DeepSeek R1, Gemma 3, Claude, GPT |
| **Ollama / LM Studio** | 100% Free & Local | No | Private on-device models with one-click local model discovery |
| **OpenAI** | BYOK API key | No | `gpt-4o-mini`, `gpt-4o`, `o4-mini`, or custom model ID |
| **Anthropic Claude** | BYOK API key | Yes | Direct browser access with `claude-sonnet-4` & `claude-3-5-haiku` |
| **Local Server (`.env`)** | Web dev mode | Yes | Uses `server.ts` + `GEMINI_API_KEY` for local web sandbox development |

> **Tip for Ollama in Chrome:** Start Ollama with `OLLAMA_ORIGINS="*"` so Chrome extensions can reach `http://localhost:11434/v1`.

---

## Quick Start

### Option 1: Build & Load the Unified Chrome Side Panel Extension

**Prerequisites:** Node.js 20+.

```bash
# 1. Clone and install dependencies
git clone https://github.com/will-iam08/Pebble-Personal-Ai-Tutor.git
cd Pebble-Personal-Ai-Tutor
npm install

# 2. Build the unified React Chrome Extension into dist-extension/
npm run build:extension
```

3. Open Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the **`dist-extension/`** folder.
6. Click the **Pebble** toolbar icon to open the Side Panel, click **Setup AI Key** (or the gear icon), pick a free or BYOK provider (Gemini free tier, OpenRouter, or local Ollama), and click **Test Connection**.

### Option 2: Run the Web Workspace Locally

```bash
# Optional: configure server-side Gemini key for "Local Server (.env)" mode
cp .env.example .env

# Start the Express + Vite dev server (http://localhost:3000)
npm run dev
```

You can also switch directly to any BYOK provider (Gemini, OpenRouter, Ollama, OpenAI, Claude) inside Settings even when running the web workspace.

#### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Express + Vite dev server (`http://localhost:3000`) |
| `npm run build` | Build the production web app to `dist/` |
| `npm run build:extension` | Build the unified React Chrome Extension (MV3) to `dist-extension/` |
| `npm run build:all` | Build both web (`dist/`) and Chrome extension (`dist-extension/`) |
| `npm run lint` | Run TypeScript typechecking (`tsc --noEmit`) |
| `npm start` | Run the server in production mode |

---

## Architecture

One shared React + TypeScript UI compiles cleanly to **both** the Chrome Side Panel extension (`dist-extension/`) and the standalone web sandbox (`dist/`):

```text
Pebble-Personal-Ai-Tutor/
├── chrome-extension/           # MV3 manifest, service worker & content script
│   ├── manifest.json           # Permissions, side panel config & provider host permissions
│   ├── background.js           # Active-tab extraction bridge + check-in alarm scheduler
│   └── content.js              # Clean DOM text extractor for active web pages
├── sidepanel.html              # Chrome Side Panel HTML entry (built by vite.extension.config.ts)
├── vite.extension.config.ts    # Builds unified React Side Panel + MV3 scripts into dist-extension/
├── src/                        # Shared React 19 + TypeScript + Tailwind v4 codebase
│   ├── sidepanel.tsx           # Extension entrypoint (<App mode="extension" />)
│   ├── main.tsx                # Web sandbox entrypoint (<App mode="web" />)
│   ├── components/             # Summary, Quiz, Tips, Chat, Vocab, Analytics, Settings, Pet Habitat
│   ├── utils/                  # aiClient, tutorPrompts, extensionBridge, storage, missions, analytics
│   └── types/                  # AI provider catalog + study, pet, and quiz TypeScript models
├── server.ts                   # Optional local Express proxy (/api/tutor/*) + Vite middleware
└── .github/                    # CI workflow, issue forms, and PR template
```

---

## Roadmap

### Stage 1 — Open-Source Foundation
- [x] MIT License, README, Contributing guide, Issue/PR templates, and GitHub Actions CI
- [x] Configurable model environment variable (`GEMINI_MODEL`) and repo hygiene cleanup

### Stage 2 — Unified Extension & Multi-Provider BYOK
- [x] **Unified React Chrome Extension:** Compiles the full `src/` React Side Panel directly into Manifest V3 (`dist-extension/`) with every tab, Pomodoro timer, Vocab bank, Analytics, and Pet Habitat
- [x] **Multi-Provider BYOK (Free & Paid Models):** Direct browser support for Google Gemini (free tier), OpenRouter (free & paid), Ollama / LM Studio (local & free), OpenAI, and Anthropic Claude with built-in connection testing

### Stage 3 — Academic Tutor v1 Upgrades
- [ ] **Socratic Tutor Mode & Learner Profiles:** Guide students with hints and diagnostic questions before revealing answers, with adjustable academic depth (High School / Undergrad / Graduate)
- [ ] **LaTeX Math & Rich Markdown Rendering:** Full KaTeX math equations and syntax-highlighted code blocks across Summary, Quiz, and Chat
- [ ] **Multimodal & Video Capture:** Screenshot/region capture for math diagrams and charts, YouTube lecture transcript import, and highlight-to-ask context menu

### Future (Phase 2)
- [ ] **FSRS Spaced Repetition & Anki Export:** Real spaced-repetition scheduling for flashcards & vocabulary, plus `.apkg` / CSV export
- [ ] **Optional Local Subscription Bridge:** Lightweight local companion bridge so power users can connect existing model subscriptions / local CLIs (inspired by T3 Code)

---

## Contributing

Contributions, bug reports, and feature ideas are welcome! Check out [CONTRIBUTING.md](./CONTRIBUTING.md) to get started, or browse open [Issues](https://github.com/will-iam08/Pebble-Personal-Ai-Tutor/issues).

---

## License

Released under the [MIT License](./LICENSE).
