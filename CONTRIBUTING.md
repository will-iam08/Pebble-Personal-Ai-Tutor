# Contributing to Pebble

Thanks for your interest in contributing to **Pebble — Personal AI Study Tutor**! Whether you are fixing a bug, improving prompts for better academic explanations, adding a new model provider, or refining the Chrome extension UI, we'd love your help.

---

## Local Development Setup

1. **Fork & clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/Pebble-Personal-Ai-Tutor.git
   cd Pebble-Personal-Ai-Tutor
   ```
2. **Install dependencies** (Node.js 20+):
   ```bash
   npm install
   ```
3. **Configure `.env`**:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` (and optionally override `GEMINI_MODEL`).
4. **Start developing**:
   ```bash
   npm run dev
   ```
5. **Testing the Chrome Extension**:
   - Open `chrome://extensions/`, enable **Developer mode**, and click **Load unpacked** → select `chrome-extension/`.
   - Click the reload icon on the extension card after editing files in `chrome-extension/`.

---

## Checks Before Opening a Pull Request

Run typechecking and verify a clean production build:

```bash
npm run lint
npm run build
```

---

## Pull Request Guidelines

- **Keep PRs focused:** One feature, bug fix, or refactor per PR makes reviews fast and clean.
- **Describe the "why":** Explain what changed, why it helps students or contributors, and include screenshots or a short recording for UI changes.
- **Never commit secrets:** Keep `.env` local and never hardcode API keys.
- **Follow existing conventions:** Match TypeScript strictness, Tailwind utility styling, and component structure in `src/`.

---

## Good Places to Jump In

Check the [Roadmap](./README.md#-roadmap) and open issues — high-impact areas include:
- Unifying the React Side Panel build into the Chrome MV3 extension
- Adding multi-provider BYOK adapters (OpenRouter, Ollama/LM Studio, OpenAI, Anthropic)
- Academic pedagogy upgrades (Socratic tutoring prompts, KaTeX math rendering, screenshot/YouTube capture)
- Automated unit and integration tests for study utilities and prompt parsing

---

## Code of Conduct

Be kind, constructive, and welcoming. Respect everyone's time and perspective so Pebble remains a helpful community for learners and builders alike.
