import {
  CompletedMissionRecord,
  DailyMission,
  DailyMissionState,
  MissionEvent,
  MissionHistoryDay,
} from '../types/study';

const MISSIONS_KEY = 'pebble_study_missions_v2';
const MISSION_HISTORY_KEY = 'pebble_mission_history_v1';

export type MissionHistoryStore = Record<string, CompletedMissionRecord[]>;

export const DAILY_ALL_CLEAR_REWARD = {
  treats: 5,
  xp: 45,
};

interface MissionTemplate {
  id: string;
  title: string;
  metric: DailyMission['metric'];
  target: number;
  rewardTreats: number;
  rewardXp: number;
}

const READING_TEMPLATES: MissionTemplate[] = [
  {
    id: 'summary_1',
    title: 'Generate 1 lecture summary',
    metric: 'summaries',
    target: 1,
    rewardTreats: 2,
    rewardXp: 20,
  },
  {
    id: 'chat_2',
    title: 'Ask Pebble 2 tutor questions',
    metric: 'chat_questions',
    target: 2,
    rewardTreats: 2,
    rewardXp: 20,
  },
  {
    id: 'flashcards_4',
    title: 'Review 4 active-recall flashcards',
    metric: 'flashcards',
    target: 4,
    rewardTreats: 3,
    rewardXp: 25,
  },
];

const QUIZ_TEMPLATES: MissionTemplate[] = [
  {
    id: 'quiz_correct_4',
    title: 'Answer 4 quiz questions correctly',
    metric: 'quiz_correct',
    target: 4,
    rewardTreats: 3,
    rewardXp: 30,
  },
  {
    id: 'quiz_correct_6',
    title: 'Answer 6 quiz questions correctly',
    metric: 'quiz_correct',
    target: 6,
    rewardTreats: 4,
    rewardXp: 40,
  },
  {
    id: 'quiz_complete_1',
    title: 'Complete 1 interactive quiz',
    metric: 'quiz_complete',
    target: 1,
    rewardTreats: 3,
    rewardXp: 30,
  },
];

const COMPANION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'pet_feed_2',
    title: 'Feed Pebble 2 study treats',
    metric: 'pet_feed',
    target: 2,
    rewardTreats: 2,
    rewardXp: 15,
  },
  {
    id: 'pet_pat_3',
    title: 'Pat Pebble 3 times during study',
    metric: 'pet_pat',
    target: 3,
    rewardTreats: 2,
    rewardXp: 15,
  },
];

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPreviousDateKey(date: Date = new Date()): string {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  return getLocalDateKey(prev);
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)];
}

export function generateDailyMissions(dateKey: string): DailyMission[] {
  const rand = createRng(hashString(`study#${dateKey}`));
  const picks = [
    pickFrom(READING_TEMPLATES, rand),
    pickFrom(QUIZ_TEMPLATES, rand),
    pickFrom(COMPANION_TEMPLATES, rand),
  ];

  return picks.map((tpl) => ({
    ...tpl,
    progress: 0,
    claimed: false,
  }));
}

export function loadDailyMissionState(): DailyMissionState {
  const today = getLocalDateKey();
  const yesterday = getPreviousDateKey();

  try {
    const raw = localStorage.getItem(MISSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DailyMissionState>;
      if (parsed.dateKey === today && Array.isArray(parsed.missions) && parsed.missions.length === 3) {
        return {
          dateKey: today,
          missions: parsed.missions,
          bonusClaimed: Boolean(parsed.bonusClaimed),
          streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
          lastCompletedDateKey: parsed.lastCompletedDateKey ?? null,
        };
      }

      // Archive any completed missions from the prior day before rolling over
      if (parsed.dateKey && Array.isArray(parsed.missions)) {
        const prevCompleted = parsed.missions.filter((m) => m.progress >= m.target);
        if (prevCompleted.length > 0) {
          const existingHistory = loadMissionHistory();
          const synced = syncCompletedMissionsToHistory(existingHistory, {
            dateKey: parsed.dateKey,
            missions: parsed.missions,
            bonusClaimed: Boolean(parsed.bonusClaimed),
            streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
            lastCompletedDateKey: parsed.lastCompletedDateKey ?? null,
          });
          saveMissionHistory(synced);
        }
      }

      const keptStreak =
        parsed.lastCompletedDateKey === yesterday || parsed.lastCompletedDateKey === today
          ? parsed.streak ?? 0
          : 0;

      return {
        dateKey: today,
        missions: generateDailyMissions(today),
        bonusClaimed: false,
        streak: keptStreak,
        lastCompletedDateKey: parsed.lastCompletedDateKey ?? null,
      };
    }
  } catch {
    // Fall through
  }

  return {
    dateKey: today,
    missions: generateDailyMissions(today),
    bonusClaimed: false,
    streak: 0,
    lastCompletedDateKey: null,
  };
}

