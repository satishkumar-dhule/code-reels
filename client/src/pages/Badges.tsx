/**
 * Badges Page - Apple Watch-style achievement showcase
 * Shows all badges, progress, and what's needed to unlock each
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  ArrowLeft, Trophy, Flame, Target, Compass, Sparkles, Star,
  ChevronRight, Lock, Check, X
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { AppLayout } from '../components/layout/AppLayout';
import { BadgeRing } from '../components/BadgeDisplay';
import { 
  BADGES, Badge, BadgeProgress, calculateBadgeProgress, 
  getCategoryLabel, getTierColor, getUnlockedBadges 
} from '../lib/badges';
import { channels, getQuestions, getAllQuestions, getQuestionDifficulty } from '../lib/data';
import { useGlobalStats } from '../hooks/use-progress';

const categoryIcons: Record<string, React.ReactNode> = {
  streak: <Flame className="w-4 h-4" />,
  completion: <Target className="w-4 h-4" />,
  mastery: <Trophy className="w-4 h-4" />,
  explorer: <Compass className="w-4 h-4" />,
  special: <Sparkles className="w-4 h-4" />,
};

// 3D Tilt Card Component - iOS-style depth effect
function Tilt3DCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springConfig = { damping: 20, stiffness: 300 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), springConfig);
  
  const handleMove = (clientX: number, clientY: number) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((clientX - centerX) / rect.width);
    y.set((clientY - centerY) / rect.height);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  
  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      style={{ 
        rotateX, 
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseLeave={handleLeave}
      onTouchEnd={handleLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}


const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;

export default function Badges() {
  const [_, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);
  const { stats } = useGlobalStats();

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  // Calculate user stats
  const userStats = useMemo(() => {
    const allQuestions = getAllQuestions();
    const allCompletedIds = new Set<string>();
    const channelsWithProgress: string[] = [];
    const channelCompletionPcts: number[] = [];
    const difficultyStats = { beginner: 0, intermediate: 0, advanced: 0 };

    channels.forEach(ch => {
      const questions = getQuestions(ch.id);
      const stored = localStorage.getItem(`progress-${ch.id}`);
      const completedIds = stored ? new Set(JSON.parse(stored)) : new Set<string>();
      
      Array.from(completedIds).forEach((id) => allCompletedIds.add(id as string));
      
      if (completedIds.size > 0) {
        channelsWithProgress.push(ch.id);
      }
      
      if (questions.length > 0) {
        // Cap at 100% to handle recategorized questions
        channelCompletionPcts.push(Math.min(100, Math.round((completedIds.size / questions.length) * 100)));
      }
      
      questions.forEach(q => {
        if (completedIds.has(q.id)) {
          const d = getQuestionDifficulty(q);
          difficultyStats[d]++;
        }
      });
    });

    // Calculate streak
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (stats.find(x => x.date === d.toISOString().split('T')[0])) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalCompleted: allCompletedIds.size,
      streak,
      channelsExplored: channelsWithProgress,
      difficultyStats,
      channelCompletionPcts,
      totalChannels: channels.length,
    };
  }, [stats]);

  // Calculate badge progress
  const badgeProgress = useMemo(() => {
    return calculateBadgeProgress(
      userStats.totalCompleted,
      userStats.streak,
      userStats.channelsExplored,
      userStats.difficultyStats,
      userStats.channelCompletionPcts,
      userStats.totalChannels
    );
  }, [userStats]);

  // Group badges by category
  const badgesByCategory = useMemo(() => {
    const grouped: Record<string, BadgeProgress[]> = {};
    badgeProgress.forEach(bp => {
      if (!grouped[bp.badge.category]) {
        grouped[bp.badge.category] = [];
      }
      grouped[bp.badge.category].push(bp);
    });
    // Sort by tier within each category
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => 
        tierOrder.indexOf(a.badge.tier) - tierOrder.indexOf(b.badge.tier)
      );
    });
    return grouped;
  }, [badgeProgress]);

  // Stats summary
  const unlockedCount = badgeProgress.filter(b => b.isUnlocked).length;
  const totalBadges = BADGES.length;
  const overallProgress = Math.round((unlockedCount / totalBadges) * 100);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedBadge) {
          setSelectedBadge(null);
        } else {
          goBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBadge]);

  const categories: Array<'streak' | 'completion' | 'mastery' | 'explorer' | 'special'> = ['streak', 'completion', 'mastery', 'explorer', 'special'];

  return (
    <>
      <SEOHead
        title="Achievement Badges - Track Your Interview Prep Progress | Code Reels"
        description="Earn badges as you master technical interview questions. Track your streaks, completion milestones, and explore different topics to unlock achievements."
        keywords="achievement badges, gamification, interview prep progress, study streaks, learning milestones"
        canonical="https://reel-interview.github.io/badges"
      />
      
      <AppLayout title="Badges" showBackOnMobile>
        <div className="max-w-4xl mx-auto pb-8">

          {/* Overall Progress */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border p-4 bg-card rounded-lg mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="font-bold">Your Collection</span>
              </div>
              <span className="text-2xl font-bold text-primary">{unlockedCount}/{totalBadges}</span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{overallProgress}% Complete</span>
              <span>{totalBadges - unlockedCount} badges remaining</span>
            </div>
          </motion.div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex-shrink-0
                ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'}`}
            >
              All
            </button>
            {categories.map(cat => {
              const catBadges = badgesByCategory[cat] || [];
              const catUnlocked = catBadges.filter(b => b.isUnlocked).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 flex-shrink-0
                    ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'}`}
                >
                  {categoryIcons[cat]}
                  <span>{getCategoryLabel(cat)}</span>
                  <span className="opacity-70 text-[10px]">{catUnlocked}/{catBadges.length}</span>
                </button>
              );
            })}
          </div>

          {/* Badge Grid by Category */}
          <div className="space-y-6">
            {categories
              .filter(cat => !selectedCategory || selectedCategory === cat)
              .map(cat => {
                const catBadges = badgesByCategory[cat] || [];
                if (catBadges.length === 0) return null;
                
                return (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border p-4 bg-card rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded bg-primary/10 text-primary">
                        {categoryIcons[cat]}
                      </div>
                      <span className="font-bold uppercase text-sm">{getCategoryLabel(cat)}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {catBadges.filter(b => b.isUnlocked).length}/{catBadges.length}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 sm:gap-4">
                      {catBadges.map((bp, i) => (
                        <motion.div
                          key={bp.badge.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex justify-center"
                        >
                          <BadgeRing
                            progress={bp}
                            size="md"
                            onClick={() => setSelectedBadge(bp)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
          </div>

          {/* Next Badges to Unlock */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-border p-4 bg-card rounded-lg mt-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-bold uppercase text-sm">Next Up</span>
            </div>
            <div className="space-y-3">
              {badgeProgress
                .filter(b => !b.isUnlocked && b.progress > 0)
                .sort((a, b) => b.progress - a.progress)
                .slice(0, 3)
                .map((bp, i) => (
                  <motion.div
                    key={bp.badge.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3 p-2 bg-muted/10 rounded cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setSelectedBadge(bp)}
                  >
                    <BadgeRing progress={bp} size="sm" showProgress={false} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold">{bp.badge.name}</div>
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${bp.progress}%`,
                            backgroundColor: getTierColor(bp.badge.tier)
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold" style={{ color: getTierColor(bp.badge.tier) }}>
                        {Math.round(bp.progress)}%
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {bp.current}/{bp.badge.requirement}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                ))}
              {badgeProgress.filter(b => !b.isUnlocked && b.progress > 0).length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Complete some questions to start earning badges!
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AppLayout>

      {/* Badge Detail Modal - Using Portal to ensure proper centering */}
      {createPortal(
        <AnimatePresence>
          {selectedBadge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, perspective: 1000 }}
              onClick={() => setSelectedBadge(null)}
            >
              <Tilt3DCard className="relative">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="relative bg-card border border-border rounded-2xl p-6 max-w-xs w-full shadow-2xl"
                  style={{ transformStyle: 'preserve-3d' }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Floating close button with 3D depth */}
                  <button
                    onClick={() => setSelectedBadge(null)}
                    className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors"
                    style={{ transform: 'translateZ(20px)' }}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                  
                  <div className="flex flex-col items-center text-center pt-2">
                    {/* Badge Icon with 3D pop-out effect */}
                    <div 
                      className={`relative ${selectedBadge.isUnlocked ? 'drop-shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)]' : ''}`}
                      style={{ transform: 'translateZ(40px)' }}
                    >
                      <BadgeRing progress={selectedBadge} size="lg" showProgress={false} />
                    </div>
                    
                    {/* Badge Name with slight depth */}
                    <h3 
                      className="text-xl font-bold mt-4 tracking-tight"
                      style={{ transform: 'translateZ(25px)' }}
                    >
                      {selectedBadge.badge.name}
                    </h3>
                    
                    {/* Description */}
                    <p 
                      className="text-sm text-muted-foreground mt-2 leading-relaxed"
                      style={{ transform: 'translateZ(15px)' }}
                    >
                      {selectedBadge.badge.description}
                    </p>
                    
                    {/* Tier & Category Tags with depth */}
                    <div 
                      className="flex items-center gap-2 mt-4"
                      style={{ transform: 'translateZ(20px)' }}
                    >
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide"
                        style={{ 
                          backgroundColor: `${getTierColor(selectedBadge.badge.tier)}15`,
                          color: getTierColor(selectedBadge.badge.tier),
                          border: `1px solid ${getTierColor(selectedBadge.badge.tier)}30`
                        }}
                      >
                        {selectedBadge.badge.tier}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-medium tracking-wide bg-muted/50 text-muted-foreground">
                        {getCategoryLabel(selectedBadge.badge.category)}
                      </span>
                    </div>
                    
                    {/* Progress Section - slightly recessed */}
                    <div 
                      className="w-full mt-6 p-4 bg-muted/20 rounded-xl"
                      style={{ transform: 'translateZ(5px)' }}
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-bold">
                          {selectedBadge.current}/{selectedBadge.badge.requirement} {selectedBadge.badge.unit}
                        </span>
                      </div>
                      <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: getTierColor(selectedBadge.badge.tier) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(selectedBadge.progress, 100)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    
                    {/* Status - Unlocked or Locked */}
                    <div 
                      className="mt-5 w-full"
                      style={{ transform: 'translateZ(10px)' }}
                    >
                      {selectedBadge.isUnlocked ? (
                        <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-green-500/10 rounded-xl border border-green-500/20">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-500">
                            Unlocked {selectedBadge.unlockedAt 
                              ? new Date(selectedBadge.unlockedAt).toLocaleDateString('en-GB', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric' 
                                }).replace(/\//g, '/')
                              : 'recently'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-muted/30 rounded-xl">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {selectedBadge.badge.requirement - selectedBadge.current} {selectedBadge.badge.unit} to unlock
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Tilt3DCard>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
