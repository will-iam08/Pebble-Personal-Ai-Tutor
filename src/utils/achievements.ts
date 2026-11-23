import { AchievementDefinition, AchievementProgressItem, PetState } from '../types/study';
import { AnalyticsStore } from './analytics';
import { getLocalDateKey } from './missions';

const ACHIEVEMENTS_KEY = 'pebble_study_achievements_v1';

export type UnlockedAchievementsMap = Record<string, string>; // achievementId -> YYYY-MM-DD unlocked

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_summary',
    title: 'First Synthesis',
    description: 'Generate your first structured lecture summary.',
    target: 1,
    unit: 'summary',
    icon: 'book',
  },
  {
    id: 'summaries_10',
    title: 'Summarized 10 Articles',
    description: 'Synthesize 10 articles, PDFs, or lecture notes.',
    target: 10,
    unit: 'summaries',
    icon: 'library',
  },
  {
    id: 'streak_7',
    title: '7-Day Study Streak',
    description: 'Maintain consistent daily studying for 7 days in a row.',
    target: 7,
    unit: 'days',
    icon: 'flame',
  },
  {
    id: 'quiz_ace_15',
    title: 'Sharp Recall',
    description: 'Answer 15 interactive quiz questions correctly.',
    target: 15,
    unit: 'correct',
    icon: 'target',
  },
  {
    id: 'quizzes_5',
    title: 'Exam Ready',
    description: 'Complete 5 full AI-generated practice quizzes.',
    target: 5,
    unit: 'quizzes',
    icon: 'graduation',
  },
  {
    id: 'flashcards_20',
    title: 'Memory Architect',
    description: 'Master 20 active-recall flashcards.',
    target: 20,
    unit: 'cards',
    icon: 'layers',
  },
  {
    id: 'deep_focus_5h',
    title: '5-Hour Scholar',
    description: 'Accumulate 5 hours of active study time.',
    target: 5,
    unit: 'hours',
    icon: 'clock',
  },
  {
    id: 'companion_lv4',
    title: 'Leafkin Mentor',
    description: 'Grow your study companion to Level 4.',
    target: 4,
    unit: 'level',
    icon: 'award',
  },
];

export function loadUnlockedAchievements(): UnlockedAchievementsMap {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UnlockedAchievementsMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveUnlockedAchievements(map: UnlockedAchievementsMap): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

/** Counts consecutive active study days ending today (or yesterday if today not yet logged). */
export function computeAnalyticsStudyStreak(store: AnalyticsStore, todayDate: Date = new Date()): number {
  let streak = 0;
  const cursor = new Date(todayDate);

  const isDayActive = (key: string) => {
    const log = store[key];
    return Boolean(log && (log.studyMinutes >= 1 || log.summaries > 0 || log.quizAttempted > 0 || log.flashcards > 0));
  };

  // If today isn't active yet, check if yesterday's streak is still alive
  if (!isDayActive(getLocalDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 30; i++) {
    const key = getLocalDateKey(cursor);
    if (!isDayActive(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export interface AchievementMetrics {
  summariesGenerated: number;
  questionsCorrect: number;
  quizzesCompleted: number;
  flashcardsMastered: number;
  streakDays: number;
  totalStudyHours: number;
  petLevel: number;
}

export function getAchievementMetrics(
  pet: PetState,
  analyticsStore: AnalyticsStore,
  dailyMissionStreak: number
): AchievementMetrics {
  let totalMinutes = 0;
  for (const log of Object.values(analyticsStore)) {
    totalMinutes += log.studyMinutes || 0;
  }
  const analyticsStreak = computeAnalyticsStudyStreak(analyticsStore);

  return {
    summariesGenerated: pet.summariesGenerated,
    questionsCorrect: pet.questionsCorrect,
    quizzesCompleted: pet.quizzesCompleted,
    flashcardsMastered: pet.flashcardsMastered,
    streakDays: Math.max(dailyMissionStreak, analyticsStreak),
    totalStudyHours: Number((totalMinutes / 60).toFixed(1)),
    petLevel: pet.level,
  };
}

function metricValueFor(id: AchievementDefinition['id'], m: AchievementMetrics): number {
  switch (id) {
    case 'first_summary':
    case 'summaries_10':
      return m.summariesGenerated;
    case 'streak_7':
      return m.streakDays;
    case 'quiz_ace_15':
      return m.questionsCorrect;
    case 'quizzes_5':
      return m.quizzesCompleted;
    case 'flashcards_20':
      return m.flashcardsMastered;
    case 'deep_focus_5h':
      return m.totalStudyHours;
    case 'companion_lv4':
      return m.petLevel;
  }
}

export function evaluateAchievements(
  unlockedMap: UnlockedAchievementsMap,
  metrics: AchievementMetrics
): {
  nextUnlockedMap: UnlockedAchievementsMap;
  newlyUnlocked: AchievementDefinition[];
  items: AchievementProgressItem[];
} {
  const today = getLocalDateKey();
  const nextUnlockedMap: UnlockedAchievementsMap = { ...unlockedMap };
  const newlyUnlocked: AchievementDefinition[] = [];

  const items: AchievementProgressItem[] = ACHIEVEMENT_DEFINITIONS.map((def) => {
    const rawCurrent = metricValueFor(def.id, metrics);
    const alreadyUnlockedAt = nextUnlockedMap[def.id] || null;
    const reachedNow = rawCurrent >= def.target;

    let unlockedAt = alreadyUnlockedAt;
    if (!unlockedAt && reachedNow) {
      unlockedAt = today;
      nextUnlockedMap[def.id] = today;
      newlyUnlocked.push(def);
    }

    const isUnlocked = Boolean(unlockedAt);
    const current = isUnlocked ? def.target : Math.min(def.target, rawCurrent);

    return {
      ...def,
      current,
      unlocked: isUnlocked,
      unlockedAt,
    };
  });

  return { nextUnlockedMap, newlyUnlocked, items };
}

/** Non-destructive sample achievement preview used only when Sample mode is active in Analytics. */
export function buildSampleAchievements(): AchievementProgressItem[] {
  const sampleMetrics: AchievementMetrics = {
    summariesGenerated: 12,
    questionsCorrect: 28,
    quizzesCompleted: 4,
    flashcardsMastered: 24,
    streakDays: 7,
    totalStudyHours: 7.3,
    petLevel: 3,
  };

  const today = getLocalDateKey();
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const rawCurrent = metricValueFor(def.id, sampleMetrics);
    const unlocked = rawCurrent >= def.target;
    return {
      ...def,
      current: unlocked ? def.target : rawCurrent,
      unlocked,
      unlockedAt: unlocked ? today : null,
    };
  });
}

export function formatUnlockedDate(dateKey: string | null): string {
  if (!dateKey) return '';
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3) return dateKey;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
