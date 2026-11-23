// Pebble Study Tutor — Chrome Side Panel Logic (Manifest V3)

const GEMINI_MODEL = 'gemini-2.5-flash';
const STORAGE_KEY_API = 'pebble_gemini_api_key';
const STORAGE_KEY_PET = 'pebble_study_pet';
const STORAGE_KEY_THEME = 'pebble_theme';
const STORAGE_KEY_REMINDERS = 'pebble_reminder_settings';

const state = {
  apiKey: '',
  pet: {
    name: 'Pebble',
    level: 1,
    xp: 0,
    treats: 3,
    fullness: 85,
    mood: 88,
  },
  reminders: {
    enabled: true,
    intervalHours: 6,
  },
  source: {
    label: '',
    text: '',
    pdfBase64: '',
    pdfName: '',
  },
  chatHistory: [],
  latestSummary: null,
  focusMode: false,
};

const els = {
  appShell: document.getElementById('app'),
  focusModeBtn: document.getElementById('focusModeBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  settingsForm: document.getElementById('settingsForm'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  petNameInput: document.getElementById('petNameInput'),
  reminderEnabledInput: document.getElementById('reminderEnabledInput'),
  reminderHoursInput: document.getElementById('reminderHoursInput'),
  testReminderBtn: document.getElementById('testReminderBtn'),
  settingsSavedMsg: document.getElementById('settingsSavedMsg'),

  petAvatarBtn: document.getElementById('petAvatarBtn'),
  petNameLabel: document.getElementById('petNameLabel'),
  petLevelLabel: document.getElementById('petLevelLabel'),
  petXpFill: document.getElementById('petXpFill'),
  petXpText: document.getElementById('petXpText'),
  petTreatsText: document.getElementById('petTreatsText'),
  petCaption: document.getElementById('petCaption'),
  feedBtn: document.getElementById('feedBtn'),
  patBtn: document.getElementById('patBtn'),

  readPageBtn: document.getElementById('readPageBtn'),
  pdfFileInput: document.getElementById('pdfFileInput'),
  pdfDropZone: document.getElementById('pdfDropZone'),
  togglePasteBtn: document.getElementById('togglePasteBtn'),
  pasteWrap: document.getElementById('pasteWrap'),
  pasteInput: document.getElementById('pasteInput'),
  useNotesBtn: document.getElementById('useNotesBtn'),
  sourceStatus: document.getElementById('sourceStatus'),
  sourceStatusText: document.getElementById('sourceStatusText'),
  clearSourceBtn: document.getElementById('clearSourceBtn'),

  errorBanner: document.getElementById('errorBanner'),
  genSummaryBtn: document.getElementById('genSummaryBtn'),
  summaryExportBar: document.getElementById('summaryExportBar'),
  exportSummaryMdBtn: document.getElementById('exportSummaryMdBtn'),
  exportSummaryTxtBtn: document.getElementById('exportSummaryTxtBtn'),
  summaryOutput: document.getElementById('summaryOutput'),
  quizCountSelect: document.getElementById('quizCountSelect'),
  quizModeSelect: document.getElementById('quizModeSelect'),
  genQuizBtn: document.getElementById('genQuizBtn'),
  quizOutput: document.getElementById('quizOutput'),
  genTipsBtn: document.getElementById('genTipsBtn'),
  tipsOutput: document.getElementById('tipsOutput'),
  chatExportBar: document.getElementById('chatExportBar'),
  exportChatMdBtn: document.getElementById('exportChatMdBtn'),
  exportChatTxtBtn: document.getElementById('exportChatTxtBtn'),
  chatMessages: document.getElementById('chatMessages'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  chatSendBtn: document.getElementById('chatSendBtn'),
};

function xpForLevel(level) {
  return 60 + (level - 1) * 40;
}

function stageForLevel(level) {
  if (level >= 7) return 'Scholar';
  if (level >= 4) return 'Leafkin';
  if (level >= 2) return 'Sproutling';
  return 'Seedling';
}

function setError(message) {
  if (!message) {
    els.errorBanner.textContent = '';
    els.errorBanner.classList.add('hidden');
  } else {
    els.errorBanner.textContent = message;
    els.errorBanner.classList.remove('hidden');
  }
}

function savePet() {
  chrome.storage.local.set({ [STORAGE_KEY_PET]: state.pet });
}

function renderPet(caption) {
  const needed = xpForLevel(state.pet.level);
  const pct = Math.min(100, Math.round((state.pet.xp / needed) * 100));
  els.petNameLabel.textContent = state.pet.name;
  els.petLevelLabel.textContent = `${stageForLevel(state.pet.level)} · Lv.${state.pet.level}`;
  els.petXpFill.style.width = `${pct}%`;
  els.petXpText.textContent = `${state.pet.xp}/${needed} XP`;
  els.petTreatsText.textContent = `${state.pet.treats} treats`;
  if (caption) {
    els.petCaption.textContent = caption;
  }
}

function rewardPet({ xp = 0, treats = 0, caption = '' }) {
  state.pet.xp += xp;
  state.pet.treats += treats;
  let leveledUp = false;
  while (state.pet.xp >= xpForLevel(state.pet.level)) {
    state.pet.xp -= xpForLevel(state.pet.level);
    state.pet.level += 1;
    leveledUp = true;
  }
  savePet();
  renderPet(
    leveledUp
      ? `${state.pet.name} reached Lv.${state.pet.level} (${stageForLevel(state.pet.level)})!`
      : caption
  );
}

function renderSourceStatus() {
  if (state.source.text || state.source.pdfBase64) {
    els.sourceStatusText.textContent = `Loaded: ${state.source.label}`;
    els.sourceStatus.classList.remove('hidden');
  } else {
    els.sourceStatusText.textContent = '';
    els.sourceStatus.classList.add('hidden');
  }
}

async function callGemini({ instruction, jsonSchema, systemInstruction }) {
  if (!state.apiKey) {
    openSettingsModal();
    throw new Error('Add your Gemini API key in Settings to use the AI Tutor.');
  }
  if (!state.source.text && !state.source.pdfBase64) {
    throw new Error('Load an active webpage, upload a PDF, or paste notes first.');
  }

  const parts = [];
  if (state.source.pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: state.source.pdfBase64,
      },
    });
  }
  const bodyText = state.source.text
    ? `Source Material (${state.source.label}):\n"""\n${state.source.text.slice(0, 36000)}\n"""\n\n${instruction}`
    : `Read the attached PDF (${state.source.pdfName}).\n\n${instruction}`;
  parts.push({ text: bodyText });

  const generationConfig = jsonSchema
    ? { responseMimeType: 'application/json', responseSchema: jsonSchema }
    : {};

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    state.apiKey
  )}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts }],
      generationConfig,
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error?.message || `Gemini API error (${res.status})`);
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Gemini returned an empty response.');
  return jsonSchema ? JSON.parse(text) : text;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugifyName(str) {
  return (
    String(str || 'study-session')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 44) || 'study-session'
  );
}

