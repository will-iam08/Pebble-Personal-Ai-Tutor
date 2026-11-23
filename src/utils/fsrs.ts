import { FsrsRating, StudyCard } from '../types/study';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Standard FSRS-4.5 baseline parameters (desired retention = 0.90)
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, // Initial stability for Again, Hard, Good, Easy
  7.2102, 0.5316, 1.0651, 0.0234, // Difficulty parameters
  1.616, 0.1544, 1.0824, // Recall stability increase
  1.9813, 0.0953, 0.2975, 2.2042, // Lapse stability
  0.2407, 2.9466, // Hard penalty, Easy bonus
];

const DESIRED_RETENTION = 0.9;
const FACTOR = 19 / 81;
const DECAY = -0.5;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function computeRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0 || elapsedDays <= 0) return 1;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function intervalDaysFromStability(stability: number): number {
  const raw = (stability / FACTOR) * (Math.pow(DESIRED_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

function initialDifficulty(rating: FsrsRating): number {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10);
}

function nextDifficulty(d: number, rating: FsrsRating): number {
  const meanReversion = W[7] * initialDifficulty(3) + (1 - W[7]) * d;
  const delta = -W[6] * (rating - 3);
  return clamp(meanReversion + delta, 1, 10);
}

function nextRecallStability(
  d: number,
  s: number,
  r: number,
  rating: FsrsRating
): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  const inc =
    Math.exp(W[8]) *
    (11 - d) *
    Math.pow(Math.max(0.1, s), -W[9]) *
    (Math.exp((1 - r) * W[10]) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(0.1, s * (1 + inc));
}

function nextForgetStability(d: number, s: number, r: number): number {
  return Math.max(
    0.1,
    W[11] *
      Math.pow(d, -W[12]) *
      (Math.pow(Math.max(0.1, s) + 1, W[13]) - 1) *
      Math.exp((1 - r) * W[14])
  );
}

export interface ScheduleOutcome {
  card: StudyCard;
  intervalMs: number;
}

export function scheduleCard(
  card: StudyCard,
  rating: FsrsRating,
  now: number = Date.now()
): ScheduleOutcome {
  const isNew = card.state === 'new' || card.reps === 0;
  let nextS: number;
  let nextD: number;
  let nextState = card.state;
  let intervalMs: number;
  let lapses = card.lapses;

  if (isNew) {
    nextS = W[rating - 1];
    nextD = initialDifficulty(rating);
    if (rating === 1) {
      nextState = 'learning';
      intervalMs = 10 * MS_PER_MINUTE;
    } else if (rating === 2) {
      nextState = 'learning';
      intervalMs = 12 * MS_PER_HOUR;
    } else {
      nextState = 'review';
      intervalMs = intervalDaysFromStability(nextS) * MS_PER_DAY;
    }
  } else {
    const elapsedDays = card.lastReviewedAt
      ? Math.max(0, (now - card.lastReviewedAt) / MS_PER_DAY)
      : 0;
    const r = computeRetrievability(elapsedDays, Math.max(0.1, card.stability));
    nextD = nextDifficulty(card.difficulty, rating);

    if (rating === 1) {
      lapses += 1;
      nextS = Math.min(card.stability || W[0], nextForgetStability(nextD, card.stability, r));
      nextState = 'relearning';
      intervalMs = 10 * MS_PER_MINUTE;
    } else {
      nextS = nextRecallStability(nextD, Math.max(0.1, card.stability), r, rating);
      nextState = 'review';
      const days = intervalDaysFromStability(nextS);
      intervalMs = days * MS_PER_DAY;
    }
  }

  const updated: StudyCard = {
    ...card,
    stability: Number(nextS.toFixed(3)),
    difficulty: Number(nextD.toFixed(3)),
    reps: card.reps + 1,
    lapses,
    state: nextState,
    lastReviewedAt: now,
    dueAt: now + intervalMs,
  };

  return { card: updated, intervalMs };
}

export function previewNextIntervals(
  card: StudyCard,
  now: number = Date.now()
): Record<FsrsRating, string> {
  return {
    1: formatIntervalLabel(scheduleCard(card, 1, now).intervalMs),
    2: formatIntervalLabel(scheduleCard(card, 2, now).intervalMs),
    3: formatIntervalLabel(scheduleCard(card, 3, now).intervalMs),
    4: formatIntervalLabel(scheduleCard(card, 4, now).intervalMs),
  };
}

export function formatIntervalLabel(ms: number): string {
  if (ms < MS_PER_HOUR) {
    return `${Math.max(1, Math.round(ms / MS_PER_MINUTE))}m`;
  }
  if (ms < MS_PER_DAY) {
    return `${Math.max(1, Math.round(ms / MS_PER_HOUR))}h`;
  }
  const days = Math.round(ms / MS_PER_DAY);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${(days / 30).toFixed(1).replace(/\.0$/, '')}mo`;
  return `${(days / 365).toFixed(1).replace(/\.0$/, '')}y`;
}

export function isCardDue(card: StudyCard, now: number = Date.now()): boolean {
  return card.dueAt <= now;
}

/**
 * Convert $...$ and $$...$$ LaTeX syntax to Anki's built-in MathJax delimiters \(...\) and \[...\].
 */
export function convertLatexForAnki(text: string): string {
  return text
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner: string) => `\\[${inner.trim()}\\]`)
    .replace(/\$([^$\n]+?)\$/g, (_m, inner: string) => `\\(${inner.trim()}\\)`);
}

function escapeAnkiField(text: string): string {
  const withMathJax = convertLatexForAnki(text.trim());
  return withMathJax
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\t/g, '    ')
    .replace(/\r?\n/g, '<br>');
}

/**
 * Build an Anki 2.1.54+ compatible TSV file (#separator:tab, #html:true, #tags column:3).
 */
export function buildAnkiTsv(cards: StudyCard[]): string {
  const header = [
    '#separator:tab',
    '#html:true',
    '#tags column:3',
  ];

  const rows = cards.map((card) => {
    const front = escapeAnkiField(card.front);
    const backCore = escapeAnkiField(card.back);
    const hintHtml = card.hint?.trim()
      ? `<br><br><i>Hint: ${escapeAnkiField(card.hint)}</i>`
      : '';
    const tags = Array.from(
      new Set([
        'pebble',
        ...card.tags.map((t) =>
          t
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '')
        ),
      ])
    )
      .filter(Boolean)
      .join(' ');
    return `${front}\t${backCore}${hintHtml}\t${tags}`;
  });

  return [...header, ...rows].join('\n');
}

export function downloadAnkiTsvFile(cards: StudyCard[]): void {
  if (cards.length === 0) return;
  const content = buildAnkiTsv(cards);
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pebble-anki-deck-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
