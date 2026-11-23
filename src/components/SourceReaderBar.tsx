import React, { useRef, useState } from 'react';
import { FileText, Globe, StickyNote, Upload, X } from 'lucide-react';
import { StudySource } from '../types/study';

interface SourceReaderBarProps {
  source: StudySource | null;
  onReadActivePage: () => void;
  onLoadPdf: (file: File) => void;
  onLoadNotes: (notes: string) => void;
  onClearSource: () => void;
}

export const SourceReaderBar: React.FC<SourceReaderBarProps> = ({
  source,
  onReadActivePage,
  onLoadPdf,
  onLoadNotes,
  onClearSource,
}) => {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndLoadFile = (file: File) => {
    setLocalError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLocalError('Please choose a PDF file (.pdf).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setLocalError('PDF must be under 15 MB.');
      return;
    }
    onLoadPdf(file);
    setPasteOpen(false);
  };

  const handleLoadNotes = () => {
    const trimmed = notesDraft.trim();
    if (trimmed.length < 20) {
      setLocalError('Paste at least a short paragraph of notes to study.');
      return;
    }
    setLocalError(null);
    onLoadNotes(trimmed);
    setPasteOpen(false);
  };

  return (
    <section
      className="px-4 py-3 bg-[#F6F8FA] dark:bg-[#131A20] border-b border-[#DFE5EB] dark:border-[#293741] flex flex-col gap-2 shrink-0"
      aria-label="Multi-Source Content Reader"
    >
      {/* 3 Primary Source Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setLocalError(null);
            setPasteOpen(false);
            onReadActivePage();
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1E2830] hover:border-[#E86A33] text-[#182026] dark:text-[#F1F3F5] border border-[#D4DCE3] dark:border-[#30404B] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-[#3D9E71] dark:text-[#52B788]" />
          <span>Read Active Page</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLocalError(null);
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1E2830] hover:border-[#E86A33] text-[#182026] dark:text-[#F1F3F5] border border-[#D4DCE3] dark:border-[#30404B] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-[#E86A33]" />
          <span>Upload PDF</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndLoadFile(file);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => {
            setLocalError(null);
            setPasteOpen((v) => !v);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            pasteOpen
              ? 'bg-[#26333D] text-white border-[#26333D] dark:bg-[#2B3B46] dark:border-[#496173]'
              : 'bg-transparent text-[#5C6B77] dark:text-[#96A5B0] border-transparent hover:text-[#182026] dark:hover:text-[#F1F3F5]'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>Paste Notes</span>
        </button>
      </div>

      {/* Compact Drag-and-Drop PDF Zone (shown when no source loaded or dragging) */}
      {(!source || dragActive) && !pasteOpen && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) validateAndLoadFile(file);
          }}
          className={`px-3 py-2 rounded-lg border border-dashed text-[11px] text-center transition-colors ${
            dragActive
              ? 'border-[#E86A33] bg-[#FFF4EE] dark:bg-[#251E1B] text-[#182026] dark:text-[#F1F3F5]'
              : 'border-[#CFD8E0] dark:border-[#30404B] bg-white/70 dark:bg-[#172026] text-[#5C6B77] dark:text-[#8E9EA9]'
          }`}
        >
          Drag &amp; drop lecture slides (.pdf) here, read the open browser tab, or paste notes
        </div>
      )}

      {/* Quick Paste Notes Fallback */}
      {pasteOpen && (
        <div className="flex flex-col gap-1.5 animate-panel-enter">
          <textarea
            rows={4}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Paste lecture transcript, textbook paragraphs, or raw study notes..."
            className="w-full p-2.5 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5] resize-y"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPasteOpen(false)}
              className="px-2.5 py-1 text-xs text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLoadNotes}
              className="px-3 py-1 rounded-md bg-[#E86A33] hover:bg-[#D95C26] text-white dark:text-[#11171C] font-semibold text-xs cursor-pointer"
            >
              Load Notes
            </button>
          </div>
        </div>
      )}

      {localError && (
        <p className="text-[11px] text-[#C93B2B] dark:text-[#F06455]">{localError}</p>
      )}

      {/* Loaded Source Readout (unboxed clean metadata line) */}
      {source && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          className="flex items-center justify-between gap-2 text-[11px] pt-0.5"
        >
          <div className="flex items-center gap-1.5 min-w-0 text-[#2F8F63] dark:text-[#74C69D]">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate font-medium">{source.title}</span>
            <span className="font-mono tabular-nums text-[#5C6B77] dark:text-[#8E9EA9] shrink-0">
              · {source.kind === 'pdf' ? source.fileSizeLabel : `${source.wordCount ?? 0} words`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClearSource}
            className="inline-flex items-center gap-0.5 text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#182026] dark:hover:text-[#F1F3F5] shrink-0 cursor-pointer"
            aria-label="Clear loaded source"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
