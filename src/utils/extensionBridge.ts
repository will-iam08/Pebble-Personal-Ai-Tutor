// Typed bridge for Chrome Extension Manifest V3 APIs.
// Gracefully no-ops when running in the standalone web workspace.

interface ChromeStorageArea {
  get: (keys: string | string[], callback: (items: Record<string, unknown>) => void) => void;
  set: (items: Record<string, unknown>, callback?: () => void) => void;
  remove?: (keys: string | string[], callback?: () => void) => void;
}

interface ChromeRuntimeLike {
  id?: string;
  lastError?: { message?: string };
  sendMessage: (message: unknown, callback?: (response: unknown) => void) => void;
  onMessage?: {
    addListener: (listener: (message: unknown) => void) => void;
    removeListener: (listener: (message: unknown) => void) => void;
  };
}

interface ChromeGlobalLike {
  runtime?: ChromeRuntimeLike;
  storage?: {
    local?: ChromeStorageArea;
  };
}

function getChrome(): ChromeGlobalLike | null {
  if (typeof globalThis === 'undefined') return null;
  const candidate = (globalThis as unknown as { chrome?: ChromeGlobalLike }).chrome;
  if (!candidate || !candidate.runtime?.id) return null;
  return candidate;
}

export function isChromeExtensionRuntime(): boolean {
  return getChrome() !== null;
}

export interface ExtractedTabResult {
  ok: true;
  kind: 'page' | 'youtube';
  title: string;
  url: string;
  text: string;
  wordCount: number;
}

export interface ExtractedTabError {
  ok: false;
  error: string;
}

export interface CapturedScreenshotResult {
  ok: true;
  title: string;
  url: string;
  dataUrl: string;
  base64: string;
  mimeType: string;
}

export interface SelectionActionPayload {
  kind: 'ask' | 'vocab';
  text: string;
  pageTitle: string;
  pageUrl: string;
  createdAt: number;
}

export function extractActiveBrowserTab(): Promise<ExtractedTabResult | ExtractedTabError> {
  const chromeApi = getChrome();
  if (!chromeApi?.runtime) {
    return Promise.resolve({
      ok: false,
      error: 'Chrome extension runtime is not available in this window.',
    });
  }

  return new Promise((resolve) => {
    chromeApi.runtime!.sendMessage({ type: 'EXTRACT_ACTIVE_TAB' }, (res) => {
      const errMsg = chromeApi.runtime?.lastError?.message;
      if (errMsg) {
        resolve({ ok: false, error: errMsg });
        return;
      }
      const payload = res as
        | {
            ok?: boolean;
            kind?: 'page' | 'youtube';
            title?: string;
            url?: string;
            text?: string;
            wordCount?: number;
            error?: string;
          }
        | undefined;
      if (payload?.ok && typeof payload.text === 'string') {
        resolve({
          ok: true,
          kind: payload.kind === 'youtube' ? 'youtube' : 'page',
          title: payload.title || 'Untitled Web Page',
          url: payload.url || '',
          text: payload.text,
          wordCount: payload.wordCount ?? payload.text.split(/\s+/).filter(Boolean).length,
        });
      } else {
        resolve({
          ok: false,
          error: payload?.error || 'Could not extract readable text from the active tab.',
        });
      }
    });
  });
}

export function captureActiveTabScreenshot(): Promise<
  CapturedScreenshotResult | ExtractedTabError
> {
  const chromeApi = getChrome();
  if (!chromeApi?.runtime) {
    return Promise.resolve({
      ok: false,
      error: 'Tab screenshot capture is available inside the Chrome Extension. In web mode, upload or paste (Ctrl/Cmd+V) an image.',
    });
  }

  return new Promise((resolve) => {
    chromeApi.runtime!.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, (res) => {
      const errMsg = chromeApi.runtime?.lastError?.message;
      if (errMsg) {
        resolve({ ok: false, error: errMsg });
        return;
      }
      const payload = res as
        | {
            ok?: boolean;
            title?: string;
            url?: string;
            dataUrl?: string;
            base64?: string;
            mimeType?: string;
            error?: string;
          }
        | undefined;
      if (payload?.ok && typeof payload.base64 === 'string' && typeof payload.dataUrl === 'string') {
        resolve({
          ok: true,
          title: payload.title || 'Tab Screenshot',
          url: payload.url || '',
          dataUrl: payload.dataUrl,
          base64: payload.base64,
          mimeType: payload.mimeType || 'image/png',
        });
      } else {
        resolve({
          ok: false,
          error: payload?.error || 'Could not capture screenshot of the active tab.',
        });
      }
    });
  });
}

