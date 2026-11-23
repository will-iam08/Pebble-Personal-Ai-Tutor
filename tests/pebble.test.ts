import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAnkiTsv,
  convertLatexForAnki,
  formatIntervalLabel,
  isCardDue,
  previewNextIntervals,
  scheduleCard,
} from '../src/utils/fsrs.ts';
import { createStudyCard, mergeCardsIntoDeck } from '../src/utils/deckStorage.ts';
import { parseJsonSafe } from '../src/utils/tutorPrompts.ts';

test('FSRS schedules new cards with ascending intervals across Again/Hard/Good/Easy', () => {
  const now = 1_700_000_000_000;
  const card = createStudyCard({
    front: 'What is Bayes Theorem?',
    back: '$P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$',
    tags: ['probability'],
  });

  const again = scheduleCard(card, 1, now);
  const hard = scheduleCard(card, 2, now);
  const good = scheduleCard(card, 3, now);
  const easy = scheduleCard(card, 4, now);

  assert.ok(again.intervalMs < hard.intervalMs);
  assert.ok(hard.intervalMs < good.intervalMs);
  assert.ok(good.intervalMs < easy.intervalMs);
  assert.equal(again.card.state, 'learning');
  assert.equal(good.card.state, 'review');
  assert.equal(isCardDue(good.card, now), false);
  assert.equal(isCardDue(good.card, good.card.dueAt), true);
});

test('FSRS increases stability on repeated Good reviews and lapses on Again', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const t0 = 1_700_000_000_000;
  const card = createStudyCard({ front: 'Eigenvalue definition', back: '$Av = \\lambda v$' });

  const first = scheduleCard(card, 3, t0);
  const second = scheduleCard(first.card, 3, first.card.dueAt);

  assert.ok(second.card.stability > first.card.stability);
  assert.ok(second.intervalMs > first.intervalMs);

  const lapsed = scheduleCard(second.card, 1, second.card.dueAt + dayMs);
  assert.equal(lapsed.card.state, 'relearning');
  assert.equal(lapsed.card.lapses, 1);
  assert.equal(formatIntervalLabel(lapsed.intervalMs), '10m');

  const previews = previewNextIntervals(second.card, second.card.dueAt);
  assert.equal(previews[1], '10m');
  assert.ok(previews[3].endsWith('d') || previews[3].endsWith('mo'));
});

test('Anki TSV export converts LaTeX to MathJax delimiters and includes directives', () => {
  const card = createStudyCard({
    front: 'State $E = mc^2$',
    back: 'Mass-energy equivalence:\n$$E = mc^2$$',
    hint: 'Einstein 1905',
    tags: ['Physics 101'],
  });

  assert.equal(convertLatexForAnki('Inline $x^2$ and $$a+b$$'), 'Inline \\(x^2\\) and \\[a+b\\]');

  const tsv = buildAnkiTsv([card]);
  const lines = tsv.split('\n');
  assert.equal(lines[0], '#separator:tab');
  assert.equal(lines[1], '#html:true');
  assert.equal(lines[2], '#tags column:3');
  assert.match(lines[3], /State \\\(E = mc\^2\\\)\t/);
  assert.match(lines[3], /\\\[E = mc\^2\\\]/);
  assert.match(lines[3], /pebble physics_101$/);
});

test('mergeCardsIntoDeck deduplicates case-insensitively', () => {
  const first = createStudyCard({ front: 'Entropy', back: 'Measure of disorder' });
  const { nextDeck, addedCount } = mergeCardsIntoDeck([first], [
    { front: '  entropy ', back: 'Duplicate' },
    { front: 'Enthalpy', back: 'Total heat content' },
  ]);

  assert.equal(addedCount, 1);
  assert.equal(nextDeck.length, 2);
});

test('parseJsonSafe strips markdown fences and DeepSeek <think> blocks', () => {
  const fenced = '```json\n{"ok":true,"score":95}\n```';
  assert.deepEqual(parseJsonSafe<{ ok: boolean; score: number }>(fenced, 'err'), {
    ok: true,
    score: 95,
  });

  const thoughtWrapped = '<think>reasoning here...</think>\nHere is the JSON:\n{"term":"Gradient"}';
  assert.deepEqual(parseJsonSafe<{ term: string }>(thoughtWrapped, 'err'), {
    term: 'Gradient',
  });

  assert.throws(() => parseJsonSafe('not json at all', 'Fallback error'), /Fallback error/);
});
