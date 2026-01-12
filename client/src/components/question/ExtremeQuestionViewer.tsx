/**
 * Extreme UX Question Viewer - Complete Redesign
 * Focus: Immersive learning experience with all original features
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { getChannel } from '../../lib/data';
import { useQuestionsWithPrefetch, useSubChannels, useCompaniesWithCounts } from '../../hooks/use-questions';
import { useProgress, trackActivity } from '../../hooks/use-progress';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useCredits } from '../../context/CreditsContext';
import { useAchievementContext } from '../../context/AchievementContext';
import { RecommendationService } from '../../services/recommendation.service';
import { ExtremeQuestionPanel } from './ExtremeQuestionPanel';
import { ExtremeAnswerPanel } from './ExtremeAnswerPanel';
import { UnifiedSearch } from '../UnifiedSearch';
import { VoiceReminder } from '../VoiceReminder';
import { ComingSoon } from '../ComingSoon';
import { trackQuestionView } from '../../hooks/use-analytics';
import { useUnifiedToast } from '../../hooks/use-unified-toast';
import { useSwipe } from '../../hooks/use-swipe';
import {
  ChevronLeft, ChevronRight, Play, Pause, Search, ChevronDown, Check,
  Brain, Clock, Target, Zap, Flame, Building2,
  X, Bookmark, Share2, Sparkles, Maximize2, Settings
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Helper function - removed unused formatTime function

interface ExtremeQuestionViewerProps {
  channelId: string;
  questionId?: string;
}

export function ExtremeQuestionViewer({ channelId, questionId }: ExtremeQuestionViewerProps) {
  const [location, setLocation] = useLocation();
  
  // Check for question ID in query params (from search) - fallback
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const questionIdFromSearch = searchParams.get('q');
  
  // Determine the target question ID
  const targetQuestionId = questionIdFromSearch || questionId;

  // Get channel data with sub-channels
  const staticChannel = getChannel(channelId || '');
  const { subChannels: apiSubChannels } = useSubChannels(channelId || '');

  const channel = staticChannel ? {
    ...staticChannel,
    subChannels: [
      { id: 'all', name: 'All Topics' },
      ...apiSubChannels.map(sc => ({
        id: sc,
        name: sc.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      }))
    ]
  } : null;

  // Filter states
  const [selectedSubChannel, setSelectedSubChannel] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  
  // UI states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aiAssistant, setAiAssistant] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [mobileView, setMobileView] = useState<'question' | 'answer'>('question');
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  // Timer states
  const [timeSpent, setTimeSpent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get companies for filtering
  const { companiesWithCounts } = useCompaniesWithCounts(
    channelId || '',
    selectedSubChannel,
    selectedDifficulty
  );

  // Get user preferences
  const { preferences, isSubscribed, subscribeChannel } = useUserPreferences();
  const shuffleEnabled = preferences.shuffleQuestions !== false;
  const prioritizeUnvisited = preferences.prioritizeUnvisited !== false;

  // Credits system
  const { onQuestionSwipe, onQuestionView } = useCredits();
  
  // Achievement system
  const { trackEvent } = useAchievementContext();

  // Get questions with all filters
  const { question: currentQuestion, questions, totalQuestions, loading, error } = useQuestionsWithPrefetch(
    channelId || '',
    currentIndex,
    selectedSubChannel,
    selectedDifficulty,
    selectedCompany,
    shuffleEnabled,
    prioritizeUnvisited
  );
  
  const { completed, markCompleted, saveLastVisitedIndex } = useProgress(channelId || '');
  const { toast } = useUnifiedToast();

  // Bookmarking system
  const [markedQuestions, setMarkedQuestions] = useState<string[]>(() => {
    const saved = localStorage.getItem(`marked-${channelId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Mobile swipe handlers
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => setMobileView('answer'),
    onSwipeRight: () => setMobileView('question'),
  });

  // Handle question ID from URL or search - find index in the list
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (loading || questions.length === 0) return;
    
    if (targetQuestionId) {
      const foundIndex = questions.findIndex(q => q.id === targetQuestionId);
      if (foundIndex >= 0 && foundIndex !== currentIndex) {
        setCurrentIndex(foundIndex);
      }
      // Update URL to use question ID format (clear query params if present)
      if (questionIdFromSearch) {
        setLocation(`/extreme/channel/${channelId}/${targetQuestionId}`, { replace: true });
      }
      setIsInitialized(true);
    } else if (questions[0] && !isInitialized) {
      // No question ID in URL, set to first question (only on initial load)
      setLocation(`/extreme/channel/${channelId}/${questions[0].id}`, { replace: true });
      setIsInitialized(true);
    }
  }, [targetQuestionId, questions.length, channelId, loading, questionIdFromSearch]);

  // Auto-subscribe to channel if not subscribed (only if it has questions)
  useEffect(() => {
    if (channelId && channel && !isSubscribed(channelId)) {
      // Wait for loading to complete before subscribing
      if (!loading) {
        // Only subscribe if channel has questions
        if (totalQuestions > 0 && questions.length > 0) {
          subscribeChannel(channelId);
          toast({
            title: "Channel added",
            description: `${channel.name} added to your channels`,
          });
        } else {
          // Show toast that channel cannot be added
          toast({
            title: "Cannot add channel",
            description: `${channel.name} has no questions available`,
            variant: "destructive"
          });
          // Redirect to home after a short delay
          setTimeout(() => {
            setLocation('/');
          }, 2000);
        }
      }
    }
    // Track channel visit for recommendations
    if (channelId) {
      RecommendationService.trackChannelVisit(channelId);
    }
  }, [channelId, channel, loading, totalQuestions, questions.length]);

  // Auto-unsubscribe from channel if it has no questions (for already subscribed channels)
  const { unsubscribeChannel } = useUserPreferences();
  useEffect(() => {
    // Wait for loading to complete and check if subscribed
    if (!loading && channelId && channel && isSubscribed(channelId)) {
      // If no questions available after loading, auto-unsubscribe
      if (totalQuestions === 0 || questions.length === 0) {
        unsubscribeChannel(channelId);
        toast({
          title: "Channel removed",
          description: `${channel.name} has no questions available and was removed from your channels`,
          variant: "destructive"
        });
        // Redirect to home after a short delay
        setTimeout(() => {
          setLocation('/');
        }, 2000);
      }
    }
  }, [loading, totalQuestions, questions.length, channelId, channel, isSubscribed]);

  // Reset index when filters change
  useEffect(() => {
    if (totalQuestions > 0 && currentIndex >= totalQuestions) {
      setCurrentIndex(0);
    }
  }, [totalQuestions, currentIndex]);

  // Update URL when navigating to a new question (only when user navigates, not on initial load)
  useEffect(() => {
    // Skip if not initialized or still loading
    if (!isInitialized || loading || !channelId || !currentQuestion) return;
    
    // Only update URL if the current question doesn't match the URL
    if (currentQuestion.id !== targetQuestionId) {
      setLocation(`/extreme/channel/${channelId}/${currentQuestion.id}`, { replace: true });
    }
    saveLastVisitedIndex(currentIndex);
  }, [currentIndex, isInitialized]);

  // Track question view and analytics
  useEffect(() => {
    if (currentQuestion) {
      trackQuestionView(currentQuestion.id, currentQuestion.channel, currentQuestion.difficulty);
      markCompleted(currentQuestion.id);
      trackActivity();
      
      trackEvent({
        type: 'question_completed',
        timestamp: new Date().toISOString(),
        data: {
          questionId: currentQuestion.id,
          difficulty: currentQuestion.difficulty,
          channel: currentQuestion.channel,
        },
      });
    }
  }, [currentQuestion?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
        return;
      }
      if (showSearchModal) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevQuestion();
      } else if (e.key === 'Escape') {
        setLocation('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalQuestions, showSearchModal]);

  // Timer for tracking time spent
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Auto-start timer when question loads
  useEffect(() => {
    if (currentQuestion && !showAnswer) {
      setIsPlaying(true);
      setTimeSpent(0);
    }
  }, [currentQuestion, showAnswer]);

  // Navigation functions
  const nextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
      setTimeSpent(0);
      setMobileView('question');
      // Track swipe for voice reminder
      onQuestionSwipe();
      // Deduct credits for viewing
      onQuestionView();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowAnswer(false);
      setTimeSpent(0);
      setMobileView('question');
    }
  };

  // Filter change handler
  const handleFilterChange = (type: 'sub' | 'diff' | 'company', value: string) => {
    setCurrentIndex(0);
    setShowAnswer(false);
    if (type === 'sub') setSelectedSubChannel(value);
    else if (type === 'diff') setSelectedDifficulty(value);
    else setSelectedCompany(value);
  };

  // Bookmark functions
  const toggleMark = () => {
    if (!currentQuestion) return;
    setMarkedQuestions(prev => {
      const newMarked = prev.includes(currentQuestion.id)
        ? prev.filter(id => id !== currentQuestion.id)
        : [...prev, currentQuestion.id];
      localStorage.setItem(`marked-${channelId}`, JSON.stringify(newMarked));
      return newMarked;
    });
  };

  // Share function
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Question link copied to clipboard",
      });
    } catch {
      toast({
        title: "Share",
        description: window.location.href,
      });
    }
  };

  // Handle no questions case - show toast (must be before conditional returns)
  useEffect(() => {
    if (!loading && channel && totalQuestions === 0) {
      const hasFilters = selectedSubChannel !== 'all' || selectedDifficulty !== 'all' || selectedCompany !== 'all';
      
      if (!hasFilters) {
        toast({
          title: "Content coming soon!",
          description: `We're preparing questions for "${channel.name}". Check back soon!`,
          variant: "warning",
        });
        setShouldRedirect(true);
      }
    }
  }, [loading, channel, totalQuestions, selectedSubChannel, selectedDifficulty, selectedCompany]);

  // Loading state
  if (loading && !currentQuestion) {
    return <QuestionSkeleton />;
  }

  // Error state
  if (error || !channel) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Channel not found</h2>
          <p className="text-muted-foreground mb-4">The channel "{channelId}" doesn't exist.</p>
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // No questions state - show ComingSoon component
  if (!loading && (!currentQuestion || totalQuestions === 0)) {
    // Check if filters are applied
    const hasFilters = selectedSubChannel !== 'all' || selectedDifficulty !== 'all' || selectedCompany !== 'all';
    
    if (!hasFilters || shouldRedirect) {
      // No questions at all for this channel - show coming soon
      return (
        <div className="h-screen flex flex-col bg-background">
          <Header
            channel={channel}
            onBack={() => setLocation('/')}
            onSearch={() => setShowSearchModal(true)}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            progress={0}
            filters={{
              selectedSubChannel,
              selectedDifficulty,
              selectedCompany,
              companiesWithCounts,
              onFilterChange: handleFilterChange
            }}
          />
          <ComingSoon 
            type="channel"
            name={channel?.name}
            redirectTo="/channels"
            redirectDelay={5000}
          />
        </div>
      );
    }
    
    // Has filters - show reset option
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header
          channel={channel}
          onBack={() => setLocation('/')}
          onSearch={() => setShowSearchModal(true)}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          progress={0}
          filters={{
            selectedSubChannel,
            selectedDifficulty,
            selectedCompany,
            companiesWithCounts,
            onFilterChange: handleFilterChange
          }}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">No questions found</h2>
            <p className="text-muted-foreground mb-4">Try adjusting your filters.</p>
            <button
              onClick={() => {
                setSelectedSubChannel('all');
                setSelectedDifficulty('all');
                setSelectedCompany('all');
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>
    );
  }

  // At this point, currentQuestion is guaranteed to be non-null
  if (!currentQuestion) return null;

  const isMarked = markedQuestions.includes(currentQuestion.id);
  const isCompleted = completed.includes(currentQuestion.id);
  const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <>
      <div className={`h-screen flex flex-col bg-background text-foreground overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {/* Header with integrated filters */}
        <Header
          channel={channel}
          onBack={() => setLocation('/')}
          onSearch={() => setShowSearchModal(true)}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          progress={progress}
          timeSpent={timeSpent}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
          filters={{
            selectedSubChannel,
            selectedDifficulty,
            selectedCompany,
            companiesWithCounts,
            onFilterChange: handleFilterChange
          }}
        />

        {/* Main Content - Desktop: Split View, Mobile: Tabs */}
        <div className="flex-1 flex overflow-hidden isolate" data-testid="reels-content">
          {/* Desktop Split View */}
          <div className="hidden lg:flex flex-1">
            {/* Question Panel */}
            <div className="w-1/2 border-r border-border overflow-hidden">
              <ExtremeQuestionPanel
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={totalQuestions}
                isMarked={isMarked}
                isCompleted={isCompleted}
                onToggleMark={toggleMark}
                timerEnabled={true}
                timeLeft={timeSpent}
              />
            </div>
            {/* Answer Panel */}
            <div className="w-1/2 overflow-hidden">
              <ExtremeAnswerPanel question={currentQuestion} isCompleted={isCompleted} />
            </div>
          </div>

          {/* Mobile Tab View */}
          <div className="flex-1 flex flex-col lg:hidden overflow-hidden">
            {/* Mobile Tabs */}
            <div className="flex border-b border-border bg-card backdrop-blur relative z-10">
              <button
                onClick={() => setMobileView('question')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  mobileView === 'question'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                Question
              </button>
              <button
                onClick={() => setMobileView('answer')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  mobileView === 'answer'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                Answer
              </button>
            </div>
            {/* Mobile Content - Swipeable */}
            <div 
              className="flex-1 overflow-y-auto overflow-x-hidden bg-background relative z-0 pb-20"
              onTouchStart={swipeHandlers.onTouchStart}
              onTouchMove={swipeHandlers.onTouchMove}
              onTouchEnd={swipeHandlers.onTouchEnd}
            >
              {mobileView === 'question' ? (
                <ExtremeQuestionPanel
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={totalQuestions}
                  isMarked={isMarked}
                  isCompleted={isCompleted}
                  onToggleMark={toggleMark}
                  onTapQuestion={() => setMobileView('answer')}
                  timerEnabled={true}
                  timeLeft={timeSpent}
                />
              ) : (
                <ExtremeAnswerPanel question={currentQuestion} isCompleted={isCompleted} />
              )}
            </div>
          </div>

          {/* AI Assistant Sidebar */}
          <AnimatePresence>
            {aiAssistant && (
              <AIAssistantPanel
                question={currentQuestion}
                onClose={() => setAiAssistant(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <NavigationFooter
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          onPrev={prevQuestion}
          onNext={nextQuestion}
          onShare={handleShare}
          isMarked={isMarked}
          onToggleMark={toggleMark}
        />
      </div>

      <UnifiedSearch isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
      
      {/* Voice Interview Reminder */}
      <VoiceReminder />
    </>
  );
}

function QuestionSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-20 bg-card" />
      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-1 p-8 space-y-6">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Header Component - Minimal & Clean with theme colors
function Header({ 
  channel, 
  onBack, 
  onSearch, 
  currentIndex, 
  totalQuestions, 
  progress, 
  timeSpent,
  isPlaying,
  onPlayPause,
  onFullscreen,
  filters 
}: any) {
  const { selectedSubChannel, selectedDifficulty, selectedCompany, companiesWithCounts, onFilterChange } = filters || {};
  const [showFilters, setShowFilters] = useState(false);
  
  const hasActiveFilter = selectedSubChannel !== 'all' || selectedDifficulty !== 'all' || selectedCompany !== 'all';
  const activeFilterCount = [selectedSubChannel !== 'all', selectedDifficulty !== 'all', selectedCompany !== 'all'].filter(Boolean).length;
  
  return (
    <header className="bg-background/95 backdrop-blur-xl border-b border-border shrink-0 relative z-20">
      {/* Minimal top bar */}
      <div className="h-14 flex items-center justify-between px-4 gap-4">
        {/* Left: Back + Channel */}
        <div className="flex items-center gap-3">
          <motion.button 
            onClick={onBack} 
            className="p-2 hover:bg-muted rounded-lg transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          
          <div className="hidden sm:block">
            <h1 className="font-bold text-foreground text-base">{channel.name}</h1>
          </div>
        </div>

        {/* Center: Progress */}
        {totalQuestions > 0 && (
          <div className="flex-1 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-primary tabular-nums min-w-[60px]">
                {currentIndex + 1} / {totalQuestions}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden border border-border">
                <motion.div 
                  className="h-full bg-primary rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-bold text-foreground tabular-nums min-w-[35px]">{progress}%</span>
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Timer - Compact */}
          {timeSpent !== undefined && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono text-foreground tabular-nums">
                {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Filter Toggle */}
          {filters && (
            <motion.button 
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-2 rounded-lg transition-all ${
                showFilters || hasActiveFilter 
                  ? 'bg-primary/10 text-primary border border-primary/30' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                  {activeFilterCount}
                </span>
              )}
            </motion.button>
          )}

          {/* Search */}
          <motion.button 
            onClick={onSearch} 
            className="p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Search className="w-5 h-5" />
          </motion.button>

          {/* Fullscreen */}
          {onFullscreen && (
            <motion.button 
              onClick={onFullscreen} 
              className="hidden lg:block p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Maximize2 className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
      
      {/* Filters Panel - Slide down */}
      <AnimatePresence>
        {filters && showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="px-4 py-4 bg-muted/30">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filters:</span>
                
                {channel.subChannels?.length > 1 && (
                  <FilterDropdown
                    label={channel.subChannels.find((s: any) => s.id === selectedSubChannel)?.name || 'All Topics'}
                    options={channel.subChannels.map((s: any) => ({ id: s.id, label: s.name }))}
                    selected={selectedSubChannel}
                    onSelect={(v) => onFilterChange('sub', v)}
                  />
                )}
                
                <FilterDropdown
                  label={selectedDifficulty === 'all' ? 'All Levels' : selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
                  options={[
                    { id: 'all', label: 'All Levels', icon: <Target className="w-3 h-3" /> },
                    { id: 'beginner', label: 'Easy', icon: <Zap className="w-3 h-3 text-green-500" /> },
                    { id: 'intermediate', label: 'Medium', icon: <Target className="w-3 h-3 text-yellow-500" /> },
                    { id: 'advanced', label: 'Hard', icon: <Flame className="w-3 h-3 text-red-500" /> },
                  ]}
                  selected={selectedDifficulty}
                  onSelect={(v) => onFilterChange('diff', v)}
                />
                
                {companiesWithCounts.length > 0 && (
                  <FilterDropdown
                    label={selectedCompany === 'all' ? 'All Companies' : selectedCompany}
                    options={[
                      { id: 'all', label: 'All Companies', icon: <Building2 className="w-3 h-3" /> },
                      ...companiesWithCounts.map((c: any) => ({ id: c.name, label: `${c.name} (${c.count})` }))
                    ]}
                    selected={selectedCompany}
                    onSelect={(v) => onFilterChange('company', v)}
                  />
                )}

                {/* Clear Filters */}
                {hasActiveFilter && (
                  <motion.button
                    onClick={() => {
                      onFilterChange('sub', 'all');
                      onFilterChange('diff', 'all');
                      onFilterChange('company', 'all');
                    }}
                    className="ml-auto px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Clear All
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// Filter Dropdown Component with theme colors
interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}

function FilterDropdown({ label, options, selected, onSelect }: FilterDropdownProps) {
  const isActive = selected !== 'all';
  
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button 
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap outline-none focus:outline-none ${
            isActive 
              ? 'bg-primary/10 text-primary border border-primary/30' 
              : 'bg-card hover:bg-muted border border-border text-foreground'
          }`}
        >
          {label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] max-h-[350px] overflow-y-auto bg-popover backdrop-blur-xl border border-border rounded-xl shadow-2xl p-2 z-50"
          sideOffset={8}
        >
          {options.map((opt: any) => (
            <DropdownMenu.Item
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer outline-none text-sm transition-all ${
                selected === opt.id 
                  ? 'bg-primary/10 text-primary border border-primary/30' 
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {opt.icon}
              <span className="flex-1">{opt.label}</span>
              {selected === opt.id && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// AI Assistant Panel - Extreme UX sidebar
function AIAssistantPanel({ question, onClose }: { question: any; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I can help you understand this ${question.difficulty} level question about "${question.question.substring(0, 50)}...". What specific aspect would you like me to explain?`
      }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-80 h-full bg-card backdrop-blur-xl border-l border-border flex flex-col relative z-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-foreground">AI Assistant</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm">
            <Brain className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p>Ask me anything about this question!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-foreground border border-border'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border p-3 rounded-xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this question..."
            className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Navigation Footer Component - Bottom-only navigation
function NavigationFooter({ 
  currentIndex, 
  totalQuestions, 
  onPrev, 
  onNext, 
  onShare, 
  isMarked, 
  onToggleMark 
}: any) {
  const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalQuestions - 1;
  
  return (
    <>
      {/* Mobile: Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Previous */}
          <motion.button
            onClick={onPrev}
            disabled={!canGoPrev}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              canGoPrev
                ? 'bg-card hover:bg-muted text-foreground border border-border'
                : 'bg-muted/50 text-muted-foreground border border-border cursor-not-allowed opacity-50'
            }`}
            whileHover={canGoPrev ? { scale: 1.05 } : {}}
            whileTap={canGoPrev ? { scale: 0.95 } : {}}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </motion.button>

          {/* Center Actions */}
          <div className="flex items-center gap-2">
            {/* Bookmark */}
            <motion.button
              onClick={onToggleMark}
              className={`p-2.5 rounded-lg transition-all ${
                isMarked
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-card text-muted-foreground hover:text-primary border border-border'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bookmark className={`w-5 h-5 ${isMarked ? 'fill-current' : ''}`} />
            </motion.button>

            {/* Share */}
            <motion.button 
              onClick={onShare} 
              className="p-2.5 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all border border-border"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Next */}
          <motion.button
            onClick={onNext}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              canGoNext
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground border border-border cursor-not-allowed opacity-50'
            }`}
            whileHover={canGoNext ? { scale: 1.05 } : {}}
            whileTap={canGoNext ? { scale: 0.95 } : {}}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Desktop: Bottom Center Bar Only - No Side Rails */}
      <div className="hidden lg:block">
        {/* Bottom Center - Navigation + Quick Actions */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl">
            {/* Previous */}
            <motion.button
              onClick={onPrev}
              disabled={!canGoPrev}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                canGoPrev
                  ? 'bg-muted hover:bg-muted/80 text-foreground'
                  : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
              }`}
              whileHover={canGoPrev ? { scale: 1.05 } : {}}
              whileTap={canGoPrev ? { scale: 0.95 } : {}}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </motion.button>

            {/* Divider */}
            <div className="w-px h-8 bg-border" />

            {/* Progress Info */}
            <div className="flex items-center gap-3 px-3 py-1 bg-muted rounded-lg border border-border">
              <span className="text-xs font-bold text-primary tabular-nums">
                {currentIndex + 1}/{totalQuestions}
              </span>
              <div className="w-20 h-1.5 bg-background rounded-full overflow-hidden border border-border">
                <motion.div 
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-border" />

            {/* Bookmark */}
            <motion.button
              onClick={onToggleMark}
              className={`p-2 rounded-lg transition-all ${
                isMarked 
                  ? 'bg-primary/10 text-primary border border-primary/30' 
                  : 'hover:bg-muted text-muted-foreground hover:text-primary'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-current' : ''}`} />
            </motion.button>

            {/* Share */}
            <motion.button 
              onClick={onShare} 
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="w-4 h-4" />
            </motion.button>

            {/* Divider */}
            <div className="w-px h-8 bg-border" />

            {/* Next */}
            <motion.button
              onClick={onNext}
              disabled={!canGoNext}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                canGoNext
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
              }`}
              whileHover={canGoNext ? { scale: 1.05 } : {}}
              whileTap={canGoNext ? { scale: 0.95 } : {}}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </>
  );
}