export function saveDailyMissionState(state: DailyMissionState): void {
  try {
    localStorage.setItem(MISSIONS_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function applyMissionEvent(
  state: DailyMissionState,
  event: MissionEvent
): { nextState: DailyMissionState; newlyCompletedTitles: string[] } {
  const newlyCompletedTitles: string[] = [];
  let changed = false;

  const nextMissions = state.missions.map((m) => {
    if (m.progress >= m.target) return m;
    let nextProgress = m.progress;

    switch (event.type) {
      case 'summary_generated':
        if (m.metric === 'summaries') nextProgress = Math.min(m.target, m.progress + 1);
        break;
      case 'quiz_correct':
        if (m.metric === 'quiz_correct') nextProgress = Math.min(m.target, m.progress + (event.count ?? 1));
        break;
      case 'quiz_completed':
        if (m.metric === 'quiz_complete') nextProgress = Math.min(m.target, m.progress + 1);
        break;
      case 'flashcard_reviewed':
        if (m.metric === 'flashcards') nextProgress = Math.min(m.target, m.progress + 1);
        break;
      case 'chat_asked':
        if (m.metric === 'chat_questions') nextProgress = Math.min(m.target, m.progress + 1);
        break;
      case 'pet_feed':
        if (m.metric === 'pet_feed') nextProgress = Math.min(m.target, m.progress + 1);
        break;
      case 'pet_pat':
        if (m.metric === 'pet_pat') nextProgress = Math.min(m.target, m.progress + 1);
        break;
    }

    if (nextProgress !== m.progress) {
      changed = true;
      if (nextProgress >= m.target && m.progress < m.target) {
        newlyCompletedTitles.push(m.title);
      }
      return { ...m, progress: nextProgress };
    }
    return m;
  });

  if (!changed) return { nextState: state, newlyCompletedTitles };
  return { nextState: { ...state, missions: nextMissions }, newlyCompletedTitles };
}

export function loadMissionHistory(): MissionHistoryStore {
  try {
    const raw = localStorage.getItem(MISSION_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MissionHistoryStore;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveMissionHistory(store: MissionHistoryStore): void {
  try {
    const keys = Object.keys(store).sort().slice(-30);
    const trimmed: MissionHistoryStore = {};
    for (const key of keys) {
      trimmed[key] = store[key];
    }
    localStorage.setItem(MISSION_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
}

export function syncCompletedMissionsToHistory(
  history: MissionHistoryStore,
  missionState: DailyMissionState
): MissionHistoryStore {
  const completedToday = missionState.missions.filter((m) => m.progress >= m.target);
  if (completedToday.length === 0) return history;

  const existingDay = history[missionState.dateKey] || [];
  const existingIds = new Set(existingDay.map((r) => r.id));
  const additions: CompletedMissionRecord[] = [];

  for (const m of completedToday) {
    if (!existingIds.has(m.id)) {
      additions.push({
        id: m.id,
        title: m.title,
        metric: m.metric,
        rewardXp: m.rewardXp,
        rewardTreats: m.rewardTreats,
        dateKey: missionState.dateKey,
        completedAt: Date.now(),
      });
    }
  }

  if (additions.length === 0) return history;

  return {
    ...history,
    [missionState.dateKey]: [...existingDay, ...additions],
  };
}

function formatDayHeading(date: Date, offsetFromToday: number): string {
  if (offsetFromToday === 0) return 'Today';
  if (offsetFromToday === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function buildPastSevenDaysMissionHistory(
  history: MissionHistoryStore,
  todayDate: Date = new Date()
): MissionHistoryDay[] {
  const days: MissionHistoryDay[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - offset);
    const dateKey = getLocalDateKey(d);
    const shortDayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    days.push({
      dateKey,
      dayLabel: formatDayHeading(d, offset),
      shortDayLabel,
      isToday: offset === 0,
      completedMissions: history[dateKey] || [],
      totalMissions: 3,
    });
  }

  return days;
}

export function buildSampleMissionHistory(todayDate: Date = new Date()): MissionHistoryDay[] {
  // Deterministic realistic 7-day pattern (most recent first: Today .. 6 days ago)
  const completedCounts = [2, 3, 2, 3, 1, 3, 2];
  const days: MissionHistoryDay[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - offset);
    const dateKey = getLocalDateKey(d);
    const shortDayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    const dayMissions = generateDailyMissions(dateKey);
    const count = completedCounts[offset] ?? 2;
    const completed: CompletedMissionRecord[] = dayMissions.slice(0, count).map((m, idx) => ({
      id: m.id,
      title: m.title,
      metric: m.metric,
      rewardXp: m.rewardXp,
      rewardTreats: m.rewardTreats,
      dateKey,
      completedAt: d.getTime() - idx * 3600000,
    }));

    days.push({
      dateKey,
      dayLabel: formatDayHeading(d, offset),
      shortDayLabel,
      isToday: offset === 0,
      completedMissions: completed,
      totalMissions: 3,
    });
  }

  return days;
}

