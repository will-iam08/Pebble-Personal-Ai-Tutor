import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Terminal,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import {
  AIProviderId,
  AIProviderSettings,
  getActiveModelName,
  getProviderMeta,
  PROVIDER_CATALOG,
} from '../types/ai';
import { ReminderSettings, ThemeMode } from '../types/study';
import {
  BridgeCliStatus,
  fetchLocalBridgeStatus,
  fetchLocalOllamaModels,
  testProviderConnection,
} from '../utils/aiClient';

interface SettingsModalProps {
  isExtensionMode: boolean;
  petName: string;
  theme: ThemeMode;
  muted: boolean;
  reminderSettings: ReminderSettings;
  aiSettings: AIProviderSettings;
  onClose: () => void;
  onRenamePet: (name: string) => void;
  onSetTheme: (theme: ThemeMode) => void;
  onToggleMute: () => void;
  onUpdateReminders: (next: { enabled: boolean; intervalHours: number }) => void;
  onPreviewReminder: () => void;
  onUpdateAISettings: (next: AIProviderSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isExtensionMode,
  petName,
  theme,
  muted,
  reminderSettings,
  aiSettings,
  onClose,
  onRenamePet,
  onSetTheme,
  onToggleMute,
  onUpdateReminders,
  onPreviewReminder,
  onUpdateAISettings,
}) => {
  const [draftName, setDraftName] = useState(petName);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingOllama, setLoadingOllama] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [bridgeClis, setBridgeClis] = useState<BridgeCliStatus[]>([]);
  const [loadingBridge, setLoadingBridge] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const visibleProviders = PROVIDER_CATALOG.filter((p) =>
    isExtensionMode ? p.id !== 'server' : true
  );
  const activeMeta = getProviderMeta(aiSettings.provider);
  const activeModel = getActiveModelName(aiSettings);
  const activeApiKey = aiSettings.apiKeys[aiSettings.provider] || '';

  const handleSelectProvider = (provider: AIProviderId) => {
    setConnResult(null);
    setShowKey(false);
    setOllamaError(null);
    onUpdateAISettings({
      ...aiSettings,
      provider,
    });
  };

  const handleModelChange = (model: string) => {
    setConnResult(null);
    onUpdateAISettings({
      ...aiSettings,
      models: {
        ...aiSettings.models,
        [aiSettings.provider]: model,
      },
    });
  };

  const handleApiKeyChange = (value: string) => {
    setConnResult(null);
    onUpdateAISettings({
      ...aiSettings,
      apiKeys: {
        ...aiSettings.apiKeys,
        [aiSettings.provider]: value,
      },
    });
  };

  const handleOllamaBaseUrlChange = (value: string) => {
    setConnResult(null);
    setOllamaError(null);
    onUpdateAISettings({
      ...aiSettings,
      ollamaBaseUrl: value,
    });
  };

  const handleBridgeBaseUrlChange = (value: string) => {
    setConnResult(null);
    setBridgeError(null);
    onUpdateAISettings({
      ...aiSettings,
      bridgeBaseUrl: value,
    });
  };

  const handleDetectBridgeClis = async () => {
    setLoadingBridge(true);
    setBridgeError(null);
    try {
      const clis = await fetchLocalBridgeStatus(aiSettings.bridgeBaseUrl);
      setBridgeClis(clis);
      const firstInstalled = clis.find((c) => c.installed);
      if (firstInstalled) {
        handleModelChange(firstInstalled.id);
      } else {
        setBridgeError('Bridge is running, but none of claude, codex, or gemini were found on PATH.');
      }
    } catch (err) {
      setBridgeError(
        err instanceof Error
          ? `${err.message} Start the bridge with: npm run bridge`
          : 'Could not connect to Pebble Local CLI Bridge. Start it with: npm run bridge'
      );
    } finally {
      setLoadingBridge(false);
    }
  };

  const handleFetchOllamaModels = async () => {
    setLoadingOllama(true);
    setOllamaError(null);
    try {
      const models = await fetchLocalOllamaModels(aiSettings.ollamaBaseUrl);
      setOllamaModels(models);
      if (models.length === 0) {
        setOllamaError('Connected, but no local models found. Run `ollama pull llama3.2` first.');
      } else if (!models.includes(activeModel)) {
        handleModelChange(models[0]);
      }
    } catch (err) {
      setOllamaError(
        err instanceof Error
          ? err.message
          : 'Could not reach local server. Ensure Ollama/LM Studio is running.'
      );
    } finally {
      setLoadingOllama(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnResult(null);
    const result = await testProviderConnection(aiSettings);
    setConnResult(result);
    setTestingConn(false);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim().slice(0, 16);
    if (!cleaned) return;
    onRenamePet(cleaned);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1014]/75 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pebble AI Provider and Study Settings"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] shadow-2xl overflow-hidden animate-panel-enter">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAEF] dark:border-[#293741]">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#182026] dark:text-[#F1F3F5]">
              Pebble Settings
            </h2>
            <p className="text-xs text-[#5C6B77] dark:text-[#96A5B0]">
              Connect free, local, or BYOK AI models and customize your study companion
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
          {/* 1. AI Model & Provider Configuration */}
          <section className="flex flex-col gap-3" aria-label="AI Provider Configuration">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#E86A33] shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                    AI Provider &amp; Model (BYOK)
                  </h3>
                  <p className="text-[11px] text-[#5C6B77] dark:text-[#96A5B0]">
                    Use free-tier APIs, local Ollama/LM Studio models, or your own key
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F5EE] dark:bg-[#1D352B] text-[10px] font-medium text-[#247A53] dark:text-[#65C99A] shrink-0">
                <ShieldCheck className="w-3 h-3" /> Local storage only
              </span>
            </div>

            {/* Provider Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visibleProviders.map((provider) => {
                const selected = provider.id === aiSettings.provider;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleSelectProvider(provider.id)}
                    className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#FFF5EF] dark:bg-[#261F1B] border-[#E86A33] text-[#182026] dark:text-[#F1F3F5]'
                        : 'bg-[#F6F8FA] dark:bg-[#11171C] border-[#DCE2E8] dark:border-[#2B3943] text-[#45535E] dark:text-[#A4B3BD] hover:border-[#B6C3CE] dark:hover:border-[#425563]'
                    }`}
                  >
                    <span className="text-xs font-semibold leading-tight">{provider.shortName}</span>
                    <span className="text-[10px] text-[#5C6B77] dark:text-[#8E9EA9] leading-tight">
                      {provider.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Provider Details Card */}
            <div className="p-3.5 rounded-xl bg-[#F6F8FA] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#2B3943] flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11.5px] text-[#45535E] dark:text-[#B5C1C9] leading-snug">
                  {activeMeta.description}
                </p>
                {activeMeta.keyUrl && (
                  <a
                    href={activeMeta.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E86A33] hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>{activeMeta.keyUrlLabel}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Ollama Base URL */}
              {aiSettings.provider === 'ollama' && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="ollama-base-url"
                      className="text-[11px] font-medium text-[#45535E] dark:text-[#B5C1C9]"
                    >
                      OpenAI-Compatible Base URL
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchOllamaModels}
                      disabled={loadingOllama}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3D9E71] dark:text-[#65C99A] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingOllama ? 'animate-spin' : ''}`} />
                      <span>Fetch local models</span>
                    </button>
                  </div>
                  <input
                    id="ollama-base-url"
                    type="url"
                    value={aiSettings.ollamaBaseUrl}
                    onChange={(e) => handleOllamaBaseUrlChange(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] font-mono text-xs text-[#182026] dark:text-[#F1F3F5]"
                  />
                  <p className="text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9]">
                    Ollama default: <span className="font-mono">http://localhost:11434/v1</span> · LM Studio:{' '}
                    <span className="font-mono">http://localhost:1234/v1</span>
                  </p>
                  {ollamaError && (
                    <p className="text-[11px] text-[#C93B2B] dark:text-[#F06455]">{ollamaError}</p>
                  )}
                </div>
              )}

              {/* Local CLI Subscription Bridge Config */}
              {aiSettings.provider === 'bridge' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="bridge-base-url"
                      className="text-[11px] font-medium text-[#45535E] dark:text-[#B5C1C9]"
                    >
                      Pebble Local CLI Bridge URL
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectBridgeClis}
                      disabled={loadingBridge}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3D9E71] dark:text-[#65C99A] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingBridge ? 'animate-spin' : ''}`} />
                      <span>Detect installed CLIs</span>
                    </button>
                  </div>
                  <input
                    id="bridge-base-url"
                    type="url"
                    value={aiSettings.bridgeBaseUrl}
                    onChange={(e) => handleBridgeBaseUrlChange(e.target.value)}
                    placeholder="http://127.0.0.1:4318"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] font-mono text-xs text-[#182026] dark:text-[#F1F3F5]"
                  />
                  <p className="text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9]">
                    Run <span className="font-mono">npm run bridge</span> in your terminal to connect Claude Code, Codex, or Gemini CLI subscriptions locally.
                  </p>
                  {bridgeClis.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {bridgeClis.map((cli) => (
                        <button
                          key={cli.id}
                          type="button"
                          disabled={!cli.installed}
                          onClick={() => handleModelChange(cli.id)}
                          className={`px-2 py-1 rounded-md border text-[10.5px] font-mono transition-colors ${
                            cli.installed
                              ? activeModel.startsWith(cli.id)
                                ? 'bg-[#E6F5EE] dark:bg-[#1A3329] border-[#3D9E71] text-[#1E6B47] dark:text-[#74C69D] cursor-pointer'
                                : 'bg-white dark:bg-[#182127] border-[#D4DCE3] dark:border-[#30404B] text-[#182026] dark:text-[#E2E8EE] cursor-pointer'
                              : 'bg-transparent border-[#DCE2E8] dark:border-[#26343E] text-[#8E9EA9] opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {cli.command} {cli.installed ? '✓' : '✗'}
                        </button>
                      ))}
                    </div>
                  )}
                  {bridgeError && (
                    <p className="text-[11px] text-[#C93B2B] dark:text-[#F06455]">{bridgeError}</p>
                  )}
                </div>
              )}

              {/* API Key Input (for BYOK & optional Ollama token) */}
              {aiSettings.provider !== 'server' && aiSettings.provider !== 'bridge' && (
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="provider-api-key"
                    className="text-[11px] font-medium text-[#45535E] dark:text-[#B5C1C9]"
                  >
                    {activeMeta.name} API Key{' '}
                    {!activeMeta.requiresApiKey && (
                      <span className="text-[#5C6B77] dark:text-[#8E9EA9] font-normal">(optional)</span>
                    )}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="provider-api-key"
                      type={showKey ? 'text' : 'password'}
                      autoComplete="off"
                      value={activeApiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder={activeMeta.keyPlaceholder}
                      className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] font-mono text-xs text-[#182026] dark:text-[#F1F3F5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 p-1 text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#182026] dark:hover:text-[#F1F3F5] cursor-pointer"
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Model Preset + Custom Input */}
              {aiSettings.provider !== 'server' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="provider-model-preset"
                      className="text-[11px] font-medium text-[#45535E] dark:text-[#B5C1C9]"
                    >
                      Model Preset
                    </label>
                    <select
                      id="provider-model-preset"
                      value={
                        [...activeMeta.presets.map((p) => p.id), ...ollamaModels].includes(activeModel)
                          ? activeModel
                          : '__custom__'
                      }
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') {
                          handleModelChange(e.target.value);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] text-xs text-[#182026] dark:text-[#F1F3F5]"
                    >
                      {ollamaModels.length > 0 && aiSettings.provider === 'ollama' && (
                        <optgroup label="Installed Local Models">
                          {ollamaModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Recommended Presets">
                        {activeMeta.presets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                            {preset.badge ? ` (${preset.badge})` : ''}
                          </option>
                        ))}
                      </optgroup>
                      <option value="__custom__">Custom model ID →</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="provider-model-custom"
                      className="text-[11px] font-medium text-[#45535E] dark:text-[#B5C1C9]"
                    >
                      Model ID (editable)
                    </label>
                    <input
                      id="provider-model-custom"
                      type="text"
                      value={activeModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      placeholder={activeMeta.defaultModel}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#182127] border border-[#D4DCE3] dark:border-[#30404B] font-mono text-xs text-[#182026] dark:text-[#F1F3F5]"
                    />
                  </div>
                </div>
              )}

              {/* Connection Test Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9]">
                  {activeMeta.supportsPdfNative
                    ? 'Supports web pages, notes, and native PDF uploads.'
                    : 'Supports web pages & pasted notes (use Gemini or Claude for direct PDF uploads).'}
                </span>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] text-white dark:text-[#11171C] font-semibold text-xs whitespace-nowrap cursor-pointer disabled:opacity-60"
                >
                  {testingConn ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <span>Test Connection</span>
                  )}
                </button>
              </div>

              {connResult && (
                <div
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg text-[11.5px] ${
                    connResult.ok
                      ? 'bg-[#E6F5EE] dark:bg-[#1A3329] text-[#1E6B47] dark:text-[#74C69D]'
                      : 'bg-[#FFF4F2] dark:bg-[#2B1918] text-[#A32B1D] dark:text-[#F59B8F]'
                  }`}
                >
                  {connResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words">{connResult.message}</span>
                </div>
              )}
            </div>
          </section>

          {/* 2. Companion, Theme & Audio */}
          <div className="pt-4 border-t border-[#E5EAEF] dark:border-[#293741] grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#233039] dark:bg-[#2C3C48] hover:bg-[#182026] dark:hover:bg-[#374B59] text-white font-semibold text-xs whitespace-nowrap cursor-pointer"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#52B788]" /> Saved
                    </>
                  ) : (
                    'Save'
                  )}
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

          {/* 3. Gentle Check-In Notification Scheduler Settings */}
          <div className="pt-4 border-t border-[#E5EAEF] dark:border-[#293741] flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#3D9E71] dark:text-[#52B788] shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                    Gentle Check-In Reminders
                  </h3>
                  <p className="text-[11px] text-[#5C6B77] dark:text-[#96A5B0]">
                    {isExtensionMode
                      ? 'Synced with Chrome desktop notifications via background service worker'
                      : 'Uses chrome.alarms & chrome.notifications when loaded as a Chrome extension'}
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
                {isExtensionMode ? 'Send Test Notification' : 'Preview Reminder'}
              </button>
            </div>
          </div>

          {/* 4. Unified Chrome Extension Build Guide (Web Sandbox Mode) */}
          {!isExtensionMode && (
            <div className="pt-4 border-t border-[#E5EAEF] dark:border-[#293741] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#5C6B77] dark:text-[#96A5B0] shrink-0" />
                <h3 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                  Load as a Real Chrome Side Panel Extension (MV3)
                </h3>
              </div>
              <p className="text-[11.5px] text-[#5C6B77] dark:text-[#96A5B0] leading-relaxed">
                This full React Side Panel compiles directly into a Manifest V3 Chrome extension with
                all tabs (Summary, Quiz, Tips, Chat, Vocab, Analytics, Pomodoro, and Pet Habitat):
              </p>
              <pre className="p-3 rounded-xl bg-[#F6F8FA] dark:bg-[#10161B] border border-[#DCE2E8] dark:border-[#2B3943] text-[11px] font-mono text-[#243038] dark:text-[#C5D0D8] overflow-x-auto m-0">
                <code>{`npm run build:extension\n# Open chrome://extensions -> Enable Developer mode -> Load unpacked -> select dist-extension/`}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
