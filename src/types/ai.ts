export type AIProviderId =
  | 'gemini'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'server';

export interface ProviderModelPreset {
  id: string;
  label: string;
  badge?: string;
}

export interface ProviderMetadata {
  id: AIProviderId;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  requiresApiKey: boolean;
  supportsPdfNative: boolean;
  defaultModel: string;
  defaultBaseUrl?: string;
  keyPlaceholder?: string;
  keyUrl?: string;
  keyUrlLabel?: string;
  presets: ProviderModelPreset[];
}

export interface AIProviderSettings {
  provider: AIProviderId;
  models: Record<AIProviderId, string>;
  apiKeys: Partial<Record<AIProviderId, string>>;
  ollamaBaseUrl: string;
}

export const PROVIDER_CATALOG: ProviderMetadata[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    badge: 'Free tier',
    description: 'Fast, reliable academic tutoring with native PDF reading and a generous free tier.',
    requiresApiKey: true,
    supportsPdfNative: true,
    defaultModel: 'gemini-2.5-flash',
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyUrlLabel: 'Get free Gemini key',
    presets: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', badge: 'Free tier · Default' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', badge: 'Deep reasoning' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', badge: 'Fast' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    shortName: 'OpenRouter',
    badge: 'Free + Paid',
    description: 'One key for 300+ models including free community models, Claude, GPT, and DeepSeek.',
    requiresApiKey: true,
    supportsPdfNative: false,
    defaultModel: 'openrouter/free',
    keyPlaceholder: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlLabel: 'Get OpenRouter key',
    presets: [
      { id: 'openrouter/free', label: 'OpenRouter Free Router', badge: 'Free' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct', badge: 'Free' },
      { id: 'deepseek/deepseek-r1-0528:free', label: 'DeepSeek R1', badge: 'Free · Reasoning' },
      { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', badge: 'Free' },
      { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', badge: 'Paid' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', badge: 'Paid' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama / LM Studio',
    shortName: 'Local',
    badge: '100% Free & Local',
    description: 'Run private local models on your own machine with zero API costs or external traffic.',
    requiresApiKey: false,
    supportsPdfNative: false,
    defaultModel: 'llama3.2',
    defaultBaseUrl: 'http://localhost:11434/v1',
    keyPlaceholder: 'Optional token (leave blank for local Ollama)',
    keyUrl: 'https://ollama.com/download',
    keyUrlLabel: 'Install Ollama',
    presets: [
      { id: 'llama3.2', label: 'Llama 3.2 (Ollama)', badge: 'Local' },
      { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B', badge: 'Local · STEM' },
      { id: 'gemma3:4b', label: 'Gemma 3 4B', badge: 'Local · Light' },
      { id: 'mistral', label: 'Mistral 7B', badge: 'Local' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OpenAI',
    badge: 'BYOK',
    description: 'Use your OpenAI API key with GPT-4o or reasoning models.',
    requiresApiKey: true,
    supportsPdfNative: false,
    defaultModel: 'gpt-4o-mini',
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'OpenAI API keys',
    presets: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', badge: 'Fast & affordable' },
      { id: 'gpt-4o', label: 'GPT-4o', badge: 'Flagship' },
      { id: 'o4-mini', label: 'o4-mini', badge: 'Reasoning' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    shortName: 'Claude',
    badge: 'BYOK · PDF',
    description: 'Use your Anthropic API key directly from the browser with native PDF support.',
    requiresApiKey: true,
    supportsPdfNative: true,
    defaultModel: 'claude-sonnet-4-20250514',
    keyPlaceholder: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyUrlLabel: 'Anthropic API keys',
    presets: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', badge: 'Academic writing' },
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', badge: 'Fast' },
    ],
  },
  {
    id: 'server',
    name: 'Local Server (.env)',
    shortName: 'Server',
    badge: 'Web Dev',
    description: 'Use the local Express backend (server.ts) with GEMINI_API_KEY from your .env file.',
    requiresApiKey: false,
    supportsPdfNative: true,
    defaultModel: 'server-env',
    presets: [{ id: 'server-env', label: 'Configured by server .env' }],
  },
];

export function getProviderMeta(id: AIProviderId): ProviderMetadata {
  return PROVIDER_CATALOG.find((p) => p.id === id) || PROVIDER_CATALOG[0];
}

export function createDefaultAISettings(isExtension: boolean): AIProviderSettings {
  return {
    provider: isExtension ? 'gemini' : 'server',
    models: {
      gemini: 'gemini-2.5-flash',
      openrouter: 'openrouter/free',
      openai: 'gpt-4o-mini',
      anthropic: 'claude-sonnet-4-20250514',
      ollama: 'llama3.2',
      server: 'server-env',
    },
    apiKeys: {},
    ollamaBaseUrl: 'http://localhost:11434/v1',
  };
}

export function getActiveModelName(settings: AIProviderSettings): string {
  const meta = getProviderMeta(settings.provider);
  const configured = (settings.models[settings.provider] || '').trim();
  return configured || meta.defaultModel;
}

export function isProviderReady(settings: AIProviderSettings): boolean {
  const meta = getProviderMeta(settings.provider);
  if (!meta.requiresApiKey) return true;
  return Boolean((settings.apiKeys[settings.provider] || '').trim());
}
