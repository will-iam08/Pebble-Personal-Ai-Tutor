import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({ apiKey });
}

interface SourceInput {
  text?: string;
  pdfBase64?: string;
  pdfName?: string;
  title?: string;
}

function buildSourceParts(source: SourceInput, instruction: string) {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (source.pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: source.pdfBase64,
      },
    });
  }

  const trimmedText = (source.text || '').trim();
  const titleLine = source.title ? `Source Title: ${source.title}\n` : '';
  const pdfLine = source.pdfName ? `Attached PDF: ${source.pdfName}\n` : '';

  if (trimmedText) {
    // Keep up to 36,000 chars of clean lecture/article text
    const clipped = trimmedText.slice(0, 36000);
    parts.push({
      text: `${titleLine}${pdfLine}Source Study Material:\n"""\n${clipped}\n"""\n\n${instruction}`,
    });
  } else if (source.pdfBase64) {
    parts.push({
      text: `${titleLine}${pdfLine}Read the attached PDF lecture slides/document carefully.\n\n${instruction}`,
    });
  } else {
    throw new Error('Please load a page, upload a PDF, or paste study notes first.');
  }

  return parts;
}

function parseJsonSafe<T>(raw: string | undefined, fallbackMsg: string): T {
  const text = (raw ?? '').trim();
  if (!text) throw new Error(fallbackMsg);
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned) as T;
}

