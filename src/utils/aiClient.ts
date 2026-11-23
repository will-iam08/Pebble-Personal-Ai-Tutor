import {
  AIProviderSettings,
  getActiveModelName,
  getProviderMeta,
} from '../types/ai';
import { StudySource } from '../types/study';
import { parseJsonSafe } from './tutorPrompts';

export interface ModelCompletionRequest {
  systemInstruction: string;
  userPrompt: string;
  source?: StudySource;
  expectJson?: boolean;
}

function getRequiredApiKey(settings: AIProviderSettings): string {
  const key = (settings.apiKeys[settings.provider] || '').trim();
  const meta = getProviderMeta(settings.provider);
  if (meta.requiresApiKey && !key) {
    throw new Error(
      `Add your ${meta.name} API key in Settings (gear icon) before generating study outputs.`
    );
  }
  return key;
}

function ensurePdfSupportedOrTextPresent(
  settings: AIProviderSettings,
  source?: StudySource
): void {
  if (!source?.pdfBase64 || (source.text && source.text.trim().length > 0)) {
    return;
  }
  const meta = getProviderMeta(settings.provider);
  if (!meta.supportsPdfNative) {
    throw new Error(
      `${meta.name} does not support direct browser PDF uploads yet. Switch to Google Gemini (free tier) or Anthropic Claude in Settings for native PDF reading, or paste the text notes instead.`
    );
  }
}

async function callGemini(
  settings: AIProviderSettings,
  req: ModelCompletionRequest
): Promise<string> {
  const apiKey = getRequiredApiKey(settings);
  const model = getActiveModelName(settings);
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [];

  if (req.source?.pdfBase64) {
    parts.push({
      inline_data: {
        mime_type: 'application/pdf',
        data: req.source.pdfBase64,
      },
    });
  }
  if (req.source?.imageBase64) {
    parts.push({
      inline_data: {
        mime_type: req.source.imageMimeType || 'image/png',
        data: req.source.imageBase64,
      },
    });
  }
  parts.push({ text: req.userPrompt });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: req.systemInstruction }] },
      contents: [{ role: 'user', parts }],
      generationConfig: req.expectJson
        ? { responseMimeType: 'application/json' }
        : undefined,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini API error (${res.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text.trim()) {
    throw new Error('Gemini returned an empty response. Try again.');
  }
  return text;
}

async function callOpenAICompatible(
  endpoint: string,
  headers: Record<string, string>,
  model: string,
  req: ModelCompletionRequest,
  providerLabel: string,
  allowJsonMode: boolean
): Promise<string> {
  const userContent: unknown = req.source?.imageBase64
    ? [
        {
          type: 'image_url',
          image_url: {
            url:
              req.source.imageDataUrl ||
              `data:${req.source.imageMimeType || 'image/png'};base64,${req.source.imageBase64}`,
          },
        },
        { type: 'text', text: req.userPrompt },
      ]
    : req.userPrompt;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: req.systemInstruction },
      { role: 'user', content: userContent },
    ],
  };

  if (req.expectJson && allowJsonMode) {
    body.response_format = { type: 'json_object' };
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (providerLabel === 'Ollama / LM Studio') {
      throw new Error(
        `Could not reach local server at ${endpoint}. Make sure Ollama or LM Studio is running (and for Ollama in Chrome, set OLLAMA_ORIGINS="*").`
      );
    }
    throw err;
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string } | string;
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    const errMsg =
      typeof data.error === 'string' ? data.error : data.error?.message;
    throw new Error(errMsg || `${providerLabel} request failed (${res.status})`);
  }

  const text = data.choices?.[0]?.message?.content || '';
  if (!text.trim()) {
    throw new Error(`${providerLabel} returned an empty response.`);
  }
  return text;
}

