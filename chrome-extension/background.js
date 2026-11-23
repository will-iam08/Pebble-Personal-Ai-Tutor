// Pebble Study Tutor — Manifest V3 Background Service Worker
// Handles Side Panel activation, active-tab extraction, and gentle study check-in notifications.

const ALARM_CHECKIN = 'pebble_study_checkin';
const ALARM_POLL = 'pebble_study_checkin_poll';
const NOTIFICATION_ID = 'pebble_checkin_reminder';

const STORAGE_KEYS = {
  REMINDER_SETTINGS: 'pebble_reminder_settings',
  LAST_OPENED_AT: 'pebble_last_opened_at',
  LAST_NOTIFIED_AT: 'pebble_last_notified_at',
  PET: 'pebble_study_pet',
  PENDING_SELECTION: 'pebble_pending_selection_action',
};

const CONTEXT_MENU_ASK = 'pebble_ask_selection';
const CONTEXT_MENU_VOCAB = 'pebble_define_selection';

const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  intervalHours: 6,
};

function clampIntervalHours(hours) {
  const num = Number(hours);
  if (!Number.isFinite(num)) return DEFAULT_REMINDER_SETTINGS.intervalHours;
  return Math.min(72, Math.max(1, Math.round(num)));
}

function getReminderMessages(petName) {
  return [
    `Take a quick 5-minute break to check in with ${petName} and review a concept or flashcard.`,
    `${petName} is resting on your study sill — drop in for a quick pat or mini quiz.`,
    `Ready for a calm study check-in? ${petName} is waiting to summarize your next reading.`,
  ];
}

async function getSchedulerState() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.REMINDER_SETTINGS,
    STORAGE_KEYS.LAST_OPENED_AT,
    STORAGE_KEYS.LAST_NOTIFIED_AT,
    STORAGE_KEYS.PET,
  ]);

  const rawSettings = data[STORAGE_KEYS.REMINDER_SETTINGS] || {};
  const settings = {
    enabled:
      typeof rawSettings.enabled === 'boolean'
        ? rawSettings.enabled
        : DEFAULT_REMINDER_SETTINGS.enabled,
    intervalHours: clampIntervalHours(rawSettings.intervalHours),
  };

  const now = Date.now();
  const lastOpenedAt =
    typeof data[STORAGE_KEYS.LAST_OPENED_AT] === 'number' ? data[STORAGE_KEYS.LAST_OPENED_AT] : now;
  const lastNotifiedAt =
    typeof data[STORAGE_KEYS.LAST_NOTIFIED_AT] === 'number' ? data[STORAGE_KEYS.LAST_NOTIFIED_AT] : 0;
  const petName = data[STORAGE_KEYS.PET]?.name || 'Pebble';

  return { settings, lastOpenedAt, lastNotifiedAt, petName };
}

// Schedule both an exact target alarm and a periodic safety poll (survives service worker sleep)
async function scheduleReminderAlarms() {
  const { settings, lastOpenedAt } = await getSchedulerState();

  await chrome.alarms.clear(ALARM_CHECKIN);
  await chrome.alarms.clear(ALARM_POLL);

  if (!settings.enabled) {
    return { enabled: false, nextAlarmAt: null };
  }

  const intervalMs = settings.intervalHours * 60 * 60 * 1000;
  const targetTime = Math.max(Date.now() + 60 * 1000, lastOpenedAt + intervalMs);

  chrome.alarms.create(ALARM_CHECKIN, { when: targetTime });
  chrome.alarms.create(ALARM_POLL, { periodInMinutes: 15 });

  return { enabled: true, nextAlarmAt: targetTime };
}

async function showCheckInNotification(petName, intervalHours, isTest = false) {
  const messages = getReminderMessages(petName);
  const body = isTest
    ? `Gentle reminder preview: ${petName} will nudge you after ${intervalHours}h without a study check-in.`
    : messages[Math.floor(Date.now() / 60000) % messages.length];

  await chrome.notifications.create(NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
    title: `Check in with ${petName}`,
    message: body,
    priority: 0,
    silent: false,
  });
}

async function evaluateAndNotify() {
  const { settings, lastOpenedAt, lastNotifiedAt, petName } = await getSchedulerState();
  if (!settings.enabled) return;

  const now = Date.now();
  const intervalMs = settings.intervalHours * 60 * 60 * 1000;
  const inactiveLongEnough = now - lastOpenedAt >= intervalMs;
  const cooledDownSinceLastReminder = now - lastNotifiedAt >= intervalMs;

  if (inactiveLongEnough && cooledDownSinceLastReminder) {
    await chrome.storage.local.set({ [STORAGE_KEYS.LAST_NOTIFIED_AT]: now });
    await showCheckInNotification(petName, settings.intervalHours, false);
    // Schedule next gentle reminder only after another full interval if still unopened
    chrome.alarms.create(ALARM_CHECKIN, { when: now + intervalMs });
  }
}

