/**
 * Gen Z Stats Page - Your Progress Dashboard
 * Beautiful charts, streaks, achievements
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { useGlobalStats } from '../hooks/use-progress';
import { useCredits } from '../context/CreditsContext';
import { channels, getQuestions, getAllQuestions, getQuestionDifficulty } from '../lib/data';
import { SEOHead } from '../components/SEOHead';
import { PullToRefresh, SkeletonCard } from '../components/mobile';
import {
  Trophy, Flame, Zap, Target, TrendingUp, Calendar, BarChart2, Award
} from 'lucide-react';

export default function StatsGenZ() {
  const [, setLocation] = useLocation();
  const { stats } = useGlobalStats();
  const { balance } = useCredits();
  const [isLoading, setIsLoading] = useState(false);

  // Calculate stats
  const { totalCompleted, totalQuestions, streak, moduleProgress } = useMemo(() => {
    const allQuestions = getAllQuestions();
    const allCompletedIds = new Set<string>();

    const modProgress = channels.map(ch => {
      const questions = getQuestions(ch.id);
      const stored = localStorage.getItem(`progress-${ch.id}`);
      const completedIds = stored ? new Set(JSON.parse(stored)) : new Set();

      Array.from(completedIds).forEach((id) => allCompletedIds.add(id as string));

      const validCompleted = Math.min(completedIds.size, questions.length);
      const pct = questions.length > 0 ? Math.min(100, Math.round((validCompleted / questions.length) * 100)) : 0;

      return {
        id: ch.id,
        name: ch.name,
        completed: validCompleted,
        total: questions.length,
        pct
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

    return {
      totalCompleted: allCompletedIds.size,
      totalQuestions: allQuestions.length,
      streak: currentStreak,
      moduleProgress: modProgress
    };
  }, [stats]);

  const level = Math.floor(balance / 100);
  const xpInLevel = balance % 100;

  // Refresh handler for pull-to-refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate refresh (in a real app, this would refetch data)
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.reload();
  };

  return (
    <>
      <SEOHead
        title="Your Stats - Track Your Progress 📊"
        description="See your learning progress, streaks, and achievements"
        canonical="https://open-interview.github.io/stats"
      />

      <AppLayout>
        <PullToRefresh onRefresh={handleRefresh}>
          {/* iPhone 13 FIX: Ensure content fits within viewport with safe areas */}
          <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 w-full"
                 style={{ maxWidth: '100vw' }}>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4 md:space-y-6 mb-8 md:mb-12"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black">
                Your
                <br />
                <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                  progress
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Keep crushing it 💪
              </p>
            </motion.div>

            {/* Top Stats */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12 w-full">
                {[...Array(4)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12 w-full"
                   style={{ maxWidth: '100%' }}>
              {/* Streak */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-6 md:p-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl rounded-[20px] md:rounded-[24px] border border-orange-500/30"
              >
                <Flame className="w-10 h-10 md:w-12 md:h-12 text-orange-500 mb-3 md:mb-4" />
                <div className="text-4xl md:text-5xl font-black mb-2">{streak}</div>
                <div className="text-xs md:text-sm text-muted-foreground">day streak</div>
              </motion.div>

              {/* XP */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-6 md:p-8 bg-gradient-to-br from-primary/20 to-cyan-500/20 backdrop-blur-xl rounded-[20px] md:rounded-[24px] border border-primary/30"
              >
                <Zap className="w-10 h-10 md:w-12 md:h-12 text-primary mb-3 md:mb-4" />
                <div className="text-4xl md:text-5xl font-black mb-2">{balance}</div>
                <div className="text-xs md:text-sm text-muted-foreground">total XP</div>
              </motion.div>

              {/* Level */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="p-6 md:p-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-[20px] md:rounded-[24px] border border-purple-500/30"
              >
                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-purple-400 mb-3 md:mb-4" />
                <div className="text-4xl md:text-5xl font-black mb-2">{level}</div>
                <div className="text-xs md:text-sm text-muted-foreground">level</div>
              </motion.div>

              {/* Completed */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="p-6 md:p-8 bg-gradient-to-br from-[#ffd700]/20 to-[#ff8c00]/20 backdrop-blur-xl rounded-[20px] md:rounded-[24px] border border-[#ffd700]/30"
              >
                <Target className="w-10 h-10 md:w-12 md:h-12 text-[#ffd700] mb-3 md:mb-4" />
                <div className="text-4xl md:text-5xl font-black mb-2">{totalCompleted}</div>
                <div className="text-xs md:text-sm text-muted-foreground">completed</div>
              </motion.div>
            </div>
            )}

            {/* Level Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 md:p-8 bg-muted/50 backdrop-blur-xl rounded-[20px] md:rounded-[24px] border border-border mb-8 md:mb-12 w-full overflow-hidden"
              style={{ maxWidth: '100%' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold">Level {level}</h2>
                <span className="text-sm md:text-base text-muted-foreground">{xpInLevel}/100 XP</span>
              </div>
              <div className="h-3 md:h-4 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpInLevel}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="h-full bg-gradient-to-r from-primary to-cyan-500"
                />
              </div>
            </motion.div>

            {/* Channel Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6 w-full overflow-hidden"
              style={{ maxWidth: '100%' }}
            >
              <h2 className="text-2xl md:text-3xl font-black">Channel Progress</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full"
                   style={{ maxWidth: '100%' }}>
                {moduleProgress.slice(0, 10).map((mod, i) => (
                  <motion.button
                    key={mod.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.05 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLocation(`/channel/${mod.id}`)}
                    className="p-5 md:p-6 bg-muted/50 backdrop-blur-xl rounded-[18px] md:rounded-[20px] border border-border hover:border-border transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg md:text-xl font-bold truncate pr-2">{mod.name}</h3>
                      {mod.pct === 100 && (
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-[#ffd700] to-[#ff8c00] rounded-full flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-4 h-4 md:w-5 md:h-5 text-black" />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{mod.completed}/{mod.total}</span>
                        <span className="font-bold">{mod.pct}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${mod.pct}%` }}
                          transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                          className="h-full bg-gradient-to-r from-primary to-cyan-500"
                        />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Activity Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-12 p-6 md:p-8 bg-muted/50 backdrop-blur-xl rounded-[20px] md:rounded-[24px] border border-border w-full"
              style={{ maxWidth: '100%', overflowX: 'hidden' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-primary" />
                <h2 className="text-xl md:text-2xl font-bold">Activity Heatmap</h2>
                <span className="text-xs md:text-sm text-muted-foreground ml-auto">Last 13 weeks</span>
              </div>
              
              {/* Mobile: Scrollable heatmap */}
              <div className="md:hidden overflow-x-auto -mx-6 px-6">
                <div className="min-w-[600px] space-y-2">
                  {/* Day labels */}
                  <div className="grid grid-cols-[auto_1fr] gap-4">
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground justify-around py-1">
                      <div>Mon</div>
                      <div>Wed</div>
                      <div>Fri</div>
                    </div>
                    
                    {/* Heatmap grid */}
                    <div className="grid grid-cols-13 gap-1">
                      {Array.from({ length: 91 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (90 - i));
                        const hasActivity = stats.find(s => s.date === date.toISOString().split('T')[0]);
                        
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1 + (i * 0.002) }}
                            className={`aspect-square rounded-md transition-all hover:scale-110 ${
                              hasActivity
                                ? 'bg-gradient-to-br from-primary to-cyan-500 shadow-lg shadow-[#00ff88]/20'
                                : 'bg-muted/50 hover:bg-muted'
                            }`}
                            title={`${date.toLocaleDateString()}${hasActivity ? ' - Active' : ''}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-4 justify-end pt-4 text-xs text-muted-foreground">
                    <span>Less</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 bg-muted/50 rounded-sm" />
                      <div className="w-4 h-4 bg-[#00ff88]/30 rounded-sm" />
                      <div className="w-4 h-4 bg-[#00ff88]/60 rounded-sm" />
                      <div className="w-4 h-4 bg-gradient-to-br from-primary to-cyan-500 rounded-sm" />
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </div>

              {/* Desktop: Full heatmap */}
              <div className="hidden md:block space-y-2">
                {/* Day labels */}
                <div className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="flex flex-col gap-2 text-xs text-muted-foreground justify-around py-1">
                    <div>Mon</div>
                    <div>Wed</div>
                    <div>Fri</div>
                  </div>
                  
                  {/* Heatmap grid */}
                  <div className="grid grid-cols-13 gap-1">
                    {Array.from({ length: 91 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (90 - i));
                      const hasActivity = stats.find(s => s.date === date.toISOString().split('T')[0]);
                      
                      return (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1 + (i * 0.002) }}
                          className={`aspect-square rounded-md transition-all hover:scale-110 ${
                            hasActivity
                              ? 'bg-gradient-to-br from-primary to-cyan-500 shadow-lg shadow-[#00ff88]/20'
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                          title={`${date.toLocaleDateString()}${hasActivity ? ' - Active' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 justify-end pt-4 text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 bg-muted/50 rounded-sm" />
                    <div className="w-4 h-4 bg-[#00ff88]/30 rounded-sm" />
                    <div className="w-4 h-4 bg-[#00ff88]/60 rounded-sm" />
                    <div className="w-4 h-4 bg-gradient-to-br from-primary to-cyan-500 rounded-sm" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        </PullToRefresh>
      </AppLayout>
    </>
  );
}
