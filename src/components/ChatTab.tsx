import React, { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, Check, Download, MessageSquare, Send } from 'lucide-react';
import { ChatMessage, StudySource } from '../types/study';
import { ExportFormat } from '../utils/exportStudy';

interface ChatTabProps {
  source: StudySource | null;
  messages: ChatMessage[];
  loading: boolean;
  petName: string;
  hasSummary?: boolean;
  onSend: (message: string) => void;
  onExportChat: (format: ExportFormat) => void;
  onExportStudyPack?: (format: ExportFormat) => void;
  onSaveVocabTerm?: (term: string, contextSnippet?: string) => void;
}

const STARTER_PROMPTS = [
  'Explain the main idea in simple terms',
  'What is most likely to appear on an exam?',
  'Walk me through a concrete example',
];

export const ChatTab: React.FC<ChatTabProps> = ({
  source,
  messages,
  loading,
  petName,
  hasSummary = false,
  onSend,
  onExportChat,
  onExportStudyPack,
  onSaveVocabTerm,
}) => {
  const [draft, setDraft] = useState('');
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [savingMsgId, setSavingMsgId] = useState<string | null>(null);
  const [vocabDraft, setVocabDraft] = useState('');
  const [savedMsgNoticeId, setSavedMsgNoticeId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const openSaveTermForMessage = (msg: ChatMessage) => {
    const selected = window.getSelection?.()?.toString().trim() || '';
    const prefill = selected.length > 0 && selected.length <= 64 ? selected : '';
    setSavingMsgId(msg.id);
    setVocabDraft(prefill);
  };

  const handleConfirmSaveTerm = (msg: ChatMessage) => {
    const cleaned = vocabDraft.trim();
    if (!cleaned || !onSaveVocabTerm) return;
    onSaveVocabTerm(cleaned, msg.text);
    setSavingMsgId(null);
    setVocabDraft('');
    setSavedMsgNoticeId(msg.id);
    window.setTimeout(() => setSavedMsgNoticeId(null), 1600);
  };

  const triggerExport = (label: string, action: () => void) => {
    action();
    setSavedLabel(label);
    window.setTimeout(() => setSavedLabel(null), 1600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned || loading || !source) return;
    setDraft('');
    onSend(cleaned);
  };

  return (
    <div className="flex flex-col h-full min-h-[340px] gap-3">
      {/* Transcript Export Bar (shown once chat has messages) */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#5C6B77] dark:text-[#96A5B0] truncate">
            {savedLabel ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#3D9E71] dark:text-[#52B788] shrink-0" />
                <span className="text-[#2F8F63] dark:text-[#52B788]">{savedLabel}</span>
              </>
            ) : (
              <span className="font-mono tabular-nums">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
            )}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => triggerExport('Saved .md', () => onExportChat('md'))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D4DCE3] dark:border-[#30404B] bg-[#F6F8FA] dark:bg-[#131B21] hover:border-[#E86A33] text-[11px] font-semibold text-[#182026] dark:text-[#E8EDF1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Download tutor chat history as Markdown (.md)"
            >
              <Download className="w-3 h-3 text-[#3D9E71] dark:text-[#52B788]" />
              <span>.md</span>
            </button>

            <button
              type="button"
              onClick={() => triggerExport('Saved .txt', () => onExportChat('txt'))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D4DCE3] dark:border-[#30404B] bg-[#F6F8FA] dark:bg-[#131B21] hover:border-[#E86A33] text-[11px] font-semibold text-[#182026] dark:text-[#E8EDF1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Download tutor chat history as plain text (.txt)"
            >
              <Download className="w-3 h-3 text-[#5C6B77] dark:text-[#96A5B0]" />
              <span>.txt</span>
            </button>

            {hasSummary && onExportStudyPack && (
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
      )}

      {/* Message List */}
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-0.5">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#182026] dark:text-[#F1F3F5]">
              <MessageSquare className="w-4 h-4 text-[#3D9E71] dark:text-[#52B788]" />
              <span>Focused Tutor Q&amp;A</span>
            </div>
            <p className="text-xs text-[#5C6B77] dark:text-[#96A5B0] leading-relaxed">
              {source
                ? `Ask ${petName} anything about "${source.title}". Every follow-up question stays grounded in your loaded material.`
                : 'Load an active browser page, upload a PDF, or paste notes above to start a grounded tutoring chat.'}
            </p>
            {source && (
              <div className="flex flex-col gap-1.5 pt-1">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={loading}
                    onClick={() => onSend(prompt)}
                    className="text-left px-3 py-2 rounded-lg bg-[#F6F8FA] dark:bg-[#131B21] hover:border-[#E86A33] border border-[#DFE5EB] dark:border-[#2B3943] text-xs text-[#182026] dark:text-[#DCE3E8] transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[92%] flex flex-col gap-1.5 ${
                msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div
                className={`px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#E86A33] text-white dark:text-[#11171C] font-medium'
                    : 'bg-white dark:bg-[#182127] border border-[#DFE5EB] dark:border-[#293741] text-[#182026] dark:text-[#E8EDF1]'
                }`}
              >
                {msg.text}
              </div>

              {msg.role === 'model' && onSaveVocabTerm && (
                <div className="w-full px-1">
                  {savingMsgId === msg.id ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="text"
                        value={vocabDraft}
                        maxLength={70}
                        autoFocus
                        onChange={(e) => setVocabDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmSaveTerm(msg);
                          } else if (e.key === 'Escape') {
                            setSavingMsgId(null);
                          }
                        }}
                        placeholder="Type or highlight a difficult term..."
                        className="flex-1 min-w-0 px-2.5 py-1 rounded-md bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] text-[11px] text-[#182026] dark:text-[#F1F3F5]"
                      />
                      <button
                        type="button"
                        disabled={!vocabDraft.trim()}
                        onClick={() => handleConfirmSaveTerm(msg)}
                        className="px-2 py-1 rounded-md bg-[#E86A33] hover:bg-[#D95C26] disabled:opacity-45 text-white dark:text-[#11171C] font-semibold text-[10.5px] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setSavingMsgId(null)}
                        className="px-1.5 py-1 text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#182026] dark:hover:text-[#F1F3F5] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSaveTermForMessage(msg)}
                      className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#E86A33] dark:hover:text-[#F28D61] transition-colors cursor-pointer"
                      title="Highlight a word or click to save a term to your Vocab tab"
                    >
                      {savedMsgNoticeId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#3D9E71] dark:text-[#52B788]" />
                          <span className="text-[#2F8F63] dark:text-[#52B788]">Saved to Vocab</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3 h-3" />
                          <span>Save term to Vocab</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="self-start px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#182127] border border-[#DFE5EB] dark:border-[#293741] text-xs text-[#5C6B77] dark:text-[#96A5B0]">
            Thinking through your question...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 pt-2.5 border-t border-[#DFE5EB] dark:border-[#293741] shrink-0"
      >
        <input
          type="text"
          value={draft}
          disabled={!source || loading}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={source ? 'Ask a follow-up question...' : 'Load study material first...'}
          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!source || loading || !draft.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] dark:hover:bg-[#F27944] disabled:opacity-50 text-white dark:text-[#11171C] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Send question"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};
