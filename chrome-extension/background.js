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
};

const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  intervalHours: 6,
};

// Valid 48x48 PNG icon for Chrome desktop notifications (Pebble sprout companion)
const NOTIFICATION_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABaUlEQVR4nN3YsRGCQBCFYcog1EQLsBPLMLYIm7AOO7AFGzBwbAKHAIdR7u7t7ttjIdhEz+P/BGeQpt3umyUPe8MOnFAANNoFM2c4BRIh3ASJFK6CRI2HEZHjIUT0+CJiCfFZxFLikwgq4Hi7JN8736/JYQNEwaXJhSshHAA7XoDIAmjxjoButQDqte8M6EwAL4SwwQZAEcNaYvgkQLvJH+j3tffzQdk7haAC+lh0wgAk0Q4YG4ARb0ToAcx4A0IH8IhXIuQAz3gFQgaoES9EcAHtZofFAeuqA/qoYSjrhAAIgUTl4tB1IEB2L4RcFswzACDkN3PjzV+nw3csv4GpfbRnAD4L44NOHRyd3D5I/CoBWUTpErIiwEvI9lTCEosO+u2rH2xFiTc9mZshXgSojtDElwDVENp4BOB2qy3YN9uHAMz/mQ2fL7ahABPCK14KqAUR9WgAXhBVhwXAgpiOzwBoMLRjsgHV5wNfY41VhlM1sAAAAABJRU5ErkJggg==';

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
    iconUrl: NOTIFICATION_ICON_DATA_URL,
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

      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        sendResponse({
          ok: false,
          error: 'Cannot read Chrome system pages. Open an article, textbook, or web notes tab first.',
        });
        return;
      }

      try {
        const result = await chrome.tabs.sendMessage(tab.id, { type: 'READ_PAGE_CONTENT' });
        if (result && result.ok) {
          sendResponse(result);
          return;
        }
      } catch {
        // Content script not injected yet on this tab — inject dynamically below
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });

      const retryResult = await chrome.tabs.sendMessage(tab.id, { type: 'READ_PAGE_CONTENT' });
      sendResponse(retryResult || { ok: false, error: 'Unable to extract readable text from this page.' });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to access the active tab.',
      });
    }
  })();

  return true;
});
