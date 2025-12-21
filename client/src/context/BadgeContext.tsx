/**
 * Badge Context
 * Manages badge progress and unlock notifications globally
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { 
  Badge, BadgeProgress, calculateBadgeProgress
} from '../lib/badges';
import { getAllQuestions, getQuestionById } from '../lib/questions-loader';
import { useGlobalStats } from '../hooks/use-progress';
import { BadgeUnlockCelebration } from '../components/BadgeUnlockCelebration';

// Storage keys
const SHOWN_BADGES_KEY = 'shown-badge-unlocks';
const NOTIFICATIONS_KEY = 'app-notifications';

function getShownBadges(): string[] {
  try {
    const stored = localStorage.getItem(SHOWN_BADGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markBadgeAsShown(badgeId: string): void {
  const shown = getShownBadges();
  if (!shown.includes(badgeId)) {
    shown.push(badgeId);
    localStorage.setItem(SHOWN_BADGES_KEY, JSON.stringify(shown));
  }
}

// Add notification to localStorage
function addBadgeNotification(badge: Badge): void {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    const notifications = stored ? JSON.parse(stored) : [];
    
    const newNotification = {
      id: `badge-${badge.id}-${Date.now()}`,
      title: `🏆 Badge Unlocked: ${badge.name}`,
      description: badge.description,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false,
      link: '/badges', // Navigate to badges page when clicked
    };
    
    // Add to beginning, limit to 50 notifications
    notifications.unshift(newNotification);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 50)));
    
    // Dispatch event so Notifications page can update
    window.dispatchEvent(new CustomEvent('notification-added'));
  } catch (e) {
    console.error('Failed to add badge notification:', e);
  }
}

interface BadgeContextType {
  badgeProgress: BadgeProgress[];
  checkForNewUnlocks: () => void;
  totalUnlocked: number;
  resetShownBadges: () => void; // For testing
}

const BadgeContext = createContext<BadgeContextType | null>(null);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { stats } = useGlobalStats();
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Listen for question completion events to trigger badge recalculation
  useEffect(() => {
    const handleQuestionCompleted = () => {
      setRefreshKey(k => k + 1);
    };
    
    window.addEventListener('question-completed', handleQuestionCompleted);
    return () => window.removeEventListener('question-completed', handleQuestionCompleted);
  }, []);
  
  // Wait a bit for questions to load before calculating badges
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate user stats from localStorage
  const userStats = useMemo(() => {
    // Don't calculate until ready
    if (!isReady) {
      return {
        totalCompleted: 0,
        streak: 0,
        channelsExplored: [],
        difficultyStats: { beginner: 0, intermediate: 0, advanced: 0 },
        channelCompletionPcts: [],
        totalChannels: 0
      };
    }
    
    // refreshKey triggers recalculation when questions are completed
    console.log('Recalculating badge stats, refreshKey:', refreshKey);
    
    const allQuestions = getAllQuestions();
    
    // Get all completed question IDs across all channels
    const allCompletedIds: string[] = [];
    const channelsWithProgress: string[] = [];
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('progress-')) {
        const channelId = key.replace('progress-', '');
        const completed = JSON.parse(localStorage.getItem(key) || '[]');
        completed.forEach((id: string) => {
          if (!allCompletedIds.includes(id)) {
            allCompletedIds.push(id);
          }
        });
        if (completed.length > 0 && !channelsWithProgress.includes(channelId)) {
          channelsWithProgress.push(channelId);
        }
      }
    });

    // Calculate difficulty stats
    const difficultyStats = { beginner: 0, intermediate: 0, advanced: 0 };
    allCompletedIds.forEach(id => {
      const question = getQuestionById(id);
      if (question && question.difficulty) {
        const difficulty = question.difficulty as keyof typeof difficultyStats;
        if (difficultyStats[difficulty] !== undefined) {
          difficultyStats[difficulty]++;
        }
      }
    });

    // Calculate streak
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (stats.find(x => x.date === dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    // Calculate channel completion percentages
    const channelCompletionPcts: number[] = [];
    const channelQuestionCounts: Record<string, number> = {};
    allQuestions.forEach(q => {
      channelQuestionCounts[q.channel] = (channelQuestionCounts[q.channel] || 0) + 1;
    });

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('progress-')) {
        const channelId = key.replace('progress-', '');
        const completed = JSON.parse(localStorage.getItem(key) || '[]');
        const total = channelQuestionCounts[channelId] || 0;
        if (total > 0) {
          channelCompletionPcts.push(Math.round((completed.length / total) * 100));
        }
      }
    });

    console.log('Badge stats:', { totalCompleted: allCompletedIds.length, streak, channelsExplored: channelsWithProgress.length });

    return {
      totalCompleted: allCompletedIds.length,
      streak,
      channelsExplored: channelsWithProgress,
      difficultyStats,
      channelCompletionPcts,
      totalChannels: Object.keys(channelQuestionCounts).length
    };
  }, [stats, refreshKey, isReady]);

  // Calculate badge progress
  useEffect(() => {
    const progress = calculateBadgeProgress(
      userStats.totalCompleted,
      userStats.streak,
      userStats.channelsExplored,
      userStats.difficultyStats,
      userStats.channelCompletionPcts,
      userStats.totalChannels
    );
    setBadgeProgress(progress);
  }, [userStats]);

  // Check for new unlocks
  const checkForNewUnlocks = useCallback(() => {
    const shownBadges = getShownBadges();
    console.log('Checking for new badge unlocks. Shown badges:', shownBadges);
    console.log('Badge progress:', badgeProgress.filter(bp => bp.isUnlocked).map(bp => bp.badge.id));
    
    const newUnlocks = badgeProgress
      .filter(bp => bp.isUnlocked && !shownBadges.includes(bp.badge.id))
      .map(bp => bp.badge);

    console.log('New unlocks to show:', newUnlocks.map(b => b.id));

    if (newUnlocks.length > 0) {
      setPendingBadges(prev => {
        // Avoid duplicates
        const existingIds = prev.map(b => b.id);
        const uniqueNew = newUnlocks.filter(b => !existingIds.includes(b.id));
        return [...prev, ...uniqueNew];
      });
    }
  }, [badgeProgress]);

  // Auto-check for new unlocks when badge progress changes
  useEffect(() => {
    checkForNewUnlocks();
  }, [badgeProgress, checkForNewUnlocks]);

  // Show next pending badge
  useEffect(() => {
    if (!unlockedBadge && pendingBadges.length > 0) {
      const [next, ...rest] = pendingBadges;
      console.log('Showing badge celebration for:', next.id, next.name);
      setUnlockedBadge(next);
      setPendingBadges(rest);
      markBadgeAsShown(next.id);
      // Also add to notifications
      addBadgeNotification(next);
    }
  }, [unlockedBadge, pendingBadges]);

  const closeCelebration = useCallback(() => {
    setUnlockedBadge(null);
  }, []);

  // Reset shown badges (for testing)
  const resetShownBadges = useCallback(() => {
    localStorage.removeItem(SHOWN_BADGES_KEY);
    setRefreshKey(k => k + 1);
  }, []);

  const totalUnlocked = useMemo(() => 
    badgeProgress.filter(bp => bp.isUnlocked).length,
    [badgeProgress]
  );

  return (
    <BadgeContext.Provider value={{ badgeProgress, checkForNewUnlocks, totalUnlocked, resetShownBadges }}>
      {children}
      <BadgeUnlockCelebration badge={unlockedBadge} onClose={closeCelebration} />
    </BadgeContext.Provider>
  );
}

export function useBadgeContext() {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadgeContext must be used within a BadgeProvider');
  }
  return context;
}
