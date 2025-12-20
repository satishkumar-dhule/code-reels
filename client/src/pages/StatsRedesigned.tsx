/**
 * Redesigned Stats Page - Clean interface
 * Dashboard with progress cards, activity heatmap, and channel breakdown
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { useGlobalStats } from '../hooks/use-progress';
import { channels, getQuestions, getAllQuestions, getQuestionDifficulty } from '../lib/data';
import { SEOHead } from '../components/SEOHead';
import { GitHubAnalytics } from '../components/GitHubAnalytics';
import { BadgeShowcase, NextBadgeProgress } from '../components/BadgeDisplay';
import { calculateBadgeProgress } from '../lib/badges';
import {
  Trophy, Flame, Zap, Target, Activity, TrendingUp, 
  ChevronRight, BarChart2, Calendar
} from 'lucide-react';

export default function StatsRedesigned() {
  const [, setLocation] = useLocation();
  const { stats } = useGlobalStats();
  const [timeRange, setTimeRange] = useState<'30' | '90' | '365'>('90');

  const days = parseInt(timeRange);

  // Calculate all stats
  const { 
    totalCompleted, 
    totalQuestions, 
    overallPct, 
    streak, 
    totalSessions,
    globalDifficulty,
    moduleProgress,
    activityData,
    badgeProgress
  } = useMemo(() => {
    const allQuestions = getAllQuestions();
    const allCompletedIds = new Set<string>();
    const channelsWithProgress: string[] = [];
    const channelCompletionPcts: number[] = [];

    const globalDiff = { 
      beginner: { total: 0, done: 0 }, 
      intermediate: { total: 0, done: 0 }, 
      advanced: { total: 0, done: 0 } 
    };

    const modProgress = channels.map(ch => {
      const questions = getQuestions(ch.id);
      const stored = localStorage.getItem(`progress-${ch.id}`);
      const completedIds = stored ? new Set(JSON.parse(stored)) : new Set();

      Array.from(completedIds).forEach((id) => allCompletedIds.add(id as string));
      if (completedIds.size > 0) channelsWithProgress.push(ch.id);

      const difficulty = { 
        beginner: { total: 0, done: 0 }, 
        intermediate: { total: 0, done: 0 }, 
        advanced: { total: 0, done: 0 } 
      };

      questions.forEach(q => {
        const d = getQuestionDifficulty(q);
        difficulty[d].total++;
        globalDiff[d].total++;
        if (completedIds.has(q.id)) {
          difficulty[d].done++;
          globalDiff[d].done++;
        }
      });

      // Cap at 100% to handle recategorized questions
      const validCompleted = Math.min(completedIds.size, questions.length);
      const pct = questions.length > 0 ? Math.min(100, Math.round((validCompleted / questions.length) * 100)) : 0;
      if (questions.length > 0) channelCompletionPcts.push(pct);

      return {
        id: ch.id,
        name: ch.name,
        completed: validCompleted,
        total: questions.length,
        pct,
        difficulty
      };
    }).filter(m => m.total > 0).sort((a, b) => b.pct - a.pct);

    // Calculate streak
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (stats.find(x => x.date === d.toISOString().split('T')[0])) currentStreak++;
      else break;
    }

    // Generate activity data
    const actData: { date: string; count: number; week: number; dayOfWeek: number }[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const activity = stats.find(s => s.date === dateStr);
      actData.push({ 
        date: dateStr, 
        count: activity?.count || 0, 
        week: Math.floor((days - 1 - i) / 7), 
        dayOfWeek: date.getDay() 
      });
    }

    // Calculate badge progress
    const badges = calculateBadgeProgress(
      allCompletedIds.size,
      currentStreak,
      channelsWithProgress,
      { beginner: globalDiff.beginner.done, intermediate: globalDiff.intermediate.done, advanced: globalDiff.advanced.done },
      channelCompletionPcts,
      channels.length
    );

    const validTotalCompleted = Math.min(allCompletedIds.size, allQuestions.length);
    return {
      totalCompleted: validTotalCompleted,
      totalQuestions: allQuestions.length,
      overallPct: allQuestions.length > 0 ? Math.min(100, Math.round((validTotalCompleted / allQuestions.length) * 100)) : 0,
      streak: currentStreak,
      totalSessions: stats.reduce((a, c) => a + c.count, 0),
      globalDifficulty: globalDiff,
      moduleProgress: modProgress,
      activityData: actData,
      badgeProgress: badges
    };
  }, [stats, days]);

  const diffColors = { beginner: '#22c55e', intermediate: '#eab308', advanced: '#ef4444' };

  return (
    <>
      <SEOHead
        title="Track Your Interview Prep Progress - Stats & Analytics | Code Reels"
        description="Monitor your technical interview preparation progress with detailed analytics."
        canonical="https://reel-interview.github.io/stats"
      />

      <AppLayout title="Statistics">
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Progress"
              value={`${overallPct}%`}
              subtext={`${totalCompleted}/${totalQuestions}`}
              color="text-primary"
              bgColor="bg-primary/10"
            />
            <StatCard
              icon={<Flame className="w-5 h-5" />}
              label="Streak"
              value={`${streak}`}
              subtext="days"
              color="text-orange-500"
              bgColor="bg-orange-500/10"
            />
            <StatCard
              icon={<Zap className="w-5 h-5" />}
              label="Sessions"
              value={totalSessions.toString()}
              subtext="total"
              color="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              label={`${timeRange}d Activity`}
              value={activityData.reduce((a, d) => a + d.count, 0).toString()}
              subtext="questions"
              color="text-purple-500"
              bgColor="bg-purple-500/10"
            />
          </div>

          {/* Badges Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div 
              className="cursor-pointer" 
              onClick={() => setLocation('/badges')}
            >
              <BadgeShowcase badges={badgeProgress} title="Your Badges" />
            </div>
            <NextBadgeProgress badges={badgeProgress} />
          </div>

          {/* Difficulty Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              By Difficulty
            </h3>
            <div className="grid grid-cols-3 gap-6">
              {(['beginner', 'intermediate', 'advanced'] as const).map((d) => {
                const pct = globalDifficulty[d].total > 0 
                  ? Math.round((globalDifficulty[d].done / globalDifficulty[d].total) * 100) 
                  : 0;
                return (
                  <div key={d} className="text-center">
                    <div className="text-3xl font-bold mb-2" style={{ color: diffColors[d] }}>
                      {pct}%
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: diffColors[d] }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">{d}</div>
                    <div className="text-xs text-muted-foreground">
                      {globalDifficulty[d].done}/{globalDifficulty[d].total}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* GitHub Analytics */}
          <GitHubAnalytics />

          {/* Activity Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Activity
              </h3>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                {(['30', '90', '365'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      timeRange === r 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r === '365' ? '1Y' : r + 'D'}
                  </button>
                ))}
              </div>
            </div>
            <ActivityHeatmap data={activityData} days={days} />
          </motion.div>

          {/* Channel Progress */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Channel Progress
            </h3>
            <div className="space-y-3">
              {moduleProgress.slice(0, 10).map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setLocation(`/channel/${m.id}`)}
                  className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {m.completed}/{m.total}
                      </span>
                      <span className="text-primary font-bold">{m.pct}%</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.pct}%` }}
                      transition={{ duration: 0.4, delay: i * 0.03 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  {/* Difficulty breakdown */}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                      <div key={d} className="flex items-center gap-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: diffColors[d] }} 
                        />
                        <span>{m.difficulty[d].done}/{m.difficulty[d].total}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </AppLayout>
    </>
  );
}

function StatCard({ icon, label, value, subtext, color, bgColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: string;
  bgColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <div className={color}>{icon}</div>
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
        <span className="text-sm text-muted-foreground">{subtext}</span>
      </div>
    </motion.div>
  );
}

function ActivityHeatmap({ data, days }: { data: any[]; days: number }) {
  const weeks = Math.ceil(days / 7);
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getActivityClass = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    if (count === 1) return 'bg-primary/30';
    if (count <= 3) return 'bg-primary/50';
    if (count <= 5) return 'bg-primary/75';
    return 'bg-primary';
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] min-w-fit">
        <div className="flex flex-col gap-[3px] mr-1">
          {dayLabels.map((d, i) => (
            <div key={i} className="w-3 h-3 text-[9px] text-muted-foreground flex items-center">
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, d) => {
              const idx = w * 7 + d;
              const day = data[idx];
              if (!day) return <div key={d} className="w-3 h-3" />;
              return (
                <div
                  key={d}
                  title={`${day.date}: ${day.count} questions`}
                  className={`w-3 h-3 rounded-sm ${getActivityClass(day.count)} hover:ring-1 hover:ring-primary transition-all`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-[3px]">
          {['bg-muted/30', 'bg-primary/30', 'bg-primary/50', 'bg-primary/75', 'bg-primary'].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
