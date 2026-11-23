export type TutorTab = 'summary' | 'quiz' | 'tips' | 'chat' | 'vocab' | 'analytics';

export type ThemeMode = 'light' | 'dark';

export type LearnerLevel = 'high_school' | 'undergrad' | 'grad';

export type TutorStyle = 'socratic' | 'direct';

export interface TutorProfile {
  learnerLevel: LearnerLevel;
  tutorStyle: TutorStyle;
}

export interface ReminderSettings {
  enabled: boolean;
  intervalHours: number;
  lastCheckInAt: number;
}

export type PetStage = 'Seedling' | 'Sproutling' | 'Leafkin' | 'Scholar';

export type AccessoryId = 'glasses' | 'headphones' | 'beret' | 'scarf' | 'bowtie';

export interface AccessoryItem {
  id: AccessoryId;
  name: string;
  cost: number; // Study Treats
  description: string;
}

export interface PetState {
  name: string;
  fullness: number; // 0 - 100
  mood: number; // 0 - 100
  xp: number;
  level: number;
  treats: number; // Study Treats earned from studying
  ownedAccessories: AccessoryId[];
  equippedAccessories: AccessoryId[];
  lastSavedAt: number;
  summariesGenerated: number;
  quizzesCompleted: number;
  questionsCorrect: number;
  flashcardsMastered: number;
}

export type PetReactionType = 'idle' | 'eat' | 'pet' | 'cheer' | 'startled' | 'levelup';

export interface PetReaction {
  type: PetReactionType;
  nonce: number;
  caption: string;
}

export interface PetRewardPayload {
  fullness?: number;
  mood?: number;
  treats?: number;
  xp?: number;
  reaction?: PetReactionType;
  caption?: string;
  summariesDelta?: number;
  quizzesDelta?: number;
  correctDelta?: number;
  flashcardsDelta?: number;
}

export type MissionMetric =
  | 'summaries'
  | 'quiz_correct'
  | 'quiz_complete'
  | 'flashcards'
  | 'chat_questions'
  | 'pet_feed'
  | 'pet_pat';

export interface DailyMission {
  id: string;
  title: string;
  metric: MissionMetric;
  target: number;
  progress: number;
  rewardTreats: number;
  rewardXp: number;
  claimed: boolean;
}

export interface DailyMissionState {
  dateKey: string;
  missions: DailyMission[];
  bonusClaimed: boolean;
  streak: number;
  lastCompletedDateKey: string | null;
}

export interface CompletedMissionRecord {
  id: string;
  title: string;
  metric: MissionMetric;
  rewardXp: number;
  rewardTreats: number;
  dateKey: string;
  completedAt: number;
}

export interface MissionHistoryDay {
  dateKey: string;
  dayLabel: string;
  shortDayLabel: string;
  isToday: boolean;
  completedMissions: CompletedMissionRecord[];
  totalMissions: number;
}

export type MissionEvent =
  | { type: 'summary_generated' }
  | { type: 'quiz_correct'; count?: number }
  | { type: 'quiz_completed' }
  | { type: 'flashcard_reviewed' }
  | { type: 'chat_asked' }
  | { type: 'pet_feed' }
  | { type: 'pet_pat' };

export interface StudySource {
  kind: 'page' | 'pdf' | 'notes' | 'image' | 'youtube';
  title: string;
  url?: string;
  wordCount?: number;
  fileSizeLabel?: string;
  text?: string;
  pdfBase64?: string;
  pdfName?: string;
  imageBase64?: string;
  imageMimeType?: string;
  imageDataUrl?: string;
}

export interface LectureSummaryData {
  topicTitle: string;
  difficulty: string;
  tldr: string;
  keyConcepts: Array<{ term: string; explanation: string }>;
  formulasAndDefinitions: Array<{ label: string; expression: string; meaning: string }>;
  examTraps: Array<{ trap: string; howToAvoid: string }>;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'short';
  question: string;
  options?: string[];
  correctIndex?: number;
  sampleAnswer?: string;
  keyPoints?: string[];
  explanation: string;
}

