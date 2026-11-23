import { StudyCard } from '../types/study';

const DECK_KEY = 'pebble_fsrs_deck_v1';

export function normalizeCardFront(front: string): string {
  return front.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function createStudyCard(input: {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  sourceTitle?: string;
}): StudyCard {
  const now = Date.now();
  return {
    id: `card-${now}-${Math.random().toString(36).slice(2, 8)}`,
    front: input.front.trim(),
    back: input.back.trim(),
    hint: input.hint?.trim() || undefined,
    tags: input.tags && input.tags.length > 0 ? input.tags : ['study'],
    sourceTitle: input.sourceTitle?.trim() || undefined,
    createdAt: now,
    dueAt: now,
    lastReviewedAt: null,
    stability: 0,
    difficulty: 5,
    reps: 0,
    lapses: 0,
    state: 'new',
  };
}

export function loadStudyDeck(): StudyCard[] {
  try {
    const raw = localStorage.getItem(DECK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StudyCard =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as StudyCard).id === 'string' &&
        typeof (item as StudyCard).front === 'string' &&
        typeof (item as StudyCard).back === 'string'
    );
  } catch {
    return [];
  }
}

export function saveStudyDeck(cards: StudyCard[]): void {
  try {
    localStorage.setItem(DECK_KEY, JSON.stringify(cards));
  } catch {
    // Ignore storage quota errors
  }
}

export function mergeCardsIntoDeck(
  existing: StudyCard[],
  incoming: Array<{
    front: string;
    back: string;
    hint?: string;
    tags?: string[];
    sourceTitle?: string;
  }>
): { nextDeck: StudyCard[]; addedCount: number } {
  const seen = new Set(existing.map((c) => normalizeCardFront(c.front)));
  const added: StudyCard[] = [];

  for (const item of incoming) {
    const key = normalizeCardFront(item.front);
    if (!key || seen.has(key) || !item.back.trim()) continue;
    seen.add(key);
    added.push(createStudyCard(item));
  }

  return {
    nextDeck: [...added, ...existing],
    addedCount: added.length,
  };
}
