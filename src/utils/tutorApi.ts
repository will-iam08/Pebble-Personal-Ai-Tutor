import { AIProviderSettings } from '../types/ai';
import {
  ChatMessage,
  LectureSummaryData,
  QuizData,
  ShortAnswerGrade,
  StudySource,
  StudyTipsData,
  VocabDefinitionResult,
} from '../types/study';
import { runDirectProviderCompletion, runDirectProviderJson } from './aiClient';
import { isChromeExtensionRuntime } from './extensionBridge';
import { loadAISettings } from './storage';
import {
  buildChatInstruction,
  buildGradeShortPrompt,
  buildQuizInstruction,
  buildSourceTextBlock,
  buildSummaryInstruction,
  buildTipsInstruction,
  buildVocabPrompt,
  SYSTEM_PROMPTS,
} from './tutorPrompts';

let cachedSettings: AIProviderSettings | null = null;

export function setActiveAISettings(settings: AIProviderSettings): void {
  cachedSettings = settings;
}

function getEffectiveSettings(): AIProviderSettings {
  if (cachedSettings) return cachedSettings;
  return loadAISettings(isChromeExtensionRuntime());
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

function toSourcePayload(source: StudySource) {
  return {
    title: source.title,
    text: source.text,
    pdfBase64: source.pdfBase64,
    pdfName: source.pdfName,
  };
}

export function fetchLectureSummary(source: StudySource): Promise<LectureSummaryData> {
  const settings = getEffectiveSettings();
  if (settings.provider === 'server') {
    return postJson<LectureSummaryData>('/api/tutor/summary', toSourcePayload(source));
  }

  return runDirectProviderJson<LectureSummaryData>(
    settings,
    {
      systemInstruction: SYSTEM_PROMPTS.summary,
      userPrompt: buildSourceTextBlock(source, buildSummaryInstruction()),
      source,
    },
    'Failed to generate lecture summary.'
  );
}

export function fetchInteractiveQuiz(
  source: StudySource,
  count: number,
  mode: 'mixed' | 'mcq' | 'short'
): Promise<QuizData> {
  const settings = getEffectiveSettings();
  if (settings.provider === 'server') {
    return postJson<QuizData>('/api/tutor/quiz', {
      ...toSourcePayload(source),
      count,
      mode,
    });
  }

  return runDirectProviderJson<QuizData>(
    settings,
    {
      systemInstruction: SYSTEM_PROMPTS.quiz,
      userPrompt: buildSourceTextBlock(source, buildQuizInstruction(count, mode)),
      source,
    },
    'Failed to generate interactive quiz.'
  );
}

export function gradeShortAnswer(payload: {
  question: string;
  sampleAnswer: string;
  keyPoints?: string[];
  studentAnswer: string;
}): Promise<ShortAnswerGrade> {
  const settings = getEffectiveSettings();
  if (settings.provider === 'server') {
    return postJson<ShortAnswerGrade>('/api/tutor/grade-short', payload);
  }

  return runDirectProviderJson<ShortAnswerGrade>(
    settings,
    {
      systemInstruction: SYSTEM_PROMPTS.gradeShort,
      userPrompt: buildGradeShortPrompt(payload),
    },
    'Failed to grade short answer.'
  );
}

export function fetchStudyTips(source: StudySource): Promise<StudyTipsData> {
  const settings = getEffectiveSettings();
  if (settings.provider === 'server') {
    return postJson<StudyTipsData>('/api/tutor/tips', toSourcePayload(source));
  }

  return runDirectProviderJson<StudyTipsData>(
    settings,
    {
      systemInstruction: SYSTEM_PROMPTS.tips,
      userPrompt: buildSourceTextBlock(source, buildTipsInstruction()),
      source,
    },
    'Failed to generate study tips.'
  );
}

export async function sendTutorChat(
  source: StudySource,
  history: ChatMessage[],
  message: string
): Promise<{ reply: string }> {
  const settings = getEffectiveSettings();
  if (settings.provider === 'server') {
    return postJson<{ reply: string }>('/api/tutor/chat', {
      ...toSourcePayload(source),
      history: history.map((m) => ({ role: m.role, text: m.text })),
      message,
    });
  }

  const reply = await runDirectProviderCompletion(settings, {
    systemInstruction: SYSTEM_PROMPTS.chat,
    userPrompt: buildSourceTextBlock(source, buildChatInstruction(history, message)),
    source,
    expectJson: false,
  });

  return { reply: reply.trim() || 'I could not generate a reply for that question.' };
}

export function fetchVocabDefinition(payload: {
  term: string;
  contextSnippet?: string;
  sourceTitle?: string;
}): Promise<VocabDefinitionResult> {
  const settings = getEffectiveSettings();
  if (settings.provider === 'server') {
    return postJson<VocabDefinitionResult>('/api/tutor/vocab-define', payload);
  }

  return runDirectProviderJson<VocabDefinitionResult>(
    settings,
    {
      systemInstruction: SYSTEM_PROMPTS.vocab,
      userPrompt: buildVocabPrompt(payload),
    },
    'Failed to generate a definition for this term.'
  );
}
