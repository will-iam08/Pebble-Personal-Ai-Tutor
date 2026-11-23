import { VocabEntry, VocabOrigin } from '../types/study';

const VOCAB_KEY = 'pebble_vocab_glossary_v1';

export function loadVocabEntries(): VocabEntry[] {
  try {
    const raw = localStorage.getItem(VOCAB_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VocabEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string' && typeof item.term === 'string');
  } catch {
    return [];
  }
}

export function saveVocabEntries(entries: VocabEntry[]): void {
  try {
    localStorage.setItem(VOCAB_KEY, JSON.stringify(entries.slice(0, 150)));
  } catch {
    // Ignore storage quota errors
  }
}

export function normalizeTermKey(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function createVocabEntry(params: {
  term: string;
  origin: VocabOrigin;
  sourceTitle?: string;
  contextSnippet?: string;
}): VocabEntry {
  return {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    term: params.term.trim(),
    origin: params.origin,
    sourceTitle: params.sourceTitle?.trim() || undefined,
    contextSnippet: params.contextSnippet?.trim().slice(0, 1200) || undefined,
    savedAt: Date.now(),
    mastered: false,
  };
}
