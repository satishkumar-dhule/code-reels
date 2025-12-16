import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGlobalStats } from "../hooks/use-progress";
import { channels, getQuestionDifficulty } from "../lib/data";
import { useChannelStats, useAllQuestionMetadata } from "../hooks/use-questions";
import { 
  ArrowLeft, Trophy, Flame, Zap, Star, AlertCircle, 
  TrendingUp, Target, Activity, ChevronRight, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { SEOHead } from "../components/SEOHead";
import { trackStatsView } from "../hooks/use-analytics";

function generateActivityData(stats: { date: string; count: number }[], days: number) {
  const data: { date: string; count: number; week: number; dayOfWeek: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const activity = stats.find(s => s.date === dateStr);
    data.push({ date: dateStr, count: activity?.count || 0, week: Math.floor((days - 1 - i) / 7), dayOfWeek: date.getDay() });
  }
  return data;
}

function CircularProgress({ value, max, size = 100, strokeWidth = 6, children }: { 
  value: number; max: number; size?: number; strokeWidth?: number; children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = max > 0 ? (value / max) * 100 : 0;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export default function Stats() {
  const [_, setLocation] = useLocation();
  const { stats } = useGlobalStats();
  const [timeRange, setTimeRange] = useState<'30' | '90' | '365'>('90');

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  useEffect(() => {
    trackStatsView();
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') goBack(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const days = parseInt(timeRange);
  const activityData = generateActivityData(stats, days);
  const weeks = Math.ceil(days / 7);

  // Use lightweight metadata (no full question loading needed for stats)
  const { metadata: allQuestionMetadata } = useAllQuestionMetadata();
  const { stats: channelStats } = useChannelStats();
  
  const allCompletedIds = new Set<string>();
  channels.forEach(ch => {
    const stored = localStorage.getItem(`progress-${ch.id}`);
    if (stored) JSON.parse(stored).forEach((id: string) => allCompletedIds.add(id));
  });

  // Module progress with difficulty breakdown (using metadata - no full load)
  const moduleProgress = channels.map(ch => {
    const chStats = channelStats.find(s => s.id === ch.id);
    const stored = localStorage.getItem(`progress-${ch.id}`);
    const completedIds = stored ? new Set(JSON.parse(stored)) : new Set();
    
    // Get difficulty breakdown from channel stats
    const difficulty = { 
      beginner: { total: chStats?.beginner || 0, done: 0 }, 
      intermediate: { total: chStats?.intermediate || 0, done: 0 }, 
      advanced: { total: chStats?.advanced || 0, done: 0 } 
    };
    
    // Count completed by difficulty using metadata
    allQuestionMetadata
      .filter(m => m.channel === ch.id && completedIds.has(m.id))
      .forEach(m => {
        const d = m.difficulty as 'beginner' | 'intermediate' | 'advanced';
        if (difficulty[d]) difficulty[d].done++;
      });

    return { 
      id: ch.id, name: ch.name.replace(/\./g, ''), 
      completed: completedIds.size, total: chStats?.total || 0, 
      pct: (chStats?.total || 0) > 0 ? Math.round((completedIds.size / (chStats?.total || 1)) * 100) : 0,
      difficulty
    };
  }).filter(m => m.total > 0).sort((a, b) => b.pct - a.pct);

  const totalCompleted = allCompletedIds.size;
  const totalQuestions = allQuestionMetadata.length;
  const overallPct = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

  // Global difficulty stats (from metadata - lightweight)
  const globalDifficulty = { beginner: { total: 0, done: 0 }, intermediate: { total: 0, done: 0 }, advanced: { total: 0, done: 0 } };
  allQuestionMetadata.forEach(m => {
    const d = m.difficulty as 'beginner' | 'intermediate' | 'advanced';
    if (globalDifficulty[d]) {
      globalDifficulty[d].total++;
      if (allCompletedIds.has(m.id)) globalDifficulty[d].done++;
    }
  });

  const streak = (() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (stats.find(x => x.date === d.toISOString().split('T')[0])) s++;
      else break;
    }
    return s;
  })();

  const totalSessions = stats.reduce((a, c) => a + c.count, 0);
  const periodActivity = activityData.reduce((a, d) => a + d.count, 0);

  const getActivityClass = (count: number) => {
    if (count === 0) return 'bg-muted/20';
    if (count === 1) return 'bg-primary/30';
    if (count <= 3) return 'bg-primary/50';
    if (count <= 5) return 'bg-primary/75';
    return 'bg-primary';
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const diffColors = { beginner: '#22c55e', intermediate: '#eab308', advanced: '#ef4444' };

  return (
    <>
      <SEOHead 
        title="Progress Stats - Code Reels Interview Prep" 
        description="Track your technical interview preparation progress. View completion stats, activity heatmap, and difficulty breakdown across all channels."
        keywords="interview prep stats, progress tracking, learning analytics, study streak"
        canonical="https://reel-interview.github.io/stats"
      />
      <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 font-mono overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="flex items-center justify-between mb-4">
            <button onClick={goBack} className="flex items-center gap-1.5 hover:text-primary text-[10px] uppercase tracking-widest font-bold">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <h1 className="text-base sm:text-xl font-bold uppercase"><span className="text-primary">&gt;</span> Stats</h1>
            <div className="flex gap-1">
              <a href="https://github.com/satishkumar-dhule/code-reels/issues/new" target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-muted rounded"><AlertCircle className="w-3.5 h-3.5" /></a>
              <a href="https://github.com/satishkumar-dhule/code-reels" target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-muted rounded"><Star className="w-3.5 h-3.5" /></a>
            </div>
          </header>

          {/* Top Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border border-border p-3 bg-card rounded-lg flex items-center gap-3">
              <CircularProgress value={totalCompleted} max={totalQuestions} size={48} strokeWidth={4}>
                <span className="text-xs font-bold text-primary">{overallPct}%</span>
              </CircularProgress>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Progress</div>
                <div className="text-sm font-bold">{totalCompleted}/{totalQuestions}</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-border p-3 bg-card rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center"><Flame className="w-5 h-5 text-orange-500" /></div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Streak</div>
                <div className="text-sm font-bold text-orange-500">{streak} days</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="border border-border p-3 bg-card rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><Zap className="w-5 h-5 text-blue-500" /></div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Sessions</div>
                <div className="text-sm font-bold text-blue-500">{totalSessions}</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="border border-border p-3 bg-card rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center"><Target className="w-5 h-5 text-purple-500" /></div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">{timeRange}d Activity</div>
                <div className="text-sm font-bold text-purple-500">{periodActivity}</div>
              </div>
            </motion.div>
          </div>

          {/* Difficulty Overview */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="border border-border p-3 bg-card rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">By Difficulty</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as const).map((d) => {
                const pct = globalDifficulty[d].total > 0 ? Math.round((globalDifficulty[d].done / globalDifficulty[d].total) * 100) : 0;
                return (
                  <div key={d} className="text-center">
                    <div className="text-lg font-bold" style={{ color: diffColors[d] }}>{pct}%</div>
                    <div className="h-1 bg-muted/30 rounded-full overflow-hidden mb-1">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: diffColors[d] }} />
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase">{d}</div>
                    <div className="text-[9px] text-muted-foreground">{globalDifficulty[d].done}/{globalDifficulty[d].total}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Activity Heatmap */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="border border-border p-3 bg-card rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Activity</span></div>
              <div className="flex gap-0.5 bg-muted/30 p-0.5 rounded">
                {(['30', '90', '365'] as const).map((r) => (
                  <button key={r} onClick={() => setTimeRange(r)} className={`px-2 py-0.5 text-[9px] uppercase rounded ${timeRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {r === '365' ? '1Y' : r + 'D'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="flex gap-[2px] min-w-fit">
                <div className="flex flex-col gap-[2px] mr-0.5">{dayLabels.map((d, i) => <div key={i} className="w-2.5 h-[10px] text-[7px] text-muted-foreground flex items-center">{i % 2 === 1 ? d : ''}</div>)}</div>
                {Array.from({ length: weeks }, (_, w) => (
                  <div key={w} className="flex flex-col gap-[2px]">
                    {Array.from({ length: 7 }, (_, d) => {
                      const idx = w * 7 + d;
                      const day = activityData[idx];
                      if (!day) return <div key={d} className="w-[10px] h-[10px]" />;
                      return <div key={d} title={`${day.date}: ${day.count}`} className={`w-[10px] h-[10px] rounded-sm ${getActivityClass(day.count)} hover:ring-1 hover:ring-primary`} />;
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-2 text-[8px] text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-[2px]">{['bg-muted/20', 'bg-primary/30', 'bg-primary/50', 'bg-primary/75', 'bg-primary'].map((c, i) => <div key={i} className={`w-[10px] h-[10px] rounded-sm ${c}`} />)}</div>
              <span>More</span>
            </div>
          </motion.div>

          {/* Channel Progress with Difficulty */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="border border-border p-3 bg-card rounded-lg">
            <div className="flex items-center gap-1.5 mb-3"><Trophy className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Channels</span></div>
            <div className="space-y-2">
              {moduleProgress.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.02 }}
                  className="p-2 bg-muted/10 rounded border border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => setLocation(`/channel/${m.id}`)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase truncate">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground">{m.completed}/{m.total}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-primary font-bold">{m.pct}%</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                  {/* Main progress bar */}
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mb-1.5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ delay: 0.4 + i * 0.02, duration: 0.4 }} className="h-full bg-primary rounded-full" />
                  </div>
                  {/* Difficulty breakdown */}
                  <div className="flex gap-3 text-[9px]">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((d) => {
                      const pct = m.difficulty[d].total > 0 ? Math.round((m.difficulty[d].done / m.difficulty[d].total) * 100) : 0;
                      return (
                        <div key={d} className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: diffColors[d] }} />
                          <span className="text-muted-foreground">{m.difficulty[d].done}/{m.difficulty[d].total}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
