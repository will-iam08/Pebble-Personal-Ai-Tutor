import React, { useState } from 'react';
import { BookmarkPlus, Lock, MessageSquare, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { SAMPLE_BROWSER_PAGES, SampleBrowserPage } from '../data/samplePages';

interface BrowserStudyPaneProps {
  activePage: SampleBrowserPage;
  articleRef: React.RefObject<HTMLElement | null>;
  sidePanelOpen: boolean;
  justExtracted: boolean;
  onSelectPage: (page: SampleBrowserPage) => void;
  onToggleSidePanel: () => void;
  onAskSelection?: (text: string, pageTitle: string) => void;
  onVocabSelection?: (text: string, pageTitle: string) => void;
}

export const BrowserStudyPane: React.FC<BrowserStudyPaneProps> = ({
  activePage,
  articleRef,
  sidePanelOpen,
  justExtracted,
  onSelectPage,
  onToggleSidePanel,
  onAskSelection,
  onVocabSelection,
}) => {
  const [selectedSnippet, setSelectedSnippet] = useState('');

  const handleMouseUp = () => {
    const raw = window.getSelection?.()?.toString().trim() || '';
    if (raw.length >= 3 && raw.length <= 1200) {
      setSelectedSnippet(raw);
    } else {
      setSelectedSnippet('');
    }
  };
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[#F6F7F9] dark:bg-[#11171C] overflow-hidden">
      {/* Realistic Chrome Tab Strip & Address Bar */}
      <div className="bg-[#E8ECEF] dark:bg-[#161E24] border-b border-[#D4DCE3] dark:border-[#27343E] shrink-0">
        {/* Browser Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto">
          {SAMPLE_BROWSER_PAGES.map((page) => {
            const active = page.id === activePage.id;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onSelectPage(page)}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#1C262E] text-[#182026] dark:text-[#F1F3F5] border-t border-x border-[#D4DCE3] dark:border-[#2D3C47]'
                    : 'text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
                }`}
              >
                {page.course.split('·')[0].trim()}
              </button>
            );
          })}
        </div>

        {/* Omnibox Row */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-[#1C262E]">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F2F5F8] dark:bg-[#12181E] border border-[#DCE2E8] dark:border-[#293741] text-xs text-[#45535E] dark:text-[#96A5B0] min-w-0">
            <Lock className="w-3.5 h-3.5 shrink-0 text-[#5C6B77] dark:text-[#7E8F9B]" />
            <span className="font-mono text-[11px] truncate">{activePage.url}</span>
          </div>

          <button
            type="button"
            onClick={onToggleSidePanel}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F2F5F8] dark:bg-[#24323C] hover:bg-[#E6ECF1] dark:hover:bg-[#2E3F4B] border border-[#D4DCE3] dark:border-[#344653] text-xs font-medium text-[#182026] dark:text-[#F1F3F5] whitespace-nowrap shrink-0 cursor-pointer"
            title={sidePanelOpen ? 'Collapse Side Panel' : 'Open Pebble Side Panel'}
          >
            {sidePanelOpen ? (
              <PanelRightClose className="w-3.5 h-3.5 text-[#E86A33]" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5 text-[#3D9E71]" />
            )}
            <span className="hidden sm:inline">Side Panel</span>
          </button>
        </div>
      </div>

      {/* Main Academic Article Surface (Extracted when user clicks "Read Active Page") */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-8 relative">
        {selectedSnippet && (onAskSelection || onVocabSelection) && (
          <div className="sticky top-2 z-20 max-w-2xl mx-auto mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#182127] dark:bg-[#233039] text-white shadow-lg border border-[#324451] text-xs animate-panel-enter">
            <span className="truncate text-[#C7D3DC] max-w-[260px]">
              “{selectedSnippet}”
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {onAskSelection && (
                <button
                  type="button"
                  onClick={() => {
                    onAskSelection(selectedSnippet, activePage.title);
                    setSelectedSnippet('');
                    window.getSelection?.()?.removeAllRanges();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#E86A33] hover:bg-[#D95C26] text-white font-semibold text-[11px] cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Ask Pebble</span>
                </button>
              )}
              {onVocabSelection && selectedSnippet.length <= 64 && (
                <button
                  type="button"
                  onClick={() => {
                    onVocabSelection(selectedSnippet, activePage.title);
                    setSelectedSnippet('');
                    window.getSelection?.()?.removeAllRanges();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2E404D] hover:bg-[#3A5060] text-white font-semibold text-[11px] cursor-pointer"
                >
                  <BookmarkPlus className="w-3 h-3 text-[#65C99A]" />
                  <span>+ Vocab</span>
                </button>
              )}
            </div>
          </div>
        )}

        <article
          ref={articleRef}
          onMouseUp={handleMouseUp}
          className={`max-w-2xl mx-auto rounded-2xl bg-white dark:bg-[#161E24] border p-6 sm:p-8 transition-colors duration-200 ${
            justExtracted
              ? 'border-[#3D9E71] dark:border-[#52B788]'
              : 'border-[#E1E6EB] dark:border-[#26333D]'
          }`}
        >
          <p className="text-xs font-medium text-[#5C6B77] dark:text-[#8E9EA9]">
            {activePage.course}
          </p>
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#182026] dark:text-[#F1F3F5] leading-tight mt-1.5 [text-wrap:balance]">
            {activePage.title}
          </h1>
          <p className="text-xs text-[#5C6B77] dark:text-[#96A5B0] mt-2 pb-5 border-b border-[#ECEFF2] dark:border-[#24313A]">
            {activePage.subtitle}
          </p>

          <div className="flex flex-col gap-6 mt-6">
            {activePage.sections.map((section, idx) => (
              <section key={idx} className="flex flex-col gap-2.5">
                <h2 className="font-display text-base font-bold text-[#182026] dark:text-[#F1F3F5]">
                  {section.heading}
                </h2>
                {section.paragraphs.map((p, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-sm leading-7 text-[#2C3740] dark:text-[#CFD8DF]"
                  >
                    {p}
                  </p>
                ))}
                {section.formula && (
                  <div className="font-mono text-xs px-4 py-3 rounded-lg bg-[#F4F7FA] dark:bg-[#11171C] border border-[#DFE5EB] dark:border-[#283640] text-[#1D3B2E] dark:text-[#8FD8B5] overflow-x-auto">
                    {section.formula}
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
};
