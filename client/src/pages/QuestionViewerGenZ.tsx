/**
 * Gen Z Question Viewer - Immersive Learning
 * Pure black, neon accents, smooth animations
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { getChannel } from '../lib/data';
import { useQuestionsWithPrefetch, useSubChannels, useCompaniesWithCounts } from '../hooks/use-questions';
import { useProgress, trackActivity } from '../hooks/use-progress';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useCredits } from '../context/CreditsContext';
import { useAchievementContext } from '../context/AchievementContext';
import { useTheme } from '../context/ThemeContext';
import { SEOHead } from '../components/SEOHead';
import { UnifiedSearch } from '../components/UnifiedSearch';
import { VoiceReminder } from '../components/VoiceReminder';
import { GenZAnswerPanel } from '../components/question/GenZAnswerPanel';
import { QuestionFeedback } from '../components/QuestionFeedback';
import { AICompanion } from '../components/AICompanion';
import { FloatingButton } from '../components/mobile';
import { Haptics } from '../lib/haptics';
import { trackQuestionView } from '../hooks/use-analytics';
import { trackSwipeNavigation, trackHapticFeedback } from '../lib/analytics';
import { useUnifiedToast } from '../hooks/use-unified-toast';
import {
  getCard, recordReview, addToSRS,
  getMasteryLabel, getMasteryColor,
  type ReviewCard, type ConfidenceRating
} from '../lib/spaced-repetition';
import {
  ChevronLeft, ChevronRight, Search, X, Bookmark, Share2,
  Filter, Brain, RotateCcw, Check, Zap, ArrowRight
} from 'lucide-react';

export default function QuestionViewerGenZ() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute('/channel/:id/:questionId?');
  const channelId = params?.id;
  const questionIdFromUrl = params?.questionId;
  
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const questionIdFromSearch = searchParams.get('q');
  const targetQuestionId = questionIdFromSearch || questionIdFromUrl;

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

  const [selectedSubChannel, setSelectedSubChannel] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileView, setMobileView] = useState<'question' | 'answer'>('question');
  const [markedQuestions, setMarkedQuestions] = useState<string[]>(() => {
    const saved = localStorage.getItem(`marked-${channelId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [srsCard, setSrsCard] = useState<ReviewCard | null>(null);
  const [showRatingButtons, setShowRatingButtons] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  
  // Swipe gesture state
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // Get current theme from context
  const { theme } = useTheme();
  const isLightMode = theme === 'genz-light';

  const { companiesWithCounts } = useCompaniesWithCounts(
    channelId || '',
    selectedSubChannel,
    selectedDifficulty
  );

  const { preferences, isSubscribed, subscribeChannel } = useUserPreferences();
  const shuffleEnabled = preferences.shuffleQuestions !== false;
  const prioritizeUnvisited = preferences.prioritizeUnvisited !== false;

  const { onQuestionSwipe, onQuestionView } = useCredits();
  const { trackEvent } = useAchievementContext();
  const { completed, markCompleted, saveLastVisitedIndex } = useProgress(channelId || '');
  const { toast } = useUnifiedToast();

  const { question: currentQuestion, questions, totalQuestions, loading, error } = useQuestionsWithPrefetch(
    channelId || '',
    currentIndex,
    selectedSubChannel,
    selectedDifficulty,
    selectedCompany,
    shuffleEnabled,
    prioritizeUnvisited
  );

  const [isInitialized, setIsInitialized] = useState(false);
  
  // Check if current question has an SRS card
  useEffect(() => {
    if (!currentQuestion) return;
    const card = getCard(currentQuestion.id, currentQuestion.channel, currentQuestion.difficulty);
    setSrsCard(card);
    setShowRatingButtons(false);
    setHasRated(false);
  }, [currentQuestion]);
  
  useEffect(() => {
    if (loading || questions.length === 0) return;
    
    if (targetQuestionId) {
      const foundIndex = questions.findIndex(q => q.id === targetQuestionId);
      if (foundIndex >= 0 && foundIndex !== currentIndex) {
        setCurrentIndex(foundIndex);
      }
      if (questionIdFromSearch) {
        setLocation(`/channel/${channelId}/${targetQuestionId}`, { replace: true });
      }
      setIsInitialized(true);
    } else if (questions[0] && !isInitialized) {
      setLocation(`/channel/${channelId}/${questions[0].id}`, { replace: true });
      setIsInitialized(true);
    }
  }, [targetQuestionId, questions.length, channelId, loading, questionIdFromSearch]);

  useEffect(() => {
    if (channelId && channel && !isSubscribed(channelId) && !loading && totalQuestions > 0 && questions.length > 0) {
      subscribeChannel(channelId);
      toast({
        title: "Channel added",
        description: `${channel.name} added to your channels`,
      });
    }
  }, [channelId, channel, loading, totalQuestions, questions.length]);

  useEffect(() => {
    if (totalQuestions > 0 && currentIndex >= totalQuestions) {
      setCurrentIndex(0);
    }
  }, [totalQuestions, currentIndex]);

  useEffect(() => {
    if (!isInitialized || loading || !channelId || !currentQuestion) return;
    
    if (currentQuestion.id !== targetQuestionId) {
      setLocation(`/channel/${channelId}/${currentQuestion.id}`, { replace: true });
    }
    saveLastVisitedIndex(currentIndex);
  }, [currentIndex, isInitialized]);

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
        setLocation('/channels');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalQuestions, showSearchModal]);

  const nextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setMobileView('question');
      onQuestionSwipe();
      onQuestionView();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setMobileView('question');
    }
  };

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

  const handleAddToSRS = () => {
    if (!currentQuestion) return;
    const card = addToSRS(currentQuestion.id, currentQuestion.channel, currentQuestion.difficulty);
    setSrsCard(card);
    setShowRatingButtons(true);
    toast({
      title: "Added to SRS",
      description: "Question added to spaced repetition system",
    });
  };

  const handleSRSRating = (rating: ConfidenceRating) => {
    if (!srsCard || !currentQuestion) return;
    const updatedCard = recordReview(currentQuestion.id, currentQuestion.channel, currentQuestion.difficulty, rating);
    setSrsCard(updatedCard);
    setHasRated(true);
    setShowRatingButtons(false);
    
    // Track achievement
    trackEvent({
      type: 'srs_review',
      timestamp: new Date().toISOString(),
      data: { rating },
    });

    toast({
      title: "Review recorded",
      description: `Mastery: ${getMasteryLabel(updatedCard.masteryLevel)}`,
    });
  };

  // Handle swipe gesture for navigation
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    const page = window.location.pathname;
    
    // Swipe left (next question)
    if (info.offset.x < -threshold || velocity < -500) {
      setSwipeDirection('left');
      Haptics.medium(); // Haptic feedback on swipe
      trackHapticFeedback('medium', 'swipe_navigation_left');
      trackSwipeNavigation(
        page, 
        'left', 
        currentQuestion?.id, 
        questions[currentIndex + 1]?.id,
        Math.abs(velocity)
      );
      setTimeout(() => {
        nextQuestion();
        setSwipeDirection(null);
        x.set(0);
      }, 150);
    }
    // Swipe right (previous question)
    else if (info.offset.x > threshold || velocity > 500) {
      setSwipeDirection('right');
      Haptics.medium(); // Haptic feedback on swipe
      trackHapticFeedback('medium', 'swipe_navigation_right');
      trackSwipeNavigation(
        page, 
        'right', 
        currentQuestion?.id, 
        questions[currentIndex - 1]?.id,
        Math.abs(velocity)
      );
      setTimeout(() => {
        prevQuestion();
        setSwipeDirection(null);
        x.set(0);
      }, 150);
    }
    // Snap back
    else {
      x.set(0);
    }
  };

  if (loading && !currentQuestion) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Channel not found</h2>
          <p className="text-muted-foreground mb-4">The channel "{channelId}" doesn't exist.</p>
          <button
            onClick={() => setLocation('/channels')}
            className="px-6 py-3 bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground font-bold rounded-full"
          >
            Go to Channels
          </button>
        </div>
      </div>
    );
  }

  if (!loading && (!currentQuestion || totalQuestions === 0)) {
    const hasFilters = selectedSubChannel !== 'all' || selectedDifficulty !== 'all' || selectedCompany !== 'all';
    
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header
          channel={channel}
          onBack={() => setLocation('/channels')}
          onSearch={() => setShowSearchModal(true)}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-2">No questions found</h2>
            <p className="text-muted-foreground mb-4">
              {hasFilters ? 'Try adjusting your filters.' : 'Check back soon for new content!'}
            </p>
            {hasFilters && (
              <button
                onClick={() => {
                  setSelectedSubChannel('all');
                  setSelectedDifficulty('all');
                  setSelectedCompany('all');
                }}
                className="px-6 py-3 bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground font-bold rounded-full"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const isMarked = markedQuestions.includes(currentQuestion.id);
  const isCompleted = completed.includes(currentQuestion.id);
  const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <>
      <SEOHead
        title={`${channel.name} - ${currentQuestion.question.substring(0, 60)}...`}
        description={currentQuestion.question}
        canonical={`https://open-interview.github.io/channel/${channelId}/${currentQuestion.id}`}
      />

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <Header
          channel={channel}
          onBack={() => setLocation('/channels')}
          onSearch={() => setShowSearchModal(true)}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          progress={progress}
          onToggleFilters={() => setShowFilters(!showFilters)}
          hasFilters={selectedSubChannel !== 'all' || selectedDifficulty !== 'all' || selectedCompany !== 'all'}
        />

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <FiltersPanel
              channel={channel}
              selectedSubChannel={selectedSubChannel}
              selectedDifficulty={selectedDifficulty}
              selectedCompany={selectedCompany}
              companiesWithCounts={companiesWithCounts}
              onSubChannelChange={(val: string) => {
                setSelectedSubChannel(val);
                setCurrentIndex(0);
              }}
              onDifficultyChange={(val: string) => {
                setSelectedDifficulty(val);
                setCurrentIndex(0);
              }}
              onCompanyChange={(val: string) => {
                setSelectedCompany(val);
                setCurrentIndex(0);
              }}
              onClose={() => setShowFilters(false)}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Split View */}
          <div className="hidden lg:flex flex-1 overflow-hidden">
            {/* Question Panel */}
            <div className="w-1/2 border-r border-border overflow-y-auto p-8">
              <QuestionContent
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={totalQuestions}
                isMarked={isMarked}
                isCompleted={isCompleted}
                srsCard={srsCard}
                showRatingButtons={showRatingButtons}
                hasRated={hasRated}
                onAddToSRS={handleAddToSRS}
                onSRSRating={handleSRSRating}
                onToggleMark={toggleMark}
              />
            </div>
            {/* Answer Panel */}
            <div 
              className="w-1/2 overflow-y-auto p-8"
              style={{
                backgroundColor: isLightMode ? 'hsl(0 0% 100%)' : 'hsl(0 0% 0%)',
                color: isLightMode ? 'hsl(0 0% 5%)' : 'hsl(0 0% 100%)'
              }}
            >
              <GenZAnswerPanel 
                question={currentQuestion} 
                isCompleted={isCompleted}
              />
            </div>
          </div>

          {/* Mobile Tab View */}
          <div className="flex-1 flex flex-col lg:hidden overflow-hidden">
            {/* Mobile Tabs */}
            <div className="flex border-b border-border bg-background">
              <button
                onClick={() => setMobileView('question')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  mobileView === 'question'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                Question
              </button>
              <button
                onClick={() => setMobileView('answer')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  mobileView === 'answer'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                Answer
              </button>
            </div>
            
            {/* Mobile Content with Swipe Gestures */}
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              style={{ x, opacity }}
              onDragEnd={handleDragEnd}
              className="flex-1 overflow-y-auto p-6 pb-24 relative"
            >
              {/* Swipe Indicators */}
              {swipeDirection === 'left' && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute top-1/2 right-4 -translate-y-1/2 z-10 bg-primary/20 backdrop-blur-sm rounded-full p-4"
                >
                  <ChevronRight className="w-8 h-8 text-primary" />
                </motion.div>
              )}
              {swipeDirection === 'right' && (
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute top-1/2 left-4 -translate-y-1/2 z-10 bg-primary/20 backdrop-blur-sm rounded-full p-4"
                >
                  <ChevronLeft className="w-8 h-8 text-primary" />
                </motion.div>
              )}
              
              {mobileView === 'question' ? (
                <QuestionContent
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={totalQuestions}
                  isMarked={isMarked}
                  isCompleted={isCompleted}
                  srsCard={srsCard}
                  showRatingButtons={showRatingButtons}
                  hasRated={hasRated}
                  onAddToSRS={handleAddToSRS}
                  onSRSRating={handleSRSRating}
                  onToggleMark={toggleMark}
                />
              ) : (
                <GenZAnswerPanel 
                  question={currentQuestion} 
                  isCompleted={isCompleted}
                />
              )}
            </motion.div>
            
            {/* Floating Action Button - Next Question */}
            {currentIndex < totalQuestions - 1 && (
              <FloatingButton
                icon={<ArrowRight className="w-6 h-6" />}
                onClick={nextQuestion}
                position="bottom-right"
                hideOnScroll={false}
                className="lg:hidden"
              />
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-border bg-background/95 backdrop-blur-xl p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Previous */}
            <motion.button
              onClick={prevQuestion}
              disabled={currentIndex === 0}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-muted/50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            {/* Progress */}
            <div className="flex-1 max-w-md">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-bold text-primary">
                  {currentIndex + 1} / {totalQuestions}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-sm font-bold">{progress}%</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={toggleMark}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-3 rounded-full transition-colors ${
                  isMarked
                    ? 'bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-black'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <Bookmark className="w-5 h-5" fill={isMarked ? 'currentColor' : 'none'} />
              </motion.button>
              <motion.button
                onClick={handleShare}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-muted/50 rounded-full hover:bg-muted transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Next */}
            <motion.button
              onClick={nextQuestion}
              disabled={currentIndex === totalQuestions - 1}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground rounded-full disabled:opacity-30 disabled:cursor-not-allowed font-bold"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      <UnifiedSearch isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
      <VoiceReminder />
      <AICompanion
        pageContent={{
          type: 'question',
          title: channel.name,
          question: currentQuestion.question,
          answer: currentQuestion.answer,
          explanation: currentQuestion.explanation,
          tags: currentQuestion.tags,
          difficulty: currentQuestion.difficulty,
        }}
        onNavigate={(path) => setLocation(path)}
        onAction={(action, data) => {
          switch (action) {
            case 'nextQuestion':
              handleNext();
              break;
            case 'previousQuestion':
              handlePrevious();
              break;
            case 'showAnswer':
              setShowAnswer(true);
              break;
            case 'hideAnswer':
              setShowAnswer(false);
              break;
            case 'bookmark':
              handleBookmark();
              break;
            case 'addToSRS':
              handleAddToSRS();
              break;
            case 'share':
              handleShare();
              break;
            case 'showSearch':
              setShowSearchModal(true);
              break;
            case 'filterByDifficulty':
              if (data?.difficulty) {
                setDifficultyFilter(data.difficulty);
              }
              break;
            case 'filterBySubChannel':
              if (data?.subChannel) {
                setSelectedSubChannel(data.subChannel);
              }
              break;
            case 'clearFilters':
              setDifficultyFilter('all');
              setSelectedSubChannel('all');
              break;
          }
        }}
        availableActions={[
          'nextQuestion',
          'previousQuestion',
          'showAnswer',
          'hideAnswer',
          'bookmark',
          'addToSRS',
          'share',
          'showSearch',
          'filterByDifficulty',
          'filterBySubChannel',
          'clearFilters',
        ]}
      />
    </>
  );
}

