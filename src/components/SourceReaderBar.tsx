import React, { useRef, useState } from 'react';
import { Camera, FileText, Globe, Image as ImageIcon, StickyNote, Upload, Video, X } from 'lucide-react';
import { StudySource } from '../types/study';

interface SourceReaderBarProps {
  isExtensionMode: boolean;
  source: StudySource | null;
  onReadActivePage: () => void;
  onCaptureScreenshot: () => void;
  onLoadPdf: (file: File) => void;
  onLoadImage: (file: File) => void;
  onLoadNotes: (notes: string) => void;
  onClearSource: () => void;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const lower = file.name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const SourceReaderBar: React.FC<SourceReaderBarProps> = ({
  isExtensionMode,
  source,
  onReadActivePage,
  onCaptureScreenshot,
  onLoadPdf,
  onLoadImage,
  onLoadNotes,
  onClearSource,
}) => {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndLoadFile = (file: File) => {
    setLocalError(null);

    if (isImageFile(file)) {
      if (file.size > 10 * 1024 * 1024) {
        setLocalError('Image must be under 10 MB.');
        return;
      }
      onLoadImage(file);
      setPasteOpen(false);
      return;
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (file.size > 15 * 1024 * 1024) {
        setLocalError('PDF must be under 15 MB.');
        return;
      }
      onLoadPdf(file);
      setPasteOpen(false);
      return;
    }

    setLocalError('Please choose a PDF (.pdf) or image (.png, .jpg, .webp) file.');
  };

  const handleLoadNotes = () => {
    const trimmed = notesDraft.trim();
    if (trimmed.length < 20) {
      setLocalError('Paste at least a short paragraph of notes or transcript to study.');
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
      {/* Primary Source Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setLocalError(null);
            setPasteOpen(false);
            onReadActivePage();
          }}
          title="Extract active webpage or YouTube video transcript"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1E2830] hover:border-[#E86A33] text-[#182026] dark:text-[#F1F3F5] border border-[#D4DCE3] dark:border-[#30404B] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-[#3D9E71] dark:text-[#52B788]" />
          <span>Read Page / YT</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLocalError(null);
            setPasteOpen(false);
            if (isExtensionMode) {
              onCaptureScreenshot();
            } else {
              imageInputRef.current?.click();
            }
          }}
          title={
            isExtensionMode
              ? 'Capture screenshot of the current tab (math formulas, diagrams, charts)'
              : 'Upload a screenshot/diagram image (or press Ctrl/Cmd+V anywhere to paste)'
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1E2830] hover:border-[#E86A33] text-[#182026] dark:text-[#F1F3F5] border border-[#D4DCE3] dark:border-[#30404B] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#60A5FA]" />
          <span>{isExtensionMode ? 'Screenshot' : 'Image'}</span>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
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
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1E2830] hover:border-[#E86A33] text-[#182026] dark:text-[#F1F3F5] border border-[#D4DCE3] dark:border-[#30404B] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-[#E86A33]" />
          <span>PDF</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
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
          className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            pasteOpen
              ? 'bg-[#26333D] text-white border-[#26333D] dark:bg-[#2B3B46] dark:border-[#496173]'
              : 'bg-transparent text-[#5C6B77] dark:text-[#96A5B0] border-transparent hover:text-[#182026] dark:hover:text-[#F1F3F5]'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>Notes</span>
        </button>
      </div>

      {/* Compact Drag-and-Drop PDF / Screenshot Zone */}
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
          Drop a PDF or diagram image, paste a screenshot (Ctrl/Cmd+V), or read any article / YouTube lecture
        </div>
      )}

      {/* Quick Paste Notes Fallback */}
      {pasteOpen && (
        <div className="flex flex-col gap-1.5 animate-panel-enter">
          <textarea
            rows={4}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Paste lecture transcript, YouTube captions, textbook paragraphs, or raw study notes..."
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

      {/* Loaded Source Readout */}
      {source && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          className="flex flex-col gap-1.5 pt-0.5"
        >
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0 text-[#2F8F63] dark:text-[#74C69D]">
              {source.kind === 'youtube' ? (
                <Video className="w-3.5 h-3.5 shrink-0 text-[#E04F44]" />
              ) : source.kind === 'image' ? (
                <ImageIcon className="w-3.5 h-3.5 shrink-0 text-[#3B82F6] dark:text-[#60A5FA]" />
              ) : (
                <FileText className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate font-medium">{source.title}</span>
              <span className="font-mono tabular-nums text-[#5C6B77] dark:text-[#8E9EA9] shrink-0">
                ·{' '}
                {source.kind === 'pdf' || source.kind === 'image'
                  ? source.fileSizeLabel || 'Visual'
                  : `${source.wordCount ?? 0} words`}
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

          {source.imageDataUrl && (
            <div className="rounded-lg overflow-hidden border border-[#DCE2E8] dark:border-[#2B3943] bg-white dark:bg-[#10161B] max-h-28 flex items-center justify-center">
              <img
                src={source.imageDataUrl}
                alt={source.title}
                className="max-h-28 w-auto object-contain"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};
