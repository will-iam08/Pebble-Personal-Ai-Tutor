import { AIProviderSettings } from '../types/ai';
import {
  ChatMessage,
  LectureSummaryData,
  QuizData,
  ShortAnswerGrade,
  StudySource,
  StudyTipsData,
  TutorProfile,
  VocabDefinitionResult,
} from '../types/study';
import { runDirectProviderCompletion, runDirectProviderJson } from './aiClient';
import { isChromeExtensionRuntime } from './extensionBridge';
import { DEFAULT_TUTOR_PROFILE, loadAISettings, loadTutorProfile } from './storage';
import {
  buildChatInstruction,
  buildGradeShortPrompt,
  buildQuizInstruction,
  buildSourceTextBlock,
  buildSummaryInstruction,
  buildSystemPrompt,
  buildTipsInstruction,
  buildVocabPrompt,
} from './tutorPrompts';

let cachedSettings: AIProviderSettings | null = null;
let cachedProfile: TutorProfile | null = null;

export function setActiveAISettings(settings: AIProviderSettings): void {
  cachedSettings = settings;
}

export function setActiveTutorProfile(profile: TutorProfile): void {
  cachedProfile = profile;
}

function getEffectiveSettings(): AIProviderSettings {
  if (cachedSettings) return cachedSettings;
  return loadAISettings(isChromeExtensionRuntime());
}

function getEffectiveProfile(): TutorProfile {
  if (cachedProfile) return cachedProfile;
  return loadTutorProfile() || DEFAULT_TUTOR_PROFILE;
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
    kind: source.kind,
    title: source.title,
    text: source.text,
    pdfBase64: source.pdfBase64,
    pdfName: source.pdfName,
    imageBase64: source.imageBase64,
    imageMimeType: source.imageMimeType,
    tutorProfile: getEffectiveProfile(),
  };
}

export function fetchLectureSummary(source: StudySource): Promise<LectureSummaryData> {
  const settings = getEffectiveSettings();
  const profile = getEffectiveProfile();
  if (settings.provider === 'server') {
    return postJson<LectureSummaryData>('/api/tutor/summary', toSourcePayload(source));
  }

  return runDirectProviderJson<LectureSummaryData>(
    settings,
    {
      systemInstruction: buildSystemPrompt('summary', profile),
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
  const profile = getEffectiveProfile();
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
      systemInstruction: buildSystemPrompt('quiz', profile),
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
  const profile = getEffectiveProfile();
  if (settings.provider === 'server') {
    return postJson<ShortAnswerGrade>('/api/tutor/grade-short', {
      ...payload,
      tutorProfile: profile,
    });
  }

  return runDirectProviderJson<ShortAnswerGrade>(
    settings,
    {
      systemInstruction: buildSystemPrompt('gradeShort', profile),
      userPrompt: buildGradeShortPrompt(payload),
    },
    'Failed to grade short answer.'
  );
}

export function fetchStudyTips(source: StudySource): Promise<StudyTipsData> {
  const settings = getEffectiveSettings();
  const profile = getEffectiveProfile();
  if (settings.provider === 'server') {
    return postJson<StudyTipsData>('/api/tutor/tips', toSourcePayload(source));
  }

  return runDirectProviderJson<StudyTipsData>(
    settings,
    {
      systemInstruction: buildSystemPrompt('tips', profile),
      userPrompt: buildSourceTextBlock(source, buildTipsInstruction()),
      source,
    },
    'Failed to generate study tips.'
  );
}

export async function sendTutorChat(
  source: StudySource,
  history: ChatMessage[],
  message: string,
  options?: { forceDirect?: boolean }
): Promise<{ reply: string }> {
  const settings = getEffectiveSettings();
  const profile = getEffectiveProfile();
  if (settings.provider === 'server') {
    return postJson<{ reply: string }>('/api/tutor/chat', {
      ...toSourcePayload(source),
      history: history.map((m) => ({ role: m.role, text: m.text })),
      message,
      forceDirect: Boolean(options?.forceDirect),
    });
  }

  const reply = await runDirectProviderCompletion(settings, {
    systemInstruction: buildSystemPrompt('chat', profile, options),
    userPrompt: buildSourceTextBlock(source, buildChatInstruction(history, message, options)),
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
  const profile = getEffectiveProfile();
  if (settings.provider === 'server') {
    return postJson<VocabDefinitionResult>('/api/tutor/vocab-define', {
      ...payload,
      tutorProfile: profile,
    });
  }

  return runDirectProviderJson<VocabDefinitionResult>(
    settings,
    {
      systemInstruction: buildSystemPrompt('vocab', profile),
      userPrompt: buildVocabPrompt(payload),
    },
    'Failed to generate a definition for this term.'
  );
}
