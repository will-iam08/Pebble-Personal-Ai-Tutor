import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Coffee,
  Cookie,
  Heart,
  Lock,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
} from 'lucide-react';
import {
  ACCESSORIES,
  AccessoryId,
  DailyMissionState,
  getFullnessLabel,
  getMoodLabel,
  getPetStage,
  getXpForLevel,
  PetReaction,
  PetState,
  PomodoroPhase,
  PomodoroState,
} from '../types/study';
import { DAILY_STUDY_QUOTES, getDailyQuoteIndex } from '../data/studyQuotes';
import { getLocalDateKey } from '../utils/missions';
import { PetHabitatCanvas } from './PetHabitatCanvas';
import { DailyMissionsPanel } from './DailyMissionsPanel';

interface PetCompanionHeaderProps {
  pet: PetState;
  reaction: PetReaction;
  snackTrigger: number;
  missionState: DailyMissionState;
  pomodoro: PomodoroState;
  onFeedTreat: () => void;
  onPatPet: () => void;
  onToggleAccessory: (id: AccessoryId) => void;
  onClaimMission: (missionId: string) => void;
  onClaimDailyBonus: () => void;
  onTogglePomodoro: () => void;
  onResetPomodoro: () => void;
  onSetPomodoroIntervals: (focusMinutes: number, breakMinutes: number) => void;
  onSwitchPomodoroPhase: (phase: PomodoroPhase) => void;
}