async function recordCheckIn() {
  const now = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_OPENED_AT]: now });
  chrome.notifications.clear(NOTIFICATION_ID).catch(() => {});
  return scheduleReminderAlarms();
}

// Extension lifecycle hooks
chrome.runtime.onInstalled.addListener(async () => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  if (chrome.contextMenus) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: CONTEXT_MENU_ASK,
        title: 'Ask Pebble about "%s"',
        contexts: ['selection'],
      });
      chrome.contextMenus.create({
        id: CONTEXT_MENU_VOCAB,
        title: 'Save "%s" to Pebble Vocab',
        contexts: ['selection'],
      });
    });
  }

  const existing = await chrome.storage.local.get([
    STORAGE_KEYS.REMINDER_SETTINGS,
    STORAGE_KEYS.LAST_OPENED_AT,
  ]);
  const patch = {};
  if (!existing[STORAGE_KEYS.REMINDER_SETTINGS]) {
    patch[STORAGE_KEYS.REMINDER_SETTINGS] = DEFAULT_REMINDER_SETTINGS;
  }
  if (typeof existing[STORAGE_KEYS.LAST_OPENED_AT] !== 'number') {
    patch[STORAGE_KEYS.LAST_OPENED_AT] = Date.now();
  }
  if (Object.keys(patch).length > 0) {
    await chrome.storage.local.set(patch);
  }
  await scheduleReminderAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  await scheduleReminderAlarms();
  await evaluateAndNotify();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_CHECKIN || alarm.name === ALARM_POLL) {
    evaluateAndNotify().catch(() => {});
  }
});

// Keep alarm schedule synced if settings change directly in chrome.storage.local
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEYS.REMINDER_SETTINGS]) {
    scheduleReminderAlarms().catch(() => {});
  }
});

// Clicking the reminder notification opens the Side Panel and records a fresh check-in
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId !== NOTIFICATION_ID) return;
  await recordCheckIn();
  try {
    const win = await chrome.windows.getLastFocused();
    if (win?.id && chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: win.id });
    }
  } catch {
    // Side Panel open requires a valid focused window
  }
});

// Highlight-to-Ask & Vocab Context Menu Handler
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ASK && info.menuItemId !== CONTEXT_MENU_VOCAB) {
      return;
    }
    const selectionText = (info.selectionText || '').trim();
    if (!selectionText) return;

    const payload = {
      kind: info.menuItemId === CONTEXT_MENU_VOCAB ? 'vocab' : 'ask',
      text: selectionText.slice(0, 2400),
      pageTitle: tab?.title || 'Highlighted Passage',
      pageUrl: tab?.url || '',
      createdAt: Date.now(),
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.PENDING_SELECTION]: payload });

    try {
      if (tab?.windowId && chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    } catch {
      // Ignore if side panel is already open or window unavailable
    }

    chrome.runtime.sendMessage({ type: 'PEBBLE_SELECTION_ACTION', payload }, () => {
      void chrome.runtime.lastError;
    });
  });
}

const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'view-source:',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com',
];

function isRestrictedTabUrl(url) {
  if (!url) return false;
  return RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function isYouTubeWatchUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /(^|\.)youtube\.com$/i.test(u.hostname) && u.pathname === '/watch';
  } catch {
    return false;
  }
}