// Header Component
function Header({ channel, onBack, onSearch, currentIndex, totalQuestions, progress, onToggleFilters, hasFilters }: any) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <h1 className="font-bold text-lg">{channel.name}</h1>
              {totalQuestions > 0 && (
                <p className="text-xs text-muted-foreground">
                  Question {currentIndex + 1} of {totalQuestions}
                </p>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {onToggleFilters && (
              <motion.button
                onClick={onToggleFilters}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-lg transition-colors ${
                  hasFilters
                    ? 'bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Filter className="w-5 h-5" />
              </motion.button>
            )}
            <motion.button
              onClick={onSearch}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Filters Panel
function FiltersPanel({ channel, selectedSubChannel, selectedDifficulty, selectedCompany, companiesWithCounts, onSubChannelChange, onDifficultyChange, onCompanyChange, onClose }: any) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-b border-border bg-muted/50 backdrop-blur-xl overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Filters</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sub-channels */}
          {channel.subChannels && channel.subChannels.length > 1 && (
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">Topic</label>
              <select
                value={selectedSubChannel}
                onChange={(e) => onSubChannelChange(e.target.value)}
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                {channel.subChannels.map((sc: any) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Difficulty */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => onDifficultyChange(e.target.value)}
              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Company */}
          {companiesWithCounts.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">Company</label>
              <select
                value={selectedCompany}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="all">All Companies</option>
                {companiesWithCounts.map((c: any) => (
                  <option key={c.company} value={c.company}>
                    {c.company} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Question Content
function QuestionContent({ question, questionNumber, totalQuestions, isMarked, isCompleted, srsCard, showRatingButtons, hasRated, onAddToSRS, onSRSRating, onToggleMark }: any) {
  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="px-3 py-1 bg-gradient-to-r from-primary/20 to-cyan-500/20 border border-primary/30 rounded-full text-xs font-bold text-primary">
          {question.difficulty}
        </span>
        {question.company && (
          <span className="px-3 py-1 bg-muted/50 border border-border rounded-full text-xs font-bold">
            {question.company}
          </span>
        )}
        {isCompleted && (
          <span className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full text-xs font-bold text-green-500">
            ✓ Completed
          </span>
        )}
        
        {/* SRS Status Badge */}
        {srsCard && !showRatingButtons && !hasRated && (
          <span 
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              getMasteryColor(srsCard.easeFactor)
            }`}
          >
            {getMasteryLabel(srsCard.easeFactor)}
          </span>
        )}
      </div>

      {/* Question */}
      <div>
        <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
          {question.question}
        </h2>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Bookmark Button */}
        <motion.button
          onClick={onToggleMark}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            isMarked
              ? 'bg-gradient-to-r from-[#ffd700]/20 to-[#ff0080]/20 border border-[#ffd700]/30 text-[#ffd700]'
              : 'bg-muted/50 border border-border text-muted-foreground hover:border-[#ffd700]/30 hover:text-[#ffd700]'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-current' : ''}`} />
          {isMarked ? 'Bookmarked' : 'Bookmark'}
        </motion.button>

        {/* SRS Button or Rating Buttons */}
        {hasRated ? (
          <span className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-xl text-sm font-bold text-green-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Review Recorded
          </span>
        ) : showRatingButtons && srsCard ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-2">Rate your confidence:</span>
            <motion.button
              onClick={() => onSRSRating('again')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Again
            </motion.button>
            <motion.button
              onClick={() => onSRSRating('hard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-xs font-bold text-orange-400 hover:bg-orange-500/30 transition-all flex items-center gap-1"
            >
              <Brain className="w-3 h-3" />
              Hard
            </motion.button>
            <motion.button
              onClick={() => onSRSRating('good')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-xs font-bold text-green-400 hover:bg-green-500/30 transition-all flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Good
            </motion.button>
            <motion.button
              onClick={() => onSRSRating('easy')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs font-bold text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-1"
            >
              <Zap className="w-4 h-4" />
              Easy
            </motion.button>
          </div>
        ) : (
          <motion.button
            onClick={onAddToSRS}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl text-sm font-bold text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Add to SRS
          </motion.button>
        )}

        {/* Flagging Button */}
        <QuestionFeedback questionId={question.id} />
      </div>

      {/* Tags */}
      {question.tags && question.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {question.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-3 py-1 bg-muted/50 rounded-full text-xs text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

