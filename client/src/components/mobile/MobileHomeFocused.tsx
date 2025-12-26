/**
 * Focused Home Component
 * Streamlined home page that drives users to learn immediately
 * Responsive: works for both mobile and desktop
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useChannelStats } from '../../hooks/use-stats';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useProgress, useGlobalStats } from '../../hooks/use-progress';
import { ProgressStorage } from '../../services/storage.service';
import { DailyReviewCard, notifySRSUpdate } from '../DailyReviewCard';
import { loadTests, TestQuestion, Test, getSessionQuestions } from '../../lib/tests';
import { addToSRS } from '../../lib/spaced-repetition';
import {
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Smartphone, Shield, Brain, Workflow, Box, Cloud, Code,
  Network, MessageCircle, Users, Sparkles, Eye, FileText, CheckCircle, 
  Monitor, Zap, Gauge, ChevronRight, Play, Compass, ArrowRight,
  RefreshCw, Flame, Target, X, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, React.ReactNode> = {
  'cpu': <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />,
  'terminal': <Terminal className="w-5 h-5 sm:w-6 sm:h-6" />,
  'layout': <Layout className="w-5 h-5 sm:w-6 sm:h-6" />,
  'database': <Database className="w-5 h-5 sm:w-6 sm:h-6" />,
  'activity': <Activity className="w-5 h-5 sm:w-6 sm:h-6" />,
  'infinity': <GitBranch className="w-5 h-5 sm:w-6 sm:h-6" />,
  'server': <Server className="w-5 h-5 sm:w-6 sm:h-6" />,
  'layers': <Layers className="w-5 h-5 sm:w-6 sm:h-6" />,
  'smartphone': <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />,
  'shield': <Shield className="w-5 h-5 sm:w-6 sm:h-6" />,
  'brain': <Brain className="w-5 h-5 sm:w-6 sm:h-6" />,
  'workflow': <Workflow className="w-5 h-5 sm:w-6 sm:h-6" />,
  'box': <Box className="w-5 h-5 sm:w-6 sm:h-6" />,
  'cloud': <Cloud className="w-5 h-5 sm:w-6 sm:h-6" />,
  'code': <Code className="w-5 h-5 sm:w-6 sm:h-6" />,
  'network': <Network className="w-5 h-5 sm:w-6 sm:h-6" />,
  'message-circle': <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
  'users': <Users className="w-5 h-5 sm:w-6 sm:h-6" />,
  'sparkles': <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />,
  'eye': <Eye className="w-5 h-5 sm:w-6 sm:h-6" />,
  'file-text': <FileText className="w-5 h-5 sm:w-6 sm:h-6" />,
  'chart': <Activity className="w-5 h-5 sm:w-6 sm:h-6" />,
  'check-circle': <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
  'monitor': <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />,
  'zap': <Zap className="w-5 h-5 sm:w-6 sm:h-6" />,
  'gauge': <Gauge className="w-5 h-5 sm:w-6 sm:h-6" />
};

export function MobileHomeFocused() {
  const [, setLocation] = useLocation();
  const { stats: channelStats } = useChannelStats();
  const { getSubscribedChannels, unsubscribeChannel } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const subscribedChannels = getSubscribedChannels();

  const questionCounts: Record<string, number> = {};
  channelStats.forEach(s => { questionCounts[s.id] = s.total; });

  const hasChannels = subscribedChannels.length > 0;
  const totalCompleted = ProgressStorage.getAllCompletedIds().size;

  // Calculate streak
  const streak = (() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (activityStats.find(x => x.date === d.toISOString().split('T')[0])) s++;
      else break;
    }
    return s;
  })();

  return (
    <div className="pb-20 sm:pb-8 max-w-4xl mx-auto">
      {/* Hero: Quick Quiz or Welcome */}
      {hasChannels ? (
        <QuickQuizCard 
          channels={subscribedChannels}
          onViewChannel={(channelId) => setLocation(`/channel/${channelId}`)}
        />
      ) : (
        <WelcomeCard onGetStarted={() => setLocation('/channels')} />
      )}

      {/* Quick Stats Row - compact */}
      {hasChannels && (
        <QuickStatsRow 
          completed={totalCompleted}
          streak={streak}
          channels={subscribedChannels.length}
          onStatsClick={() => setLocation('/stats')}
        />
      )}

      {/* Daily Review - Spaced Repetition */}
      {hasChannels && <DailyReviewCard />}

      {/* Continue Learning - show more channels */}
      {hasChannels && (
        <ContinueLearningSection 
          channels={subscribedChannels}
          questionCounts={questionCounts}
          onChannelClick={(id) => setLocation(`/channel/${id}`)}
          onUnsubscribe={unsubscribeChannel}
          onSeeAll={() => setLocation('/channels')}
        />
      )}

      {/* Coding Challenge CTA */}
      {hasChannels && (
        <CodingChallengeCard onStart={() => setLocation('/coding')} />
      )}

      {/* Quick Start Topics for new users */}
      {!hasChannels && (
        <QuickStartTopics onSelect={(id) => setLocation(`/channel/${id}`)} />
      )}
    </div>
  );
}

