import React, { useMemo, useState } from 'react';
import { BookMarked, Check, Layers, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { VocabEntry, VocabOrigin } from '../types/study';
import { AcademicMarkdown } from './AcademicMarkdown';

interface VocabTabProps {
  entries: VocabEntry[];
  definingIds: Record<string, boolean>;
  sourceTitle?: string;
  onAddTerm: (term: string, contextSnippet?: string, origin?: VocabOrigin) => void;
  onDefineTerm: (entryId: string) => void;
  onDefineAllPending: () => void;
  onToggleMastered: (entryId: string) => void;
  onDeleteTerm: (entryId: string) => void;
  onSendToDeck?: (entry: VocabEntry) => void;
}

type VocabFilter = 'all' | 'pending' | 'mastered';

const ORIGIN_LABEL: Record<VocabOrigin, string> = {
  summary: 'From Summary',
  chat: 'From Chat',
  manual: 'Added manually',
};

export const VocabTab: React.FC<VocabTabProps> = ({
  entries,
  definingIds,
  sourceTitle,
  onAddTerm,
  onDefineTerm,
  onDefineAllPending,
  onToggleMastered,
  onDeleteTerm,
  onSendToDeck,
}) => {
  const [draftTerm, setDraftTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<VocabFilter>('all');

  const pendingCount = useMemo(
    () => entries.filter((e) => !e.simpleDefinition).length,
    [entries]
  );

  const anyDefining = Object.values(definingIds).some(Boolean);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter === 'pending' && entry.simpleDefinition) return false;
      if (filter === 'mastered' && !entry.mastered) return false;
      if (!q) return true;
      return (
        entry.term.toLowerCase().includes(q) ||
        (entry.simpleDefinition || '').toLowerCase().includes(q) ||
        (entry.sourceTitle || '').toLowerCase().includes(q)
      );
    });
  }, [entries, filter, searchQuery]);

  const handleSubmitTerm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftTerm.trim();
    if (!cleaned) return;
    onAddTerm(cleaned, undefined, 'manual');
    setDraftTerm('');
  };

  return (
    <div className="flex flex-col gap-3.5 animate-panel-enter">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-[#182026] dark:text-[#F1F3F5]">
            Vocab Glossary
          </h3>
          <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
            Save difficult terms &amp; generate plain-language definitions ·{' '}
            <span className="font-mono tabular-nums">{entries.length} saved</span>
          </p>
        </div>

        {pendingCount > 0 && (
          <button
            type="button"
            disabled={anyDefining}
            onClick={onDefineAllPending}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] dark:hover:bg-[#F27944] disabled:opacity-50 text-white dark:text-[#11171C] font-semibold text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 ${anyDefining ? 'animate-spin' : ''}`} />
            <span>Define All ({pendingCount})</span>
          </button>
        )}
      </div>

      {/* Add Difficult Term Manually */}
      <form onSubmit={handleSubmitTerm} className="flex items-center gap-2">
        <input
          type="text"
          value={draftTerm}
          maxLength={80}
          onChange={(e) => setDraftTerm(e.target.value)}
          placeholder={
            sourceTitle
              ? `Add a term from "${sourceTitle.slice(0, 26)}..."`
              : 'Add a difficult term (e.g., Oxidative Phosphorylation)...'
          }
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5]"
        />
        <button
          type="submit"
          disabled={!draftTerm.trim()}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#233039] dark:bg-[#2A3A46] hover:bg-[#182127] dark:hover:bg-[#354856] disabled:opacity-45 text-white font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </form>

      {/* Search & Filter Controls */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#7A8A96] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter terms..."
              aria-label="Filter saved vocabulary terms"
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white dark:bg-[#182127] border border-[#DCE2E8] dark:border-[#2B3943] text-[11.5px] text-[#182026] dark:text-[#F1F3F5]"
            />
          </div>

          <div
            className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#EFF3F6] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#293741] shrink-0"
            role="tablist"
            aria-label="Filter vocabulary list"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Needs Def' },
                { id: 'mastered', label: 'Mastered' },
              ] as Array<{ id: VocabFilter; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={filter === opt.id}
                onClick={() => setFilter(opt.id)}
                className={`px-2 py-1 rounded-md text-[10.5px] font-medium whitespace-nowrap cursor-pointer ${
                  filter === opt.id
                    ? 'bg-white dark:bg-[#233039] text-[#182026] dark:text-[#F1F3F5] shadow-xs'
                    : 'text-[#5C6B77] dark:text-[#8E9EA9]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-5 text-center flex flex-col items-center gap-2">
          <BookMarked className="w-6 h-6 text-[#3D9E71] dark:text-[#52B788]" />
          <p className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5]">
            Your study glossary is empty
          </p>
          <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] max-w-[310px] leading-relaxed">
            Click <strong>+ Vocab</strong> beside any concept in Summary, use <strong>Save term</strong> on any Tutor Chat reply, or type a term above to generate a simple definition.
          </p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <p className="text-xs text-center text-[#5C6B77] dark:text-[#8E9EA9] py-6">
          No saved terms match your current filter.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredEntries.map((entry) => {
            const isDefining = Boolean(definingIds[entry.id]);

            return (
              <article
                key={entry.id}
                className={`rounded-xl border p-3.5 flex flex-col gap-2 transition-colors ${
                  entry.mastered
                    ? 'bg-[#F4FAF7] dark:bg-[#172621] border-[#BBDED0] dark:border-[#2A5041]'
                    : 'bg-white dark:bg-[#182127] border-[#DFE5EB] dark:border-[#293741]'
                }`}
              >
                {/* Term Header & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-display text-xs font-bold text-[#182026] dark:text-[#F1F3F5] leading-snug">
                      {entry.term}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9] mt-0.5 truncate">
                      <span>{ORIGIN_LABEL[entry.origin]}</span>
                      {entry.sourceTitle && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{entry.sourceTitle}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isDefining}
                      onClick={() => onDefineTerm(entry.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#D4DCE3] dark:border-[#30404B] bg-[#F6F8FA] dark:bg-[#131B21] hover:border-[#E86A33] disabled:opacity-50 text-[10.5px] font-semibold text-[#182026] dark:text-[#E8EDF1] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      title={entry.simpleDefinition ? 'Regenerate simple definition' : 'Generate simple definition with AI'}
                    >
                      <RefreshCw className={`w-3 h-3 text-[#3D9E71] dark:text-[#52B788] ${isDefining ? 'animate-spin' : ''}`} />
                      <span>{isDefining ? 'Defining...' : entry.simpleDefinition ? 'Refresh' : 'Define'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleMastered(entry.id)}
                      aria-pressed={entry.mastered}
                      className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                        entry.mastered
                          ? 'bg-[#2F8F63] dark:bg-[#3D9E71] border-[#2F8F63] text-white'
                          : 'bg-[#F6F8FA] dark:bg-[#131B21] border-[#D4DCE3] dark:border-[#30404B] text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
                      }`}
                      title={entry.mastered ? 'Marked as mastered' : 'Mark term as mastered'}
                      aria-label={entry.mastered ? `Unmark ${entry.term} as mastered` : `Mark ${entry.term} as mastered`}
                    >
                      <Check className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTerm(entry.id)}
                      className="p-1.5 rounded-md border border-transparent hover:border-[#E6B3AC] dark:hover:border-[#5C312B] text-[#7D8C97] hover:text-[#B93829] dark:hover:text-[#F59B8F] transition-colors cursor-pointer"
                      title="Remove term"
                      aria-label={`Remove ${entry.term}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Definition Output or Pending Prompt */}
                {entry.simpleDefinition ? (
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#ECEFF2] dark:border-[#24313A] text-xs">
                    <AcademicMarkdown
                      content={entry.simpleDefinition}
                      className="text-[#182026] dark:text-[#E8EDF1] leading-relaxed"
                    />
                    {entry.analogyOrExample && (
                      <AcademicMarkdown
                        content={`**Example:** ${entry.analogyOrExample}`}
                        className="text-[11.5px] text-[#45535E] dark:text-[#B5C1C9] leading-relaxed"
                      />
                    )}
                    {entry.memoryCue && (
                      <p className="text-[11px] text-[#2F8F63] dark:text-[#65C99A] font-medium">
                        Recall cue: {entry.memoryCue}
                      </p>
                    )}
                    {onSendToDeck && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onSendToDeck(entry)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E6F5EE] dark:bg-[#1D352B] text-[10.5px] font-semibold text-[#1F704B] dark:text-[#74C69D] hover:opacity-90 cursor-pointer"
                        >
                          <Layers className="w-3 h-3" />
                          <span>+ FSRS Deck</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#ECEFF2] dark:border-[#24313A]">
                    {entry.contextSnippet && (
                      <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] line-clamp-2 leading-relaxed">
                        Context: “{entry.contextSnippet}”
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={isDefining}
                      onClick={() => onDefineTerm(entry.id)}
                      className="self-start text-[11px] font-semibold text-[#E86A33] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {isDefining ? 'Generating simple definition...' : 'Generate simple AI definition (+5 XP)'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
