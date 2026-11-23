import React, { useEffect, useState } from 'react';
import { Bell, Check, Copy, Download, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { ReminderSettings, ThemeMode } from '../types/study';
import { fetchExtensionBundle } from '../utils/tutorApi';

interface SettingsModalProps {
  petName: string;
  theme: ThemeMode;
  muted: boolean;
  reminderSettings: ReminderSettings;
  onClose: () => void;
  onRenamePet: (name: string) => void;
  onSetTheme: (theme: ThemeMode) => void;
  onToggleMute: () => void;
  onUpdateReminders: (next: { enabled: boolean; intervalHours: number }) => void;
  onPreviewReminder: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  petName,
  theme,
  muted,
  reminderSettings,
  onClose,
  onRenamePet,
  onSetTheme,
  onToggleMute,
  onUpdateReminders,
  onPreviewReminder,
}) => {
  const [draftName, setDraftName] = useState(petName);
  const [savedNotice, setSavedNotice] = useState(false);
  const [extFiles, setExtFiles] = useState<Array<{ name: string; content: string }>>([]);
  const [activeFile, setActiveFile] = useState<string>('manifest.json');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [loadingExt, setLoadingExt] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchExtensionBundle()
      .then((files) => {
        if (!mounted) return;
        setExtFiles(files);
        if (files.length > 0) setActiveFile(files[0].name);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingExt(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const currentFileObj = extFiles.find((f) => f.name === activeFile);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim().slice(0, 16);
    if (!cleaned) return;
    onRenamePet(cleaned);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  const handleDownloadFile = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyFile = async (name: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(name);
      setTimeout(() => setCopiedFile(null), 1500);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1014]/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tutor Settings and Chrome Extension Files"
    >
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] shadow-2xl overflow-hidden animate-panel-enter">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAEF] dark:border-[#293741]">
          <div>
            <h2 className="font-display text-lg font-bold text-[#182026] dark:text-[#F1F3F5]">
              Settings &amp; Chrome Extension (MV3)
            </h2>
            <p className="text-xs text-[#5C6B77] dark:text-[#96A5B0]">
              Customize your study companion or export the unpacked Chrome Side Panel files
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6B77] dark:text-[#96A5B0] hover:bg-[#EFF3F6] dark:hover:bg-[#233039] cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Preferences Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <form onSubmit={handleSaveName} className="flex flex-col gap-1.5">
              <label
                htmlFor="settings-pet-name"
                className="text-xs font-medium text-[#45535E] dark:text-[#B5C1C9]"
              >
                Study Companion Name
              </label>
              <div className="flex gap-2">
                <input
                  id="settings-pet-name"
                  type="text"
                  maxLength={16}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#F6F8FA] dark:bg-[#11171C] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] text-white dark:text-[#11171C] font-semibold text-xs whitespace-nowrap cursor-pointer"
                >
                  {savedNotice ? 'Saved' : 'Save'}
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[#45535E] dark:text-[#B5C1C9]">
                Appearance &amp; Audio
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#EFF3F6] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#2B3943]">
                  <button
                    type="button"
                    onClick={() => onSetTheme('light')}
                    className={`inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white text-[#182026] shadow-sm'
                        : 'text-[#5C6B77] dark:text-[#96A5B0]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetTheme('dark')}
                    className={`inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#25333E] text-[#F1F3F5]'
                        : 'text-[#5C6B77] dark:text-[#96A5B0]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Dark
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onToggleMute}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EFF3F6] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#2B3943] text-xs font-medium text-[#182026] dark:text-[#F1F3F5] whitespace-nowrap cursor-pointer"
                >
                  {muted ? (
                    <VolumeX className="w-3.5 h-3.5 text-[#E86A33]" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#3D9E71] dark:text-[#52B788]" />
                  )}
                  <span>{muted ? 'Muted' : 'Sound'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gentle Check-In Notification Scheduler Settings */}
          <div className="pt-4 border-t border-[#E5EAEF] dark:border-[#293741] flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#3D9E71] dark:text-[#52B788] shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                    Gentle Check-In Reminders
                  </h3>
                  <p className="text-[11px] text-[#5C6B77] dark:text-[#96A5B0]">
                    Uses <span className="font-mono">chrome.alarms</span> &amp; <span className="font-mono">chrome.notifications</span> in <span className="font-mono">background.js</span>
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#182026] dark:text-[#F1F3F5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderSettings.enabled}
                  onChange={(e) =>
                    onUpdateReminders({
                      enabled: e.target.checked,
                      intervalHours: reminderSettings.intervalHours,
                    })
                  }
                  className="accent-[#E86A33] w-4 h-4 cursor-pointer"
                />
                <span>{reminderSettings.enabled ? 'Enabled' : 'Paused'}</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#F6F8FA] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#2B3943]">
              <div className="flex items-center gap-2 text-xs text-[#45535E] dark:text-[#B5C1C9]">
                <label htmlFor="reminder-hours-input" className="whitespace-nowrap">
                  Remind if unopened for
                </label>
                <input
                  id="reminder-hours-input"
                  type="number"
                  min={1}
                  max={72}
                  disabled={!reminderSettings.enabled}
                  value={reminderSettings.intervalHours}
                  onChange={(e) => {
                    const parsed = Math.min(72, Math.max(1, Math.round(Number(e.target.value) || 1)));
                    onUpdateReminders({
                      enabled: reminderSettings.enabled,
                      intervalHours: parsed,
                    });
                  }}
                  className="w-16 px-2 py-1 rounded-md bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] font-mono tabular-nums text-xs text-[#182026] dark:text-[#F1F3F5] disabled:opacity-50"
                />
                <span className="whitespace-nowrap">hours</span>
              </div>

              <button
                type="button"
                onClick={onPreviewReminder}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1C262E] hover:border-[#E86A33] border border-[#D4DCE3] dark:border-[#30404B] text-xs font-medium text-[#182026] dark:text-[#F1F3F5] whitespace-nowrap cursor-pointer"
              >
                Preview Reminder
              </button>
            </div>
          </div>

          {/* Real Chrome Extension Manifest V3 Package Viewer */}
          <div className="pt-4 border-t border-[#E5EAEF] dark:border-[#293741] flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                  Chrome Extension Manifest V3 Files
                </h3>
                <p className="text-[11px] text-[#5C6B77] dark:text-[#96A5B0]">
                  Place these 6 files in a folder and load via <span className="font-mono">chrome://extensions</span> → Load unpacked. Includes <span className="font-mono">chrome.storage.local</span> API key settings.
                </p>
              </div>
            </div>

            {loadingExt ? (
              <p className="text-xs text-[#5C6B77] dark:text-[#96A5B0]">Loading extension files...</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {extFiles.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setActiveFile(f.name)}
                      className={`px-2.5 py-1 rounded-md font-mono text-[11px] border transition-colors cursor-pointer ${
                        activeFile === f.name
                          ? 'bg-[#233039] dark:bg-[#2B3B46] text-white border-[#233039] dark:border-[#496173]'
                          : 'bg-[#F6F8FA] dark:bg-[#11171C] text-[#45535E] dark:text-[#9AA8B2] border-[#DCE2E8] dark:border-[#2B3943]'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>

                {currentFileObj && (
                  <div className="rounded-xl border border-[#DCE2E8] dark:border-[#2B3943] bg-[#F6F8FA] dark:bg-[#10161B] overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5EAEF] dark:border-[#232F37] text-[11px]">
                      <span className="font-mono font-semibold text-[#182026] dark:text-[#E2E8EE]">
                        chrome-extension/{currentFileObj.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyFile(currentFileObj.name, currentFileObj.content)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-[#1C262E] border border-[#D4DCE3] dark:border-[#30404B] text-[#182026] dark:text-[#F1F3F5] cursor-pointer"
                        >
                          {copiedFile === currentFileObj.name ? (
                            <>
                              <Check className="w-3 h-3 text-[#3D9E71]" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(currentFileObj.name, currentFileObj.content)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E86A33] text-white dark:text-[#11171C] font-semibold cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 text-[11px] font-mono leading-relaxed text-[#243038] dark:text-[#C5D0D8] overflow-auto max-h-[250px] m-0">
                      <code>{currentFileObj.content}</code>
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