// Quick Quiz Card - Interactive quiz directly on home screen
function QuickQuizCard({ 
  channels,
  onViewChannel 
}: { 
  channels: any[];
  onViewChannel: (channelId: string) => void;
}) {
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load test questions from subscribed channels
  useEffect(() => {
    const loadQuizQuestions = async () => {
      setIsLoading(true);
      try {
        const allTests = await loadTests();
        const subscribedIds = new Set(channels.map(c => c.id));
        const relevantTests = allTests.filter(t => subscribedIds.has(t.channelId));
        setTests(relevantTests);
        
        if (relevantTests.length > 0) {
          // Gather questions from all relevant tests and shuffle
          const allQuestions: TestQuestion[] = [];
          relevantTests.forEach(test => {
            const sessionQuestions = getSessionQuestions(test, 5); // 5 from each channel
            allQuestions.push(...sessionQuestions);
          });
          
          // Shuffle all questions together
          const shuffled = allQuestions.sort(() => Math.random() - 0.5);
          setQuestions(shuffled.slice(0, 10)); // Take 10 questions max
        }
      } catch (e) {
        console.error('Failed to load quiz questions', e);
      }
      setIsLoading(false);
    };
    
    loadQuizQuestions();
  }, [channels]);

  const handleRefresh = useCallback(() => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(null);
    setCorrectCount(0);
    setTotalAnswered(0);
    
    // Re-shuffle questions
    if (tests.length > 0) {
      const allQuestions: TestQuestion[] = [];
      tests.forEach(test => {
        const sessionQuestions = getSessionQuestions(test, 5);
        allQuestions.push(...sessionQuestions);
      });
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      setQuestions(shuffled.slice(0, 10));
    }
  }, [tests]);

  const handleOptionSelect = (optionId: string) => {
    if (showFeedback || !currentQuestion) return;
    
    setSelectedAnswer(optionId);
    const correctOption = currentQuestion.options.find(o => o.isCorrect);
    const isCorrect = correctOption?.id === optionId;
    
    setShowFeedback(isCorrect ? 'correct' : 'incorrect');
    setTotalAnswered(prev => prev + 1);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      // Add wrong answer's question to SRS for spaced repetition review
      if (currentQuestion.questionId && currentTest) {
        addToSRS(currentQuestion.questionId, currentTest.channelId, currentQuestion.difficulty);
        // Notify DailyReviewCard to refresh
        notifySRSUpdate();
      }
    }
    
    // Auto-advance after feedback
    setTimeout(() => {
      setShowFeedback(null);
      setSelectedAnswer(null);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Quiz complete - refresh with new questions
        handleRefresh();
      }
    }, isCorrect ? 800 : 1500);
  };

  const currentQuestion = questions[currentIndex];
  const currentTest = tests.find(t => 
    t.questions.some(q => q.id === currentQuestion?.id)
  );
  const channelConfig = channels.find(c => c.id === currentTest?.channelId);

  if (isLoading) {
    return (
      <section className="mx-3 sm:mx-0 mt-3 sm:mt-4 mb-2 sm:mb-4">
        <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-primary/20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="font-semibold sm:text-lg">Loading quiz...</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Preparing questions</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!currentQuestion || questions.length === 0) {
    return (
      <section className="mx-3 sm:mx-0 mt-3 sm:mt-4 mb-2 sm:mb-4">
        <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-primary/20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold sm:text-lg">No quiz available</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Tests coming soon for your channels</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-3 sm:mx-0 mt-3 sm:mt-4 mb-2 sm:mb-4">
      <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl sm:rounded-2xl overflow-hidden border border-primary/20">
        {/* Header */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-border/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <span className="text-[11px] sm:text-xs font-semibold text-primary uppercase tracking-wide">
              Quick Quiz
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {currentIndex + 1}/{questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {totalAnswered > 0 && (
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {correctCount}/{totalAnswered} correct
              </span>
            )}
            <button 
              onClick={handleRefresh}
              className="p-1 sm:p-1.5 hover:bg-muted rounded transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="p-3 sm:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Channel & Difficulty badges */}
              <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
                <button
                  onClick={() => currentTest && onViewChannel(currentTest.channelId)}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/10 rounded sm:rounded-lg flex items-center gap-1 sm:gap-2 hover:bg-primary/20 transition-colors"
                >
                  <span className="text-primary">{channelConfig && iconMap[channelConfig.icon]}</span>
                  <span className="text-[11px] sm:text-sm font-medium">{channelConfig?.name || currentTest?.channelName}</span>
                </button>
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
                  currentQuestion.difficulty === 'beginner' ? 'bg-green-500/10 text-green-600' :
                  currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-red-500/10 text-red-600'
                }`}>
                  {currentQuestion.difficulty}
                </span>
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
                  currentQuestion.type === 'multiple' 
                    ? 'bg-purple-500/10 text-purple-500' 
                    : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {currentQuestion.type === 'multiple' ? 'Multi' : 'Single'}
                </span>
              </div>

              {/* Question text */}
              <h3 className="font-medium text-sm sm:text-lg leading-snug mb-3 sm:mb-4">
                {currentQuestion.question}
              </h3>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const showCorrect = showFeedback && option.isCorrect;
                  const showWrong = showFeedback === 'incorrect' && isSelected && !option.isCorrect;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={showFeedback !== null}
                      className={`w-full p-3 sm:p-4 text-left border rounded-lg transition-all text-sm ${
                        showCorrect
                          ? 'border-green-500 bg-green-500/20'
                          : showWrong
                          ? 'border-red-500 bg-red-500/20'
                          : isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      } ${showFeedback ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          showCorrect
                            ? 'border-green-500 bg-green-500'
                            : showWrong
                            ? 'border-red-500 bg-red-500'
                            : isSelected 
                            ? 'border-primary bg-primary' 
                            : 'border-muted-foreground/30'
                        }`}>
                          {showCorrect && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                          {showWrong && <X className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                          {!showFeedback && isSelected && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />}
                        </div>
                        <span className="text-xs sm:text-sm">{option.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation on wrong answer */}
              {showFeedback === 'incorrect' && currentQuestion.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 bg-muted/30 rounded-lg text-xs sm:text-sm text-muted-foreground"
                >
                  <span className="font-medium text-foreground">💡 </span>
                  {currentQuestion.explanation}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted/30">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}

// Quick Stats Row - compact horizontal stats
function QuickStatsRow({ 
  completed, 
  streak, 
  channels,
  onStatsClick 
}: { 
  completed: number;
  streak: number;
  channels: number;
  onStatsClick: () => void;
}) {
  return (
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <button 
        onClick={onStatsClick}
        className="w-full bg-card rounded-xl sm:rounded-2xl border border-border p-2 sm:p-4 flex items-center justify-around hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <div className="text-left">
            <div className="font-bold text-sm sm:text-lg">{completed}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Done</div>
          </div>
        </div>
        <div className="w-px h-8 sm:h-10 bg-border" />
        <div className="flex items-center gap-2 sm:gap-3">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          <div className="text-left">
            <div className="font-bold text-sm sm:text-lg">{streak}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Streak</div>
          </div>
        </div>
        <div className="w-px h-8 sm:h-10 bg-border" />
        <div className="flex items-center gap-2 sm:gap-3">
          <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
          <div className="text-left">
            <div className="font-bold text-sm sm:text-lg">{channels}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Topics</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
      </button>
    </section>
  );
}

// Continue Learning Section - shows all subscribed channels
function ContinueLearningSection({ 
  channels, 
  questionCounts,
  onChannelClick,
  onUnsubscribe,
  onSeeAll
}: { 
  channels: any[];
  questionCounts: Record<string, number>;
  onChannelClick: (id: string) => void;
  onUnsubscribe: (id: string) => void;
  onSeeAll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  // Determine visible count based on screen size and expanded state
  const mobileLimit = 4;
  const desktopLimit = 6;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const limit = isMobile ? mobileLimit : desktopLimit;
  const hasMore = channels.length > limit;
  const visibleChannels = expanded ? channels : channels.slice(0, limit);
  const hiddenCount = channels.length - limit;

  return (
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden">
        <button 
          onClick={onSeeAll}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border-b border-border/50 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <h3 className="font-semibold text-sm sm:text-base">Your Channels</h3>
          <div className="flex items-center gap-1 text-xs sm:text-sm text-primary">
            Manage <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
        </button>
        
        {/* Desktop: Grid layout, Mobile: List */}
        <div className="sm:hidden divide-y divide-border/50">
          {visibleChannels.map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              questionCount={questionCounts[channel.id] || 0}
              onClick={() => onChannelClick(channel.id)}
              onUnsubscribe={() => onUnsubscribe(channel.id)}
            />
          ))}
        </div>
        
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4">
          {visibleChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              questionCount={questionCounts[channel.id] || 0}
              onClick={() => onChannelClick(channel.id)}
              onUnsubscribe={() => onUnsubscribe(channel.id)}
            />
          ))}
        </div>

        {hasMore && !expanded && (
          <button 
            onClick={() => setExpanded(true)}
            className="w-full py-2 sm:py-3 text-xs sm:text-sm text-primary font-medium hover:bg-muted/50 border-t border-border/50"
          >
            +{hiddenCount} more channels
          </button>
        )}
        
        {expanded && hasMore && (
          <button 
            onClick={() => setExpanded(false)}
            className="w-full py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground font-medium hover:bg-muted/50 border-t border-border/50"
          >
            Show less
          </button>
        )}
      </div>
    </section>
  );
}

// Desktop channel card
function ChannelCard({ 
  channel, 
  questionCount,
  onClick,
  onUnsubscribe
}: { 
  channel: any;
  questionCount: number;
  onClick: () => void;
  onUnsubscribe: () => void;
}) {
  const { completed } = useProgress(channel.id);
  const [confirmingUnsubscribe, setConfirmingUnsubscribe] = useState(false);
  const validCompleted = Math.min(completed.length, questionCount);
  const progress = questionCount > 0 ? Math.round((validCompleted / questionCount) * 100) : 0;

  // Auto-cancel confirmation after 5 seconds
  useEffect(() => {
    if (confirmingUnsubscribe) {
      const timer = setTimeout(() => setConfirmingUnsubscribe(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmingUnsubscribe]);

  if (confirmingUnsubscribe) {
    return (
      <div className="relative p-4 rounded-xl border border-border bg-card overflow-hidden">
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-destructive/20 via-destructive/10 to-destructive/20 animate-pulse" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              {iconMap[channel.icon] || <Code className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{channel.name}</p>
              <p className="text-xs text-muted-foreground">Will be removed from your feed</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingUnsubscribe(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-muted/80 hover:bg-muted transition-all duration-200 active:scale-[0.98]"
            >
              Keep
            </button>
            <button
              onClick={() => {
                onUnsubscribe();
                setConfirmingUnsubscribe(false);
              }}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-destructive/25"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left border border-border/50 hover:border-primary/30"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {iconMap[channel.icon] || <Code className="w-5 h-5" />}
          </div>
          <span className="text-lg font-bold text-primary">{progress}%</span>
        </div>
        
        <h4 className="font-semibold text-sm mb-1 truncate">{channel.name}</h4>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{channel.description}</p>
        
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {validCompleted}/{questionCount} completed
        </div>
      </button>
      
      {/* Unsubscribe button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setConfirmingUnsubscribe(true);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all"
        title="Unsubscribe"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ChannelRow({ 
  channel, 
  questionCount,
  onClick,
  onUnsubscribe
}: { 
  channel: any;
  questionCount: number;
  onClick: () => void;
  onUnsubscribe: () => void;
}) {
  const { completed } = useProgress(channel.id);
  const [confirmingUnsubscribe, setConfirmingUnsubscribe] = useState(false);
  const validCompleted = Math.min(completed.length, questionCount);
  const progress = questionCount > 0 ? Math.round((validCompleted / questionCount) * 100) : 0;

  // Auto-cancel confirmation after 5 seconds
  useEffect(() => {
    if (confirmingUnsubscribe) {
      const timer = setTimeout(() => setConfirmingUnsubscribe(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmingUnsubscribe]);

  if (confirmingUnsubscribe) {
    return (
      <div className="relative px-3 py-3 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-destructive/10 to-destructive/5" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0">
            {iconMap[channel.icon] || <Code className="w-4 h-4" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{channel.name}</p>
            <p className="text-[11px] text-muted-foreground">Remove from your channels?</p>
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirmingUnsubscribe(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted/80 hover:bg-muted transition-all duration-200 active:scale-[0.97]"
            >
              Keep
            </button>
            <button
              onClick={() => {
                onUnsubscribe();
                setConfirmingUnsubscribe(false);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200 active:scale-[0.97] shadow-md shadow-destructive/20"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-muted/50 transition-colors">
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-3 text-left"
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {iconMap[channel.icon] || <Code className="w-4 h-4 sm:w-5 sm:h-5" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-sm sm:text-base truncate">{channel.name}</h4>
            <span className="text-xs sm:text-sm text-muted-foreground ml-2">{progress}%</span>
          </div>
          <div className="h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" fill="currentColor" />
      </button>
      
      {/* Unsubscribe button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setConfirmingUnsubscribe(true);
        }}
        className="p-1.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
        title="Unsubscribe"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Coding Challenge CTA
function CodingChallengeCard({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <button
        onClick={onStart}
        className="w-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl sm:rounded-2xl border border-purple-500/20 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:from-purple-500/15 hover:to-blue-500/15 transition-colors"
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Code className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-sm sm:text-base">Practice Coding</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Solve real interview challenges</p>
        </div>
        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
      </button>
    </section>
  );
}

// Welcome Card for new users
function WelcomeCard({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="mx-3 sm:mx-0 mt-3 sm:mt-4 mb-2 sm:mb-4">
      <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-primary/20">
        <div className="text-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Code className="w-7 h-7 sm:w-10 sm:h-10 text-primary" />
          </div>
          
          <h1 className="font-bold text-lg sm:text-2xl lg:text-3xl mb-1 sm:mb-2">Welcome to Learn Reels</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
            Master technical interviews with bite-sized questions
          </p>

          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-lg sm:rounded-xl font-semibold flex items-center justify-center gap-2 text-sm sm:text-base mx-auto"
          >
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            Choose Your Topics
          </button>
        </div>
      </div>
    </section>
  );
}

// Quick Start Topics for new users - responsive grid
function QuickStartTopics({ onSelect }: { onSelect: (id: string) => void }) {
  const popularTopics = [
    { id: 'system-design', name: 'System Design', icon: 'cpu', desc: 'Architecture' },
    { id: 'algorithms', name: 'Algorithms', icon: 'terminal', desc: 'Data structures' },
    { id: 'frontend', name: 'Frontend', icon: 'layout', desc: 'React & CSS' },
    { id: 'backend', name: 'Backend', icon: 'server', desc: 'APIs' },
    { id: 'database', name: 'Database', icon: 'database', desc: 'SQL & NoSQL' },
    { id: 'devops', name: 'DevOps', icon: 'infinity', desc: 'CI/CD' },
  ];

  return (
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 px-1">Popular Topics</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {popularTopics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic.id)}
            className="p-3 sm:p-4 bg-card rounded-xl sm:rounded-2xl border border-border hover:border-primary/30 transition-colors text-left flex items-center gap-3"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {iconMap[topic.icon]}
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-sm sm:text-base truncate">{topic.name}</h4>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{topic.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
