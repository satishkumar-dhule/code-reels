/**
 * Bookmarks Page
 * Shows all bookmarked/tagged questions across all channels
 */

import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { SEOHead } from '../components/SEOHead';
import { getAllQuestions } from '../lib/questions-loader';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { ProgressStorage } from '../services/storage.service';
import { STORAGE_KEYS } from '../lib/constants';
import type { Question } from '../types';
import {
  Bookmark, Trash2, Play, ChevronRight, Filter,
  Zap, Target, Flame, Building2, CheckCircle,
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Code, X
} from 'lucide-react';

const channelIcons: Record<string, React.ReactNode> = {
  'system-design': <Cpu className="w-4 h-4" />,
  'algorithms': <Terminal className="w-4 h-4" />,
  'frontend': <Layout className="w-4 h-4" />,
  'backend': <Server className="w-4 h-4" />,
  'database': <Database className="w-4 h-4" />,
  'devops': <GitBranch className="w-4 h-4" />,
  'sre': <Activity className="w-4 h-4" />,
  'default': <Layers className="w-4 h-4" />,
};

interface BookmarkedQuestion extends Question {
  channelId: string;
}

export default function Bookmarks() {
  const [, setLocation] = useLocation();
  const { getSubscribedChannels } = useUserPreferences();
  const subscribedChannels = getSubscribedChannels();
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<BookmarkedQuestion[]>([]);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Load all bookmarked questions
  useEffect(() => {
    const allQuestions = getAllQuestions();
    const bookmarked: BookmarkedQuestion[] = [];

    // Get all channel IDs that might have bookmarks
    const channelIds = new Set<string>();
    subscribedChannels.forEach(c => channelIds.add(c.id));
    
    // Also check localStorage for any marked- keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEYS.MARKED_PREFIX)) {
        const channelId = key.replace(STORAGE_KEYS.MARKED_PREFIX, '');
        channelIds.add(channelId);
      }
    }

    // Get bookmarked questions from each channel
    channelIds.forEach(channelId => {
      const markedIds = ProgressStorage.getMarked(channelId);
      markedIds.forEach(questionId => {
        const question = allQuestions.find(q => q.id === questionId);
        if (question) {
          bookmarked.push({ ...question, channelId });
        }
      });
    });

    setBookmarkedQuestions(bookmarked);
  }, [subscribedChannels]);

  // Get unique channels from bookmarked questions
  const channelsWithBookmarks = useMemo(() => {
    const channels = new Set(bookmarkedQuestions.map(q => q.channelId));
    return Array.from(channels);
  }, [bookmarkedQuestions]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return bookmarkedQuestions.filter(q => {
      if (filterChannel !== 'all' && q.channelId !== filterChannel) return false;
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
      return true;
    });
  }, [bookmarkedQuestions, filterChannel, filterDifficulty]);

  // Remove bookmark
  const removeBookmark = (question: BookmarkedQuestion) => {
    ProgressStorage.toggleMarked(question.channelId, question.id);
    setBookmarkedQuestions(prev => prev.filter(q => q.id !== question.id));
  };

  // Navigate to question
  const goToQuestion = (question: BookmarkedQuestion) => {
    const allQuestions = getAllQuestions();
    const channelQuestions = allQuestions.filter(q => q.channel === question.channelId);
    const index = channelQuestions.findIndex(q => q.id === question.id);
    setLocation(`/channel/${question.channelId}/${index >= 0 ? index : 0}`);
  };

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Easy' };
      case 'intermediate':
        return { icon: Target, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Medium' };
      case 'advanced':
        return { icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Hard' };
      default:
        return { icon: Target, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Unknown' };
    }
  };

  return (
    <>
      <SEOHead
        title="Bookmarked Questions - Code Reels"
        description="View and manage your bookmarked interview questions"
      />
      
      <AppLayout>
        <div className="max-w-4xl mx-auto px-3 sm:px-0 pb-20 sm:pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-primary/10">
                <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold">Bookmarks</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {bookmarkedQuestions.length} saved question{bookmarkedQuestions.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          {bookmarkedQuestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
              {/* Channel filter */}
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="px-3 py-1.5 sm:py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Channels</option>
                {channelsWithBookmarks.map(channel => (
                  <option key={channel} value={channel}>
                    {channel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </option>
                ))}
              </select>

              {/* Difficulty filter */}
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-3 py-1.5 sm:py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">Easy</option>
                <option value="intermediate">Medium</option>
                <option value="advanced">Hard</option>
              </select>

              {/* Clear filters */}
              {(filterChannel !== 'all' || filterDifficulty !== 'all') && (
                <button
                  onClick={() => { setFilterChannel('all'); setFilterDifficulty('all'); }}
                  className="px-3 py-1.5 sm:py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {bookmarkedQuestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold mb-2">No bookmarks yet</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Tap the bookmark icon on any question to save it for later review
              </p>
              <button
                onClick={() => setLocation('/channels')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
              >
                Browse Questions
              </button>
            </motion.div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No questions match your filters</p>
            </div>
          ) : (
            /* Question list */
            <div className="space-y-2 sm:space-y-3">
              {filteredQuestions.map((question, index) => {
                const diffConfig = getDifficultyConfig(question.difficulty);
                const DiffIcon = diffConfig.icon;
                const isCompleted = ProgressStorage.getCompleted(question.channelId).includes(question.id);

                return (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Channel icon */}
                      <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0 hidden sm:flex">
                        {channelIcons[question.channelId] || channelIcons.default}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Meta row */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                            {question.channelId.split('-').join(' ')}
                          </span>
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${diffConfig.bg} ${diffConfig.color}`}>
                            <DiffIcon className="w-3 h-3" />
                            {diffConfig.label}
                          </span>
                          {isCompleted && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-green-500/10 text-green-500">
                              <CheckCircle className="w-3 h-3" />
                              Done
                            </span>
                          )}
                        </div>

                        {/* Question text */}
                        <h3 className="font-medium text-sm sm:text-base line-clamp-2 mb-2">
                          {question.question}
                        </h3>

                        {/* Companies */}
                        {question.companies && question.companies.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <div className="flex flex-wrap gap-1">
                              {question.companies.slice(0, 3).map((company, i) => (
                                <span key={i} className="text-[10px] text-muted-foreground">
                                  {company}{i < Math.min(question.companies!.length, 3) - 1 ? ',' : ''}
                                </span>
                              ))}
                              {question.companies.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{question.companies.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => removeBookmark(question)}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => goToQuestion(question)}
                          className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                          title="Go to question"
                        >
                          <Play className="w-4 h-4" fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
}