function getErrorStatusAndMessage(err: unknown): { status: number; message: string } {
  const message = err instanceof Error ? err.message : 'Unexpected server error calling Gemini API.';
  const lower = message.toLowerCase();
  if (lower.includes('api_key') || lower.includes('permission_denied') || lower.includes('not configured')) {
    return { status: 400, message: `${message} Check GEMINI_API_KEY in your .env file.` };
  }
  if (lower.includes('429') || lower.includes('resource_exhausted')) {
    return { status: 429, message: 'Rate limit reached on Gemini API. Please wait a moment and try again.' };
  }
  return { status: 500, message };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // 1. Structured Lecture Summary
  app.post('/api/tutor/summary', async (req, res) => {
    try {
      const source = req.body as SourceInput;
      const ai = getAiClient();
      const parts = buildSourceParts(
        source,
        'Create a clear, high-signal study breakdown for a university student: concise TL;DR (2-3 sentences), 4-6 key concepts, 3-5 important formulas or formal definitions, and 3-4 potential exam traps with how to avoid each trap.'
      );

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: { parts },
        config: {
          systemInstruction:
            'You are Pebble, an encouraging, rigorous university study tutor. Ground every statement strictly in the provided study material. Keep prose crisp and scannable.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topicTitle: { type: Type.STRING },
              difficulty: { type: Type.STRING, description: 'Foundational, Intermediate, or Advanced' },
              tldr: { type: Type.STRING },
              keyConcepts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                },
              },
              formulasAndDefinitions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    expression: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                  },
                },
              },
              examTraps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trap: { type: Type.STRING },
                    howToAvoid: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const data = parseJsonSafe(response.text, 'Failed to generate summary.');
      res.json(data);
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. Interactive Quiz Generator (5-10 MCQ or Short Answer)
  app.post('/api/tutor/quiz', async (req, res) => {
    try {
      const { count = 5, mode = 'mixed', ...source } = req.body as SourceInput & {
        count?: number;
        mode?: 'mixed' | 'mcq' | 'short';
      };
      const safeCount = Math.min(10, Math.max(5, Number(count) || 5));
      const modeGuidance =
        mode === 'mcq'
          ? 'Make all questions multiple-choice ("mcq") with exactly 4 plausible options.'
          : mode === 'short'
          ? 'Make all questions short-answer ("short") requiring 1-3 concise sentences.'
          : `Create a balanced mix of multiple-choice ("mcq", ~70%) and short-answer ("short", ~30%) questions.`;

      const ai = getAiClient();
      const parts = buildSourceParts(
        source,
        `Generate exactly ${safeCount} exam-quality study questions testing genuine conceptual understanding. ${modeGuidance} For every question provide a clear step-by-step explanation. For "mcq" include 4 options and correctIndex (0-3). For "short" include sampleAnswer and 2-3 keyPoints.`
      );

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: { parts },
        config: {
          systemInstruction:
            'You are Pebble, a thoughtful university exam coach. Write fair, unambiguous questions grounded in the provided source material.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quizTitle: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, description: 'Either "mcq" or "short"' },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    sampleAnswer: { type: Type.STRING },
                    keyPoints: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    explanation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const data = parseJsonSafe(response.text, 'Failed to generate quiz.');
      res.json(data);
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Instant Short-Answer Grader
  app.post('/api/tutor/grade-short', async (req, res) => {
    try {
      const { question, sampleAnswer, keyPoints, studentAnswer } = req.body as {
        question: string;
        sampleAnswer: string;
        keyPoints?: string[];
        studentAnswer: string;
      };
      if (!studentAnswer?.trim()) {
        res.status(400).json({ error: 'Please write an answer before submitting.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: `Question: ${question}\nReference Answer: ${sampleAnswer}\nKey Points: ${(keyPoints || []).join('; ')}\nStudent Answer: ${studentAnswer}\n\nGrade the student answer fairly (isCorrect = true if scorePct >= 70). Provide encouraging, specific feedback and a concise step-by-step explanation covering anything missed.`,
        config: {
          systemInstruction:
            'You are Pebble, a fair and supportive study grader. Focus on conceptual accuracy rather than exact phrasing.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCorrect: { type: Type.BOOLEAN },
              scorePct: { type: Type.INTEGER },
              feedback: { type: Type.STRING },
              stepByStep: { type: Type.STRING },
            },
          },
        },
      });

      const data = parseJsonSafe(response.text, 'Failed to grade answer.');
      res.json(data);
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. Study Tips, Mnemonics & Active Recall Flashcards
  app.post('/api/tutor/tips', async (req, res) => {
    try {
      const source = req.body as SourceInput;
      const ai = getAiClient();
      const parts = buildSourceParts(
        source,
        'Analyze the complexity of this study material and generate: difficultyLevel (Foundational, Intermediate, or Advanced), estimatedMinutes to master, a brief focusAdvice line, 3-4 tailored active-recall study strategies, 3-4 memorable mnemonics or memory hooks, and 6 crisp active-recall flashcards (front question/prompt, concise back answer, and optional short hint).'
      );

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: { parts },
        config: {
          systemInstruction:
            'You are Pebble, an evidence-based learning scientist specializing in spaced repetition, mnemonics, and active recall.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              difficultyLevel: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              focusAdvice: { type: Type.STRING },
              strategies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                },
              },
              mnemonics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    concept: { type: Type.STRING },
                    hook: { type: Type.STRING },
                  },
                },
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const data = parseJsonSafe(response.text, 'Failed to generate study tips.');
      res.json(data);
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 5. Grounded Tutor Chat
  app.post('/api/tutor/chat', async (req, res) => {
    try {
      const { history = [], message, ...source } = req.body as SourceInput & {
        history?: Array<{ role: 'user' | 'model'; text: string }>;
        message: string;
      };

      if (!message?.trim()) {
        res.status(400).json({ error: 'Please type a question first.' });
        return;
      }

      const ai = getAiClient();
      const recentHistory = history
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`)
        .join('\n');

      const prompt = recentHistory
        ? `Conversation so far:\n${recentHistory}\n\nStudent's new question: ${message}\n\nAnswer clearly, concisely, and directly using the loaded study material. Use short paragraphs or bullet points when helpful.`
        : `Student's question: ${message}\n\nAnswer clearly, concisely, and directly using the loaded study material. Use short paragraphs or bullet points when helpful.`;

      const parts = buildSourceParts(source, prompt);

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: { parts },
        config: {
          systemInstruction:
            'You are Pebble, a calm, insightful study tutor sitting in the student’s Chrome Side Panel. Explain step by step, check intuition, and connect answers back to the loaded article, PDF, or notes. If something is outside the provided text, say so briefly before answering.',
        },
      });

      res.json({ reply: (response.text ?? '').trim() || 'I could not generate a reply for that question.' });
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 5b. Simple Vocabulary Definition Generator (Gemini API)
  app.post('/api/tutor/vocab-define', async (req, res) => {
    try {
      const { term, contextSnippet, sourceTitle } = req.body as {
        term?: string;
        contextSnippet?: string;
        sourceTitle?: string;
      };

      const cleanedTerm = (term || '').trim();
      if (!cleanedTerm) {
        res.status(400).json({ error: 'Please provide a vocabulary term to define.' });
        return;
      }

      const ai = getAiClient();
      const contextLines: string[] = [];
      if (sourceTitle?.trim()) {
        contextLines.push(`Topic / Source: ${sourceTitle.trim()}`);
      }
      if (contextSnippet?.trim()) {
        contextLines.push(`Study Context: "${contextSnippet.trim().slice(0, 1400)}"`);
      }

      const prompt = [
        `Term to define: "${cleanedTerm}"`,
        ...contextLines,
        'Provide: (1) simpleDefinition — a clear, jargon-free 1–2 sentence explanation a student can understand immediately; (2) analogyOrExample — one concrete everyday analogy or short academic example; (3) memoryCue — a crisp 5–10 word mental hook to remember the term.',
      ].join('\n\n');

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are Pebble, a clear, friendly university study tutor. Explain complex academic terms in plain, accurate language without losing scientific or conceptual precision.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              simpleDefinition: { type: Type.STRING },
              analogyOrExample: { type: Type.STRING },
              memoryCue: { type: Type.STRING },
            },
          },
        },
      });

      const data = parseJsonSafe<{
        simpleDefinition: string;
        analogyOrExample: string;
        memoryCue: string;
      }>(response.text, 'Failed to generate a definition for this term.');

      res.json(data);
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // Mount Vite in dev, or serve dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Pebble Study Tutor running on http://0.0.0.0:${port}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
