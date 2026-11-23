import { ChatMessage, StudySource } from '../types/study';

export const SYSTEM_PROMPTS = {
  summary:
    'You are Pebble, an encouraging, rigorous university study tutor. Ground every statement strictly in the provided study material. Keep prose crisp and scannable.',
  quiz:
    'You are Pebble, a thoughtful university exam coach. Write fair, unambiguous questions grounded in the provided source material.',
  gradeShort:
    'You are Pebble, a fair and supportive study grader. Focus on conceptual accuracy rather than exact phrasing.',
  tips:
    'You are Pebble, an evidence-based learning scientist specializing in spaced repetition, mnemonics, and active recall.',
  chat:
    'You are Pebble, a calm, insightful study tutor sitting in the student’s Chrome Side Panel. Explain step by step, check intuition, and connect answers back to the loaded article, PDF, or notes. If something is outside the provided text, say so briefly before answering.',
  vocab:
    'You are Pebble, a clear, friendly university study tutor. Explain complex academic terms in plain, accurate language without losing scientific or conceptual precision.',
} as const;

export function buildSourceTextBlock(source: StudySource, instruction: string): string {
  const trimmedText = (source.text || '').trim();
  const titleLine = source.title ? `Source Title: ${source.title}\n` : '';
  const pdfLine = source.pdfName ? `Attached PDF: ${source.pdfName}\n` : '';

  if (trimmedText) {
    const clipped = trimmedText.slice(0, 36000);
    return `${titleLine}${pdfLine}Source Study Material:\n"""\n${clipped}\n"""\n\n${instruction}`;
  }

  if (source.pdfBase64) {
    return `${titleLine}${pdfLine}Read the attached PDF lecture slides/document carefully.\n\n${instruction}`;
  }

  throw new Error('Please load a page, upload a PDF, or paste study notes first.');
}

export function buildSummaryInstruction(): string {
  return [
    'Create a clear, high-signal study breakdown for a university student: concise TL;DR (2-3 sentences), 4-6 key concepts, 3-5 important formulas or formal definitions, and 3-4 potential exam traps with how to avoid each trap.',
    'Return ONLY valid JSON matching this exact shape:',
    '{"topicTitle":"string","difficulty":"Foundational|Intermediate|Advanced","tldr":"string","keyConcepts":[{"term":"string","explanation":"string"}],"formulasAndDefinitions":[{"label":"string","expression":"string","meaning":"string"}],"examTraps":[{"trap":"string","howToAvoid":"string"}]}',
  ].join('\n\n');
}

export function buildQuizInstruction(count: number, mode: 'mixed' | 'mcq' | 'short'): string {
  const safeCount = Math.min(10, Math.max(5, Number(count) || 5));
  const modeGuidance =
    mode === 'mcq'
      ? 'Make all questions multiple-choice ("mcq") with exactly 4 plausible options.'
      : mode === 'short'
      ? 'Make all questions short-answer ("short") requiring 1-3 concise sentences.'
      : 'Create a balanced mix of multiple-choice ("mcq", ~70%) and short-answer ("short", ~30%) questions.';

  return [
    `Generate exactly ${safeCount} exam-quality study questions testing genuine conceptual understanding. ${modeGuidance} For every question provide a clear step-by-step explanation. For "mcq" include 4 options and correctIndex (0-3). For "short" include sampleAnswer and 2-3 keyPoints.`,
    'Return ONLY valid JSON matching this exact shape:',
    '{"quizTitle":"string","questions":[{"id":"q1","type":"mcq|short","question":"string","options":["A","B","C","D"],"correctIndex":0,"sampleAnswer":"string","keyPoints":["string"],"explanation":"string"}]}',
  ].join('\n\n');
}

export function buildGradeShortPrompt(payload: {
  question: string;
  sampleAnswer: string;
  keyPoints?: string[];
  studentAnswer: string;
}): string {
  return [
    `Question: ${payload.question}`,
    `Reference Answer: ${payload.sampleAnswer}`,
    `Key Points: ${(payload.keyPoints || []).join('; ')}`,
    `Student Answer: ${payload.studentAnswer}`,
    'Grade the student answer fairly (isCorrect = true if scorePct >= 70). Provide encouraging, specific feedback and a concise step-by-step explanation covering anything missed.',
    'Return ONLY valid JSON matching this exact shape:',
    '{"isCorrect":true,"scorePct":85,"feedback":"string","stepByStep":"string"}',
  ].join('\n');
}

export function buildTipsInstruction(): string {
  return [
    'Analyze the complexity of this study material and generate: difficultyLevel (Foundational, Intermediate, or Advanced), estimatedMinutes to master (integer), a brief focusAdvice line, 3-4 tailored active-recall study strategies, 3-4 memorable mnemonics or memory hooks, and 6 crisp active-recall flashcards (front question/prompt, concise back answer, and optional short hint).',
    'Return ONLY valid JSON matching this exact shape:',
    '{"difficultyLevel":"Foundational|Intermediate|Advanced","estimatedMinutes":25,"focusAdvice":"string","strategies":[{"title":"string","description":"string"}],"mnemonics":[{"concept":"string","hook":"string"}],"flashcards":[{"front":"string","back":"string","hint":"string"}]}',
  ].join('\n\n');
}

export function buildChatInstruction(history: ChatMessage[], message: string): string {
  const recentHistory = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`)
    .join('\n');

  return recentHistory
    ? `Conversation so far:\n${recentHistory}\n\nStudent's new question: ${message}\n\nAnswer clearly, concisely, and directly using the loaded study material. Use short paragraphs or bullet points when helpful.`
    : `Student's question: ${message}\n\nAnswer clearly, concisely, and directly using the loaded study material. Use short paragraphs or bullet points when helpful.`;
}

export function buildVocabPrompt(payload: {
  term: string;
  contextSnippet?: string;
  sourceTitle?: string;
}): string {
  const lines: string[] = [`Term to define: "${payload.term.trim()}"`];
  if (payload.sourceTitle?.trim()) {
    lines.push(`Topic / Source: ${payload.sourceTitle.trim()}`);
  }
  if (payload.contextSnippet?.trim()) {
    lines.push(`Study Context: "${payload.contextSnippet.trim().slice(0, 1400)}"`);
  }
  lines.push(
    'Provide: (1) simpleDefinition — a clear, jargon-free 1–2 sentence explanation a student can understand immediately; (2) analogyOrExample — one concrete everyday analogy or short academic example; (3) memoryCue — a crisp 5–10 word mental hook to remember the term.'
  );
  lines.push(
    'Return ONLY valid JSON matching this exact shape:\n{"simpleDefinition":"string","analogyOrExample":"string","memoryCue":"string"}'
  );
  return lines.join('\n\n');
}

export function parseJsonSafe<T>(raw: string | undefined, fallbackMsg: string): T {
  const text = (raw ?? '').trim();
  if (!text) throw new Error(fallbackMsg);

  // Strip common markdown code fences first
  const stripped = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Fallback: extract the outermost JSON object if the model wrapped it in prose or <think> tags
    const cleanedNoThink = stripped.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const firstBrace = cleanedNoThink.indexOf('{');
    const lastBrace = cleanedNoThink.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleanedNoThink.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        // fall through
      }
    }
    throw new Error(`${fallbackMsg} (Model returned non-JSON output.)`);
  }
}
