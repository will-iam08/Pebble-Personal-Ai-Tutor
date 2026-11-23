import { DailyStudyLog, WeeklyAnalyticsDay } from '../types/study';
import { getLocalDateKey } from './missions';

const ANALYTICS_KEY = 'pebble_study_analytics_v1';

export type AnalyticsStore = Record<string, DailyStudyLog>;

function createEmptyDay(dateKey: string): DailyStudyLog {
  return {
    dateKey,
    studyMinutes: 0,
    summaries: 0,
    quizCorrect: 0,
    quizAttempted: 0,
    flashcards: 0,
  };
}

export function loadAnalyticsStore(): AnalyticsStore {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AnalyticsStore;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveAnalyticsStore(store: AnalyticsStore): void {
  try {
    // Keep last 30 days so localStorage stays lean
    const keys = Object.keys(store).sort().slice(-30);
    const trimmed: AnalyticsStore = {};
    for (const k of keys) {
      trimmed[k] = store[k];
    }
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore quota errors
  }
}

export function recordStudyDelta(
  store: AnalyticsStore,
  delta: Partial<Omit<DailyStudyLog, 'dateKey'>>
): AnalyticsStore {
  const today = getLocalDateKey();
  const existing = store[today] || createEmptyDay(today);
  return {
    ...store,
    [today]: {
      dateKey: today,
      studyMinutes: Math.max(0, existing.studyMinutes + (delta.studyMinutes ?? 0)),
      summaries: Math.max(0, existing.summaries + (delta.summaries ?? 0)),
      quizCorrect: Math.max(0, existing.quizCorrect + (delta.quizCorrect ?? 0)),
      quizAttempted: Math.max(0, existing.quizAttempted + (delta.quizAttempted ?? 0)),
      flashcards: Math.max(0, existing.flashcards + (delta.flashcards ?? 0)),
    },
  };
}

export function buildRollingWeekSeries(store: AnalyticsStore, todayDate: Date = new Date()): WeeklyAnalyticsDay[] {
  const todayKey = getLocalDateKey(todayDate);
  const days: WeeklyAnalyticsDay[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - offset);
    const dateKey = getLocalDateKey(d);
    const log = store[dateKey] || createEmptyDay(dateKey);
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    const hours = Number((log.studyMinutes / 60).toFixed(2));
    const quizAccuracy =
      log.quizAttempted > 0 ? Math.round((log.quizCorrect / log.quizAttempted) * 100) : null;

    days.push({
      dateKey,
      dayLabel,
      isToday: dateKey === todayKey,
      hours,
      studyMinutes: Math.round(log.studyMinutes),
      summaries: log.summaries,
      quizAccuracy,
      quizCorrect: log.quizCorrect,
      quizAttempted: log.quizAttempted,
      flashcards: log.flashcards,
    });
  }

  return days;
}

// Optional non-destructive sample week preview so students can visualize a full 7-day trend on day 1
export function buildSampleWeekSeries(todayDate: Date = new Date()): WeeklyAnalyticsDay[] {
  const samplePattern = [
    { minutes: 42, summaries: 1, correct: 4, attempted: 6, flashcards: 4 },
    { minutes: 68, summaries: 2, correct: 6, attempted: 8, flashcards: 6 },
    { minutes: 35, summaries: 1, correct: 5, attempted: 6, flashcards: 3 },
    { minutes: 84, summaries: 2, correct: 8, attempted: 10, flashcards: 8 },
    { minutes: 55, summaries: 1, correct: 7, attempted: 8, flashcards: 5 },
    { minutes: 92, summaries: 3, correct: 9, attempted: 10, flashcards: 9 },
    { minutes: 64, summaries: 2, correct: 9, attempted: 10, flashcards: 6 },
  ];

  const todayKey = getLocalDateKey(todayDate);
  return samplePattern.map((item, idx) => {
    const offset = 6 - idx;
    const d = new Date(todayDate);
    d.setDate(d.getDate() - offset);
    const dateKey = getLocalDateKey(d);
    return {
      dateKey,
      dayLabel: d.toLocaleDateString(undefined, { weekday: 'short' }),
      isToday: dateKey === todayKey,
      hours: Number((item.minutes / 60).toFixed(2)),
      studyMinutes: item.minutes,
      summaries: item.summaries,
      quizAccuracy: Math.round((item.correct / item.attempted) * 100),
      quizCorrect: item.correct,
      quizAttempted: item.attempted,
      flashcards: item.flashcards,
    };
  });
}
