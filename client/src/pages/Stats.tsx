import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGlobalStats } from "../hooks/use-progress";
import { channels, getQuestions, getAllQuestions, getQuestionDifficulty } from "../lib/data";
import { ArrowLeft, Trophy, Flame, Calendar, Zap } from "lucide-react";
import { motion } from "framer-motion";

// Generate activity data for a given number of days
function generateActivityData(stats: { date: string; count: number }[], days: number) {
  const data: { date: string; count: number; week: number }[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const activity = stats.find(s => s.date === dateStr);
    data.push({ date: dateStr, count: activity?.count || 0, week: Math.floor((days - 1 - i) / 7) });
  }
  return data;
}

export default function Stats() {
  const [_, setLocation] = useLocation();
  const { stats } = useGlobalStats();
  const [timeRange, setTimeRange] = useState<'30' | '90' | '365'>('90');

  // Handle ESC key to go back to main page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocation('/');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);

  const days = parseInt(timeRange);
  const activityData = generateActivityData(stats, days);
  const weeks = Math.ceil(days / 7);

  // Get all questions and calculate completed by difficulty
  const allQuestions = getAllQuestions();
  const allCompletedIds = new Set<string>();
  channels.forEach(ch => {
    const stored = localStorage.getItem(`progress-${ch.id}`);
    if (stored) JSON.parse(stored).forEach((id: string) => allCompletedIds.add(id));
  });

  const difficultyStats = {
    beginner: { total: 0, completed: 0, color: '#22c55e' },
    intermediate: { total: 0, completed: 0, color: '#eab308' },
    advanced: { total: 0, completed: 0, color: '#ef4444' },
  };

  allQuestions.forEach(q => {
    const diff = getQuestionDifficulty(q);
    difficultyStats[diff].total++;
    if (allCompletedIds.has(q.id)) difficultyStats[diff].completed++;
  });

  // Module progress
  const moduleProgress = channels.map(ch => {
    const stored = localStorage.getItem(`progress-${ch.id}`);
    const completed = stored ? JSON.parse(stored).length : 0;
    const total = getQuestions(ch.id).length;
    return { name: ch.name.replace(/\./g, ''), completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  // Totals
  const totalCompleted = allCompletedIds.size;
  const totalQuestions = allQuestions.length;
  const overallPct = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

  // Streak
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

  return (
    <div className="h-screen bg-background text-foreground flex flex-col p-3 sm:p-4 font-mono overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-2 mb-3">
        <button onClick={() => setLocation('/')} className="flex items-center gap-1 hover:text-primary text-[10px] uppercase tracking-widest font-bold">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
        <h1 className="text-sm sm:text-lg font-bold uppercase tracking-tight">
          <span className="text-primary">&gt;</span> Stats
        </h1>
      </header>

      {/* Main Grid - fits viewport */}
      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-h-0">
        
        {/* Top Row: 4 stat cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border p-2 sm:p-3 bg-card flex flex-col justify-center">
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <Trophy className="w-3 h-3 text-primary" /> Progress
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary">{overallPct}%</div>
          <div className="text-[9px] text-muted-foreground">{totalCompleted}/{totalQuestions}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="border border-border p-2 sm:p-3 bg-card flex flex-col justify-center">
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <Flame className="w-3 h-3 text-orange-500" /> Streak
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-500">{streak}</div>
          <div className="text-[9px] text-muted-foreground">days</div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="border border-border p-2 sm:p-3 bg-card flex flex-col justify-center">
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <Zap className="w-3 h-3 text-blue-400" /> Sessions
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400">{totalSessions}</div>
          <div className="text-[9px] text-muted-foreground">total</div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="border border-border p-2 sm:p-3 bg-card flex flex-col justify-center">
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <Calendar className="w-3 h-3 text-green-400" /> Period
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-400">{periodActivity}</div>
          <div className="text-[9px] text-muted-foreground">{timeRange}d sessions</div>
        </motion.div>

        {/* Difficulty Progress - spans 2 cols */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="col-span-2 border border-border p-2 sm:p-3 bg-card">
          <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-2">By Difficulty</h2>
          <div className="space-y-2">
            {Object.entries(difficultyStats).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-[9px] sm:text-[10px] mb-0.5">
                  <span className="uppercase" style={{ color: val.color }}>{key}</span>
                  <span className="text-muted-foreground">{val.completed}/{val.total}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${val.total > 0 ? (val.completed / val.total) * 100 : 0}%` }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="h-full rounded-full" 
                    style={{ backgroundColor: val.color }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Module Progress - spans 2 cols */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="col-span-2 border border-border p-2 sm:p-3 bg-card">
          <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-2">By Module</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {moduleProgress.map((m) => (
              <div key={m.name}>
                <div className="flex justify-between text-[9px] sm:text-[10px] mb-0.5">
                  <span className="uppercase truncate">{m.name}</span>
                  <span className="text-muted-foreground ml-1">{m.pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${m.pct}%` }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="h-full bg-primary rounded-full" 
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Activity Heatmap - spans full width */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="col-span-2 lg:col-span-4 border border-border p-2 sm:p-3 bg-card flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Activity
            </h2>
            <div className="flex gap-0.5 bg-muted/30 p-0.5 rounded">
              {(['30', '90', '365'] as const).map((r) => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 text-[9px] uppercase rounded ${timeRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {r === '365' ? '1Y' : r + 'D'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Heatmap */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-[2px] min-w-fit">
              {Array.from({ length: weeks }, (_, w) => (
                <div key={w} className="flex flex-col gap-[2px]">
                  {Array.from({ length: 7 }, (_, d) => {
                    const idx = w * 7 + d;
                    const day = activityData[idx];
                    if (!day) return <div key={d} className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px]" />;
                    return (
                      <div key={d} title={`${day.date}: ${day.count}`}
                        className={`w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] rounded-sm ${getActivityClass(day.count)} hover:ring-1 hover:ring-primary`} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-2 text-[8px] sm:text-[9px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-[2px]">
              {['bg-muted/20', 'bg-primary/30', 'bg-primary/50', 'bg-primary/75', 'bg-primary'].map((c, i) => (
                <div key={i} className={`w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] rounded-sm ${c}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