const PENDING_SELECTION_KEY = 'pebble_pending_selection_action';

export function consumePendingSelectionAction(): Promise<SelectionActionPayload | null> {
  const chromeApi = getChrome();
  if (!chromeApi?.storage?.local) return Promise.resolve(null);

  return new Promise((resolve) => {
    chromeApi.storage!.local!.get([PENDING_SELECTION_KEY], (data) => {
      const raw = data?.[PENDING_SELECTION_KEY] as SelectionActionPayload | undefined;
      if (!raw || !raw.text) {
        resolve(null);
        return;
      }
      chromeApi.storage?.local?.remove?.([PENDING_SELECTION_KEY]);
      // Ignore stale selections older than 5 minutes
      if (typeof raw.createdAt === 'number' && Date.now() - raw.createdAt > 5 * 60 * 1000) {
        resolve(null);
        return;
      }
      resolve(raw);
    });
  });
}

export function subscribeToSelectionActions(
  onAction: (payload: SelectionActionPayload) => void
): () => void {
  const chromeApi = getChrome();
  if (!chromeApi?.runtime?.onMessage) return () => {};

  const listener = (message: unknown) => {
    const msg = message as { type?: string; payload?: SelectionActionPayload } | undefined;
    if (msg?.type === 'PEBBLE_SELECTION_ACTION' && msg.payload?.text) {
      chromeApi.storage?.local?.remove?.([PENDING_SELECTION_KEY]);
      onAction(msg.payload);
    }
  };

  chromeApi.runtime.onMessage.addListener(listener);
  return () => {
    chromeApi.runtime?.onMessage?.removeListener(listener);
  };
}

export function recordExtensionCheckIn(): void {
  const chromeApi = getChrome();
  if (!chromeApi?.runtime) return;
  chromeApi.runtime.sendMessage({ type: 'RECORD_CHECKIN' }, () => {
    void chromeApi.runtime?.lastError;
  });
}

export function syncExtensionReminderSettings(enabled: boolean, intervalHours: number): void {
  const chromeApi = getChrome();
  if (!chromeApi?.runtime) return;
  chromeApi.runtime.sendMessage(
    {
      type: 'UPDATE_REMINDER_SETTINGS',
      enabled,
      intervalHours,
    },
    () => {
      void chromeApi.runtime?.lastError;
    }
  );
}

export function triggerExtensionTestReminder(intervalHours: number): Promise<boolean> {
  const chromeApi = getChrome();
  if (!chromeApi?.runtime) return Promise.resolve(false);
  return new Promise((resolve) => {
    chromeApi.runtime!.sendMessage(
      {
        type: 'TEST_REMINDER_NOTIFICATION',
        intervalHours,
      },
      (res) => {
        if (chromeApi.runtime?.lastError) {
          resolve(false);
          return;
        }
        resolve(Boolean((res as { ok?: boolean } | undefined)?.ok));
      }
    );
  });
}

export function syncPetNameToExtensionStorage(name: string): void {
  const chromeApi = getChrome();
  if (!chromeApi?.storage?.local) return;
  chromeApi.storage.local.get(['pebble_study_pet'], (data) => {
    const existing =
      data && typeof data.pebble_study_pet === 'object' && data.pebble_study_pet !== null
        ? (data.pebble_study_pet as Record<string, unknown>)
        : {};
    chromeApi.storage?.local?.set({
      pebble_study_pet: { ...existing, name },
    });
  });
}
