import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Download,
  Layers,
  Lightbulb,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { FsrsRating, StudyCard, StudySource, StudyTipsData } from '../types/study';
import {
  downloadAnkiTsvFile,
  formatIntervalLabel,
  isCardDue,
  previewNextIntervals,
} from '../utils/fsrs';
import { normalizeCardFront } from '../utils/deckStorage';
import { AcademicMarkdown } from './AcademicMarkdown';

interface StudyTipsTabProps {
  source: StudySource | null;
  tips: StudyTipsData | null;
  loading: boolean;
  deck: StudyCard[];
  onGenerate: () => void;
  onMasterFlashcard: (index: number) => void;
  onAddCardsToDeck: (
    cards: Array<{ front: string; back: string; hint?: string; tags?: string[]; sourceTitle?: string }>
  ) => number;
  onReviewDeckCard: (cardId: string, rating: FsrsRating) => void;
  onDeleteDeckCard: (cardId: string) => void;
}

type TipsSubView = 'tips' | 'deck';

export const StudyTipsTab: React.FC<StudyTipsTabProps> = ({
  source,
  tips,
  loading,
  deck,
  onGenerate,
  onMasterFlashcard,
  onAddCardsToDeck,
  onReviewDeckCard,
  onDeleteDeckCard,
}) => {
  const [subView, setSubView] = useState<TipsSubView>('tips');
  const [flippedMap, setFlippedMap] = useState<Record<number, boolean>>({});
  const [hintMap, setHintMap] = useState<Record<number, boolean>>({});
  const [masteredMap, setMasteredMap] = useState<Record<number, boolean>>({});
  const [tipsKey, setTipsKey] = useState('');
  const [savedDeckToast, setSavedDeckToast] = useState<string | null>(null);

  // FSRS Review Queue state
  const [reviewFlipped, setReviewFlipped] = useState(false);
  const [reviewShowHint, setReviewShowHint] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [draftFront, setDraftFront] = useState('');
  const [draftBack, setDraftBack] = useState('');
  const [draftHint, setDraftHint] = useState('');

  const sig = tips ? `${tips.difficultyLevel}:${tips.flashcards.length}:${tips.flashcards[0]?.front ?? ''}` : '';
  if (sig !== tipsKey) {
    setTipsKey(sig);
    setFlippedMap({});
    setHintMap({});
    setMasteredMap({});
  }

  const now = Date.now();
  const dueCards = useMemo(
    () =>
      deck
        .filter((c) => isCardDue(c, now))
        .sort((a, b) => a.dueAt - b.dueAt),
    [deck, now]
  );

  const deckFrontKeys = useMemo(
    () => new Set(deck.map((c) => normalizeCardFront(c.front))),
    [deck]
  );

  const currentReviewCard = dueCards[0] ?? null;
  const intervalPreview = useMemo(
    () => (currentReviewCard ? previewNextIntervals(currentReviewCard, now) : null),
    [currentReviewCard, now]
  );

  const toggleFlip = (idx: number) => {
    setFlippedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const markMastered = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (masteredMap[idx]) return;
    setMasteredMap((prev) => ({ ...prev, [idx]: true }));
    onMasterFlashcard(idx);
  };

  const handleSaveAllGenerated = () => {
    if (!tips?.flashcards?.length) return;
    const added = onAddCardsToDeck(
      tips.flashcards.map((fc) => ({
        front: fc.front,
        back: fc.back,
        hint: fc.hint,
        tags: [source?.title || 'flashcard'],
        sourceTitle: source?.title,
      }))
    );
    setSavedDeckToast(
      added > 0 ? `Added ${added} card${added === 1 ? '' : 's'} to FSRS Deck` : 'All cards already in deck'
    );
    window.setTimeout(() => setSavedDeckToast(null), 2000);
  };

  const handleCreateCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftFront.trim() || !draftBack.trim()) return;
    onAddCardsToDeck([
      {
        front: draftFront,
        back: draftBack,
        hint: draftHint || undefined,
        tags: [source?.title || 'custom'],
        sourceTitle: source?.title,
      },
    ]);
    setDraftFront('');
    setDraftBack('');
    setDraftHint('');
    setAddCardOpen(false);
  };

  const handleGradeCurrentCard = (rating: FsrsRating) => {
    if (!currentReviewCard) return;
    onReviewDeckCard(currentReviewCard.id, rating);
    setReviewFlipped(false);
    setReviewShowHint(false);
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Sub-view Switcher: AI Study Tips vs FSRS Review Deck */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="inline-flex items-center p-0.5 rounded-lg bg-[#EFF3F6] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#2B3943]"
          role="tablist"
          aria-label="Tips and Review Deck"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'tips'}
            onClick={() => setSubView('tips')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              subView === 'tips'
                ? 'bg-white dark:bg-[#24323C] text-[#182026] dark:text-[#F1F3F5] shadow-xs'
                : 'text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
            }`}
          >
            <Lightbulb className="w-3 h-3 text-[#C68A0A] dark:text-[#F3C64F]" />
            <span>Study Tips</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subView === 'deck'}
            onClick={() => setSubView('deck')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              subView === 'deck'
                ? 'bg-white dark:bg-[#24323C] text-[#182026] dark:text-[#F1F3F5] shadow-xs'
                : 'text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
            }`}
          >
            <Layers className="w-3 h-3 text-[#3D9E71] dark:text-[#52B788]" />
            <span>FSRS Deck</span>
            {dueCards.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#E86A33] text-white dark:text-[#11171C] font-mono text-[10px] leading-tight">
                {dueCards.length}
              </span>
            )}
          </button>
        </div>

        {subView === 'tips' ? (
          <button
            type="button"
            onClick={onGenerate}
            disabled={!source || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] dark:hover:bg-[#F27944] disabled:opacity-50 text-white dark:text-[#11171C] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Building...' : tips ? 'Refresh' : 'Generate Tips'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAddCardOpen((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D4DCE3] dark:border-[#30404B] bg-white dark:bg-[#182127] hover:border-[#E86A33] text-[11px] font-semibold text-[#182026] dark:text-[#F1F3F5] cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
            <button
              type="button"
              disabled={deck.length === 0}
              onClick={() => downloadAnkiTsvFile(deck)}
              title="Export all cards as an Anki-ready TSV deck with MathJax LaTeX support"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#233039] dark:bg-[#2B3B46] hover:bg-[#31424E] disabled:opacity-45 text-white text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              <Download className="w-3 h-3 text-[#65C99A]" />
              <span>Anki .txt</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= VIEW 1: AI STUDY TIPS & FLASHCARDS ================= */}
      {subView === 'tips' && (
        <>
          {!tips && !loading && (
            <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-5 text-center flex flex-col items-center gap-2">
              <Lightbulb className="w-6 h-6 text-[#C68A0A] dark:text-[#F3C64F]" />
              <p className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5]">
                Active recall toolkit
              </p>
              <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] max-w-[290px]">
                Generate difficulty-aware study methods, memory hooks, and interactive flashcards — then save them to your FSRS spaced-repetition deck or export to Anki.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-24 rounded-xl bg-white dark:bg-[#182127] border border-[#DFE5EB] dark:border-[#293741]" />
              <div className="h-28 rounded-xl bg-white dark:bg-[#182127] border border-[#DFE5EB] dark:border-[#293741]" />
            </div>
          )}

          {tips && !loading && (
            <div className="flex flex-col gap-3.5 animate-panel-enter">
              {/* Difficulty & Pacing Overview */}
              <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4">
                <div className="flex items-baseline justify-between gap-2 text-xs mb-1.5">
                  <span className="font-semibold text-[#182026] dark:text-[#F1F3F5]">
                    Difficulty: {tips.difficultyLevel}
                  </span>
                  <span className="font-mono tabular-nums text-[#5C6B77] dark:text-[#96A5B0]">
                    ~{tips.estimatedMinutes} min focus block
                  </span>
                </div>
                <AcademicMarkdown
                  content={tips.focusAdvice}
                  className="text-xs text-[#45535E] dark:text-[#B5C1C9] leading-relaxed"
                />
              </div>

              {/* Targeted Study Strategies */}
              {tips.strategies?.length > 0 && (
                <section className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4">
                  <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5] mb-2.5">
                    Recommended Strategies
                  </h4>
                  <div className="flex flex-col gap-2.5">
                    {tips.strategies.map((s, idx) => (
                      <div key={idx} className="text-xs leading-relaxed">
                        <p className="font-semibold text-[#182026] dark:text-[#F1F3F5]">{s.title}</p>
                        <AcademicMarkdown
                          content={s.description}
                          className="text-[#45535E] dark:text-[#B5C1C9] mt-0.5"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Mnemonics & Memory Hooks */}
              {tips.mnemonics?.length > 0 && (
                <section className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4">
                  <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5] mb-2.5">
                    Memory Hooks &amp; Mnemonics
                  </h4>
                  <div className="flex flex-col gap-2.5">
                    {tips.mnemonics.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#F6F8FA] dark:bg-[#131B21] border border-[#E5EAEF] dark:border-[#26343E] text-xs"
                      >
                        <span className="font-semibold text-[#182026] dark:text-[#F1F3F5]">
                          {m.concept}
                        </span>
                        <AcademicMarkdown
                          content={m.hook}
                          className="text-[#45535E] dark:text-[#B5C1C9] mt-0.5 leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Interactive Active Recall Flashcards */}
              {tips.flashcards?.length > 0 && (
                <section className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                    <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                      Active Recall Flashcards
                    </h4>
                    <div className="flex items-center gap-2">
                      {savedDeckToast ? (
                        <span className="text-[11px] font-medium text-[#2F8F63] dark:text-[#65C99A]">
                          {savedDeckToast}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSaveAllGenerated}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#E6F5EE] dark:bg-[#1D352B] hover:opacity-90 text-[11px] font-semibold text-[#1F704B] dark:text-[#74C69D] cursor-pointer"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                          <span>Save all to FSRS Deck</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {tips.flashcards.map((fc, idx) => {
                    const flipped = Boolean(flippedMap[idx]);
                    const mastered = Boolean(masteredMap[idx]);
                    const showHint = Boolean(hintMap[idx]);
                    const inDeck = deckFrontKeys.has(normalizeCardFront(fc.front));

                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleFlip(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleFlip(idx);
                          }
                        }}
                        className={`rounded-xl border p-3.5 transition-all duration-150 cursor-pointer ${
                          mastered
                            ? 'bg-[#EFF8F3] dark:bg-[#162721] border-[#3D9E71]/60'
                            : flipped
                            ? 'bg-[#F8FAFC] dark:bg-[#1D2932] border-[#E86A33]/60'
                            : 'bg-white dark:bg-[#182127] border-[#DFE5EB] dark:border-[#293741] hover:border-[#94A3B8] dark:hover:border-[#496173]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] mb-2">
                          <span className="font-mono tabular-nums">
                            Card {idx + 1} · {flipped ? 'Answer' : 'Prompt'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={inDeck}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddCardsToDeck([
                                  {
                                    front: fc.front,
                                    back: fc.back,
                                    hint: fc.hint,
                                    tags: [source?.title || 'flashcard'],
                                    sourceTitle: source?.title,
                                  },
                                ]);
                              }}
                              className={`inline-flex items-center gap-1 text-[10.5px] font-medium ${
                                inDeck
                                  ? 'text-[#2F8F63] dark:text-[#65C99A] cursor-default'
                                  : 'text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#E86A33] cursor-pointer'
                              }`}
                            >
                              {inDeck ? (
                                <>
                                  <Check className="w-3 h-3" /> In Deck
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3 h-3" /> + Deck
                                </>
                              )}
                            </button>
                            <span className="inline-flex items-center gap-1">
                              <RotateCw className="w-3 h-3" />
                              Flip
                            </span>
                          </div>
                        </div>

                        <AcademicMarkdown
                          content={flipped ? fc.back : fc.front}
                          className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5] leading-relaxed"
                        />

                        {!flipped && fc.hint && (
                          <div className="mt-2">
                            {showHint ? (
                              <AcademicMarkdown
                                content={`**Hint:** ${fc.hint}`}
                                className="text-[11px] text-[#5C6B77] dark:text-[#9AA8B2]"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHintMap((prev) => ({ ...prev, [idx]: true }));
                                }}
                                className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] underline hover:text-[#182026] dark:hover:text-[#F1F3F5] cursor-pointer"
                              >
                                Show hint
                              </button>
                            )}
                          </div>
                        )}

                        {flipped && (
                          <div className="mt-2.5 pt-2 border-t border-[#E5EAEF] dark:border-[#293741] flex items-center justify-end">
                            {mastered ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F8F63] dark:text-[#74C69D]">
                                <Check className="w-3.5 h-3.5" /> Mastered (+5 XP)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => markMastered(idx, e)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#3D9E71] hover:bg-[#328860] text-white font-semibold text-[11px] cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Got it (+5 XP)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* ================= VIEW 2: FSRS SPACED REPETITION DECK ================= */}
      {subView === 'deck' && (
        <div className="flex flex-col gap-3 animate-panel-enter">
          {/* Deck Stats Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] px-3 py-2">
              <div className="text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9]">Due Now</div>
              <div className="font-mono text-base font-bold text-[#E86A33] tabular-nums">
                {dueCards.length}
              </div>
            </div>
            <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] px-3 py-2">
              <div className="text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9]">Total Cards</div>
              <div className="font-mono text-base font-bold text-[#182026] dark:text-[#F1F3F5] tabular-nums">
                {deck.length}
              </div>
            </div>
            <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] px-3 py-2">
              <div className="text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9]">Scheduled</div>
              <div className="font-mono text-base font-bold text-[#3D9E71] dark:text-[#65C99A] tabular-nums">
                {deck.filter((c) => c.state === 'review').length}
              </div>
            </div>
          </div>

          {/* Add Custom Card Form */}
          {addCardOpen && (
            <form
              onSubmit={handleCreateCustomCard}
              className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-3.5 flex flex-col gap-2"
            >
              <input
                type="text"
                required
                value={draftFront}
                onChange={(e) => setDraftFront(e.target.value)}
                placeholder="Front (question, concept, or $LaTeX$ prompt)..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#F6F8FA] dark:bg-[#11171C] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5]"
              />
              <textarea
                rows={2}
                required
                value={draftBack}
                onChange={(e) => setDraftBack(e.target.value)}
                placeholder="Back (concise answer or derivation)..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#F6F8FA] dark:bg-[#11171C] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5] resize-none"
              />
              <input
                type="text"
                value={draftHint}
                onChange={(e) => setDraftHint(e.target.value)}
                placeholder="Optional hint..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#F6F8FA] dark:bg-[#11171C] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddCardOpen(false)}
                  className="px-2 py-1 text-xs text-[#5C6B77] dark:text-[#8E9EA9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-md bg-[#E86A33] hover:bg-[#D95C26] text-white dark:text-[#11171C] font-semibold text-xs cursor-pointer"
                >
                  Add to FSRS Deck
                </button>
              </div>
            </form>
          )}

          {/* Active FSRS Review Queue Card */}
          {currentReviewCard ? (
            <div className="rounded-xl border border-[#E86A33]/50 bg-white dark:bg-[#182127] p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
                <span className="font-mono uppercase tracking-wide text-[#E86A33] font-semibold">
                  FSRS Review · {currentReviewCard.state}
                </span>
                <span className="truncate">{currentReviewCard.sourceTitle || 'Study Deck'}</span>
              </div>

              <div className="py-1">
                <div className="text-[10.5px] uppercase tracking-wider text-[#5C6B77] dark:text-[#8E9EA9] mb-1">
                  Prompt
                </div>
                <AcademicMarkdown
                  content={currentReviewCard.front}
                  className="text-xs font-semibold text-[#182026] dark:text-[#F1F3F5] leading-relaxed"
                />
              </div>

              {!reviewFlipped && currentReviewCard.hint && (
                <div>
                  {reviewShowHint ? (
                    <AcademicMarkdown
                      content={`**Hint:** ${currentReviewCard.hint}`}
                      className="text-[11px] text-[#5C6B77] dark:text-[#9AA8B2]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReviewShowHint(true)}
                      className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] underline cursor-pointer"
                    >
                      Show hint
                    </button>
                  )}
                </div>
              )}

              {reviewFlipped ? (
                <>
                  <div className="pt-2.5 border-t border-[#ECEFF2] dark:border-[#24313A]">
                    <div className="text-[10.5px] uppercase tracking-wider text-[#2F8F63] dark:text-[#65C99A] mb-1">
                      Answer
                    </div>
                    <AcademicMarkdown
                      content={currentReviewCard.back}
                      className="text-xs text-[#2C3740] dark:text-[#DCE3E8] leading-relaxed"
                    />
                  </div>

                  {intervalPreview && (
                    <div className="grid grid-cols-4 gap-1.5 pt-2">
                      {(
                        [
                          { rating: 1 as FsrsRating, label: 'Again', tone: 'border-[#E6B3AC] dark:border-[#5C312B] text-[#B93829] dark:text-[#F59B8F] bg-[#FFF4F2] dark:bg-[#271918]' },
                          { rating: 2 as FsrsRating, label: 'Hard', tone: 'border-[#E5CFA3] dark:border-[#594726] text-[#9A6700] dark:text-[#F3C64F] bg-[#FFFBF0] dark:bg-[#252015]' },
                          { rating: 3 as FsrsRating, label: 'Good', tone: 'border-[#BBDED0] dark:border-[#2A5041] text-[#1F704B] dark:text-[#74C69D] bg-[#EEF8F2] dark:bg-[#162721]' },
                          { rating: 4 as FsrsRating, label: 'Easy', tone: 'border-[#BBD4F0] dark:border-[#2A425E] text-[#1D5CA8] dark:text-[#7CB7F9] bg-[#F0F7FF] dark:bg-[#16212E]' },
                        ] as const
                      ).map((btn) => (
                        <button
                          key={btn.rating}
                          type="button"
                          onClick={() => handleGradeCurrentCard(btn.rating)}
                          className={`flex flex-col items-center py-1.5 px-1 rounded-lg border text-center transition-opacity hover:opacity-90 cursor-pointer ${btn.tone}`}
                        >
                          <span className="text-[11px] font-bold">{btn.label}</span>
                          <span className="font-mono text-[10px] opacity-85">
                            {intervalPreview[btn.rating]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setReviewFlipped(true)}
                  className="w-full py-2 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] text-white dark:text-[#11171C] font-semibold text-xs cursor-pointer"
                >
                  Reveal Answer
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-5 text-center flex flex-col items-center gap-2">
              <Layers className="w-6 h-6 text-[#3D9E71] dark:text-[#52B788]" />
              <p className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5]">
                {deck.length === 0
                  ? 'Your FSRS Review Deck is empty'
                  : 'All caught up for now!'}
              </p>
              <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] max-w-[300px]">
                {deck.length === 0
                  ? 'Generate Study Tips flashcards or define Vocab terms and click "+ Deck" to schedule them with FSRS spaced repetition.'
                  : 'Your scheduled cards will reappear automatically right before you are likely to forget them. You can also export your deck to Anki anytime.'}
              </p>
            </div>
          )}

          {/* Deck Inventory List */}
          {deck.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] px-0.5">
                <span className="font-semibold">All Saved Cards ({deck.length})</span>
                <span>Import `.txt` via Anki → File → Import</span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                {deck.map((card) => {
                  const due = isCardDue(card, now);
                  const dueLabel = due
                    ? 'Due now'
                    : `In ${formatIntervalLabel(card.dueAt - now)}`;
                  return (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#E5EAEF] dark:border-[#26343E] bg-white dark:bg-[#182127] text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[#182026] dark:text-[#F1F3F5]">
                          {card.front}
                        </p>
                        <p className="text-[10.5px] font-mono text-[#5C6B77] dark:text-[#8E9EA9]">
                          {dueLabel} · {card.reps} rev · S={card.stability.toFixed(1)}d
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteDeckCard(card.id)}
                        className="p-1 text-[#7D8C97] hover:text-[#B93829] dark:hover:text-[#F59B8F] cursor-pointer shrink-0"
                        aria-label={`Delete card ${card.front}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
