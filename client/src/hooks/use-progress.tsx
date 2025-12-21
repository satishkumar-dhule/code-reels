import { useState, useEffect, useMemo } from "react";

interface ProgressEntry {
  questionId: string;
  timestamp: number;
}

export function useProgress(channelId: string, validQuestionIds?: string[]) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [history, setHistory] = useState<ProgressEntry[]>([]);
  const [lastVisitedIndex, setLastVisitedIndex] = useState(0);

  useEffect(() => {
    // Load simple completed list
    const savedCompleted = localStorage.getItem(`progress-${channelId}`);
    if (savedCompleted) {
      setCompleted(JSON.parse(savedCompleted));
    }

    // Load detailed history
    const savedHistory = localStorage.getItem(`history-${channelId}`);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Load last visited index
    const savedIndex = localStorage.getItem(`last-index-${channelId}`);
    if (savedIndex) {
        setLastVisitedIndex(parseInt(savedIndex));
    }
  }, [channelId]);

  // Filter completed IDs to only include valid questions still in this channel
  // This handles recategorization - old IDs that moved to other channels are excluded
  const validCompleted = useMemo(() => {
    if (!validQuestionIds || validQuestionIds.length === 0) {
      return completed;
    }
    const validSet = new Set(validQuestionIds);
    return completed.filter(id => validSet.has(id));
  }, [completed, validQuestionIds]);

  const saveLastVisitedIndex = (index: number) => {
      localStorage.setItem(`last-index-${channelId}`, index.toString());
      setLastVisitedIndex(index);
  }

  const markCompleted = (questionId: string) => {
    setCompleted((prev) => {
      if (prev.includes(questionId)) return prev;
      const next = [...prev, questionId];
      localStorage.setItem(`progress-${channelId}`, JSON.stringify(next));
      return next;
    });

    setHistory((prev) => {
      // Avoid duplicate history entries for same day/session if needed
      // For now, simple append
      const next = [...prev, { questionId, timestamp: Date.now() }];
      localStorage.setItem(`history-${channelId}`, JSON.stringify(next));
      return next;
    });
    
    // Dispatch event to trigger badge check
    window.dispatchEvent(new CustomEvent('question-completed'));
  };

  // Clean up stale completed IDs that no longer exist in the channel
  const cleanupStaleProgress = (currentValidIds: string[]) => {
    const validSet = new Set(currentValidIds);
    const cleaned = completed.filter(id => validSet.has(id));
    if (cleaned.length !== completed.length) {
      localStorage.setItem(`progress-${channelId}`, JSON.stringify(cleaned));
      setCompleted(cleaned);
    }
  };

  return { 
    completed: validCompleted, 
    rawCompleted: completed, // Original unfiltered for debugging
    history, 
    markCompleted, 
    lastVisitedIndex, 
    saveLastVisitedIndex,
    cleanupStaleProgress
  };
}

// Track a session/activity
export function trackActivity() {
  const today = new Date().toISOString().split('T')[0];
  const activityKey = 'global-activity';
  
  const saved = localStorage.getItem(activityKey);
  const activity: { date: string; count: number }[] = saved ? JSON.parse(saved) : [];
  
  const todayEntry = activity.find(a => a.date === today);
  if (todayEntry) {
    todayEntry.count += 1;
  } else {
    activity.push({ date: today, count: 1 });
  }
  
  // Keep only last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const filtered = activity.filter(a => new Date(a.date) >= cutoff);
  
  localStorage.setItem(activityKey, JSON.stringify(filtered));
}

export function useGlobalStats() {
  const [stats, setStats] = useState<{ date: string; count: number }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to refresh stats
  const refreshStats = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    // Load global activity
    const activityKey = 'global-activity';
    const saved = localStorage.getItem(activityKey);
    const activity: { date: string; count: number }[] = saved ? JSON.parse(saved) : [];
    
    // Also aggregate from channel history for backward compatibility
    const allHistory: ProgressEntry[] = [];
    
    // Scan ALL channels dynamically from localStorage
    const historyKeys = Object.keys(localStorage).filter(k => k.startsWith('history-'));
    historyKeys.forEach(key => {
      const savedHistory = localStorage.getItem(key);
      if (savedHistory) {
        allHistory.push(...JSON.parse(savedHistory));
      }
    });

    // Group history by date
    const historyGrouped = allHistory.reduce((acc, curr) => {
      const date = new Date(curr.timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Merge activity and history
    const merged: Record<string, number> = {};
    
    // Add activity data
    activity.forEach(a => {
      merged[a.date] = (merged[a.date] || 0) + a.count;
    });
    
    // Add history data (avoid double counting by using max)
    Object.entries(historyGrouped).forEach(([date, count]) => {
      merged[date] = Math.max(merged[date] || 0, count);
    });

    const chartData = Object.entries(merged)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setStats(chartData);
  }, [refreshKey]);

  return { stats, refreshStats };
}