function downloadStudyExport(filename, content, ext) {
  const mime = ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCurrentSummary(ext) {
  const s = state.latestSummary;
  if (!s) return;
  const title = s.topicTitle || state.source.label || 'Lecture Summary';
  const lines =
    ext === 'md'
      ? [
          `# ${title}`,
          '',
          `> **Difficulty:** ${s.difficulty || 'Study Overview'}`,
          '',
          '## TL;DR',
          '',
          s.tldr || '',
          '',
          '## Key Concepts',
          '',
          ...(s.keyConcepts || []).map((c) => `- **${c.term}:** ${c.explanation}`),
          '',
          '## Formulas & Definitions',
          '',
          ...(s.formulasAndDefinitions || []).flatMap((f) => [
            `### ${f.label}`,
            '',
            '```text',
            f.expression,
            '```',
            '',
            f.meaning,
            '',
          ]),
          '## Potential Exam Traps',
          '',
          ...(s.examTraps || []).map((t) => `- **Trap:** ${t.trap}\n  - *How to avoid:* ${t.howToAvoid}`),
        ]
      : [
          title.toUpperCase(),
          '='.repeat(Math.min(64, Math.max(20, title.length))),
          `Difficulty: ${s.difficulty || 'Study Overview'}`,
          '',
          'TL;DR',
          '-----',
          s.tldr || '',
          '',
          'KEY CONCEPTS',
          '------------',
          ...(s.keyConcepts || []).map((c) => `* ${c.term}: ${c.explanation}`),
          '',
          'FORMULAS & DEFINITIONS',
          '----------------------',
          ...(s.formulasAndDefinitions || []).flatMap((f) => [
            `${f.label}`,
            `  Formula: ${f.expression}`,
            `  Meaning: ${f.meaning}`,
            '',
          ]),
          'POTENTIAL EXAM TRAPS',
          '--------------------',
          ...(s.examTraps || []).map((t) => `* Trap: ${t.trap}\n  How to avoid: ${t.howToAvoid}`),
        ];

  downloadStudyExport(`pebble-summary-${slugifyName(title)}.${ext}`, lines.join('\n') + '\n', ext);
}

function exportCurrentChat(ext) {
  if (!state.chatHistory.length) return;
  const title = state.source.label || 'Tutor Chat';
  const lines =
    ext === 'md'
      ? [
          `# Tutor Chat History — ${title}`,
          '',
          ...state.chatHistory.flatMap((m) => [
            `### ${m.role === 'user' ? 'Student' : `${state.pet.name} (Tutor)`}`,
            '',
            m.text,
            '',
            '---',
            '',
          ]),
        ]
      : [
          `TUTOR CHAT HISTORY: ${title}`,
          '====================================',
          '',
          ...state.chatHistory.flatMap((m) => [
            `[${m.role === 'user' ? 'Student' : `${state.pet.name} (Tutor)`}]`,
            m.text,
            '',
            '------------------------------------',
            '',
          ]),
        ];

  downloadStudyExport(`pebble-chat-${slugifyName(title)}.${ext}`, lines.join('\n') + '\n', ext);
}

function setFocusMode(enabled) {
  state.focusMode = Boolean(enabled);
  els.appShell.classList.toggle('focus-mode', state.focusMode);
  els.focusModeBtn.textContent = state.focusMode ? 'Exit Focus' : 'Focus';
  els.focusModeBtn.setAttribute('aria-pressed', String(state.focusMode));
}

function handlePdfFile(file) {
  if (!file || file.type !== 'application/pdf') {
    setError('Please select a valid PDF file.');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    setError('PDF file is larger than 15 MB. Please choose a smaller lecture slide deck.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    const base64 = result.split(',')[1] || '';
    state.source = {
      label: `PDF: ${file.name}`,
      text: '',
      pdfBase64: base64,
      pdfName: file.name,
    };
    state.chatHistory = [];
    state.latestSummary = null;
    els.summaryExportBar.classList.add('hidden');
    els.chatExportBar.classList.add('hidden');
    setError('');
    renderSourceStatus();
    renderPet(`Loaded ${file.name}. Ready to summarize or quiz!`);
  };
  reader.readAsDataURL(file);
}

// 1. Lecture Summary
async function generateSummary() {
  setError('');
  els.genSummaryBtn.disabled = true;
  els.genSummaryBtn.textContent = 'Summarizing...';

  try {
    const data = await callGemini({
      systemInstruction: 'You are Pebble, a clear, rigorous university study tutor.',
      instruction:
        'Produce a structured study breakdown: topicTitle, difficulty, concise TL;DR, 4-6 keyConcepts (term + explanation), 3-5 formulasAndDefinitions (label, expression, meaning), and 3-4 examTraps (trap + howToAvoid).',
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          topicTitle: { type: 'STRING' },
          difficulty: { type: 'STRING' },
          tldr: { type: 'STRING' },
          keyConcepts: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { term: { type: 'STRING' }, explanation: { type: 'STRING' } },
            },
          },
          formulasAndDefinitions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                label: { type: 'STRING' },
                expression: { type: 'STRING' },
                meaning: { type: 'STRING' },
              },
            },
          },
          examTraps: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { trap: { type: 'STRING' }, howToAvoid: { type: 'STRING' } },
            },
          },
        },
      },
    });

    els.summaryOutput.innerHTML = `
      <div class="card">
        <h3>${escapeHtml(data.topicTitle || 'Lecture Summary')}</h3>
        <p class="muted small">${escapeHtml(data.difficulty || 'Study Overview')}</p>
        <p>${escapeHtml(data.tldr)}</p>
      </div>
      <div class="card">
        <h3>Key Concepts</h3>
        ${(data.keyConcepts || [])
          .map((c) => `<p><strong>${escapeHtml(c.term)}:</strong> ${escapeHtml(c.explanation)}</p>`)
          .join('')}
      </div>
      <div class="card">
        <h3>Formulas &amp; Definitions</h3>
        ${(data.formulasAndDefinitions || [])
          .map(
            (f) => `
          <div>
            <strong>${escapeHtml(f.label)}</strong>
            <div class="formula">${escapeHtml(f.expression)}</div>
            <p class="muted small">${escapeHtml(f.meaning)}</p>
          </div>`
          )
          .join('')}
      </div>
      <div class="card">
        <h3>Potential Exam Traps</h3>
        ${(data.examTraps || [])
          .map(
            (t) =>
              `<p><strong>Watch out:</strong> ${escapeHtml(t.trap)}<br/><span class="muted small">Avoid by: ${escapeHtml(
                t.howToAvoid
              )}</span></p>`
          )
          .join('')}
      </div>
    `;

    state.latestSummary = data;
    els.summaryExportBar.classList.remove('hidden');
    rewardPet({ xp: 15, treats: 2, caption: 'Summary ready! +15 XP & +2 study treats.' });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Summary generation failed.');
  } finally {
    els.genSummaryBtn.disabled = false;
    els.genSummaryBtn.textContent = 'Generate Lecture Summary';
  }
}

