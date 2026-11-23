import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  Clock,
  Flame,
  GraduationCap,
  Layers,
  Library,
  Lock,
  Target,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AchievementIconKey,
  AchievementProgressItem,
  MissionHistoryDay,
  MissionMetric,
  ThemeMode,
  WeeklyAnalyticsDay,
} from '../types/study';
import { AnalyticsStore, buildRollingWeekSeries, buildSampleWeekSeries } from '../utils/analytics';
import { buildSampleAchievements, formatUnlockedDate } from '../utils/achievements';
import {
  buildPastSevenDaysMissionHistory,
  buildSampleMissionHistory,
  MissionHistoryStore,
} from '../utils/missions';

interface AnalyticsTabProps {
  analyticsStore: AnalyticsStore;
  missionHistory: MissionHistoryStore;
  dailyStreak: number;
  theme: ThemeMode;
  achievements: AchievementProgressItem[];
}

const ACHIEVEMENT_ICON_MAP: Record<AchievementIconKey, React.FC<{ className?: string }>> = {
  book: BookOpen,
  library: Library,
  flame: Flame,
  target: Target,
  graduation: GraduationCap,
  layers: Layers,
  clock: Clock,
  award: Award,
};

function getHabitCategoryLabel(metric: MissionMetric): string {
  switch (metric) {
    case 'summaries':
    case 'chat_questions':
    case 'flashcards':
      return 'Reading & Recall';
    case 'quiz_correct':
    case 'quiz_complete':
      return 'Quizzes & Practice';
    case 'pet_feed':
    case 'pet_pat':
      return 'Companion Check-Ins';
  }
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  analyticsStore,
  missionHistory,
  dailyStreak,
  theme,
  achievements,
}) => {
  const [previewSample, setPreviewSample] = useState(false);

  const realSeries = useMemo(() => buildRollingWeekSeries(analyticsStore), [analyticsStore]);
  const sampleSeries = useMemo(() => buildSampleWeekSeries(), []);
  const sampleAchievements = useMemo(() => buildSampleAchievements(), []);
  const realMissionDays = useMemo(
    () => buildPastSevenDaysMissionHistory(missionHistory),
    [missionHistory]
  );
  const sampleMissionDays = useMemo(() => buildSampleMissionHistory(), []);

  const series: WeeklyAnalyticsDay[] = previewSample ? sampleSeries : realSeries;
  const visibleAchievements = previewSample ? sampleAchievements : achievements;
  const visibleMissionDays: MissionHistoryDay[] = previewSample
    ? sampleMissionDays
    : realMissionDays;
  const unlockedCount = visibleAchievements.filter((a) => a.unlocked).length;

  const missionSummary = useMemo(() => {
    let totalCompleted = 0;
    let perfectDays = 0;
    const categoryCounts: Record<string, number> = {};

    for (const day of visibleMissionDays) {
      totalCompleted += day.completedMissions.length;
      if (day.completedMissions.length >= day.totalMissions) {
        perfectDays += 1;
      }
      for (const m of day.completedMissions) {
        const cat = getHabitCategoryLabel(m.metric);
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    }

    let topHabit: string | null = null;
    let topCount = 0;
    for (const [label, count] of Object.entries(categoryCounts)) {
      if (count > topCount) {
        topCount = count;
        topHabit = label;
      }
    }

    const daysWithCompletions = visibleMissionDays.filter(
      (d) => d.completedMissions.length > 0
    );
    const chronologicalDays = [...visibleMissionDays].reverse();

    return {
      totalCompleted,
      perfectDays,
      topHabit,
      daysWithCompletions,
      chronologicalDays,
    };
  }, [visibleMissionDays]);

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#24313A' : '#E6ECF1';
  const axisColor = isDark ? '#8E9EA9' : '#5C6B77';
  const tooltipBg = isDark ? '#182127' : '#FFFFFF';
  const tooltipBorder = isDark ? '#30404B' : '#D4DCE3';
  const tooltipText = isDark ? '#F1F3F5' : '#182026';
  const sageColor = isDark ? '#52B788' : '#3D9E71';
  const accentColor = '#E86A33';
  const goldColor = isDark ? '#F3C64F' : '#D99B16';

  const totals = useMemo(() => {
    let totalMinutes = 0;
    let totalSummaries = 0;
    let totalCorrect = 0;
    let totalAttempted = 0;
    let activeDays = 0;
    let bestDay: WeeklyAnalyticsDay | null = null;

    for (const day of series) {
      totalMinutes += day.studyMinutes;
      totalSummaries += day.summaries;
      totalCorrect += day.quizCorrect;
      totalAttempted += day.quizAttempted;
      if (day.studyMinutes > 0 || day.summaries > 0 || day.quizAttempted > 0) {
        activeDays += 1;
      }
      if (!bestDay || day.studyMinutes > bestDay.studyMinutes) {
        bestDay = day;
      }
    }

    const totalHours = Number((totalMinutes / 60).toFixed(1));
    const avgAccuracy =
      totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;

    return {
      totalHours,
      totalMinutes,
      totalSummaries,
      totalCorrect,
      totalAttempted,
      avgAccuracy,
      activeDays,
      bestDay,
    };
  }, [series]);

  const hasQuizData = totals.totalAttempted > 0;

  return (
    <div className="flex flex-col gap-3.5 animate-panel-enter">
      {/* Header & Real / Sample Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-[#182026] dark:text-[#F1F3F5]">
            Weekly Study Analytics
          </h3>
          <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
            Rolling 7-day consistency &amp; mastery trends
          </p>
        </div>

        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#EFF3F6] dark:bg-[#11171C] border border-[#DCE2E8] dark:border-[#293741] shrink-0"
          role="tablist"
          aria-label="Analytics dataset"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!previewSample}
            onClick={() => setPreviewSample(false)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap cursor-pointer ${
              !previewSample
                ? 'bg-white dark:bg-[#233039] text-[#182026] dark:text-[#F1F3F5] shadow-xs'
                : 'text-[#5C6B77] dark:text-[#8E9EA9]'
            }`}
          >
            My Data
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={previewSample}
            onClick={() => setPreviewSample(true)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap cursor-pointer ${
              previewSample
                ? 'bg-white dark:bg-[#233039] text-[#182026] dark:text-[#F1F3F5] shadow-xs'
                : 'text-[#5C6B77] dark:text-[#8E9EA9]'
            }`}
          >
            Sample
          </button>
        </div>
      </div>

      {/* 3-Metric Tabular KPI Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] px-3 py-2.5">
          <span className="block text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">Study Time</span>
          <span className="font-mono tabular-nums text-base font-bold text-[#182026] dark:text-[#F1F3F5]">
            {totals.totalHours}h
          </span>
          <span className="block text-[10.5px] font-mono tabular-nums text-[#5C6B77] dark:text-[#7E8F9B]">
            {totals.activeDays}/7 days active
          </span>
        </div>

        <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] px-3 py-2.5">
          <span className="block text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">Summaries</span>
          <span className="font-mono tabular-nums text-base font-bold text-[#E86A33]">
            {totals.totalSummaries}
          </span>
          <span className="block text-[10.5px] font-mono tabular-nums text-[#5C6B77] dark:text-[#7E8F9B]">
            this week
          </span>
        </div>

        <div className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] px-3 py-2.5">
          <span className="block text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">Quiz Avg</span>
          <span className="font-mono tabular-nums text-base font-bold text-[#2F8F63] dark:text-[#52B788]">
            {totals.avgAccuracy !== null ? `${totals.avgAccuracy}%` : '—'}
          </span>
          <span className="block text-[10.5px] font-mono tabular-nums text-[#5C6B77] dark:text-[#7E8F9B]">
            {totals.totalCorrect}/{totals.totalAttempted} right
          </span>
        </div>
      </div>

      {/* Chart 1: Hours Studied per Day */}
      <section className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-3.5">
        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
            Hours Studied per Day
          </h4>
          <span className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
            Today highlighted
          </span>
        </div>

        <div className="w-full h-[156px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: axisColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}h`}
                allowDecimals
              />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(24,32,38,0.04)' }}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: tooltipText,
                }}
                formatter={(value: unknown, _name: unknown, item: { payload?: WeeklyAnalyticsDay }) => [
                  `${Number(value).toFixed(2)}h (${item?.payload?.studyMinutes ?? 0} min)`,
                  'Study Time',
                ]}
              />
              <Bar dataKey="hours" radius={[5, 5, 0, 0]} maxBarSize={28}>
                {series.map((entry) => (
                  <Cell
                    key={entry.dateKey}
                    fill={entry.isToday ? accentColor : sageColor}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart 2: Quiz Performance Trend */}
      <section className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-3.5">
        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
            Quiz Performance Trend
          </h4>
          <span className="text-[11px] font-mono tabular-nums text-[#5C6B77] dark:text-[#8E9EA9]">
            Accuracy %
          </span>
        </div>

        {hasQuizData ? (
          <div className="w-full h-[152px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="quizAccGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sageColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={sageColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fill: axisColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tick={{ fill: axisColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    color: tooltipText,
                  }}
                  formatter={(value: unknown, _name: unknown, item: { payload?: WeeklyAnalyticsDay }) => [
                    `${value}% (${item?.payload?.quizCorrect ?? 0}/${item?.payload?.quizAttempted ?? 0})`,
                    'Quiz Score',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="quizAccuracy"
                  stroke={sageColor}
                  strokeWidth={2.2}
                  fill="url(#quizAccGradient)"
                  connectNulls
                  dot={{ r: 3.5, fill: sageColor, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: accentColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-[#5C6B77] dark:text-[#8E9EA9] py-5 text-center">
            Answer a few questions in the Quiz tab to chart your accuracy trend, or switch to{' '}
            <button
              type="button"
              onClick={() => setPreviewSample(true)}
              className="underline text-[#E86A33] cursor-pointer"
            >
              Sample
            </button>{' '}
            to preview a full week.
          </p>
        )}
      </section>

      {/* Chart 3: Summaries & Flashcards Output */}
      <section className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-3.5">
        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
            Summaries &amp; Flashcards
          </h4>
          <span className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
            <span className="text-[#E86A33] font-semibold">Summaries</span> ·{' '}
            <span className="text-[#B47A0A] dark:text-[#F3C64F] font-semibold">Flashcards</span>
          </span>
        </div>

        <div className="w-full h-[142px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: axisColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: axisColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(24,32,38,0.04)' }}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: tooltipText,
                }}
              />
              <Bar dataKey="summaries" name="Summaries" fill={accentColor} radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar dataKey="flashcards" name="Flashcards" fill={goldColor} radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Completed Daily Missions (Past 7 Days) */}
      <section
        className="rounded-xl border border-[#DFE5EB] dark:border-[#293741] bg-white dark:bg-[#182127] p-3.5 flex flex-col gap-3"
        aria-label="Completed Daily Missions from the Past 7 Days"
      >
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
              Completed Daily Missions
            </h4>
            <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
              Past 7 days ·{' '}
              <span className="font-mono tabular-nums">
                {missionSummary.totalCompleted}/21
              </span>{' '}
              goals cleared
            </p>
          </div>
          {missionSummary.perfectDays > 0 && (
            <span className="font-mono tabular-nums text-[11px] font-semibold text-[#2F8F63] dark:text-[#52B788] shrink-0">
              {missionSummary.perfectDays} all-clear {missionSummary.perfectDays === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>

        {/* 7-Day Study Habit Pattern Strip (oldest -> today) */}
        <div className="grid grid-cols-7 gap-1.5" aria-label="7-day mission completion pattern">
          {missionSummary.chronologicalDays.map((day) => {
            const count = day.completedMissions.length;
            const isPerfect = count >= day.totalMissions;
            const isPartial = count > 0 && count < day.totalMissions;
            return (
              <div
                key={day.dateKey}
                title={`${day.dayLabel}: ${count}/${day.totalMissions} daily missions completed`}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`w-full h-5 rounded-md border flex items-center justify-center font-mono tabular-nums text-[10px] font-semibold ${
                    isPerfect
                      ? 'bg-[#DFF2E8] dark:bg-[#1E3B30] border-[#9AD2B7] dark:border-[#2E624D] text-[#226E4B] dark:text-[#6AD1A1]'
                      : isPartial
                      ? 'bg-[#FFF1EA] dark:bg-[#2F211B] border-[#F0BFA8] dark:border-[#633C2C] text-[#B84A1E] dark:text-[#F3966F]'
                      : 'bg-[#F5F7F9] dark:bg-[#12191E] border-[#E5EAEF] dark:border-[#232F38] text-[#8E9CA6] dark:text-[#5C6E7B]'
                  }`}
                >
                  {count}/{day.totalMissions}
                </div>
                <span
                  className={`text-[10px] font-mono ${
                    day.isToday
                      ? 'font-bold text-[#E86A33]'
                      : 'text-[#6B7B87] dark:text-[#7E8F9B]'
                  }`}
                >
                  {day.shortDayLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Chronological Completed Missions List (most recent first) */}
        {missionSummary.daysWithCompletions.length > 0 ? (
          <div className="flex flex-col divide-y divide-[#ECEFF2] dark:divide-[#24313A] border-t border-[#ECEFF2] dark:border-[#24313A]">
            {missionSummary.daysWithCompletions.map((day) => (
              <div key={day.dateKey} className="py-2.5 first:pt-2.5 last:pb-0 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#182026] dark:text-[#F1F3F5]">
                    {day.dayLabel}
                  </span>
                  <span className="font-mono tabular-nums text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9]">
                    {day.completedMissions.length}/{day.totalMissions}
                    {day.completedMissions.length >= day.totalMissions ? ' · All Clear' : ''}
                  </span>
                </div>

                <ul className="flex flex-col gap-1 m-0 p-0 list-none">
                  {day.completedMissions.map((m) => (
                    <li
                      key={`${day.dateKey}-${m.id}`}
                      className="flex items-center justify-between gap-2 text-[11.5px]"
                    >
                      <span className="inline-flex items-center gap-1.5 min-w-0 text-[#2C3740] dark:text-[#D5DDE3]">
                        <Check className="w-3 h-3 text-[#2F8F63] dark:text-[#52B788] shrink-0" />
                        <span className="truncate">{m.title}</span>
                      </span>
                      <span className="font-mono tabular-nums text-[10.5px] text-[#5C6B77] dark:text-[#8E9EA9] whitespace-nowrap shrink-0">
                        +{m.rewardXp} XP · +{m.rewardTreats}t
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#5C6B77] dark:text-[#8E9EA9] py-3 text-center border-t border-[#ECEFF2] dark:border-[#24313A]">
            Complete a daily goal to start your 7-day mission log, or view{' '}
            <button
              type="button"
              onClick={() => setPreviewSample(true)}
              className="underline text-[#E86A33] cursor-pointer"
            >
              Sample
            </button>{' '}
            to preview a full week.
          </p>
        )}

        {missionSummary.topHabit && (
          <div className="pt-2 border-t border-[#ECEFF2] dark:border-[#24313A] flex items-center justify-between gap-2 text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
            <span>
              Strongest habit:{' '}
              <strong className="font-semibold text-[#182026] dark:text-[#E8EDF1]">
                {missionSummary.topHabit}
              </strong>
            </span>
            <span className="font-mono tabular-nums">
              {missionSummary.daysWithCompletions.length}/7 days
            </span>
          </div>
        )}
      </section>

      {/* Permanent Achievements Milestones */}
      <section className="flex flex-col gap-2.5 pt-1" aria-label="Study Achievements">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <div>
            <h4 className="text-xs font-bold text-[#182026] dark:text-[#F1F3F5]">
              Achievements
            </h4>
            <p className="text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
              Permanent badges unlocked by study milestones
            </p>
          </div>
          <span className="font-mono tabular-nums text-[11px] font-semibold text-[#2F8F63] dark:text-[#52B788] shrink-0">
            {unlockedCount}/{visibleAchievements.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visibleAchievements.map((badge) => {
            const Icon = ACHIEVEMENT_ICON_MAP[badge.icon];
            const pct = Math.min(100, Math.round((badge.current / badge.target) * 100));

            return (
              <div
                key={badge.id}
                className={`rounded-xl border p-3 flex flex-col justify-between gap-2 transition-colors ${
                  badge.unlocked
                    ? 'bg-[#F3FAF6] dark:bg-[#182822] border-[#BBDED0] dark:border-[#2B5242]'
                    : 'bg-white dark:bg-[#182127] border-[#DFE5EB] dark:border-[#293741]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      badge.unlocked
                        ? 'bg-[#DFF2E8] dark:bg-[#214034] text-[#267A53] dark:text-[#65C99A]'
                        : 'bg-[#ECEFF3] dark:bg-[#1D2730] text-[#7D8C97] dark:text-[#6D7E8A]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h5
                      className={`text-xs font-bold leading-snug ${
                        badge.unlocked
                          ? 'text-[#182026] dark:text-[#F1F3F5]'
                          : 'text-[#45535E] dark:text-[#96A5B0]'
                      }`}
                    >
                      {badge.title}
                    </h5>
                    <p className="text-[11px] text-[#5C6B77] dark:text-[#8394A0] leading-snug mt-0.5">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {badge.unlocked ? (
                  <div className="flex items-center justify-between gap-2 pt-1 text-[10.5px] text-[#267A53] dark:text-[#65C99A] font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3 h-3 shrink-0" />
                      <span>Unlocked</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#4E7A65] dark:text-[#86B89F]">
                      {formatUnlockedDate(badge.unlockedAt)}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 pt-0.5">
                    <div className="h-1 w-full rounded-full bg-[#E3E8EE] dark:bg-[#1E2A33] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#E86A33] transition-[width] duration-200"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] text-[#6B7B87] dark:text-[#7E8F9B]">
                      <span className="inline-flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 shrink-0" />
                        <span>In progress</span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {badge.current}/{badge.target} {badge.unit}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Consistency Footer */}
      <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-[#5C6B77] dark:text-[#8E9EA9]">
        <span>
          {dailyStreak > 0
            ? `Goal streak: ${dailyStreak} ${dailyStreak === 1 ? 'day' : 'days'}`
            : 'Complete daily goals to build a streak'}
        </span>
        {totals.bestDay && totals.bestDay.studyMinutes > 0 && (
          <span className="font-mono tabular-nums">
            Best day: {totals.bestDay.dayLabel} ({totals.bestDay.hours}h)
          </span>
        )}
      </div>
    </div>
  );
};
