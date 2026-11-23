# Publishing Pebble to the Chrome Web Store

This guide walks through submitting Pebble (`release/pebble-chrome-extension-v*.zip`) to the official **Chrome Web Store Developer Dashboard**.

---

## 1. Prerequisites

1. **Chrome Web Store Developer Account:**  
   Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (requires a one-time **$5 USD** Google registration fee and 2-Step Verification on your Google account).
2. **Build the Store-Ready Zip Package:**
   ```bash
   npm install
   npm run package:extension
   ```
   This builds `dist-extension/`, validates Manifest V3 requirements (including the 132-character description limit and icons), and outputs:
   ```text
   release/pebble-chrome-extension-v2.3.0.zip
   ```

---

## 2. Upload Package & Store Listing Details

In the Developer Dashboard, click **Add new item** and upload `release/pebble-chrome-extension-v2.3.0.zip`.

Fill in the **Store listing** tab:

- **Title:** `Pebble — AI Study Tutor & Companion`
- **Summary (≤ 132 chars):**  
  `AI Study Tutor in your Chrome Side Panel: summaries, quizzes, LaTeX math, YouTube & PDF reading, FSRS flashcards, and a study pet.`
- **Category:** `Education`
- **Language:** `English`
- **Store Icon (`128x128`):** Upload `store-assets/icon-128.png`
- **Small Promo Tile (`440x280`):** Upload `store-assets/promo-small-440x280.png`
- **Screenshots (`1280x800` or `640x400`, recommended 2–4):**  
  Open Pebble in Chrome's Side Panel beside a lecture PDF or article and capture clean `1280x800` screenshots showing:
  1. Lecture Summary + KaTeX formulas & Pet Companion header
  2. Interactive Quiz & Socratic Tutor Chat
  3. FSRS Spaced Repetition Deck + Analytics

**Suggested Store Description:**

```text
Pebble turns any webpage, LMS slide deck, PDF, YouTube lecture, or screenshot into a focused academic study session right inside Chrome’s Side Panel.

KEY STUDY TOOLS
• Multi-Source Reader: Extract clean text from articles, YouTube lecture transcripts, and embedded LMS PDFs (Canvas, D2L Brightspace, Blackboard) — or capture a screenshot / paste Ctrl+V for diagrams and handwritten equations.
• Structured Lecture Summaries: Crisp TL;DR, key concepts, formal definitions, LaTeX math rendering (KaTeX), and common exam traps.
• Interactive Quizzes & AI Grading: Multiple-choice and short-answer questions with conceptual AI grading and step-by-step walkthroughs.
• Socratic & Direct Tutor Chat: Calibrate depth (High School / AP, Undergrad, Graduate) and switch between Socratic hints and direct solutions. Right-click highlighted text on any page to Ask Pebble or Save to Vocab.
• FSRS-4.5 Flashcards & Anki Export: Built-in spaced repetition review queue plus one-click Anki .txt export with MathJax LaTeX support.
• Virtual Companion & Focus Suite: Earn XP and Study Treats for Pebble as you learn, complete daily missions, track study analytics, and use the built-in Pomodoro timer.

BRING YOUR OWN KEY OR RUN 100% LOCAL
Connect your own free-tier or paid API key (Google Gemini, OpenRouter, OpenAI, Anthropic Claude), run private local models via Ollama / LM Studio, or use the optional Pebble Local CLI Bridge. Keys stay strictly in local browser storage.
```

---

## 3. Privacy Practices Tab (Copy-Paste Review Answers)

Chrome reviewers verify every declared permission and host permission. Use these accurate justifications:

- **Single Purpose Description:**  
  `Pebble is an AI-powered academic study tutor in Chrome's Side Panel that turns user-selected readings, PDFs, transcripts, and tab screenshots into summaries, quizzes, flashcards, and guided study Q&A.`

- **Privacy Policy URL:**  
  `https://github.com/will-iam08/Pebble-Personal-Ai-Tutor/blob/main/PRIVACY.md`

- **Remote Code:**  
  Select **No, I am not using remote code** (all React, KaTeX, and extension scripts are bundled in the zip).

- **Data Usage Disclosures:**  
  Check only what reflects BYOK transmission on user action (or none collected by the developer): Pebble has **no developer backend** and stores settings, study decks, and keys locally. Declare **Website content** as processed *only when initiated by user interaction* and *not sold or used for ads/creditworthiness*.

- **Permission Justifications:**
  - **`sidePanel`**: Renders the Pebble AI Study Tutor workspace inside Chrome's native Side Panel alongside active study tabs.
  - **`activeTab`**: Captures the visible tab screenshot or inspects the currently active tab only when the user clicks "Read Page / YT" or "Screenshot".
  - **`tabs`**: Reads the active tab's URL and title cleanly across tab switches while the Side Panel remains open so Pebble can detect YouTube watch pages or restricted `chrome://` URLs.
  - **`scripting`**: Dynamically injects content extraction into the active tab and embedded LMS PDF.js frames (`allFrames: true`) when the user clicks "Read Page / YT" so multi-frame university lecture slides can be studied.
  - **`storage`**: Persists user API keys, model selection, FSRS flashcard decks, vocabulary entries, reminder settings, and companion pet progress locally on the user's device.
  - **`alarms`**: Schedules optional study check-in reminder timers that survive service worker sleep.
  - **`notifications`**: Displays gentle desktop check-in reminders when enabled by the user.
  - **`contextMenus`**: Adds "Ask Pebble" and "Save to Pebble Vocab" to the right-click menu when the user highlights text on a page.
  - **Host Permissions (`https://*/*`, `http://*/*`)**: Required so users can (1) extract embedded LMS PDFs across domains on explicit "Read Page / YT" clicks, and (2) send prompts directly from the Side Panel to their chosen AI endpoint (Gemini, OpenRouter, OpenAI, Anthropic, or local `localhost` Ollama/CLI Bridge).

---

## 4. Submit for Review & Optional Future CI Publishing

1. Click **Save draft** → **Submit for review** (typical Chrome Web Store review takes 1–3 business days; extensions requesting broad host permissions may take slightly longer).
2. Once approved, note your permanent **Extension ID** from the dashboard URL. You can optionally automate future version uploads via [`chrome-webstore-upload-cli`](https://github.com/fregante/chrome-webstore-upload-cli) in GitHub Actions using your Google Cloud OAuth credentials.
