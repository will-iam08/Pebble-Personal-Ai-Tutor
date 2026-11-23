import React from 'react';
import { Check, Gift } from 'lucide-react';
import { DailyMissionState } from '../types/study';
import { DAILY_ALL_CLEAR_REWARD } from '../utils/missions';

interface DailyMissionsPanelProps {
  missionState: DailyMissionState;
  onClaimMission: (missionId: string) => void;
  onClaimDailyBonus: () => void;
}

export const DailyMissionsPanel: React.FC<DailyMissionsPanelProps> = ({
  missionState,
  onClaimMission,
  onClaimDailyBonus,
}) => {
  const completedCount = missionState.missions.filter((m) => m.progress >= m.target).length;
  const allComplete = completedCount === missionState.missions.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-[11px] text-[#5C6B77] dark:text-[#96A5B0]">
        <span className="font-mono tabular-nums">
          {completedCount}/{missionState.missions.length} study goals today
        </span>
        <span>
          {missionState.streak > 0 ? `${missionState.streak}-day streak` : 'Refreshes daily'}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {missionState.missions.map((mission) => {
          const isReady = mission.progress >= mission.target && !mission.claimed;
          const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));

          return (
            <div
              key={mission.id}
              className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg border transition-colors duration-150 ${
                mission.claimed
                  ? 'bg-[#F2F4F7] dark:bg-[#151D23] border-[#E1E6EB] dark:border-[#24313A] opacity-75'
                  : isReady
                  ? 'bg-[#FFF7F3] dark:bg-[#242A2D] border-[#E86A33]/60'
                  : 'bg-white dark:bg-[#192228] border-[#DFE5EB] dark:border-[#2B3943]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#182026] dark:text-[#F1F3F5] leading-snug">
                    {mission.title}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-[#5C6B77] dark:text-[#96A5B0] mt-0.5">
                    +{mission.rewardTreats} treats · +{mission.rewardXp} XP
                  </p>
                </div>

                <div className="shrink-0">
                  {mission.claimed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2F8F63] dark:text-[#74C69D]">
                      <Check className="w-3.5 h-3.5" />
                      Done
                    </span>
                  ) : isReady ? (
                    <button
                      type="button"
                      onClick={() => onClaimMission(mission.id)}
                      className="px-2.5 py-1 rounded-md bg-[#E86A33] hover:bg-[#D95C26] dark:hover:bg-[#F27944] text-white dark:text-[#11171C] font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="font-mono tabular-nums text-[11px] text-[#45535E] dark:text-[#C5CFD6]">
                      {mission.progress}/{mission.target}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-[#E5EAEF] dark:bg-[#10161B] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#3D9E71] dark:bg-[#52B788] transition-[width] duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${
          missionState.bonusClaimed
            ? 'bg-[#EEF7F2] dark:bg-[#172420] border-[#BBE0CD] dark:border-[#2B4339] text-[#2F8F63] dark:text-[#8CC9AB]'
            : allComplete
            ? 'bg-[#FFFBEB] dark:bg-[#262B22] border-[#EAB308]/60 text-[#182026] dark:text-[#F1F3F5]'
            : 'bg-[#F4F6F8] dark:bg-[#151D23] border-[#E1E6EB] dark:border-[#26333C] text-[#5C6B77] dark:text-[#96A5B0]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Gift
            className={`w-3.5 h-3.5 shrink-0 ${
              allComplete && !missionState.bonusClaimed ? 'text-[#C68A0A] dark:text-[#F3C64F]' : 'text-[#7A8994]'
            }`}
          />
          <span className="truncate text-[11px]">
            All-clear bonus ·{' '}
            <span className="font-mono tabular-nums text-[#B47A0A] dark:text-[#F3C64F]">
              +{DAILY_ALL_CLEAR_REWARD.treats} treats · +{DAILY_ALL_CLEAR_REWARD.xp} XP
            </span>
          </span>
        </div>

        {missionState.bonusClaimed ? (
          <span className="text-[11px] font-medium shrink-0">Claimed</span>
        ) : allComplete ? (
          <button
            type="button"
            onClick={onClaimDailyBonus}
            className="px-2.5 py-1 rounded-md bg-[#EAB308] hover:bg-[#D9A306] text-[#11171C] font-semibold text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Claim
          </button>
        ) : (
          <span className="font-mono tabular-nums text-[11px] shrink-0">{completedCount}/3</span>
        )}
      </div>
    </div>
  );
};