export interface QuizData {
  quizTitle: string;
  questions: QuizQuestion[];
}

export interface ShortAnswerGrade {
  isCorrect: boolean;
  scorePct: number;
  feedback: string;
  stepByStep: string;
}

export interface StudyTipsData {
  difficultyLevel: string;
  estimatedMinutes: number;
  focusAdvice: string;
  strategies: Array<{ title: string; description: string }>;
  mnemonics: Array<{ concept: string; hook: string }>;
  flashcards: Array<{ front: string; back: string; hint?: string }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export type VocabOrigin = 'summary' | 'chat' | 'manual';

export interface VocabDefinitionResult {
  simpleDefinition: string;
  analogyOrExample: string;
  memoryCue: string;
}

export interface VocabEntry {
  id: string;
  term: string;
  origin: VocabOrigin;
  sourceTitle?: string;
  contextSnippet?: string;
  simpleDefinition?: string;
  analogyOrExample?: string;
  memoryCue?: string;
  savedAt: number;
  mastered: boolean;
}

export type PomodoroPhase = 'focus' | 'break';

export interface PomodoroState {
  phase: PomodoroPhase;
  focusMinutes: number;
  breakMinutes: number;
  secondsLeft: number;
  running: boolean;
  completedSessions: number;
}

export interface DailyStudyLog {
  dateKey: string; // Local YYYY-MM-DD
  studyMinutes: number;
  summaries: number;
  quizCorrect: number;
  quizAttempted: number;
  flashcards: number;
}

export interface WeeklyAnalyticsDay {
  dateKey: string;
  dayLabel: string;
  isToday: boolean;
  hours: number;
  studyMinutes: number;
  summaries: number;
  quizAccuracy: number | null;
  quizCorrect: number;
  quizAttempted: number;
  flashcards: number;
}

export type AchievementId =
  | 'first_summary'
  | 'summaries_10'
  | 'streak_7'
  | 'quiz_ace_15'
  | 'quizzes_5'
  | 'flashcards_20'
  | 'deep_focus_5h'
  | 'companion_lv4';

export type AchievementIconKey =
  | 'book'
  | 'library'
  | 'flame'
  | 'target'
  | 'graduation'
  | 'layers'
  | 'clock'
  | 'award';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  target: number;
  unit: string;
  icon: AchievementIconKey;
}

export interface AchievementProgressItem extends AchievementDefinition {
  current: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export const ACCESSORIES: AccessoryItem[] = [
  {
    id: 'glasses',
    name: 'Round Specs',
    cost: 4,
    description: 'Brass lecture frames for focused reading',
  },
  {
    id: 'scarf',
    name: 'Autumn Scarf',
    cost: 6,
    description: 'Soft knit wrap for library nights',
  },
  {
    id: 'headphones',
    name: 'Study Cans',
    cost: 8,
    description: 'Deep-focus noise isolation',
  },
  {
    id: 'bowtie',
    name: 'Sage Bowtie',
    cost: 10,
    description: 'Seminar presentation attire',
  },
  {
    id: 'beret',
    name: 'Scholar Beret',
    cost: 14,
    description: 'Distinguished academic cap',
  },
];

export function getPetStage(level: number): PetStage {
  if (level >= 7) return 'Scholar';
  if (level >= 4) return 'Leafkin';
  if (level >= 2) return 'Sproutling';
  return 'Seedling';
}

export function getXpForLevel(level: number): number {
  return 60 + (level - 1) * 40;
}

export function getFullnessLabel(fullness: number): string {
  if (fullness >= 80) return 'Nourished';
  if (fullness >= 50) return 'Content';
  if (fullness >= 25) return 'Peckish';
  return 'Hungry';
}

export function getMoodLabel(mood: number): string {
  if (mood >= 80) return 'Focused';
  if (mood >= 50) return 'Cozy';
  if (mood >= 25) return 'Sleepy';
  return 'Resting';
}