async function callAnthropic(
  settings: AIProviderSettings,
  req: ModelCompletionRequest
): Promise<string> {
  const apiKey = getRequiredApiKey(settings);
  const model = getActiveModelName(settings);

  const contentBlocks: Array<
    | { type: 'text'; text: string }
    | {
        type: 'document';
        source: { type: 'base64'; media_type: 'application/pdf'; data: string };
      }
    | {
        type: 'image';
        source: { type: 'base64'; media_type: string; data: string };
      }
  > = [];

  if (req.source?.pdfBase64) {
    contentBlocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: req.source.pdfBase64,
      },
    });
  }
  if (req.source?.imageBase64) {
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: req.source.imageMimeType || 'image/png',
        data: req.source.imageBase64,
      },
    });
  }
  contentBlocks.push({ type: 'text', text: req.userPrompt });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: req.systemInstruction,
      messages: [{ role: 'user', content: contentBlocks }],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    content?: Array<{ type: string; text?: string }>;
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Anthropic API error (${res.status})`);
  }

  const text = (data.content || [])
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('\n');

  if (!text.trim()) {
    throw new Error('Anthropic returned an empty response.');
  }
  return text;
}

export async function runDirectProviderCompletion(
  settings: AIProviderSettings,
  req: ModelCompletionRequest
): Promise<string> {
  ensurePdfSupportedOrTextPresent(settings, req.source);

  switch (settings.provider) {
    case 'gemini':
      return callGemini(settings, req);

    case 'openrouter': {
      const apiKey = getRequiredApiKey(settings);
      const model = getActiveModelName(settings);
      return callOpenAICompatible(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/will-iam08/Pebble-Personal-Ai-Tutor',
          'X-Title': 'Pebble AI Study Tutor',
        },
        model,
        req,
        'OpenRouter',
        false // Some free models on OpenRouter reject strict response_format
      );
    }

    case 'openai': {
      const apiKey = getRequiredApiKey(settings);
      const model = getActiveModelName(settings);
      return callOpenAICompatible(
        'https://api.openai.com/v1/chat/completions',
        { Authorization: `Bearer ${apiKey}` },
        model,
        req,
        'OpenAI',
        true
      );
    }

    case 'anthropic':
      return callAnthropic(settings, req);

    case 'ollama': {
      const base = (settings.ollamaBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
      const model = getActiveModelName(settings);
      const optionalKey = (settings.apiKeys.ollama || '').trim();
      const headers: Record<string, string> = optionalKey
        ? { Authorization: `Bearer ${optionalKey}` }
        : {};
      return callOpenAICompatible(
        `${base}/chat/completions`,
        headers,
        model,
        req,
        'Ollama / LM Studio',
        false
      );
    }

    default:
      throw new Error(`Unsupported direct provider: ${settings.provider}`);
  }
}

export async function runDirectProviderJson<T>(
  settings: AIProviderSettings,
  req: ModelCompletionRequest,
  fallbackError: string
): Promise<T> {
  const raw = await runDirectProviderCompletion(settings, {
    ...req,
    expectJson: true,
  });
  return parseJsonSafe<T>(raw, fallbackError);
}

export async function fetchLocalOllamaModels(baseUrl: string): Promise<string[]> {
  const base = (baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
  const res = await fetch(`${base}/models`);
  if (!res.ok) {
    throw new Error(`Could not list models from ${base}/models (${res.status})`);
  }
  const data = (await res.json()) as { data?: Array<{ id?: string }> };
  return (data.data || [])
    .map((m) => m.id || '')
    .filter(Boolean)
    .sort();
}

export async function testProviderConnection(
  settings: AIProviderSettings
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  try {
    if (settings.provider === 'server') {
      const res = await fetch('/api/tutor/vocab-define', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: 'Active Recall' }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { ok: false, message: data.error || `Local server returned ${res.status}` };
      }
      return { ok: true, message: 'Connected to local Express server (.env).' };
    }

    const reply = await runDirectProviderCompletion(settings, {
      systemInstruction: 'Reply concisely with the single word: ready',
      userPrompt: 'Connection test. Reply with one word.',
      expectJson: false,
    });
    const meta = getProviderMeta(settings.provider);
    const model = getActiveModelName(settings);
    return {
      ok: true,
      message: `Connected to ${meta.shortName} (${model}) — replied "${reply.trim().slice(0, 24)}".`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Connection test failed.',
    };
  }
}
