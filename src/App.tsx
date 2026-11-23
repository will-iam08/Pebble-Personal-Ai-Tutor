/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Coffee, Maximize2, Minimize2, Moon, Settings, Sun, Timer, Volume2, VolumeX } from 'lucide-react';
import {
  ACCESSORIES,
  AccessoryId,
  ChatMessage,
  DailyMissionState,
  getPetStage,
  getXpForLevel,
  LectureSummaryData,
  MissionEvent,
  PetReaction,
  PetRewardPayload,
  PetState,
  PomodoroPhase,
  PomodoroState,
  QuizData,
  ReminderSettings,
  StudySource,
  StudyTipsData,
  ThemeMode,
  TutorTab,
  VocabEntry,
  VocabOrigin,
} from './types/study';
import { SAMPLE_BROWSER_PAGES, SampleBrowserPage } from './data/samplePages';
import { soundEngine } from './utils/audio';
import {
  loadMuted,
  loadPetState,
  loadReminderSettings,
  loadTheme,
  saveMuted,
  savePetState,
  saveReminderSettings,
  saveTheme,
} from './utils/storage';
import {
  applyMissionEvent,
  DAILY_ALL_CLEAR_REWARD,
  getLocalDateKey,
  loadDailyMissionState,
  loadMissionHistory,
  MissionHistoryStore,
  saveDailyMissionState,
  saveMissionHistory,
  syncCompletedMissionsToHistory,
} from './utils/missions';
import {
  AnalyticsStore,
  loadAnalyticsStore,
  recordStudyDelta,
  saveAnalyticsStore,
} from './utils/analytics';
import {
  evaluateAchievements,
  getAchievementMetrics,
  loadUnlockedAchievements,
  saveUnlockedAchievements,
  UnlockedAchievementsMap,
} from './utils/achievements';
import {
  fetchInteractiveQuiz,
  fetchLectureSummary,
  fetchStudyTips,
  fetchVocabDefinition,
  sendTutorChat,
} from './utils/tutorApi';
import {
  createVocabEntry,
  loadVocabEntries,
  normalizeTermKey,
  saveVocabEntries,
} from './utils/vocab';
import {
  exportChatFile,
  exportCombinedStudyPack,
  ExportFormat,
  exportSummaryFile,
} from './utils/exportStudy';
import { PebbleIcon } from './components/PebbleLogo';
import { BrowserStudyPane } from './components/BrowserStudyPane';
import { formatCountdown, PetCompanionHeader } from './components/PetCompanionHeader';
import { SourceReaderBar } from './components/SourceReaderBar';
import { SummaryTab } from './components/SummaryTab';
import { QuizTab } from './components/QuizTab';
import { StudyTipsTab } from './components/StudyTipsTab';
import { ChatTab } from './components/ChatTab';
import { VocabTab } from './components/VocabTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsModal } from './components/SettingsModal';

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [muted, setMuted] = useState<boolean>(() => {
    const m = loadMuted();
    soundEngine.setMuted(m);
    return m;
  });
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [activePage, setActivePage] = useState<SampleBrowserPage>(SAMPLE_BROWSER_PAGES[0]);
  const [justExtracted, setJustExtracted] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);

  const [activeTab, setActiveTab] = useState<TutorTab>('summary');
  const [source, setSource] = useState<StudySource | null>(null);

  // AI Tutor Outputs & Loading/Error States
  const [summaryData, setSummaryData] = useState<LectureSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [tipsData, setTipsData] = useState<StudyTipsData | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [vocabEntries, setVocabEntries] = useState<VocabEntry[]>(() => loadVocabEntries());
  const [definingVocabIds, setDefiningVocabIds] = useState<Record<string, boolean>>({});

  const [pomodoro, setPomodoro] = useState<PomodoroState>({
    phase: 'focus',
    focusMinutes: 25,
    breakMinutes: 5,
    secondsLeft: 25 * 60,
    running: false,
    completedSessions: 0,
  });
  const [pomodoroNotice, setPomodoroNotice] = useState<{
    kind: 'break' | 'focus';
    minutes: number;
  } | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  // Study Companion Pet, Daily Study Missions, Analytics & Check-In Reminder Scheduler
  const [pet, setPet] = useState<PetState>(() => loadPetState());
  const [missionState, setMissionState] = useState<DailyMissionState>(() => loadDailyMissionState());
  const [missionHistory, setMissionHistory] = useState<MissionHistoryStore>(() =>
    syncCompletedMissionsToHistory(loadMissionHistory(), loadDailyMissionState())
  );
  const [analyticsStore, setAnalyticsStore] = useState<AnalyticsStore>(() => loadAnalyticsStore());
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievementsMap>(() =>
    loadUnlockedAchievements()
  );
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() =>
    loadReminderSettings()
  );
  const [reminderToastVisible, setReminderToastVisible] = useState(false);
  const [snackTrigger, setSnackTrigger] = useState(0);
  const [reaction, setReaction] = useState<PetReaction>({
    type: 'idle',
    nonce: 0,
    caption: 'Ready to study! Read the active page or drop a lecture PDF.',
  });

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    savePetState(pet);
  }, [pet]);

  useEffect(() => {
    saveDailyMissionState(missionState);
    setMissionHistory((prev) => syncCompletedMissionsToHistory(prev, missionState));
  }, [missionState]);

  useEffect(() => {
    saveMissionHistory(missionHistory);
  }, [missionHistory]);

  useEffect(() => {
    saveAnalyticsStore(analyticsStore);
  }, [analyticsStore]);

  useEffect(() => {
    saveUnlockedAchievements(unlockedAchievements);
  }, [unlockedAchievements]);

  useEffect(() => {
    saveVocabEntries(vocabEntries);
  }, [vocabEntries]);

  useEffect(() => {
    saveReminderSettings(reminderSettings);
  }, [reminderSettings]);

  // Pomodoro 1-second tick loop
  useEffect(() => {
    if (!pomodoro.running) return;
    const id = window.setInterval(() => {
      setPomodoro((prev) => {
        if (!prev.running) return prev;
        if (prev.secondsLeft > 1) {
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        }
        return { ...prev, secondsLeft: 0 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [pomodoro.running]);

  // Press Escape to exit Focus Mode when no modal is open
  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !settingsOpen) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, settingsOpen]);

  // Track active study time every 30s while the Side Panel is open and tab is visible
  useEffect(() => {
    if (!sidePanelOpen) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setAnalyticsStore((prev) => recordStudyDelta(prev, { studyMinutes: 0.5 }));
      }
    }, 30000);
    return () => window.clearInterval(id);
  }, [sidePanelOpen]);

  // Auto-refresh daily study goals at local midnight
  useEffect(() => {
    const id = window.setInterval(() => {
      const today = getLocalDateKey();
      setMissionState((prev) => (prev.dateKey === today ? prev : loadDailyMissionState()));
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  // Gentle study-session vitality drift (never punishing)
  useEffect(() => {
    const id = window.setInterval(() => {
      setPet((prev) => ({
        ...prev,
        fullness: Math.max(35, prev.fullness - 1),
        mood: Math.max(35, prev.mood - 0.8),
      }));
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  const triggerReaction = useCallback((type: PetReaction['type'], caption: string) => {
    setReaction((prev) => ({ type, nonce: prev.nonce + 1, caption }));
  }, []);

  // Level-up & mission-ready effect watchers
  const prevLevelRef = useRef(pet.level);
  useEffect(() => {
    if (pet.level > prevLevelRef.current) {
      const stage = getPetStage(pet.level);
      soundEngine.playLevelUp();
      triggerReaction('levelup', `${pet.name} evolved to Lv.${pet.level} (${stage})!`);
    }
    prevLevelRef.current = pet.level;
  }, [pet.level, pet.name, triggerReaction]);

  const completedIdsRef = useRef<Set<string>>(
    new Set(missionState.missions.filter((m) => m.progress >= m.target).map((m) => m.id))
  );
  useEffect(() => {
    const nowDone = new Set(
      missionState.missions.filter((m) => m.progress >= m.target).map((m) => m.id)
    );
    const newlyCompleted = missionState.missions.find(
      (m) => nowDone.has(m.id) && !completedIdsRef.current.has(m.id)
    );
    completedIdsRef.current = nowDone;
    if (newlyCompleted) {
      soundEngine.playReward();
      triggerReaction('cheer', `Daily goal ready to claim: ${newlyCompleted.title}!`);
    }
  }, [missionState.missions, triggerReaction]);

  // Evaluate & permanently unlock milestone achievements
  const achievementEvaluation = useMemo(() => {
    const metrics = getAchievementMetrics(pet, analyticsStore, missionState.streak);
    return evaluateAchievements(unlockedAchievements, metrics);
  }, [analyticsStore, missionState.streak, pet, unlockedAchievements]);

  useEffect(() => {
    if (achievementEvaluation.newlyUnlocked.length === 0) return;
    setUnlockedAchievements(achievementEvaluation.nextUnlockedMap);
    soundEngine.playReward();
    const first = achievementEvaluation.newlyUnlocked[0];
    triggerReaction('cheer', `Achievement unlocked: ${first.title}!`);
  }, [achievementEvaluation, triggerReaction]);

  // Trigger automatic Break / Focus notification whenever Pomodoro countdown hits 00:00
  useEffect(() => {
    if (!pomodoro.running || pomodoro.secondsLeft !== 0) return;

    if (pomodoro.phase === 'focus') {
      soundEngine.playLevelUp();
      setPomodoro((prev) => ({
        ...prev,
        phase: 'break',
        secondsLeft: prev.breakMinutes * 60,
        running: true,
        completedSessions: prev.completedSessions + 1,
      }));
      setPomodoroNotice({ kind: 'break', minutes: pomodoro.breakMinutes });
      setAnalyticsStore((prev) => recordStudyDelta(prev, { studyMinutes: pomodoro.focusMinutes }));
      setPet((prev) => {
        let nextXp = prev.xp + 15;
        let nextLevel = prev.level;
        while (nextXp >= getXpForLevel(nextLevel)) {
          nextXp -= getXpForLevel(nextLevel);
          nextLevel += 1;
        }
        return {
          ...prev,
          xp: nextXp,
          level: nextLevel,
          treats: prev.treats + 2,
          mood: Math.min(100, prev.mood + 10),
        };
      });
      triggerReaction(
        'cheer',
        `Focus session complete! Time for a ${pomodoro.breakMinutes}-min break (+15 XP, +2 treats).`
      );
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(`Break Time — ${pet.name}`, {
            body: `Great ${pomodoro.focusMinutes}-minute focus block! Take a ${pomodoro.breakMinutes}-minute break.`,
          });
        } catch {
          // Ignore browser notification errors in restricted iframes
        }
      }
    } else {
      soundEngine.playReward();
      setPomodoro((prev) => ({
        ...prev,
        phase: 'focus',
        secondsLeft: prev.focusMinutes * 60,
        running: false,
      }));
      setPomodoroNotice({ kind: 'focus', minutes: pomodoro.focusMinutes });
      triggerReaction('idle', 'Break finished! Start your next focus block when ready.');
    }
  }, [
    pet.name,
    pomodoro.breakMinutes,
    pomodoro.focusMinutes,
    pomodoro.phase,
    pomodoro.running,
    pomodoro.secondsLeft,
    triggerReaction,
  ]);

  const handlePetReward = useCallback(
    (reward: PetRewardPayload) => {
      setPet((prev) => {
        let nextXp = prev.xp + (reward.xp ?? 0);
        let nextLevel = prev.level;
        while (nextXp >= getXpForLevel(nextLevel)) {
          nextXp -= getXpForLevel(nextLevel);
          nextLevel += 1;
        }
        return {
          ...prev,
          fullness: Math.min(100, Math.max(0, prev.fullness + (reward.fullness ?? 0))),
          mood: Math.min(100, Math.max(0, prev.mood + (reward.mood ?? 0))),
          treats: Math.max(0, prev.treats + (reward.treats ?? 0)),
          xp: nextXp,
          level: nextLevel,
          summariesGenerated: prev.summariesGenerated + (reward.summariesDelta ?? 0),
          quizzesCompleted: prev.quizzesCompleted + (reward.quizzesDelta ?? 0),
          questionsCorrect: prev.questionsCorrect + (reward.correctDelta ?? 0),
          flashcardsMastered: prev.flashcardsMastered + (reward.flashcardsDelta ?? 0),
        };
      });

      if (reward.reaction && reward.caption) {
        triggerReaction(reward.reaction, reward.caption);
      }
    },
    [triggerReaction]
  );

  const handleMissionEvent = useCallback((event: MissionEvent) => {
    setMissionState((prev) => applyMissionEvent(prev, event).nextState);
  }, []);

  const handleFeedTreat = useCallback(() => {
    soundEngine.playTreatToss();
    setSnackTrigger((n) => n + 1);
    if (pet.treats > 0) {
      handlePetReward({
        treats: -1,
        fullness: 24,
        mood: 14,
        xp: 12,
        reaction: 'eat',
        caption: `${pet.name} munched a Study Treat! +12 XP.`,
      });
      handleMissionEvent({ type: 'pet_feed' });
    } else {
      handlePetReward({
        fullness: 8,
        mood: 5,
        xp: 2,
        reaction: 'eat',
        caption: 'Gave a light nibble! Generate summaries or pass quizzes for Study Treats.',
      });
    }
  }, [handleMissionEvent, handlePetReward, pet.name, pet.treats]);

  const handlePatPet = useCallback(() => {
    soundEngine.playPetPurr();
    handlePetReward({
      mood: 12,
      xp: 3,
      reaction: 'pet',
      caption: `${pet.name} is cheered up and ready for the next concept.`,
    });
    handleMissionEvent({ type: 'pet_pat' });
  }, [handleMissionEvent, handlePetReward, pet.name]);

  const handleToggleAccessory = useCallback(
    (id: AccessoryId) => {
      const item = ACCESSORIES.find((a) => a.id === id);
      if (!item) return;

      setPet((prev) => {
        const owned = prev.ownedAccessories.includes(id);
        if (!owned) {
          if (prev.treats < item.cost) return prev;
          soundEngine.playReward();
          return {
            ...prev,
            treats: prev.treats - item.cost,
            ownedAccessories: [...prev.ownedAccessories, id],
            equippedAccessories: [...prev.equippedAccessories, id],
          };
        }

        soundEngine.playUiClick();
        const equipped = prev.equippedAccessories.includes(id);
        return {
          ...prev,
          equippedAccessories: equipped
            ? prev.equippedAccessories.filter((x) => x !== id)
            : [...prev.equippedAccessories, id],
        };
      });
      triggerReaction('cheer', `${pet.name} tried on ${item.name}!`);
    },
    [pet.name, triggerReaction]
  );

  const handleClaimMission = useCallback(
    (missionId: string) => {
      const target = missionState.missions.find((m) => m.id === missionId);
      if (!target || target.claimed || target.progress < target.target) return;

      soundEngine.playReward();
      setMissionState((prev) => ({
        ...prev,
        missions: prev.missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
      }));
      handlePetReward({
        treats: target.rewardTreats,
        xp: target.rewardXp,
        mood: 10,
        reaction: 'cheer',
        caption: `Claimed +${target.rewardTreats} treats & +${target.rewardXp} XP!`,
      });
    },
    [handlePetReward, missionState.missions]
  );

  const handleClaimDailyBonus = useCallback(() => {
    const allComplete = missionState.missions.every((m) => m.progress >= m.target);
    if (!allComplete || missionState.bonusClaimed) return;

    const today = getLocalDateKey();
    soundEngine.playLevelUp();
    setMissionState((prev) => ({
      ...prev,
      bonusClaimed: true,
      streak: prev.lastCompletedDateKey === today ? prev.streak : prev.streak + 1,
      lastCompletedDateKey: today,
    }));
    handlePetReward({
      treats: DAILY_ALL_CLEAR_REWARD.treats,
      xp: DAILY_ALL_CLEAR_REWARD.xp,
      fullness: 20,
      mood: 20,
      reaction: 'cheer',
      caption: `All daily goals cleared! +${DAILY_ALL_CLEAR_REWARD.treats} treats & +${DAILY_ALL_CLEAR_REWARD.xp} XP!`,
    });
  }, [handlePetReward, missionState.bonusClaimed, missionState.missions]);

  const resetGeneratedOutputs = () => {
    setSummaryData(null);
    setQuizData(null);
    setTipsData(null);
    setChatMessages([]);
    setApiError(null);
  };

  // Multi-Source Content Readers
  const handleReadActivePage = useCallback(() => {
    soundEngine.playUiClick();
    const domText = (articleRef.current?.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
    const fallbackText = activePage.sections
      .map((s) => `${s.heading}\n${s.paragraphs.join('\n')}${s.formula ? `\nFormula: ${s.formula}` : ''}`)
      .join('\n\n');
    const finalText = domText.length > 60 ? domText : `${activePage.title}\n\n${fallbackText}`;
    const wordCount = finalText.split(/\s+/).filter(Boolean).length;

    resetGeneratedOutputs();
    setSource({
      kind: 'page',
      title: activePage.title,
      text: finalText,
      wordCount,
    });
    setJustExtracted(true);
    setTimeout(() => setJustExtracted(false), 900);
    triggerReaction('cheer', `Read "${activePage.course.split('·')[0].trim()}" — ready to summarize or quiz!`);
  }, [activePage, triggerReaction]);

  const handleLoadPdf = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.split(',')[1] || '';
        if (!base64) {
          setApiError('Could not read the selected PDF file.');
          return;
        }
        soundEngine.playUiClick();
        resetGeneratedOutputs();
        setSource({
          kind: 'pdf',
          title: file.name,
          pdfName: file.name,
          pdfBase64: base64,
          fileSizeLabel: formatFileSize(file.size),
        });
        triggerReaction('cheer', `Loaded PDF "${file.name}". Ready to study!`);
      };
      reader.readAsDataURL(file);
    },
    [triggerReaction]
  );

  const handleLoadNotes = useCallback(
    (notes: string) => {
      soundEngine.playUiClick();
      const wordCount = notes.split(/\s+/).filter(Boolean).length;
      resetGeneratedOutputs();
      setSource({
        kind: 'notes',
        title: 'Pasted Study Notes',
        text: notes,
        wordCount,
      });
      triggerReaction('cheer', `Loaded ${wordCount} words of notes. Pick any study tool below!`);
    },
    [triggerReaction]
  );

  // AI Tutor Handlers (Server-Side Gemini API)
  const handleGenerateSummary = async () => {
    if (!source) return;
    setApiError(null);
    setSummaryLoading(true);
    try {
      const data = await fetchLectureSummary(source);
      setSummaryData(data);
      soundEngine.playReward();
      handlePetReward({
        xp: 15,
        treats: 2,
        mood: 8,
        summariesDelta: 1,
        reaction: 'cheer',
        caption: 'Lecture summary generated! +15 XP & +2 study treats.',
      });
      handleMissionEvent({ type: 'summary_generated' });
      setAnalyticsStore((prev) => recordStudyDelta(prev, { summaries: 1, studyMinutes: 3 }));
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to generate lecture summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateQuiz = async (count: number, mode: 'mixed' | 'mcq' | 'short') => {
    if (!source) return;
    setApiError(null);
    setQuizLoading(true);
    try {
      const data = await fetchInteractiveQuiz(source, count, mode);
      setQuizData(data);
      soundEngine.playUiClick();
      triggerReaction('idle', `${data.questions.length} quiz questions ready — answer well for treats!`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to generate quiz.');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizAnswerResult = (
    isCorrect: boolean,
    allAnswered: boolean,
    totalCorrect: number,
    totalQuestions: number
  ) => {
    setAnalyticsStore((prev) =>
      recordStudyDelta(prev, {
        quizAttempted: 1,
        quizCorrect: isCorrect ? 1 : 0,
        studyMinutes: 1,
      })
    );

    if (isCorrect) {
      soundEngine.playCorrect();
      handlePetReward({
        xp: 10,
        treats: 1,
        mood: 6,
        correctDelta: 1,
        reaction: 'cheer',
        caption: 'Spot on! +10 XP & +1 study treat.',
      });
      handleMissionEvent({ type: 'quiz_correct', count: 1 });
    } else {
      soundEngine.playIncorrect();
      triggerReaction('startled', 'Tricky one! Check the step-by-step walkthrough below.');
    }

    if (allAnswered) {
      soundEngine.playReward();
      handlePetReward({
        xp: 15,
        treats: 2,
        quizzesDelta: 1,
        reaction: 'cheer',
        caption: `Quiz finished (${totalCorrect}/${totalQuestions})! Bonus +15 XP & +2 treats.`,
      });
      handleMissionEvent({ type: 'quiz_completed' });
    }
  };

  const handleGenerateTips = async () => {
    if (!source) return;
    setApiError(null);
    setTipsLoading(true);
    try {
      const data = await fetchStudyTips(source);
      setTipsData(data);
      soundEngine.playReward();
      handlePetReward({
        xp: 12,
        treats: 1,
        mood: 6,
        reaction: 'cheer',
        caption: 'Active recall tips & flashcards ready! +12 XP & +1 treat.',
      });
      setAnalyticsStore((prev) => recordStudyDelta(prev, { studyMinutes: 2 }));
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to generate study tips.');
    } finally {
      setTipsLoading(false);
    }
  };

  const handleMasterFlashcard = () => {
    soundEngine.playCorrect();
    handlePetReward({
      xp: 5,
      mood: 4,
      flashcardsDelta: 1,
      reaction: 'pet',
      caption: 'Flashcard mastered! Active recall builds durable memory (+5 XP).',
    });
    handleMissionEvent({ type: 'flashcard_reviewed' });
    setAnalyticsStore((prev) => recordStudyDelta(prev, { flashcards: 1, studyMinutes: 0.5 }));
  };

  const handleSendChat = async (message: string) => {
    if (!source) return;
    setApiError(null);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: message };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatLoading(true);

    try {
      const { reply } = await sendTutorChat(source, chatMessages, message);
      setChatMessages((prev) => [
        ...prev,
        { id: `m-${Date.now()}`, role: 'model', text: reply },
      ]);
      soundEngine.playUiClick();
      handlePetReward({
        xp: 5,
        mood: 4,
        reaction: 'cheer',
        caption: 'Great follow-up question! +5 XP.',
      });
      handleMissionEvent({ type: 'chat_asked' });
      setAnalyticsStore((prev) => recordStudyDelta(prev, { studyMinutes: 1 }));
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Tutor chat request failed.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleToggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      saveMuted(next);
      if (!next) soundEngine.playUiClick();
      return next;
    });
  };

  const handleToggleFocusMode = () => {
    soundEngine.playUiClick();
    setFocusMode((prev) => !prev);
  };

  const handleExportSummary = useCallback(
    (format: ExportFormat) => {
      if (!summaryData) return;
      soundEngine.playUiClick();
      exportSummaryFile(summaryData, source, format);
    },
    [source, summaryData]
  );

  const handleExportChat = useCallback(
    (format: ExportFormat) => {
      if (chatMessages.length === 0) return;
      soundEngine.playUiClick();
      exportChatFile(chatMessages, source, pet.name, format);
    },
    [chatMessages, pet.name, source]
  );

  const handleExportStudyPack = useCallback(
    (format: ExportFormat) => {
      if (!summaryData && chatMessages.length === 0) return;
      soundEngine.playUiClick();
      exportCombinedStudyPack(summaryData, chatMessages, source, pet.name, format);
    },
    [chatMessages, pet.name, source, summaryData]
  );

  const savedVocabTermKeys = useMemo(
    () => new Set(vocabEntries.map((entry) => normalizeTermKey(entry.term))),
    [vocabEntries]
  );

  const handleSaveVocabTerm = useCallback(
    (term: string, contextSnippet?: string, origin: VocabOrigin = 'manual') => {
      const cleaned = term.trim();
      if (!cleaned) return;
      const key = normalizeTermKey(cleaned);
      const exists = vocabEntries.some((entry) => normalizeTermKey(entry.term) === key);
      if (exists) {
        triggerReaction('idle', `"${cleaned}" is already in your Vocab glossary.`);
        return;
      }

      soundEngine.playUiClick();
      const nextEntry = createVocabEntry({
        term: cleaned,
        origin,
        sourceTitle: source?.title,
        contextSnippet,
      });
      setVocabEntries((prev) => [nextEntry, ...prev]);
      triggerReaction('pet', `Saved "${cleaned}" to Vocab! Open the Vocab tab to define it.`);
    },
    [source?.title, triggerReaction, vocabEntries]
  );

  const handleDefineVocabEntry = useCallback(
    async (entryId: string) => {
      const target = vocabEntries.find((e) => e.id === entryId);
      if (!target) return;
      const hadDefinitionBefore = Boolean(target.simpleDefinition);

      setApiError(null);
      setDefiningVocabIds((prev) => ({ ...prev, [entryId]: true }));
      try {
        const result = await fetchVocabDefinition({
          term: target.term,
          contextSnippet: target.contextSnippet,
          sourceTitle: target.sourceTitle || source?.title,
        });

        setVocabEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  simpleDefinition: result.simpleDefinition,
                  analogyOrExample: result.analogyOrExample,
                  memoryCue: result.memoryCue,
                }
              : entry
          )
        );
        soundEngine.playCorrect();
        if (!hadDefinitionBefore) {
          handlePetReward({
            xp: 5,
            mood: 4,
            reaction: 'cheer',
            caption: `Defined "${target.term}" in plain language! +5 XP.`,
          });
          setAnalyticsStore((prev) => recordStudyDelta(prev, { studyMinutes: 0.5 }));
        }
      } catch (err) {
        setApiError(err instanceof Error ? err.message : `Failed to define "${target.term}".`);
      } finally {
        setDefiningVocabIds((prev) => {
          const next = { ...prev };
          delete next[entryId];
          return next;
        });
      }
    },
    [handlePetReward, source?.title, vocabEntries]
  );

  const handleDefineAllPendingVocab = useCallback(async () => {
    const pending = vocabEntries.filter((e) => !e.simpleDefinition).slice(0, 6);
    for (const item of pending) {
      await handleDefineVocabEntry(item.id);
    }
  }, [handleDefineVocabEntry, vocabEntries]);

  const handleToggleVocabMastered = useCallback((entryId: string) => {
    soundEngine.playUiClick();
    setVocabEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, mastered: !entry.mastered } : entry
      )
    );
  }, []);

  const handleDeleteVocabTerm = useCallback((entryId: string) => {
    soundEngine.playUiClick();
    setVocabEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  }, []);

  const handleTogglePomodoro = useCallback(() => {
    soundEngine.playUiClick();
    setPomodoroNotice(null);
    // Request gentle browser notification permission only on explicit Start click if undecided
    if (
      !pomodoro.running &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().catch(() => {});
    }
    setPomodoro((prev) => ({
      ...prev,
      running: !prev.running,
      secondsLeft:
        prev.secondsLeft <= 0
          ? (prev.phase === 'focus' ? prev.focusMinutes : prev.breakMinutes) * 60
          : prev.secondsLeft,
    }));
  }, [pomodoro.running]);

  const handleResetPomodoro = useCallback(() => {
    soundEngine.playUiClick();
    setPomodoroNotice(null);
    setPomodoro((prev) => ({
      ...prev,
      running: false,
      secondsLeft: (prev.phase === 'focus' ? prev.focusMinutes : prev.breakMinutes) * 60,
    }));
  }, []);

  const handleSetPomodoroIntervals = useCallback((focusMinutes: number, breakMinutes: number) => {
    const safeFocus = Math.min(120, Math.max(1, Math.round(focusMinutes)));
    const safeBreak = Math.min(30, Math.max(1, Math.round(breakMinutes)));
    setPomodoro((prev) => {
      const nextSeconds =
        prev.phase === 'focus' ? safeFocus * 60 : safeBreak * 60;
      return {
        ...prev,
        focusMinutes: safeFocus,
        breakMinutes: safeBreak,
        running: false,
        secondsLeft: nextSeconds,
      };
    });
  }, []);

  const handleSwitchPomodoroPhase = useCallback((phase: PomodoroPhase) => {
    soundEngine.playUiClick();
    setPomodoroNotice(null);
    setPomodoro((prev) => ({
      ...prev,
      phase,
      running: false,
      secondsLeft: (phase === 'focus' ? prev.focusMinutes : prev.breakMinutes) * 60,
    }));
  }, []);

  const activeTabLabel: Record<TutorTab, string> = {
    summary: 'Summary',
    quiz: 'Quiz',
    tips: 'Study Tips',
    chat: 'Tutor Chat',
    vocab: 'Vocab',
    analytics: 'Analytics',
  };

  return (
    <div className="w-full h-screen min-h-[620px] flex bg-[#F6F7F9] dark:bg-[#11171C] text-[#182026] dark:text-[#F1F3F5] overflow-hidden">
      {/* Left: Open Browser Tab (Articles / Lecture Readings) */}
      <BrowserStudyPane
        activePage={activePage}
        articleRef={articleRef}
        sidePanelOpen={sidePanelOpen}
        justExtracted={justExtracted}
        onSelectPage={(page) => {
          soundEngine.playUiClick();
          setActivePage(page);
        }}
        onToggleSidePanel={() => {
          soundEngine.playUiClick();
          setSidePanelOpen((v) => !v);
        }}
      />

      {/* Right: Docked Chrome Side Panel (Pebble AI Study Tutor) */}
      {sidePanelOpen && (
        <aside
          className={`w-full h-full flex flex-col bg-[#F8FAFC] dark:bg-[#141C22] border-l border-[#D4DCE3] dark:border-[#293741] shadow-xl shrink-0 transition-[max-width] duration-200 ${
            focusMode
              ? 'max-w-[540px] xl:max-w-[580px]'
              : 'max-w-[440px] xl:max-w-[464px]'
          }`}
          aria-label="Pebble Chrome Side Panel"
        >
          {/* Side Panel Top Bar (minimized in Focus Mode) */}
          {focusMode ? (
            <header className="flex items-center justify-between gap-2 px-4 py-2 bg-white dark:bg-[#182127] border-b border-[#DFE5EB] dark:border-[#293741] shrink-0">
              <div className="flex items-center gap-2 min-w-0 text-xs">
                <span
                  title={`${pet.name} · Lv.${pet.level} · ${pet.treats} treats`}
                  className="inline-flex items-center shrink-0"
                >
                  <PebbleIcon className="w-4 h-4 opacity-85" />
                </span>
                <span className="font-display font-bold text-[#182026] dark:text-[#F1F3F5] whitespace-nowrap shrink-0">
                  {activeTabLabel[activeTab]}
                </span>
                {source && (
                  <>
                    <span className="text-[#9AA8B2]" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9] truncate">
                      {source.title}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {pomodoro.running && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-semibold text-[#E86A33] pr-1 whitespace-nowrap shrink-0"
                    title={pomodoro.phase === 'focus' ? 'Focus timer running' : 'Break timer running'}
                  >
                    <Timer className="w-3 h-3" />
                    <span>{formatCountdown(pomodoro.secondsLeft)}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                  className="p-1.5 rounded-lg text-[#5C6B77] dark:text-[#96A5B0] hover:bg-[#EFF3F6] dark:hover:bg-[#233039] hover:text-[#182026] dark:hover:text-[#F1F3F5] transition-colors cursor-pointer"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title="Toggle Light / Dark mode"
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleFocusMode}
                  aria-pressed={focusMode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF3F6] dark:bg-[#233039] hover:bg-[#E3E9EE] dark:hover:bg-[#2C3B46] text-[11px] font-semibold text-[#182026] dark:text-[#F1F3F5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="Exit Focus Mode (Esc)"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-[#E86A33]" />
                  <span>Exit Focus</span>
                </button>
              </div>
            </header>
          ) : (
            <header className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-[#182127] border-b border-[#DFE5EB] dark:border-[#293741] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <PebbleIcon className="w-5 h-5 shrink-0" />
                <span className="font-display text-sm font-bold text-[#182026] dark:text-[#F1F3F5] truncate">
                  Pebble Study Tutor
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleFocusMode}
                  aria-pressed={focusMode}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-[#45535E] dark:text-[#B5C1C9] hover:bg-[#EFF3F6] dark:hover:bg-[#233039] hover:text-[#182026] dark:hover:text-[#F1F3F5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  aria-label="Enable Focus Mode"
                  title="Focus Mode — minimize pet and navigation"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#3D9E71] dark:text-[#52B788]" />
                  <span>Focus</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                  className="p-1.5 rounded-lg text-[#5C6B77] dark:text-[#96A5B0] hover:bg-[#EFF3F6] dark:hover:bg-[#233039] hover:text-[#182026] dark:hover:text-[#F1F3F5] transition-colors cursor-pointer"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title="Toggle Light / Dark mode"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-1.5 rounded-lg text-[#5C6B77] dark:text-[#96A5B0] hover:bg-[#EFF3F6] dark:hover:bg-[#233039] hover:text-[#182026] dark:hover:text-[#F1F3F5] transition-colors cursor-pointer"
                  aria-label={muted ? 'Unmute chimes' : 'Mute chimes'}
                  title="Toggle sound effects"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setSettingsOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-[#5C6B77] dark:text-[#96A5B0] hover:bg-[#EFF3F6] dark:hover:bg-[#233039] hover:text-[#182026] dark:hover:text-[#F1F3F5] transition-colors cursor-pointer"
                  aria-label="Open Settings and Chrome Extension MV3 Files"
                  title="Settings & Chrome Extension MV3 Export"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </header>
          )}

          {/* Compact Pet Companion Header, Source Reader & Navigation (hidden in Focus Mode) */}
          {!focusMode && (
            <>
              <PetCompanionHeader
                pet={pet}
                reaction={reaction}
                snackTrigger={snackTrigger}
                missionState={missionState}
                pomodoro={pomodoro}
                onFeedTreat={handleFeedTreat}
                onPatPet={handlePatPet}
                onToggleAccessory={handleToggleAccessory}
                onClaimMission={handleClaimMission}
                onClaimDailyBonus={handleClaimDailyBonus}
                onTogglePomodoro={handleTogglePomodoro}
                onResetPomodoro={handleResetPomodoro}
                onSetPomodoroIntervals={handleSetPomodoroIntervals}
                onSwitchPomodoroPhase={handleSwitchPomodoroPhase}
              />

              <SourceReaderBar
                source={source}
                onReadActivePage={handleReadActivePage}
                onLoadPdf={handleLoadPdf}
                onLoadNotes={handleLoadNotes}
                onClearSource={() => {
                  setSource(null);
                  resetGeneratedOutputs();
                }}
              />

              <nav
                className="flex items-center justify-between gap-0.5 px-2 py-2 bg-white dark:bg-[#182127] border-b border-[#DFE5EB] dark:border-[#293741] shrink-0"
                role="tablist"
                aria-label="AI Tutor Tools"
              >
                {(
                  [
                    { id: 'summary', label: 'Summary' },
                    { id: 'quiz', label: 'Quiz' },
                    { id: 'tips', label: 'Tips' },
                    { id: 'chat', label: 'Chat' },
                    { id: 'vocab', label: 'Vocab' },
                    { id: 'analytics', label: 'Analytics' },
                  ] as Array<{ id: TutorTab; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => {
                      soundEngine.playUiClick();
                      setActiveTab(tab.id);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#EDF1F5] dark:bg-[#24323C] text-[#182026] dark:text-[#F1F3F5]'
                        : 'text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </>
          )}

          {/* Active Study Tool Scroll Viewport */}
          <main className={`flex-1 overflow-y-auto flex flex-col gap-3 ${focusMode ? 'p-5' : 'p-4'}`}>
            {apiError && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded-lg border border-[#E6B3AC] dark:border-[#5C312B] bg-[#FFF4F2] dark:bg-[#271918] text-xs text-[#A32B1D] dark:text-[#F59B8F]"
              >
                {apiError}
              </div>
            )}

            {activeTab === 'summary' && (
              <SummaryTab
                source={source}
                summary={summaryData}
                loading={summaryLoading}
                hasChatHistory={chatMessages.length > 0}
                savedTermKeys={savedVocabTermKeys}
                onGenerate={handleGenerateSummary}
                onExportSummary={handleExportSummary}
                onExportStudyPack={handleExportStudyPack}
                onSaveVocabTerm={(term, ctx) => handleSaveVocabTerm(term, ctx, 'summary')}
              />
            )}

            {activeTab === 'quiz' && (
              <QuizTab
                source={source}
                quiz={quizData}
                loading={quizLoading}
                onGenerate={handleGenerateQuiz}
                onAnswerResult={handleQuizAnswerResult}
              />
            )}

            {activeTab === 'tips' && (
              <StudyTipsTab
                source={source}
                tips={tipsData}
                loading={tipsLoading}
                onGenerate={handleGenerateTips}
                onMasterFlashcard={handleMasterFlashcard}
              />
            )}

            {activeTab === 'chat' && (
              <ChatTab
                source={source}
                messages={chatMessages}
                loading={chatLoading}
                petName={pet.name}
                hasSummary={Boolean(summaryData)}
                onSend={handleSendChat}
                onExportChat={handleExportChat}
                onExportStudyPack={handleExportStudyPack}
                onSaveVocabTerm={(term, ctx) => handleSaveVocabTerm(term, ctx, 'chat')}
              />
            )}

            {activeTab === 'vocab' && (
              <VocabTab
                entries={vocabEntries}
                definingIds={definingVocabIds}
                sourceTitle={source?.title}
                onAddTerm={handleSaveVocabTerm}
                onDefineTerm={handleDefineVocabEntry}
                onDefineAllPending={handleDefineAllPendingVocab}
                onToggleMastered={handleToggleVocabMastered}
                onDeleteTerm={handleDeleteVocabTerm}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsTab
                analyticsStore={analyticsStore}
                missionHistory={missionHistory}
                dailyStreak={missionState.streak}
                theme={theme}
                achievements={achievementEvaluation.items}
              />
            )}
          </main>
        </aside>
      )}

      {settingsOpen && (
        <SettingsModal
          petName={pet.name}
          theme={theme}
          muted={muted}
          reminderSettings={reminderSettings}
          onClose={() => setSettingsOpen(false)}
          onRenamePet={(name) => {
            setPet((prev) => ({ ...prev, name }));
            triggerReaction('pet', `${name} likes the new study badge!`);
          }}
          onSetTheme={setTheme}
          onToggleMute={handleToggleMute}
          onUpdateReminders={({ enabled, intervalHours }) => {
            setReminderSettings({
              enabled,
              intervalHours,
              lastCheckInAt: Date.now(),
            });
          }}
          onPreviewReminder={() => {
            soundEngine.playPetPurr();
            setReminderToastVisible(true);
          }}
        />
      )}

      {/* Automatic Pomodoro Break / Focus Notification Toast */}
      {pomodoroNotice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 w-[348px] max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-[#1C262E] border border-[#BBDED0] dark:border-[#2E5746] shadow-2xl p-3.5 flex items-start gap-3 animate-panel-enter"
        >
          <div className="w-9 h-9 rounded-lg bg-[#E6F5EE] dark:bg-[#1F3A30] text-[#2F8F63] dark:text-[#65C99A] flex items-center justify-center shrink-0 mt-0.5">
            {pomodoroNotice.kind === 'break' ? (
              <Coffee className="w-4.5 h-4.5" />
            ) : (
              <Timer className="w-4.5 h-4.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                {pomodoroNotice.kind === 'break'
                  ? 'Time for a study break!'
                  : 'Break complete — ready to focus'}
              </p>
              <span className="text-[10.5px] font-mono tabular-nums text-[#2F8F63] dark:text-[#65C99A] shrink-0">
                {pomodoroNotice.minutes}m
              </span>
            </div>
            <p className="text-[11.5px] text-[#45535E] dark:text-[#B5C1C9] leading-snug mt-0.5">
              {pomodoroNotice.kind === 'break'
                ? `Focus interval finished (+15 XP & +2 treats). Your ${pomodoroNotice.minutes}-minute break countdown has started — stretch, hydrate, or pat ${pet.name}.`
                : `Your break has wrapped up. Start a fresh ${pomodoroNotice.minutes}-minute focus block whenever you’re ready.`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {pomodoroNotice.kind === 'break' ? (
                <button
                  type="button"
                  onClick={() => {
                    setPomodoroNotice(null);
                    handlePatPet();
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#2F8F63] hover:bg-[#267A53] text-white font-semibold text-[11px] whitespace-nowrap cursor-pointer"
                >
                  Pat {pet.name}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPomodoroNotice(null);
                    handleTogglePomodoro();
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#E86A33] hover:bg-[#D95C26] text-white dark:text-[#11171C] font-semibold text-[11px] whitespace-nowrap cursor-pointer"
                >
                  Start Focus
                </button>
              )}
              <button
                type="button"
                onClick={() => setPomodoroNotice(null)}
                className="px-2 py-1 text-[11px] text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gentle Chrome Desktop Notification Preview Toast */}
      {reminderToastVisible && !pomodoroNotice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-[#1C262E] border border-[#D4DCE3] dark:border-[#344653] shadow-2xl p-3.5 flex items-start gap-3 animate-panel-enter"
        >
          <PebbleIcon className="w-9 h-9 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
                Check in with {pet.name}
              </p>
              <span className="text-[10px] font-mono text-[#6B7B87] dark:text-[#8E9EA9]">
                {reminderSettings.intervalHours}h idle
              </span>
            </div>
            <p className="text-[11.5px] text-[#45535E] dark:text-[#B5C1C9] leading-snug mt-0.5">
              Take a quick 5-minute break to check in with your study companion and review a flashcard.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setReminderToastVisible(false);
                  setSettingsOpen(false);
                  setSidePanelOpen(true);
                  handlePatPet();
                }}
                className="px-2.5 py-1 rounded-md bg-[#E86A33] hover:bg-[#D95C26] text-white dark:text-[#11171C] font-semibold text-[11px] cursor-pointer"
              >
                Check In
              </button>
              <button
                type="button"
                onClick={() => setReminderToastVisible(false)}
                className="px-2 py-1 text-[11px] text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
