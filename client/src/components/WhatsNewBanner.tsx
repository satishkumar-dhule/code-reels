import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, Plus, RefreshCw } from 'lucide-react';
import changelog from '../lib/questions/changelog.json';

interface ChangelogEntry {
  date: string;
  type: 'questions_added' | 'questions_improved' | 'initial' | 'feature';
  title: string;
  description: string;
  details?: {
    questionsAdded?: number;
    questionsImproved?: number;
    channels?: string[];
    questionIds?: string[];
  };
}

const LAST_VISIT_KEY = 'last-visit-date';
const BANNER_DISMISSED_KEY = 'whats-new-banner-dismissed';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function isFirstVisitToday(): boolean {
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  const today = getToday();
  
  if (lastVisit !== today) {
    localStorage.setItem(LAST_VISIT_KEY, today);
    localStorage.removeItem(BANNER_DISMISSED_KEY); // Reset dismissal for new day
    return true;
  }
  return false;
}

function isBannerDismissedToday(): boolean {
  const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
  return dismissed === getToday();
}

function dismissBanner(): void {
  localStorage.setItem(BANNER_DISMISSED_KEY, getToday());
}

function getRecentChanges(): ChangelogEntry[] {
  const entries = changelog.entries as ChangelogEntry[];
  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  
  // Get entries from last 3 days
  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= threeDaysAgo;
  }).slice(0, 3); // Max 3 entries
}

export function WhatsNewBanner() {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [recentChanges, setRecentChanges] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    // Check if first visit today and banner not dismissed
    const firstVisit = isFirstVisitToday();
    const dismissed = isBannerDismissedToday();
    
    if (!dismissed) {
      const changes = getRecentChanges();
      if (changes.length > 0) {
        setRecentChanges(changes);
        // Small delay for better UX
        setTimeout(() => setIsVisible(true), 500);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    dismissBanner();
  };

  const handleViewAll = () => {
    setIsVisible(false);
    dismissBanner();
    setLocation('/whats-new');
  };

  // Calculate totals from recent changes
  const totalAdded = recentChanges.reduce((sum, entry) => 
    sum + (entry.details?.questionsAdded || 0), 0);
  const totalImproved = recentChanges.reduce((sum, entry) => 
    sum + (entry.details?.questionsImproved || 0), 0);
  const affectedChannels = [...new Set(
    recentChanges.flatMap(entry => entry.details?.channels || [])
  )];

  if (!isVisible || recentChanges.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-4 right-4 z-50 max-w-2xl mx-auto"
      >
        <div className="bg-card border border-primary/50 rounded-lg shadow-lg shadow-primary/10 overflow-hidden">
          {/* Header */}
          <div className="bg-primary/10 px-4 py-3 flex items-center justify-between border-b border-primary/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-wider">What's New</span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-primary/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Summary Stats */}
            <div className="flex gap-4 text-sm">
              {totalAdded > 0 && (
                <div className="flex items-center gap-1.5 text-green-500">
                  <Plus className="w-4 h-4" />
                  <span className="font-bold">{totalAdded}</span>
                  <span className="text-muted-foreground">new questions</span>
                </div>
              )}
              {totalImproved > 0 && (
                <div className="flex items-center gap-1.5 text-blue-500">
                  <RefreshCw className="w-4 h-4" />
                  <span className="font-bold">{totalImproved}</span>
                  <span className="text-muted-foreground">improved</span>
                </div>
              )}
            </div>

            {/* Affected Channels */}
            {affectedChannels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {affectedChannels.slice(0, 6).map(channel => (
                  <span
                    key={channel}
                    className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium"
                  >
                    {channel}
                  </span>
                ))}
                {affectedChannels.length > 6 && (
                  <span className="px-2 py-0.5 text-muted-foreground text-xs">
                    +{affectedChannels.length - 6} more
                  </span>
                )}
              </div>
            )}

            {/* Recent Entries */}
            <div className="space-y-2 pt-2 border-t border-border">
              {recentChanges.slice(0, 2).map((entry, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{entry.date}</span>
                    <span className="font-medium">{entry.title}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-1">{entry.description}</p>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <button
              onClick={handleViewAll}
              className="w-full mt-2 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors"
            >
              View All Updates
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
