import React, { useState } from 'react';
import { Check, Lightbulb, RefreshCw, RotateCw } from 'lucide-react';
import { StudySource, StudyTipsData } from '../types/study';

interface StudyTipsTabProps {
  source: StudySource | null;
  tips: StudyTipsData | null;
  loading: boolean;
  onGenerate: () => void;
  onMasterFlashcard: (index: number) => void;
}

export const StudyTipsTab: React.FC<StudyTipsTabProps> = ({
  source,
  tips,
  loading,
  onGenerate,
  onMasterFlashcard,
}) => {
  const [flippedMap, setFlippedMap] = useState<Record<number, boolean>>({});
  const [hintMap, setHintMap] = useState<Record<number, boolean>>({});
  const [masteredMap, setMasteredMap] = useState<Record<number, boolean>>({});
  const [tipsKey, setTipsKey] = useState('');

  const sig = tips ? `${tips.difficultyLevel}:${tips.flashcards.length}:${tips.flashcards[0]?.front ?? ''}` : '';
  if (sig !== tipsKey) {
    setTipsKey(sig);
    setFlippedMap({});
    setHintMap({});
    setMasteredMap({});
  }

  const toggleFlip = (idx: number) => {
    setFlippedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const markMastered = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (masteredMap[idx]) return;
    setMasteredMap((prev) => ({ ...prev, [idx]: true }));
    onMasterFlashcard(idx);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-[#182026] dark:text-[#F1F3F5]">
            Study Tips &amp; Active Recall
          </h3>
          <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
            Tailored strategies, mnemonics, and flip flashcards
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!source || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] dark:hover:bg-[#F27944] disabled:opacity-50 text-white dark:text-[#11171C] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Building...' : tips ? 'Refresh' : 'Generate Tips'}</span>
        </button>
      </div>

      {!tips && !loading && (
        <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-5 text-center flex flex-col items-center gap-2">
          <Lightbulb className="w-6 h-6 text-[#C68A0A] dark:text-[#F3C64F]" />
          <p className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5]">
            Active recall toolkit
          </p>
          <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] max-w-[290px]">
            Generate difficulty-aware study methods, memory hooks, and interactive flashcards that reward XP as you master them.
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
            <p className="text-xs text-[#45535E] dark:text-[#B5C1C9] leading-relaxed">
              {tips.focusAdvice}
            </p>
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
                    <p className="text-[#45535E] dark:text-[#B5C1C9] mt-0.5">{s.description}</p>
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
                    <p className="text-[#45535E] dark:text-[#B5C1C9] mt-0.5 leading-relaxed">
                      {m.hook}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Interactive Active Recall Flashcards */}
          {tips.flashcards?.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between px-0.5">
                <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                  Active Recall Flashcards
                </h4>
                <span className="font-mono tabular-nums text-[11px] text-[#5C6B77] dark:text-[#96A5B0]">
                  {Object.values(masteredMap).filter(Boolean).length}/{tips.flashcards.length} mastered
                </span>
              </div>

              {tips.flashcards.map((fc, idx) => {
                const flipped = Boolean(flippedMap[idx]);
                const mastered = Boolean(masteredMap[idx]);
                const showHint = Boolean(hintMap[idx]);

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
                      <span className="inline-flex items-center gap-1">
                        <RotateCw className="w-3 h-3" />
                        Click to flip
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5] leading-relaxed">
                      {flipped ? fc.back : fc.front}
                    </p>

                    {!flipped && fc.hint && (
                      <div className="mt-2">
                        {showHint ? (
                          <p className="text-[11px] text-[#5C6B77] dark:text-[#9AA8B2]">
                            Hint: {fc.hint}
                          </p>
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
    </div>
  );
};