// 2. Interactive Quiz
async function generateQuiz() {
  setError('');
  els.genQuizBtn.disabled = true;
  els.genQuizBtn.textContent = 'Building Quiz...';

  const count = Number(els.quizCountSelect.value) || 5;
  const mode = els.quizModeSelect.value || 'mixed';

  try {
    const data = await callGemini({
      systemInstruction: 'You are Pebble, a supportive university exam coach.',
      instruction: `Generate ${count} exam questions (${mode} format: use "mcq" with 4 options + correctIndex 0-3, or "short" with sampleAnswer). Include a clear step-by-step explanation for every question.`,
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          quizTitle: { type: 'STRING' },
          questions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                type: { type: 'STRING' },
                question: { type: 'STRING' },
                options: { type: 'ARRAY', items: { type: 'STRING' } },
                correctIndex: { type: 'INTEGER' },
                sampleAnswer: { type: 'STRING' },
                explanation: { type: 'STRING' },
              },
            },
          },
        },
      },
    });

    els.quizOutput.innerHTML = '';
    (data.questions || []).forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3>Q${idx + 1}. ${escapeHtml(q.question)}</h3>`;

      const feedback = document.createElement('div');
      feedback.className = 'small muted';
      feedback.style.marginTop = '8px';

      if (q.type === 'short' || !Array.isArray(q.options) || q.options.length === 0) {
        const input = document.createElement('textarea');
        input.rows = 2;
        input.style.width = '100%';
        input.placeholder = 'Write your answer...';
        const btn = document.createElement('button');
        btn.className = 'btn-secondary btn-sm';
        btn.style.marginTop = '6px';
        btn.textContent = 'Check Answer';
        btn.addEventListener('click', () => {
          btn.disabled = true;
          const answered = input.value.trim().length > 6;
          feedback.innerHTML = `<strong>Reference Answer:</strong> ${escapeHtml(
            q.sampleAnswer || ''
          )}<br/><strong>Explanation:</strong> ${escapeHtml(q.explanation || '')}`;
          if (answered) {
            rewardPet({ xp: 10, treats: 1, caption: 'Great short-answer recall! +10 XP & +1 treat.' });
          }
        });
        card.appendChild(input);
        card.appendChild(btn);
      } else {
        q.options.forEach((opt, optIdx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'quiz-option';
          btn.textContent = opt;
          btn.addEventListener('click', () => {
            const buttons = card.querySelectorAll('.quiz-option');
            buttons.forEach((b, i) => {
              b.disabled = true;
              if (i === q.correctIndex) b.classList.add('correct');
            });
            if (optIdx === q.correctIndex) {
              feedback.innerHTML = `<strong>Correct! (+10 XP, +1 treat)</strong><br/>${escapeHtml(q.explanation)}`;
              rewardPet({ xp: 10, treats: 1, caption: 'Nailed that quiz question! +10 XP.' });
            } else {
              btn.classList.add('wrong');
              feedback.innerHTML = `<strong>Not quite.</strong> ${escapeHtml(q.explanation)}`;
            }
          });
          card.appendChild(btn);
        });
      }

      card.appendChild(feedback);
      els.quizOutput.appendChild(card);
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Quiz generation failed.');
  } finally {
    els.genQuizBtn.disabled = false;
    els.genQuizBtn.textContent = 'Generate Quiz';
  }
}

// 3. Study Tips & Flashcards
async function generateTips() {
  setError('');
  els.genTipsBtn.disabled = true;
  els.genTipsBtn.textContent = 'Generating...';

  try {
    const data = await callGemini({
      systemInstruction: 'You are Pebble, an active-recall learning strategist.',
      instruction:
        'Provide difficultyLevel, estimatedMinutes, 3 targeted study strategies (title + description), 3 mnemonics (concept + hook), and 5 active-recall flashcards (front, back, hint).',
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          difficultyLevel: { type: 'STRING' },
          estimatedMinutes: { type: 'INTEGER' },
          strategies: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { title: { type: 'STRING' }, description: { type: 'STRING' } },
            },
          },
          mnemonics: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { concept: { type: 'STRING' }, hook: { type: 'STRING' } },
            },
          },
          flashcards: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { front: { type: 'STRING' }, back: { type: 'STRING' }, hint: { type: 'STRING' } },
            },
          },
        },
      },
    });

    els.tipsOutput.innerHTML = `
      <div class="card">
        <h3>Study Plan · ${escapeHtml(data.difficultyLevel || 'Focused')} (~${Number(data.estimatedMinutes) || 20} min)</h3>
        ${(data.strategies || [])
          .map((s) => `<p><strong>${escapeHtml(s.title)}:</strong> ${escapeHtml(s.description)}</p>`)
          .join('')}
      </div>
      <div class="card">
        <h3>Memory Hooks &amp; Mnemonics</h3>
        ${(data.mnemonics || [])
          .map((m) => `<p><strong>${escapeHtml(m.concept)}:</strong> ${escapeHtml(m.hook)}</p>`)
          .join('')}
      </div>
    `;

    (data.flashcards || []).forEach((fc, idx) => {
      const card = document.createElement('div');
      card.className = 'flashcard';
      let flipped = false;
      const renderCard = () => {
        card.innerHTML = flipped
          ? `<div class="muted small">Flashcard ${idx + 1} · Answer (click to flip)</div><p style="margin-top:6px">${escapeHtml(fc.back)}</p>`
          : `<div class="muted small">Flashcard ${idx + 1} · Prompt (click to flip)</div><p style="margin-top:6px"><strong>${escapeHtml(fc.front)}</strong></p>`;
      };
      renderCard();
      card.addEventListener('click', () => {
        flipped = !flipped;
        renderCard();
      });
      els.tipsOutput.appendChild(card);
    });

    rewardPet({ xp: 12, treats: 1, caption: 'Flashcards & memory hooks built! +12 XP.' });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Study tips generation failed.');
  } finally {
    els.genTipsBtn.disabled = false;
    els.genTipsBtn.textContent = 'Generate Tips & Flashcards';
  }
}

// 4. Tutor Chat
async function sendChatMessage(question) {
  setError('');
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg user';
  userDiv.textContent = question;
  if (els.chatMessages.querySelector('.empty-hint')) {
    els.chatMessages.innerHTML = '';
  }
  els.chatMessages.appendChild(userDiv);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

  els.chatSendBtn.disabled = true;
  try {
    const historyBlock = state.chatHistory
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`)
      .join('\n');

    const reply = await callGemini({
      systemInstruction:
        'You are Pebble, a calm, concise Chrome Side Panel study tutor. Ground answers in the loaded page or PDF.',
      instruction: historyBlock
        ? `Previous chat:\n${historyBlock}\n\nStudent question: ${question}`
        : `Student question: ${question}`,
    });

    state.chatHistory.push({ role: 'user', text: question }, { role: 'model', text: reply });
    els.chatExportBar.classList.remove('hidden');
    const botDiv = document.createElement('div');
    botDiv.className = 'chat-msg model';
    botDiv.textContent = reply;
    els.chatMessages.appendChild(botDiv);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

    rewardPet({ xp: 5, treats: 0, caption: 'Great follow-up question! +5 XP.' });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Chat reply failed.');
  } finally {
    els.chatSendBtn.disabled = false;
  }
}