const FOCUS_PRESETS = [15, 25, 45, 50];

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PetCompanionHeader: React.FC<PetCompanionHeaderProps> = ({
  pet,
  reaction,
  snackTrigger,
  missionState,
  pomodoro,
  onFeedTreat,
  onPatPet,
  onToggleAccessory,
  onClaimMission,
  onClaimDailyBonus,
  onTogglePomodoro,
  onResetPomodoro,
  onSetPomodoroIntervals,
  onSwitchPomodoroPhase,
}) => {
  const [drawerMode, setDrawerMode] = useState<'closed' | 'timer' | 'goals' | 'wardrobe'>('closed');
  const [quoteIndex, setQuoteIndex] = useState<number>(() =>
    getDailyQuoteIndex(getLocalDateKey())
  );
  const lastReactionNonceRef = useRef<number>(reaction.nonce);

  // Cycle the Daily Study Quote whenever the student interacts directly with Pebble (pat or feed)
  useEffect(() => {
    if (reaction.nonce === lastReactionNonceRef.current) return;
    lastReactionNonceRef.current = reaction.nonce;
    if (reaction.type === 'pet' || reaction.type === 'eat') {
      setQuoteIndex((prev) => (prev + 1) % DAILY_STUDY_QUOTES.length);
    }
  }, [reaction.nonce, reaction.type]);

  const currentQuote = DAILY_STUDY_QUOTES[quoteIndex] || DAILY_STUDY_QUOTES[0];

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % DAILY_STUDY_QUOTES.length);
  };

  const stage = getPetStage(pet.level);
  const xpNeeded = getXpForLevel(pet.level);
  const xpPct = Math.min(100, Math.round((pet.xp / xpNeeded) * 100));

  const readyMissionCount =
    missionState.missions.filter((m) => m.progress >= m.target && !m.claimed).length +
    (missionState.missions.every((m) => m.progress >= m.target) && !missionState.bonusClaimed ? 1 : 0);

  const toggleDrawer = (target: 'timer' | 'goals' | 'wardrobe') => {
    setDrawerMode((prev) => (prev === target ? 'closed' : target));
  };

  const totalPhaseSeconds =
    (pomodoro.phase === 'focus' ? pomodoro.focusMinutes : pomodoro.breakMinutes) * 60;
  const timerElapsedPct =
    totalPhaseSeconds > 0
      ? Math.min(100, Math.max(0, Math.round(((totalPhaseSeconds - pomodoro.secondsLeft) / totalPhaseSeconds) * 100)))
      : 0;
  const timerActiveOrPausedMidway =
    pomodoro.running || pomodoro.secondsLeft !== totalPhaseSeconds;

  return (
    <section
      className="bg-white dark:bg-[#182127] border-b border-[#DFE5EB] dark:border-[#293741] px-4 py-3 shrink-0"
      aria-label="Study Companion"
    >
      {/* Compact Row: Live Avatar | Name, Level, XP Bar & Treats | Quick Feed & Pat */}
      <div className="flex items-center gap-3">
        <PetHabitatCanvas
          pet={pet}
          reaction={reaction}
          snackTrigger={snackTrigger}
          mini
          onPatPet={onPatPet}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1.5">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <h2 className="font-display text-sm font-bold text-[#182026] dark:text-[#F1F3F5] whitespace-nowrap shrink-0">
                {pet.name}
              </h2>
              <span className="text-[11px] text-[#5C6B77] dark:text-[#96A5B0] truncate">
                {stage} · <span className="font-mono tabular-nums">Lv.{pet.level}</span>
              </span>
            </div>
            <span className="font-mono tabular-nums text-[11px] font-semibold text-[#B47A0A] dark:text-[#F3C64F] shrink-0">
              {pet.treats} treats
            </span>
          </div>

          {/* Crisp XP Bar */}
          <div className="h-1.5 w-full rounded-full bg-[#E5EAEF] dark:bg-[#11171C] overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full bg-[#3D9E71] dark:bg-[#52B788] transition-[width] duration-200"
              style={{ width: `${xpPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-[#5C6B77] dark:text-[#96A5B0]">
            <span className="font-mono tabular-nums">
              {pet.xp}/{xpNeeded} XP
            </span>
            <span className="truncate">
              {getFullnessLabel(pet.fullness)} · {getMoodLabel(pet.mood)}
            </span>
          </div>

          <p className="text-[11px] text-[#45535E] dark:text-[#B5C1C9] truncate mt-0.5">
            {reaction.caption}
          </p>
        </div>

        {/* Quick Companion Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onFeedTreat}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] dark:hover:bg-[#F27944] active:scale-[0.98] text-white dark:text-[#11171C] font-semibold text-[11px] transition-all duration-150 whitespace-nowrap cursor-pointer"
            title={pet.treats > 0 ? 'Feed 1 Study Treat (+12 XP)' : 'Give a quick nibble'}
          >
            <Cookie className="w-3 h-3 shrink-0" />
            <span>Feed</span>
          </button>
          <button
            type="button"
            onClick={onPatPet}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F1F4F7] dark:bg-[#233039] hover:bg-[#E5EAEF] dark:hover:bg-[#2D3D48] active:scale-[0.98] text-[#182026] dark:text-[#F1F3F5] font-medium text-[11px] border border-[#DCE2E8] dark:border-[#344653] transition-all duration-150 whitespace-nowrap cursor-pointer"
          >
            <Heart className="w-3 h-3 shrink-0 text-[#E86A33]" />
            <span>Pat</span>
          </button>
        </div>
      </div>

      {/* Daily Study Quote (cycles automatically on pat/feed or manual refresh) */}
      <div className="mt-2.5 pt-2 border-t border-[#ECEFF2] dark:border-[#24313A]">
        <div className="flex items-center justify-between gap-2 text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9]">
          <span className="truncate">
            <span className="font-semibold text-[#3D9E71] dark:text-[#52B788]">Daily Study Quote</span>
            <span aria-hidden="true"> · </span>
            <span>{currentQuote.author}</span>
          </span>
          <button
            type="button"
            onClick={handleNextQuote}
            className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#5C6B77] dark:text-[#8E9EA9] hover:text-[#182026] dark:hover:text-[#F1F3F5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Next daily study quote"
            title="Next study quote (also cycles when you pat or feed your companion)"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Next</span>
          </button>
        </div>
        <p
          key={quoteIndex}
          className="text-[11.5px] italic leading-snug text-[#2C3740] dark:text-[#CDD6DD] mt-0.5 line-clamp-2 animate-panel-enter"
        >
          “{currentQuote.text}”
        </p>
      </div>

      {/* Slim Expandable Strip for Pomodoro Timer, Daily Goals & Study Wardrobe */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#ECEFF2] dark:border-[#24313A] text-[11px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="inline-flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => toggleDrawer('timer')}
              className={`inline-flex items-center gap-1 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                drawerMode === 'timer' || pomodoro.running
                  ? 'text-[#E86A33]'
                  : 'text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
              }`}
            >
              <Timer className="w-3 h-3 shrink-0" />
              <span className={timerActiveOrPausedMidway ? 'font-mono tabular-nums font-semibold' : ''}>
                {timerActiveOrPausedMidway ? formatCountdown(pomodoro.secondsLeft) : 'Timer'}
              </span>
              {drawerMode === 'timer' ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {timerActiveOrPausedMidway && (
              <button
                type="button"
                onClick={onTogglePomodoro}
                className="p-0.5 rounded text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5] cursor-pointer"
                aria-label={pomodoro.running ? 'Pause Pomodoro timer' : 'Resume Pomodoro timer'}
                title={pomodoro.running ? 'Pause timer' : 'Resume timer'}
              >
                {pomodoro.running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleDrawer('goals')}
            className={`inline-flex items-center gap-1 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              drawerMode === 'goals'
                ? 'text-[#E86A33]'
                : 'text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
            }`}
          >
            <span>
              Goals{readyMissionCount > 0 ? ` (${readyMissionCount})` : ''}
            </span>
            {drawerMode === 'goals' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleDrawer('wardrobe')}
            className={`inline-flex items-center gap-1 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              drawerMode === 'wardrobe'
                ? 'text-[#E86A33]'
                : 'text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
            }`}
          >
            <span>Wardrobe</span>
            {drawerMode === 'wardrobe' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        <span className="font-mono tabular-nums text-[#6B7B87] dark:text-[#8394A0] truncate">
          {pet.questionsCorrect} pts · {pet.summariesGenerated} sum
        </span>
      </div>

      {/* Expanded Drawer (Pomodoro Timer, Daily Goals, OR Wardrobe) */}
      {drawerMode !== 'closed' && (
        <div className="mt-2.5 pt-2.5 border-t border-[#ECEFF2] dark:border-[#24313A] animate-panel-enter">
          {drawerMode === 'timer' ? (
            <div className="flex flex-col gap-2.5">
              {/* Countdown Header & Primary Controls */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    {pomodoro.phase === 'focus' ? (
                      <span className="text-[#182026] dark:text-[#F1F3F5]">Focus Session</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#2F8F63] dark:text-[#52B788]">
                        <Coffee className="w-3 h-3" />
                        <span>Break Time</span>
                      </span>
                    )}
                    <span className="text-[#9AA8B2]" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums font-normal text-[#5C6B77] dark:text-[#8E9EA9]">
                      {pomodoro.completedSessions} done
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-xl font-bold text-[#182026] dark:text-[#F1F3F5] leading-tight mt-0.5">
                    {formatCountdown(pomodoro.secondsLeft)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onTogglePomodoro}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E86A33] hover:bg-[#D95C26] text-white dark:text-[#11171C] font-semibold text-xs whitespace-nowrap cursor-pointer"
                  >
                    {pomodoro.running ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Start</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onResetPomodoro}
                    className="p-1.5 rounded-lg border border-[#DCE2E8] dark:border-[#30404B] bg-[#F6F8FA] dark:bg-[#131B21] text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5] cursor-pointer"
                    aria-label="Reset timer"
                    title="Reset current interval"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSwitchPomodoroPhase(pomodoro.phase === 'focus' ? 'break' : 'focus')
                    }
                    className="px-2 py-1.5 rounded-lg border border-[#DCE2E8] dark:border-[#30404B] bg-[#F6F8FA] dark:bg-[#131B21] text-[11px] font-medium text-[#45535E] dark:text-[#B5C1C9] hover:text-[#182026] dark:hover:text-[#F1F3F5] whitespace-nowrap cursor-pointer"
                  >
                    {pomodoro.phase === 'focus' ? 'Break' : 'Focus'}
                  </button>
                </div>
              </div>

              {/* Hairline Progress Bar */}
              <div className="h-1 w-full rounded-full bg-[#E5EAEF] dark:bg-[#11171C] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    pomodoro.phase === 'focus'
                      ? 'bg-[#E86A33]'
                      : 'bg-[#3D9E71] dark:bg-[#52B788]'
                  }`}
                  style={{ width: `${timerElapsedPct}%` }}
                />
              </div>

              {/* Focus Interval Presets & Custom Focus/Break Durations */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1">
                  {FOCUS_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onSetPomodoroIntervals(mins, pomodoro.breakMinutes)}
                      className={`px-2 py-1 rounded-md font-mono tabular-nums text-[10.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        pomodoro.focusMinutes === mins
                          ? 'bg-[#233039] dark:bg-[#2C3E4B] text-white'
                          : 'bg-[#F1F4F7] dark:bg-[#131B21] text-[#5C6B77] dark:text-[#96A5B0] hover:text-[#182026] dark:hover:text-[#F1F3F5]'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[#5C6B77] dark:text-[#96A5B0]">
                  <label className="inline-flex items-center gap-1">
                    <span>Focus</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={pomodoro.focusMinutes}
                      onChange={(e) => {
                        const val = Math.min(120, Math.max(1, Math.round(Number(e.target.value) || 1)));
                        onSetPomodoroIntervals(val, pomodoro.breakMinutes);
                      }}
                      className="w-11 px-1.5 py-0.5 rounded bg-[#F6F8FA] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#30404B] font-mono tabular-nums text-[11px] text-[#182026] dark:text-[#F1F3F5]"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <span>Break</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={pomodoro.breakMinutes}
                      onChange={(e) => {
                        const val = Math.min(30, Math.max(1, Math.round(Number(e.target.value) || 1)));
                        onSetPomodoroIntervals(pomodoro.focusMinutes, val);
                      }}
                      className="w-10 px-1.5 py-0.5 rounded bg-[#F6F8FA] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#30404B] font-mono tabular-nums text-[11px] text-[#182026] dark:text-[#F1F3F5]"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : drawerMode === 'goals' ? (
            <DailyMissionsPanel
              missionState={missionState}
              onClaimMission={onClaimMission}
              onClaimDailyBonus={onClaimDailyBonus}
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              {ACCESSORIES.map((item) => {
                const owned = pet.ownedAccessories.includes(item.id);
                const equipped = pet.equippedAccessories.includes(item.id);
                const canAfford = pet.treats >= item.cost;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleAccessory(item.id)}
                    disabled={!owned && !canAfford}
                    className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-left text-xs border transition-colors ${
                      equipped
                        ? 'bg-[#EEF7F2] dark:bg-[#1E332C] border-[#3D9E71]/60 text-[#182026] dark:text-[#F1F3F5]'
                        : owned
                        ? 'bg-[#F6F8FA] dark:bg-[#1E2830] border-[#DCE2E8] dark:border-[#30404B] text-[#182026] dark:text-[#F1F3F5] cursor-pointer'
                        : canAfford
                        ? 'bg-white dark:bg-[#1A232A] border-[#DCE2E8] dark:border-[#30404B] text-[#182026] dark:text-[#F1F3F5] hover:border-[#EAB308] cursor-pointer'
                        : 'bg-[#F4F6F8] dark:bg-[#151D22] border-[#E5EAEF] dark:border-[#232F37] text-[#8E9CA6] dark:text-[#63727D] cursor-not-allowed'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-medium block truncate">{item.name}</span>
                      <span className="text-[11px] text-[#5C6B77] dark:text-[#8E9CA6] block truncate">
                        {item.description}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono tabular-nums text-[11px] flex items-center gap-1">
                      {equipped ? (
                        <span className="text-[#2F8F63] dark:text-[#74C69D] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> On
                        </span>
                      ) : owned ? (
                        <span>Wear</span>
                      ) : (
                        <span className={`flex items-center gap-1 ${canAfford ? 'text-[#B47A0A] dark:text-[#F3C64F]' : ''}`}>
                          {!canAfford && <Lock className="w-3 h-3" />}
                          {item.cost}t
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
