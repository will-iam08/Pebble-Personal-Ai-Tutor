<div align="center">

# Pebble — Personal AI Study Tutor

**Your personal AI academic tutor and virtual study companion that lives in your Chrome Side Panel.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](./chrome-extension/manifest.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-React%2019-3178C6?logo=typescript&logoColor=white)](./package.json)
[![CI](https://github.com/will-iam08/Pebble-Personal-Ai-Tutor/actions/workflows/ci.yml/badge.svg)](https://github.com/will-iam08/Pebble-Personal-Ai-Tutor/actions/workflows/ci.yml)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Roadmap](#-roadmap) • [Contributing](#-contributing)

</div>

---

## What is Pebble?

Pebble turns any webpage, lecture PDF, or set of class notes into an interactive study session right beside what you're reading. Instead of copy-pasting chapters into a generic chat window, Pebble extracts your study material into structured summaries, exam-style quizzes with AI grading, flashcards, a vocabulary bank, and grounded tutor Q&A — all paired with **Pebble**, a cozy study companion pet that levels up as you learn.

---

## Features

### Multi-Source Study Reader
- **Active Tab Extraction:** Pulls clean article/textbook content from your current Chrome tab while stripping navigation, ads, and boilerplate.
- **PDF & Notes Support:** Upload lecture slide PDFs directly or paste raw study notes.
- **Web Sandbox Mode:** Includes a built-in simulated Chrome browser with sample university course readings for local development and testing.

### AI Academic Study Tools
- **Structured Lecture Summaries:** Generates a crisp TL;DR, difficulty rating, key concepts, formulas/formal definitions, and common exam traps with tips to avoid them.
- **Interactive Quizzes & AI Grading:** Builds 5–10 multiple-choice, short-answer, or mixed questions with step-by-step explanations and conceptual grading for written responses.
- **Study Tips & Active-Recall Flashcards:** Produces tailored study strategies, mnemonics/memory hooks, and flippable flashcards with hints.
- **Grounded Tutor Chat:** Ask follow-up questions anchored directly to your loaded reading or PDF.
- **Vocabulary Bank:** Collect terms from summaries, chat, or manually; generate plain-language definitions, analogies, and memory cues; track mastered terms.
- **Study Exports:** Download summaries, tutor chats, or combined study packs as Markdown (`.md`) or plain text (`.txt`).

### Virtual Companion & Focus Tools
- **Study Companion Pet:** Earn XP and Study Treats as you study. Evolve Pebble through 4 stages (**Seedling → Sproutling → Leafkin → Scholar**), unlock accessories, and keep Pebble fed and happy.
- **Pomodoro Timer & Focus Mode:** Built-in focus/break timer with sound effects, light/dark themes, and distraction-free focus view.
- **Daily Missions, Streaks & Analytics:** Track 7-day study time, quiz accuracy charts, daily streaks, and unlockable achievements.
- **Gentle Check-In Reminders:** Optional Chrome desktop notifications to nudge you back for short review sessions.

---

## Quick Start

### Option 1: Load the Chrome Side Panel Extension (Unpacked)

1. Clone this repository:
   ```bash
   git clone https://github.com/will-iam08/Pebble-Personal-Ai-Tutor.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `chrome-extension/` folder.
5. Click the **Pebble** toolbar icon to open the Side Panel, open **Settings**, and paste your Gemini API key (free tier available via [Google AI Studio](https://aistudio.google.com/apikey)).

### Option 2: Run the Full-Stack Web App Locally

**Prerequisites:** Node.js 20+ and a Gemini API key.

```bash
# 1. Clone and install dependencies
git clone https://github.com/will-iam08/Pebble-Personal-Ai-Tutor.git
cd Pebble-Personal-Ai-Tutor
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY

# 3. Start the dev server (Express API + Vite React app)
npm run dev
```

Open `http://localhost:3000` in your browser.

#### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Express + Vite dev server (`http://localhost:3000`) |
| `npm run build` | Build the production React frontend to `dist/` |
| `npm run lint` | Run TypeScript typechecking (`tsc --noEmit`) |
| `npm start` | Run the server in production mode |

---

## Architecture

```text
Pebble-Personal-Ai-Tutor/
├── chrome-extension/       # Manifest V3 Chrome Side Panel extension
│   ├── manifest.json       # MV3 permissions, side panel & service worker config
│   ├── background.js       # Tab extraction bridge + gentle check-in alarms
│   ├── content.js          # Clean DOM text extractor for active web pages
│   └── sidepanel.*         # Side panel UI & direct Gemini API integration
├── src/                    # React 19 + TypeScript + Tailwind v4 web workspace
│   ├── components/         # Summary, Quiz, Tips, Chat, Vocab, Analytics, Pet Habitat
│   ├── utils/              # API client, missions, analytics, achievements, exports, audio
│   └── types/              # Shared study, pet, and quiz TypeScript models
├── server.ts               # Express API proxy (/api/tutor/*) + Vite middleware
└── .github/                # CI workflow, issue forms, and PR template
```

> **Note on current codebase structure:** The full React workspace (`src/`) currently runs as a web simulator alongside a lightweight vanilla JS Chrome extension (`chrome-extension/`). Unifying the React UI directly into the Chrome Side Panel build is our top priority in Stage 2 below.

---

## Roadmap

Pebble is actively evolving into a best-in-class open-source academic tutor. Here is what we are building next:

### Stage 1 — Open-Source Foundation
- [x] MIT License, README, Contributing guide, Issue/PR templates, and GitHub Actions CI
- [x] Configurable model environment variable (`GEMINI_MODEL`) and repo hygiene cleanup

### Stage 2 — Unified Extension & Multi-Provider BYOK
- [ ] **Unified React Chrome Extension:** Build the full `src/` React Side Panel directly into the Manifest V3 extension (so real Chrome users get Vocab, Analytics, Pomodoro, Missions, Achievements, and Pet Accessories with one shared UI codebase)
- [ ] **Multi-Provider BYOK (Free & Paid Models):** Support Google Gemini (free tier + model picker), OpenRouter (free & paid models), OpenAI, Anthropic, and local **Ollama / LM Studio** endpoints directly from the extension

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