function openSettingsModal() {
  els.apiKeyInput.value = state.apiKey;
  els.petNameInput.value = state.pet.name;
  els.reminderEnabledInput.checked = state.reminders.enabled;
  els.reminderHoursInput.value = String(state.reminders.intervalHours);
  els.reminderHoursInput.disabled = !state.reminders.enabled;
  els.settingsSavedMsg.textContent = '';
  els.settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  els.settingsModal.classList.add('hidden');
}

// Event Listeners
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t === btn);
      t.setAttribute('aria-selected', String(t === btn));
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${target}`);
    });
  });
});

els.focusModeBtn.addEventListener('click', () => {
  setFocusMode(!state.focusMode);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.focusMode && els.settingsModal.classList.contains('hidden')) {
    setFocusMode(false);
  }
});

els.exportSummaryMdBtn.addEventListener('click', () => exportCurrentSummary('md'));
els.exportSummaryTxtBtn.addEventListener('click', () => exportCurrentSummary('txt'));
els.exportChatMdBtn.addEventListener('click', () => exportCurrentChat('md'));
els.exportChatTxtBtn.addEventListener('click', () => exportCurrentChat('txt'));

els.themeToggleBtn.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  chrome.storage.local.set({ [STORAGE_KEY_THEME]: isDark ? 'dark' : 'light' });
});

els.settingsBtn.addEventListener('click', openSettingsModal);
els.closeSettingsBtn.addEventListener('click', closeSettingsModal);
els.reminderEnabledInput.addEventListener('change', () => {
  els.reminderHoursInput.disabled = !els.reminderEnabledInput.checked;
});
els.testReminderBtn.addEventListener('click', () => {
  const hours = Math.min(72, Math.max(1, Math.round(Number(els.reminderHoursInput.value) || 6)));
  chrome.runtime.sendMessage({ type: 'TEST_REMINDER_NOTIFICATION', intervalHours: hours }, () => {
    els.settingsSavedMsg.textContent = 'Test reminder sent';
  });
});
els.settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.apiKey = els.apiKeyInput.value.trim();
  const nextName = els.petNameInput.value.trim().slice(0, 16);
  if (nextName) state.pet.name = nextName;
  const intervalHours = Math.min(72, Math.max(1, Math.round(Number(els.reminderHoursInput.value) || 6)));
  state.reminders = {
    enabled: Boolean(els.reminderEnabledInput.checked),
    intervalHours,
  };
  chrome.storage.local.set(
    {
      [STORAGE_KEY_API]: state.apiKey,
      [STORAGE_KEY_PET]: state.pet,
      [STORAGE_KEY_REMINDERS]: state.reminders,
    },
    () => {
      chrome.runtime.sendMessage({
        type: 'UPDATE_REMINDER_SETTINGS',
        enabled: state.reminders.enabled,
        intervalHours: state.reminders.intervalHours,
      });
      renderPet(
        state.reminders.enabled
          ? `Reminders set for every ${state.reminders.intervalHours}h of inactivity.`
          : 'Settings saved (check-in reminders paused).'
      );
      els.settingsSavedMsg.textContent = 'Saved';
      setTimeout(closeSettingsModal, 450);
    }
  );
});

els.feedBtn.addEventListener('click', () => {
  if (state.pet.treats > 0) {
    state.pet.treats -= 1;
    rewardPet({ xp: 10, caption: `${state.pet.name} happily munched a study treat! +10 XP.` });
  } else {
    renderPet('Earn study treats by generating summaries or answering quiz questions!');
  }
});

const patHandler = () => {
  rewardPet({ xp: 3, caption: `${state.pet.name} loved that pat! Ready to keep studying.` });
};
els.patBtn.addEventListener('click', patHandler);
els.petAvatarBtn.addEventListener('click', patHandler);

els.readPageBtn.addEventListener('click', () => {
  setError('');
  els.readPageBtn.disabled = true;
  els.readPageBtn.textContent = 'Reading...';
  chrome.runtime.sendMessage({ type: 'EXTRACT_ACTIVE_TAB' }, (res) => {
    els.readPageBtn.disabled = false;
    els.readPageBtn.textContent = 'Read Active Page';
    if (chrome.runtime.lastError || !res?.ok) {
      setError(res?.error || chrome.runtime.lastError?.message || 'Could not read active tab.');
      return;
    }
    state.source = {
      label: `${res.title} (${res.wordCount} words)`,
      text: res.text,
      pdfBase64: '',
      pdfName: '',
    };
    state.chatHistory = [];
    state.latestSummary = null;
    els.summaryExportBar.classList.add('hidden');
    els.chatExportBar.classList.add('hidden');
    renderSourceStatus();
    renderPet(`Read "${res.title}" — pick Summary, Quiz, Tips, or Chat!`);
  });
});

els.pdfFileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handlePdfFile(file);
});

els.pdfDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.pdfDropZone.classList.add('drag-over');
});
els.pdfDropZone.addEventListener('dragleave', () => {
  els.pdfDropZone.classList.remove('drag-over');
});
els.pdfDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  els.pdfDropZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) handlePdfFile(file);
});

els.togglePasteBtn.addEventListener('click', () => {
  els.pasteWrap.classList.toggle('hidden');
});

els.useNotesBtn.addEventListener('click', () => {
  const text = els.pasteInput.value.trim();
  if (!text) {
    setError('Paste some study notes before loading.');
    return;
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  state.source = {
    label: `Pasted Notes (${words} words)`,
    text,
    pdfBase64: '',
    pdfName: '',
  };
  state.chatHistory = [];
  state.latestSummary = null;
  els.summaryExportBar.classList.add('hidden');
  els.chatExportBar.classList.add('hidden');
  els.pasteWrap.classList.add('hidden');
  setError('');
  renderSourceStatus();
  renderPet('Notes loaded! Ready to build a summary or quiz.');
});

els.clearSourceBtn.addEventListener('click', () => {
  state.source = { label: '', text: '', pdfBase64: '', pdfName: '' };
  state.chatHistory = [];
  state.latestSummary = null;
  els.summaryExportBar.classList.add('hidden');
  els.chatExportBar.classList.add('hidden');
  renderSourceStatus();
});

els.genSummaryBtn.addEventListener('click', generateSummary);
els.genQuizBtn.addEventListener('click', generateQuiz);
els.genTipsBtn.addEventListener('click', generateTips);
els.chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = els.chatInput.value.trim();
  if (!q) return;
  els.chatInput.value = '';
  sendChatMessage(q);
});

// Hydrate saved state from chrome.storage.local and record an active check-in
chrome.storage.local.get(
  [STORAGE_KEY_API, STORAGE_KEY_PET, STORAGE_KEY_THEME, STORAGE_KEY_REMINDERS],
  (data) => {
    if (typeof data[STORAGE_KEY_API] === 'string') {
      state.apiKey = data[STORAGE_KEY_API];
    }
    if (data[STORAGE_KEY_PET]) {
      state.pet = { ...state.pet, ...data[STORAGE_KEY_PET] };
    }
    if (data[STORAGE_KEY_REMINDERS]) {
      state.reminders = {
        enabled:
          typeof data[STORAGE_KEY_REMINDERS].enabled === 'boolean'
            ? data[STORAGE_KEY_REMINDERS].enabled
            : true,
        intervalHours: Number(data[STORAGE_KEY_REMINDERS].intervalHours) || 6,
      };
    }
    const theme = data[STORAGE_KEY_THEME] || 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    renderPet();

    // Reset the inactivity notification timer whenever the student opens the Side Panel
    chrome.runtime.sendMessage({ type: 'RECORD_CHECKIN' }, () => {
      void chrome.runtime.lastError;
    });
  }
);
