/**
 * Daily Review Card Component
 * Shows SRS review queue status and quick access to reviews
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Brain, Flame, ChevronRight, 
  Trophy, Zap
} from 'lucide-react';
import { 
  getSRSStats, getDueCards, getMasteryColor, getMasteryEmoji, getUserXP,
  type SRSStats, type ReviewCard 
} from '../lib/spaced-repetition';
import { ProgressRing } from './ProgressRing';

// Event emitter for SRS updates
const srsUpdateListeners = new Set<() => void>();

export function notifySRSUpdate() {
  srsUpdateListeners.forEach(listener => listener());
}

export function DailyReviewCard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<SRSStats | null>(null);
  const [dueCards, setDueCards] = useState<ReviewCard[]>([]);
  const [userXP, setUserXP] = useState({ totalXP: 0, level: 1, xpToNext: 100, progress: 0 });

  const loadData = () => {
    setStats(getSRSStats());
    setDueCards(getDueCards());
    setUserXP(getUserXP());
  };

  useEffect(() => {
    loadData();
    
    // Subscribe to SRS updates
    srsUpdateListeners.add(loadData);
    return () => {
      srsUpdateListeners.delete(loadData);
    };
  }, []);

  if (!stats || stats.totalCards === 0) {
    return null;
  }

  const hasDueCards = stats.dueToday > 0;
  const dailyGoal = 10;
  const todayProgress = Math.min(100, ((stats.newToday + (dailyGoal - stats.dueToday)) / dailyGoal) * 100);

  return (
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl sm:rounded-2xl border overflow-hidden ${
          hasDueCards 
            ? 'bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-cyan-500/10 border-purple-500/20' 
            : 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20'
        }`}
      >
        {/* Header with Level & Streak */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/20 rounded-full">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="text-xs font-bold text-purple-400">Lv.{userXP.level}</span>
            </div>
            <span className="text-xs text-muted-foreground">{userXP.totalXP} XP</span>
          </div>
          {stats.reviewStreak > 0 && (
            <motion.div 
              className="flex items-center gap-1 text-orange-500"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Flame className="w-4 h-4" />
              <span className="text-xs font-bold">{stats.reviewStreak}🔥</span>
            </motion.div>
          )}
        </div>

        {/* Main Content */}
        <button
          onClick={() => setLocation('/review')}
          className="w-full p-3 sm:p-4 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            {/* Progress Ring */}
            <ProgressRing 
              progress={hasDueCards ? todayProgress : 100} 
              size={70}
              strokeWidth={6}
              color={hasDueCards ? '#a855f7' : '#22c55e'}
              bgColor={hasDueCards ? 'rgba(168, 85, 247, 0.15)' : 'rgba(34, 197, 94, 0.15)'}
            >
              {hasDueCards ? (
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-500">{stats.dueToday}</div>
                  <div className="text-[9px] text-muted-foreground">due</div>
                </div>
              ) : (
                <Trophy className="w-6 h-6 text-green-500" />
              )}
            </ProgressRing>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Brain className={`w-4 h-4 ${hasDueCards ? 'text-purple-500' : 'text-green-500'}`} />
                <span className={`text-sm font-semibold ${hasDueCards ? 'text-purple-500' : 'text-green-500'}`}>
                  {hasDueCards ? 'Ready to Review' : 'All Caught Up!'}
                </span>
              </div>
              
              {hasDueCards ? (
                <div className="flex flex-wrap gap-1">
                  {dueCards.slice(0, 4).map((card) => (
                    <span
                      key={card.questionId}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getMasteryColor(card.masteryLevel)} bg-muted/50`}
                    >
                      <span>{getMasteryEmoji(card.masteryLevel)}</span>
                      {card.channel.slice(0, 8)}
                    </span>
                  ))}
                  {dueCards.length > 4 && (
                    <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      +{dueCards.length - 4}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {stats.dueTomorrow > 0 
                    ? `${stats.dueTomorrow} cards due tomorrow`
                    : 'Great job! Keep the streak going'}
                </p>
              )}
            </div>

            {/* Arrow */}
            <ChevronRight className={`w-5 h-5 ${hasDueCards ? 'text-purple-500' : 'text-green-500'}`} />
          </div>
        </button>

        {/* Stats Footer */}
        <div className="px-3 sm:px-4 py-2 border-t border-border/30 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-sm font-bold">{stats.totalCards}</div>
            <div className="text-[9px] text-muted-foreground">Cards</div>
          </div>
          <div>
            <div className="text-sm font-bold text-yellow-500 flex items-center justify-center gap-0.5">
              👑 {stats.mastered}
            </div>
            <div className="text-[9px] text-muted-foreground">Mastered</div>
          </div>
          <div>
            <div className="text-sm font-bold text-blue-500 flex items-center justify-center gap-0.5">
              📚 {stats.learning}
            </div>
            <div className="text-[9px] text-muted-foreground">Learning</div>
          </div>
          <div>
            <div className="text-sm font-bold text-green-500">{stats.dueThisWeek}</div>
            <div className="text-[9px] text-muted-foreground">This Week</div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default DailyReviewCard;
