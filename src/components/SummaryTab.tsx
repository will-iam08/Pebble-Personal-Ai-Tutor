import React, { useState } from 'react';
import { AlertTriangle, BookmarkPlus, BookOpen, Check, Download, RefreshCw } from 'lucide-react';
import { LectureSummaryData, StudySource } from '../types/study';
import { ExportFormat } from '../utils/exportStudy';
import { normalizeTermKey } from '../utils/vocab';

interface SummaryTabProps {
  source: StudySource | null;
  summary: LectureSummaryData | null;
  loading: boolean;
  hasChatHistory?: boolean;
  savedTermKeys?: Set<string>;
  onGenerate: () => void;
  onExportSummary: (format: ExportFormat) => void;
  onExportStudyPack?: (format: ExportFormat) => void;
  onSaveVocabTerm?: (term: string, contextSnippet?: string) => void;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  source,
  summary,
  loading,
  hasChatHistory = false,
  savedTermKeys,
  onGenerate,
  onExportSummary,
  onExportStudyPack,
  onSaveVocabTerm,
}) => {
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  const triggerExport = (label: string, action: () => void) => {
    action();
    setSavedLabel(label);
    window.setTimeout(() => setSavedLabel(null), 1600);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-[#182026] dark:text-[#F1F3F5]">
            Lecture Summary
          </h3>
          <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
            TL;DR, key concepts, formulas, and exam traps · +15 XP &amp; +2 treats
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!source || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] dark:hover:bg-[#F27944] disabled:opacity-50 text-white dark:text-[#11171C] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Reading...' : summary ? 'Regenerate' : 'Summarize'}</span>
        </button>
      </div>

      {!summary && !loading && (
        <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-5 text-center flex flex-col items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#3D9E71] dark:text-[#52B788]" />
          <p className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5]">
            {source ? `Ready to summarize "${source.title}"` : 'Load a page, PDF, or notes above'}
          </p>
          <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] max-w-[290px]">
            Generate a structured study breakdown to clarify core ideas and spot tricky exam pitfalls.
          </p>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4 flex flex-col gap-3 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-[#E5EAEF] dark:bg-[#24313A]" />
          <div className="h-3 w-full rounded bg-[#EDF1F5] dark:bg-[#1E2A33]" />
          <div className="h-3 w-5/6 rounded bg-[#EDF1F5] dark:bg-[#1E2A33]" />
          <div className="h-16 w-full rounded bg-[#EDF1F5] dark:bg-[#1E2A33]" />
        </div>
      )}

      {summary && !loading && (
        <div className="flex flex-col gap-3.5 animate-panel-enter">
          {/* Local Export Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127]">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#5C6B77] dark:text-[#96A5B0] truncate">
              {savedLabel ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#3D9E71] dark:text-[#52B788] shrink-0" />
                  <span className="text-[#2F8F63] dark:text-[#52B788]">{savedLabel}</span>
                </>
              ) : (
                <span>Export summary</span>
              )}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => triggerExport('Saved .md', () => onExportSummary('md'))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D4DCE3] dark:border-[#30404B] bg-[#F6F8FA] dark:bg-[#131B21] hover:border-[#E86A33] text-[11px] font-semibold text-[#182026] dark:text-[#E8EDF1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Download lecture summary as Markdown (.md)"
              >
                <Download className="w-3 h-3 text-[#3D9E71] dark:text-[#52B788]" />
                <span>.md</span>
              </button>

              <button
                type="button"
                onClick={() => triggerExport('Saved .txt', () => onExportSummary('txt'))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D4DCE3] dark:border-[#30404B] bg-[#F6F8FA] dark:bg-[#131B21] hover:border-[#E86A33] text-[11px] font-semibold text-[#182026] dark:text-[#E8EDF1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Download lecture summary as plain text (.txt)"
              >
                <Download className="w-3 h-3 text-[#5C6B77] dark:text-[#96A5B0]" />
                <span>.txt</span>
              </button>

              {hasChatHistory && onExportStudyPack && (
                <button
                  type="button"
                  onClick={() => triggerExport('Saved full notes', () => onExportStudyPack('md'))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D4DCE3] dark:border-[#30404B] bg-[#F6F8FA] dark:bg-[#131B21] hover:border-[#E86A33] text-[11px] font-semibold text-[#182026] dark:text-[#E8EDF1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="Download summary and chat history together as Markdown (.md)"
                >
                  <span>All .md</span>
                </button>
              )}
            </div>
          </div>

          {/* TL;DR */}
          <article className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h4 className="font-display text-sm font-bold text-[#182026] dark:text-[#F1F3F5]">
                {summary.topicTitle}
              </h4>
              <span className="text-[11px] font-mono text-[#5C6B77] dark:text-[#96A5B0] shrink-0">
                {summary.difficulty}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#2C3740] dark:text-[#D5DDE3]">
              {summary.tldr}
            </p>
          </article>

          {/* Key Concepts */}
          {summary.keyConcepts?.length > 0 && (
            <section className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4">
              <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5] mb-3">
                Key Concepts
              </h4>
              <div className="flex flex-col gap-2.5 divide-y divide-[#ECEFF2] dark:divide-[#24313A]">
                {summary.keyConcepts.map((item, idx) => {
                  const isSaved = Boolean(savedTermKeys?.has(normalizeTermKey(item.term)));
                  return (
                    <div key={idx} className={idx > 0 ? 'pt-2.5' : ''}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-[#182026] dark:text-[#F1F3F5]">
                          {item.term}
                        </p>
                        {onSaveVocabTerm && (
                          <button
                            type="button"
                            disabled={isSaved}
                            onClick={() => onSaveVocabTerm(item.term, item.explanation)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                              isSaved
                                ? 'text-[#2F8F63] dark:text-[#52B788] cursor-default'
                                : 'text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#E86A33] dark:hover:text-[#F28D61] cursor-pointer'
                            }`}
                            title={isSaved ? 'Saved in Vocab glossary' : 'Save term to Vocab tab'}
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3 h-3" />
                                <span>Vocab</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#45535E] dark:text-[#B5C1C9] mt-0.5 leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Important Formulas & Definitions */}
          {summary.formulasAndDefinitions?.length > 0 && (
            <section className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4">
              <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5] mb-3">
                Formulas &amp; Definitions
              </h4>
              <div className="flex flex-col gap-3">
                {summary.formulasAndDefinitions.map((f, idx) => {
                  const isSaved = Boolean(savedTermKeys?.has(normalizeTermKey(f.label)));
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-[#182026] dark:text-[#F1F3F5]">
                          {f.label}
                        </span>
                        {onSaveVocabTerm && (
                          <button
                            type="button"
                            disabled={isSaved}
                            onClick={() => onSaveVocabTerm(f.label, `${f.expression} — ${f.meaning}`)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                              isSaved
                                ? 'text-[#2F8F63] dark:text-[#52B788] cursor-default'
                                : 'text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#E86A33] dark:hover:text-[#F28D61] cursor-pointer'
                            }`}
                            title={isSaved ? 'Saved in Vocab glossary' : 'Save term to Vocab tab'}
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3 h-3" />
                                <span>Vocab</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="font-mono text-[11.5px] px-3 py-2 rounded-lg bg-[#F2F5F8] dark:bg-[#11171C] border border-[#E2E8EE] dark:border-[#26343E] text-[#1D3B2E] dark:text-[#8FD8B5] overflow-x-auto">
                        {f.expression}
                      </div>
                      <p className="text-[11.5px] text-[#5C6B77] dark:text-[#9AA8B2] leading-relaxed">
                        {f.meaning}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Potential Exam Traps */}
          {summary.examTraps?.length > 0 && (
            <section className="rounded-xl border border-[#E8C5B5] dark:border-[#4D342B] bg-[#FFF8F5] dark:bg-[#211A18] p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#B3431B] dark:text-[#F3966F] mb-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Potential Exam Traps</span>
              </h4>
              <div className="flex flex-col gap-2.5">
                {summary.examTraps.map((trap, idx) => (
                  <div key={idx} className="text-xs leading-relaxed">
                    <p className="font-semibold text-[#182026] dark:text-[#F1F3F5]">{trap.trap}</p>
                    <p className="text-[#5C6B77] dark:text-[#B8C2C9] mt-0.5">
                      How to avoid: {trap.howToAvoid}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
