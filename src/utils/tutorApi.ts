import {
  ChatMessage,
  LectureSummaryData,
  QuizData,
  ShortAnswerGrade,
  StudySource,
  StudyTipsData,
  VocabDefinitionResult,
} from '../types/study';

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
  return postJson<LectureSummaryData>('/api/tutor/summary', toSourcePayload(source));
}

export function fetchInteractiveQuiz(
  source: StudySource,
  count: number,
  mode: 'mixed' | 'mcq' | 'short'
): Promise<QuizData> {
  return postJson<QuizData>('/api/tutor/quiz', {
    ...toSourcePayload(source),
    count,
    mode,
  });
}

export function gradeShortAnswer(payload: {
  question: string;
  sampleAnswer: string;
  keyPoints?: string[];
  studentAnswer: string;
}): Promise<ShortAnswerGrade> {
  return postJson<ShortAnswerGrade>('/api/tutor/grade-short', payload);
}

export function fetchStudyTips(source: StudySource): Promise<StudyTipsData> {
  return postJson<StudyTipsData>('/api/tutor/tips', toSourcePayload(source));
}

export function sendTutorChat(
  source: StudySource,
  history: ChatMessage[],
  message: string
): Promise<{ reply: string }> {
  return postJson<{ reply: string }>('/api/tutor/chat', {
    ...toSourcePayload(source),
    history: history.map((m) => ({ role: m.role, text: m.text })),
    message,
  });
}

export function fetchVocabDefinition(payload: {
  term: string;
  contextSnippet?: string;
  sourceTitle?: string;
}): Promise<VocabDefinitionResult> {
  return postJson<VocabDefinitionResult>('/api/tutor/vocab-define', payload);
}

export async function fetchExtensionBundle(): Promise<Array<{ name: string; content: string }>> {
  const res = await fetch('/api/extension/files');
  const data = (await res.json()) as { files?: Array<{ name: string; content: string }>; error?: string };
  if (!res.ok || !data.files) {
    throw new Error(data.error || 'Could not load extension files.');
  }
  return data.files;
}