function isLikelyDirectPdfUrl(url) {
  if (!url) return false;
  return /\.pdf($|[?#])/i.test(url) || /\/d2l\/common\/viewFile\.d2lfile/i.test(url);
}

// Executed inside EVERY frame (including D2L Brightspace / Canvas / Blackboard PDF.js iframes)
function extractFrameContentAndPdfHints() {
  const href = window.location.href || '';
  const pdfUrls = [];
  const pushPdfUrl = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    try {
      const resolved = new URL(raw, href).href;
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        if (!pdfUrls.includes(resolved)) pdfUrls.push(resolved);
      }
    } catch {
      // ignore invalid URLs
    }
  };

  // 1. Direct PDF document
  if (document.contentType === 'application/pdf' || /\.pdf($|[?#])/i.test(href)) {
    pushPdfUrl(href);
  }

  // 2. PDF.js viewer query parameter (?file=...) — used by D2L Brightspace / Waterloo Learn, Moodle, etc.
  try {
    const parsedUrl = new URL(href);
    const fileParam = parsedUrl.searchParams.get('file');
    if (fileParam) {
      pushPdfUrl(fileParam);
    }
  } catch {
    // ignore
  }

  // 3. Embedded <embed>, <object>, <iframe> pointing at PDFs or LMS file viewers
  document.querySelectorAll('embed, object, iframe').forEach((el) => {
    const type = (el.getAttribute('type') || '').toLowerCase();
    const src = el.getAttribute('src') || el.getAttribute('data') || '';
    if (
      type.includes('pdf') ||
      /\.pdf($|[?#])/i.test(src) ||
      /\/content\/enforced\/.+\.pdf/i.test(src) ||
      /viewFile\.d2lfile/i.test(src)
    ) {
      pushPdfUrl(src);
    }
    if (src.includes('file=')) {
      try {
        const innerUrl = new URL(src, href);
        const fp = innerUrl.searchParams.get('file');
        if (fp) pushPdfUrl(fp);
      } catch {
        // ignore
      }
    }
  });

  // 4. LMS download links pointing directly to a PDF
  document.querySelectorAll('a[href]').forEach((a) => {
    const rawHref = a.getAttribute('href') || '';
    if (/\.pdf($|[?#])/i.test(rawHref) || /\/content\/enforced\/.+\.pdf/i.test(rawHref)) {
      pushPdfUrl(rawHref);
    }
  });

  // 5. Extract PDF.js rendered text layers if this frame is a PDF.js viewer
  let pdfJsText = '';
  const textLayers = document.querySelectorAll('.textLayer, #viewer .page');
  if (textLayers.length > 0) {
    const chunks = [];
    textLayers.forEach((layer) => {
      const t = (layer.innerText || layer.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) chunks.push(t);
    });
    pdfJsText = chunks.join('\n\n').trim();
  }

  // 6. Standard clean page text extraction
  const NOISE_SELECTORS = [
    'script',
    'style',
    'noscript',
    'nav',
    'header',
    'footer',
    'aside',
    'iframe',
    'svg',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '.sidebar',
    '.advertisement',
    '.ads',
    '.cookie-banner',
  ];

  const rootCandidate =
    document.querySelector('article') ||
    document.querySelector('main') ||
    document.querySelector('[role="main"]') ||
    document.body;

  let pageText = '';
  if (rootCandidate) {
    const clone = rootCandidate.cloneNode(true);
    for (const selector of NOISE_SELECTORS) {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    }
    pageText = (clone.innerText || clone.textContent || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return {
    href,
    title: document.title || '',
    isTop: window.self === window.top,
    pdfUrls,
    pdfJsText: pdfJsText.slice(0, 36000),
    pageText: pageText.slice(0, 36000),
  };
}

// Executed inside the tab's authenticated origin so LMS session cookies (D2L/Canvas/Blackboard) are included
async function fetchPdfAsBase64InPage(pdfUrl) {
  const MAX_BYTES = 15 * 1024 * 1024;
  try {
    const res = await fetch(pdfUrl, { credentials: 'include' });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 100 || buf.byteLength > MAX_BYTES) {
      return { ok: false, error: `Unexpected PDF size (${buf.byteLength} bytes)` };
    }
    const bytes = new Uint8Array(buf);
    // Verify %PDF- magic header (some PDFs have a few leading bytes before %PDF-)
    let headerStr = '';
    for (let i = 0; i < Math.min(32, bytes.length); i++) {
      headerStr += String.fromCharCode(bytes[i]);
    }
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!headerStr.includes('%PDF-') && !contentType.includes('pdf')) {
      return { ok: false, error: 'Response was not a PDF document.' };
    }

    // Encode ArrayBuffer to base64 in chunks to avoid call-stack limits
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    const base64 = btoa(binary);

    let fileName = 'lecture-slides.pdf';
    try {
      const pathname = new URL(pdfUrl).pathname;
      const lastSeg = decodeURIComponent(pathname.split('/').pop() || '');
      if (lastSeg && lastSeg.length < 120) {
        fileName = lastSeg.toLowerCase().endsWith('.pdf') ? lastSeg : `${lastSeg}.pdf`;
      }
    } catch {
      // keep fallback filename
    }

    return {
      ok: true,
      base64,
      sizeBytes: buf.byteLength,
      fileName,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'PDF fetch failed',
    };
  }
}

async function fetchPdfDirectlyInWorker(pdfUrl) {
  const MAX_BYTES = 15 * 1024 * 1024;
  try {
    const res = await fetch(pdfUrl, { credentials: 'include' });
    if (!res.ok) return { ok: false };
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 100 || buf.byteLength > MAX_BYTES) return { ok: false };
    const bytes = new Uint8Array(buf);
    let headerStr = '';
    for (let i = 0; i < Math.min(32, bytes.length); i++) {
      headerStr += String.fromCharCode(bytes[i]);
    }
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!headerStr.includes('%PDF-') && !contentType.includes('pdf')) {
      return { ok: false };
    }
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    let fileName = 'lecture-slides.pdf';
    try {
      const pathname = new URL(pdfUrl).pathname;
      const lastSeg = decodeURIComponent(pathname.split('/').pop() || '');
      if (lastSeg && lastSeg.length < 120) {
        fileName = lastSeg.toLowerCase().endsWith('.pdf') ? lastSeg : `${lastSeg}.pdf`;
      }
    } catch {
      // ignore
    }
    return { ok: true, base64: btoa(binary), sizeBytes: buf.byteLength, fileName };
  } catch {
    return { ok: false };
  }
}

// Message router for Side Panel actions
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'RECORD_CHECKIN') {
    recordCheckIn()
      .then((info) => sendResponse({ ok: true, ...info }))
      .catch((err) => sendResponse({ ok: false, error: err?.message || 'Check-in failed.' }));
    return true;
  }

  if (message?.type === 'UPDATE_REMINDER_SETTINGS') {
    (async () => {
      const nextSettings = {
        enabled: Boolean(message.enabled),
        intervalHours: clampIntervalHours(message.intervalHours),
      };
      await chrome.storage.local.set({ [STORAGE_KEYS.REMINDER_SETTINGS]: nextSettings });
      const info = await scheduleReminderAlarms();
      sendResponse({ ok: true, settings: nextSettings, ...info });
    })().catch((err) =>
      sendResponse({ ok: false, error: err?.message || 'Could not update reminder settings.' })
    );
    return true;
  }

  if (message?.type === 'TEST_REMINDER_NOTIFICATION') {
    (async () => {
      const { settings, petName } = await getSchedulerState();
      const hours = clampIntervalHours(message.intervalHours ?? settings.intervalHours);
      await showCheckInNotification(petName, hours, true);
      sendResponse({ ok: true });
    })().catch((err) =>
      sendResponse({ ok: false, error: err?.message || 'Could not display test notification.' })
    );
    return true;
  }

  if (message?.type === 'CAPTURE_VISIBLE_TAB') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          sendResponse({ ok: false, error: 'No active browser tab found to capture.' });
          return;
        }
        const tabUrl = tab.url || tab.pendingUrl || '';
        if (isRestrictedTabUrl(tabUrl)) {
          sendResponse({
            ok: false,
            error: 'Cannot screenshot Chrome system pages. Open an article, textbook, or diagram tab first.',
          });
          return;
        }
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        const base64 = dataUrl.split(',')[1] || '';
        if (!base64) {
          sendResponse({ ok: false, error: 'Failed to encode tab screenshot.' });
          return;
        }
        sendResponse({
          ok: true,
          title: `Screenshot: ${tab.title || 'Active Tab'}`,
          url: tabUrl,
          dataUrl,
          base64,
          mimeType: 'image/png',
        });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to capture tab screenshot.',
        });
      }
    })();
    return true;
  }

  if (message?.type !== 'EXTRACT_ACTIVE_TAB') {
    return false;
  }

  (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        sendResponse({ ok: false, error: 'No active browser tab found.' });
        return;
      }

      const tabUrl = tab.url || tab.pendingUrl || '';
      if (isRestrictedTabUrl(tabUrl)) {
        sendResponse({
          ok: false,
          error: 'Cannot read Chrome system pages. Open an article, LMS slide deck, or web notes tab first.',
        });
        return;
      }

      // 1. YouTube watch pages: extract timestamped transcript via content.js
      if (isYouTubeWatchUrl(tabUrl)) {
        try {
          const ytResult = await chrome.tabs.sendMessage(tab.id, { type: 'READ_PAGE_CONTENT' });
          if (ytResult && ytResult.ok) {
            sendResponse(ytResult);
            return;
          }
        } catch {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          });
          const retryYt = await chrome.tabs.sendMessage(tab.id, { type: 'READ_PAGE_CONTENT' });
          if (retryYt && retryYt.ok) {
            sendResponse(retryYt);
            return;
          }
        }
      }

      // 2. Direct PDF URLs (Chrome's built-in PDF viewer)
      if (isLikelyDirectPdfUrl(tabUrl)) {
        const directPdf = await fetchPdfDirectlyInWorker(tabUrl);
        if (directPdf.ok) {
          sendResponse({
            ok: true,
            kind: 'pdf',
            title: tab.title || directPdf.fileName,
            url: tabUrl,
            pdfBase64: directPdf.base64,
            pdfName: directPdf.fileName,
            fileSizeBytes: directPdf.sizeBytes,
          });
          return;
        }
      }

      // 3. Inspect ALL frames (top page + embedded LMS / D2L Brightspace / Canvas / PDF.js iframes)
      let frameResults = [];
      try {
        const injected = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: extractFrameContentAndPdfHints,
        });
        frameResults = injected.map((entry) => ({
          frameId: entry.frameId,
          ...(entry.result || {}),
        }));
      } catch {
        // Some PDF viewer tabs block scripting; fall through to screenshot fallback below
      }

      // Collect PDF candidates + best PDF.js textLayer + best page text across all frames
      const pdfCandidates = [];
      let bestPdfJsText = '';
      let bestPageText = '';

      for (const frame of frameResults) {
        if (Array.isArray(frame.pdfUrls)) {
          for (const candidateUrl of frame.pdfUrls) {
            if (!pdfCandidates.some((c) => c.url === candidateUrl)) {
              pdfCandidates.push({ url: candidateUrl, frameId: frame.frameId });
            }
          }
        }
        if (frame.pdfJsText && frame.pdfJsText.length > bestPdfJsText.length) {
          bestPdfJsText = frame.pdfJsText;
        }
        if (frame.pageText && frame.pageText.length > bestPageText.length) {
          bestPageText = frame.pageText;
        }
      }

      const fallbackText = (bestPdfJsText.length >= 40 ? bestPdfJsText : bestPageText).slice(0, 36000);

      // 4. If an embedded PDF was discovered (e.g. D2L Brightspace / Waterloo Learn / Canvas PDF.js viewer),
      // fetch the actual PDF with the student's logged-in cookies so Pebble gets ALL pages + handwritten ink!
      for (const candidate of pdfCandidates) {
        let fetched = null;
        try {
          const [res] = await chrome.scripting.executeScript({
            target: { tabId: tab.id, frameIds: [candidate.frameId] },
            func: fetchPdfAsBase64InPage,
            args: [candidate.url],
          });
          fetched = res?.result || null;
        } catch {
          // Cross-origin frame fetch failed; try service worker fetch next
        }

        if (!fetched?.ok) {
          fetched = await fetchPdfDirectlyInWorker(candidate.url);
        }

        if (fetched?.ok && fetched.base64) {
          const wordCount = fallbackText ? fallbackText.split(/\s+/).filter(Boolean).length : undefined;
          sendResponse({
            ok: true,
            kind: 'pdf',
            title: tab.title || fetched.fileName,
            url: tabUrl || candidate.url,
            pdfBase64: fetched.base64,
            pdfName: fetched.fileName,
            fileSizeBytes: fetched.sizeBytes,
            text: fallbackText || undefined,
            wordCount,
          });
          return;
        }
      }

      // 5. Return extracted text from PDF.js textLayer or richest page frame
      if (fallbackText.length >= 40) {
        const wordCount = fallbackText.split(/\s+/).filter(Boolean).length;
        sendResponse({
          ok: true,
          kind: 'page',
          title: tab.title || 'Untitled Web Page',
          url: tabUrl,
          text: fallbackText,
          wordCount,
        });
        return;
      }

      // 6. Visual slide fallback: if a viewer renders purely to canvas/images with no accessible PDF URL,
      // automatically capture the visible slide screenshot so the student is never blocked!
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        const base64 = dataUrl.split(',')[1] || '';
        if (base64) {
          sendResponse({
            ok: true,
            kind: 'image',
            title: `Slide Snapshot: ${tab.title || 'Active Tab'}`,
            url: tabUrl,
            dataUrl,
            base64,
            mimeType: 'image/png',
          });
          return;
        }
      } catch {
        // Ignore capture failure and return helpful guidance
      }

      sendResponse({
        ok: false,
        error: 'Could not extract text or PDF from this tab. Click Screenshot to capture the visible slide, or upload the PDF directly.',
      });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to access the active tab.',
      });
    }
  })();

  return true;
});
