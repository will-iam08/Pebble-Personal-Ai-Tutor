# Privacy Policy for Pebble — Personal AI Study Tutor

**Effective Date:** November 23, 2026  
**Project Repository:** [will-iam08/Pebble-Personal-Ai-Tutor](https://github.com/will-iam08/Pebble-Personal-Ai-Tutor)

Pebble is an open-source, Bring-Your-Own-Key (BYOK) and local-first Chrome Side Panel extension. We do not operate tracking servers, user accounts, advertisements, or analytics pipelines that collect your personal data.

---

## 1. Data Stored Locally on Your Device

Pebble stores all user preferences, study state, and API credentials **strictly locally** in your browser (`chrome.storage.local` and extension `localStorage`), including:

- **AI Provider Settings & API Keys:** Your chosen provider, model ID, local Ollama / CLI Bridge URL, and any API key you enter.
- **Study Content & Progress:** Your saved vocabulary glossary, FSRS flashcard review deck, daily study missions, Pomodoro settings, study analytics logs, and virtual companion ("Pebble") progress.
- **Reminder Preferences:** Notification toggle and check-in interval used by `chrome.alarms`.

You can clear all stored extension data at any time by removing the extension or clearing site/extension storage in Chrome.

---

## 2. How Web Page Content, PDFs, Transcripts, and Screenshots Are Handled

Pebble **never reads or transmits web page data in the background**. Page inspection happens **only** when you explicitly trigger a study action:

- Clicking **Read Page / YT** extracts text, YouTube captions, or an embedded PDF from your currently active tab.
- Clicking **Screenshot** captures a PNG image of the currently visible browser tab.
- Right-clicking highlighted text and choosing **Ask Pebble** or **Save to Pebble Vocab** uses only the highlighted passage.
- Uploading a PDF/image or pasting notes stays inside the Side Panel until you run an AI study tool.

When you generate a Summary, Quiz, Study Tips, Tutor Chat reply, or Vocab definition, the selected study content is transmitted **directly from your browser** to the AI endpoint you configured:

- **Cloud BYOK Providers** (Google Gemini, OpenRouter, OpenAI, or Anthropic Claude): Subject to the privacy policy of the AI provider you chose.
- **Local Providers** (Ollama, LM Studio, or Pebble Local CLI Bridge at `localhost` / `127.0.0.1`): Study material stays entirely on your local machine and is not sent to external servers by Pebble.

---

## 3. Permissions Used & Why

- `sidePanel`: Displays Pebble inside Chrome's native Side Panel alongside your readings.
- `activeTab`, `tabs`, `scripting`, and host permissions (`http://*/*`, `https://*/*`): Required on explicit user action to extract clean article text, YouTube transcripts, and embedded LMS PDF slides (e.g., D2L Brightspace, Canvas, Blackboard) across frames, and to reach configured AI APIs or `localhost` model runners.
- `storage`: Saves your API keys, FSRS decks, vocabulary, and companion state locally.
- `alarms` & `notifications`: Schedules optional gentle study check-in reminders.
- `contextMenus`: Adds the right-click **Ask Pebble** and **Save to Pebble Vocab** actions for highlighted text.

---

## 4. Chrome Web Store Limited Use & Data Sharing

- Pebble **does not** sell, rent, or transfer user data to third parties, data brokers, or advertising networks.
- Pebble **does not** use remote executable code; all application scripts are bundled directly inside the extension package.
- Use of information received from Google/Chrome APIs adheres to the **Chrome Web Store User Data Policy**, including the Limited Use requirements.

---

## 5. Contact

If you have questions or privacy concerns, please open an issue on GitHub:  
[https://github.com/will-iam08/Pebble-Personal-Ai-Tutor/issues](https://github.com/will-iam08/Pebble-Personal-Ai-Tutor/issues)
