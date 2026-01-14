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
import { useCredits } from '../../context/CreditsContext';
import { useAchievementContext } from '../../context/AchievementContext';
import { ProgressStorage } from '../../services/storage.service';
import { RecommendationService } from '../../services/recommendation.service';
import { DailyReviewCard, notifySRSUpdate } from '../DailyReviewCard';
import { Recommendations } from '../Recommendations';
import { ListenIconButton } from '../ListenButton';
import { QuestionFeedback } from '../QuestionFeedback';
import { RecentBlogPosts } from '../RecentBlogPosts';
import { QuestionHistoryIcon } from '../unified/QuestionHistory';
import { loadTests, TestQuestion, Test, getSessionQuestions } from '../../lib/tests';
import { addToSRS } from '../../lib/spaced-repetition';
import { 
  initializeQuizSession, 
  updateSession, 
  selectNextQuestion,
  QuizSession 
} from '../../lib/progressive-quiz';
import {
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Smartphone, Shield, Brain, Workflow, Box, Cloud, Code,
  Network, MessageCircle, Users, Sparkles, Eye, FileText, CheckCircle, 
  Monitor, Zap, Gauge, ChevronRight, Play, Compass, ArrowRight,
  RefreshCw, Flame, Target, X, Check, Mic, Coins, Award, BookOpen, Volume2
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

// Fisher-Yates shuffle to randomize option order (prevents "longest answer" bias)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function MobileHomeFocused() {
  const [, setLocation] = useLocation();
  const { stats: channelStats } = useChannelStats();
  const { getSubscribedChannels, unsubscribeChannel } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const { balance, formatCredits, config } = useCredits();
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

  // Memoize the onViewChannel callback to prevent QuickQuizCard re-renders
  const handleViewChannel = useCallback((channelId: string) => {
    setLocation(`/channel/${channelId}`);
  }, [setLocation]);

  return (
    <div className="pb-20 sm:pb-8 max-w-6xl mx-auto px-3 sm:px-4">
      {/* Desktop: Two-column layout with equal heights, Mobile: Single column */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-4">
        {/* Main Column - Quiz & Learning */}
        <div className="lg:col-span-8 lg:flex lg:flex-col">
          {/* Hero: Quick Quiz or Welcome */}
          {hasChannels ? (
            <QuickQuizCard 
              channels={subscribedChannels}
              onViewChannel={handleViewChannel}
            />
          ) : (
            <WelcomeCard onGetStarted={() => setLocation('/channels')} />
          )}

          {/* Continue Learning - show more channels - grows to fill space */}
          {hasChannels && (
            <ContinueLearningSection 
              channels={subscribedChannels}
              questionCounts={questionCounts}
              onChannelClick={(id) => setLocation(`/channel/${id}`)}
              onUnsubscribe={unsubscribeChannel}
              onSeeAll={() => setLocation('/channels')}
              fillHeight
            />
          )}
        </div>

        {/* Sidebar Column - Stats, Actions & Review */}
        <div className="lg:col-span-4 mt-3 lg:mt-0 flex flex-col">
          {/* Premium Stats Card - Matching Profile Design */}
          <div className="bg-card rounded-xl border border-border overflow-hidden mb-3">
            {/* Mini Profile Header - Premium gradient */}
            <button
              onClick={() => setLocation('/profile')}
              className="w-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-3 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-600 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-white">{formatCredits(balance)}</div>
                    <div className="text-[10px] text-white/60">Credits</div>
                  </div>
                </div>
                <div className="text-right text-[10px]">
                  <div className="text-green-300">+{config.VOICE_ATTEMPT} voice</div>
                  <div className="text-red-300/80">-{config.QUESTION_VIEW_COST}/q</div>
                </div>
              </div>
            </button>

            {/* Quick Stats Row - Enhanced */}
            {hasChannels && (
              <button 
                onClick={() => setLocation('/stats')}
                className="w-full p-3 flex items-center justify-around hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">{totalCompleted}</div>
                    <div className="text-[9px] text-muted-foreground">Done</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">{streak}</div>
                    <div className="text-[9px] text-muted-foreground">Streak</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">{subscribedChannels.length}</div>
                    <div className="text-[9px] text-muted-foreground">Topics</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Adaptive Grid for Sidebar Cards */}
          {hasChannels && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 mb-3">
              {/* Training Mode - Compact */}
              <TrainingModeCardCompact onStart={() => setLocation('/training')} />
              
              {/* Practice CTAs */}
              <CodingChallengeCardCompact onStart={() => setLocation('/coding')} />
              <CertificationCardCompact onStart={() => setLocation('/certifications')} />
              
              {/* Quick Links - Compact inline */}
              <QuickLinksCompact onNavigate={setLocation} />
            </div>
          )}

          {/* Daily Review - Spaced Repetition */}
          {hasChannels && <DailyReviewCard />}

          {/* Personalized Recommendations */}
          {hasChannels && (
            <Recommendations 
              channelQuestionCounts={questionCounts}
              compact={false}
              className="mb-3 bg-card rounded-xl border border-border p-3"
            />
          )}

          {/* Voice Interview CTA - Primary feature - Full width */}
          {hasChannels && (
            <VoiceInterviewCard onStart={() => setLocation('/voice-interview')} />
          )}

          {/* Recent Blog Posts & Pro Tip - Side by side on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {/* Recent Blog Posts */}
            <RecentBlogPosts limit={3} className="mb-0" />
            
            {/* Pro Tips Card */}
            {hasChannels && (
              <div className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 rounded-xl border border-violet-500/20 p-3 h-fit">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-violet-300 mb-1">Pro Tip</div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Use Voice Interview mode to practice speaking your answers out loud. 
                      It's the best way to prepare for real interviews!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [creditChange, setCreditChange] = useState<number | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession>(initializeQuizSession());
  const { onQuizAnswer, config } = useCredits();
  const { trackEvent } = useAchievementContext();
  
  // Memoize channel IDs to prevent unnecessary reloads
  const channelIds = channels.map(c => c.id).sort().join(',');

  // Load test questions from subscribed channels - only when channel IDs actually change
  useEffect(() => {
    const loadQuizQuestions = async () => {
      setIsLoading(true);
      try {
        const allTests = await loadTests();
        const subscribedIds = new Set(channelIds.split(','));
        const relevantTests = allTests.filter(t => subscribedIds.has(t.channelId));
        setTests(relevantTests);
        
        if (relevantTests.length > 0) {
          // Initialize progressive quiz session
          const newSession = initializeQuizSession();
          setQuizSession(newSession);
          
          // Generate progressive questions with shuffled options
          const progressiveQuestions: TestQuestion[] = [];
          let previousQuestion: TestQuestion | undefined;
          
          for (let i = 0; i < 10; i++) {
            const next = selectNextQuestion(relevantTests, newSession, previousQuestion);
            if (!next) break;
            
            // Shuffle options to prevent "longest answer" bias from being exploitable
            const questionWithShuffledOptions = {
              ...next.question,
              options: shuffleArray([...next.question.options])
            };
            
            progressiveQuestions.push(questionWithShuffledOptions);
            previousQuestion = next.question;
            
            // Update session for next selection (simulate average performance)
            Object.assign(newSession, updateSession(newSession, next.question, true));
          }
          
          setQuestions(progressiveQuestions);
        }
      } catch (e) {
        console.error('Failed to load quiz questions', e);
      }
      setIsLoading(false);
    };
    
    if (channelIds) {
      loadQuizQuestions();
    }
  }, [channelIds]);

  const handleRefresh = useCallback(() => {
    // Re-generate progressive questions
    if (tests.length > 0) {
      const newSession = initializeQuizSession();
      const progressiveQuestions: TestQuestion[] = [];
      let previousQuestion: TestQuestion | undefined;
      
      for (let i = 0; i < 10; i++) {
        const next = selectNextQuestion(tests, newSession, previousQuestion);
        if (!next) break;
        
        // Shuffle options to prevent "longest answer" bias from being exploitable
        const questionWithShuffledOptions = {
          ...next.question,
          options: shuffleArray([...next.question.options])
        };
        
        progressiveQuestions.push(questionWithShuffledOptions);
        previousQuestion = next.question;
        
        // Update session for next selection
        Object.assign(newSession, updateSession(newSession, next.question, true));
      }
      
      // Reset state
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowFeedback(null);
      setCorrectCount(0);
      setTotalAnswered(0);
      setQuizSession(newSession);
      setQuestions(progressiveQuestions);
    }
  }, [tests]);

  const handleOptionSelect = (optionId: string) => {
    if (showFeedback || !currentQuestion || isTransitioning) return;
    
    setSelectedAnswer(optionId);
    const correctOption = currentQuestion.options.find(o => o.isCorrect);
    const isCorrect = correctOption?.id === optionId;
    
    setShowFeedback(isCorrect ? 'correct' : 'incorrect');
    setTotalAnswered(prev => prev + 1);
    
    // Update quiz session with performance
    setQuizSession(prev => updateSession(prev, currentQuestion, isCorrect));
    
    // Process credits for quiz answer
    const creditResult = onQuizAnswer(isCorrect);
    if (creditResult.amount !== 0) {
      setCreditChange(creditResult.amount);
      // Clear credit change display after animation
      setTimeout(() => setCreditChange(null), 1500);
    }
    
    // Track achievement event
    trackEvent({
      type: 'quiz_answered',
      timestamp: new Date().toISOString(),
      data: {
        isCorrect,
        difficulty: currentQuestion.difficulty,
      },
    });
    
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
    
    // Auto-advance after feedback - LONGER delay for wrong answers
    const advanceDelay = isCorrect ? 800 : 3500; // Increased from 1500ms to 3500ms
    setIsTransitioning(true);
    
    setTimeout(() => {
      setShowFeedback(null);
      setSelectedAnswer(null);
      
      if (currentIndex < questions.length - 1) {
        // Move to next question
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
      } else {
        // Quiz complete - refresh with new questions after brief delay
        setTimeout(() => {
          handleRefresh();
          setIsTransitioning(false);
        }, 200);
      }
    }, advanceDelay);
  };

  const currentQuestion = questions[currentIndex];
  const currentTest = tests.find(t => 
    t.questions.some(q => q.id === currentQuestion?.id)
  );
  const channelConfig = channels.find(c => c.id === currentTest?.channelId);

  if (isLoading) {
    return (
      <section className="mb-3">
        <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl p-4 border border-primary/20">
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
      <section className="mb-3">
        <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl p-4 border border-primary/20">
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
    <section className="mb-3">
      <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl overflow-hidden border border-primary/20">
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
            {/* Difficulty indicator */}
            {totalAnswered > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                quizSession.difficultyLevel === 'beginner' ? 'bg-green-500/10 text-green-600' :
                quizSession.difficultyLevel === 'intermediate' ? 'bg-yellow-500/10 text-yellow-600' :
                'bg-red-500/10 text-red-600'
              }`}>
                {quizSession.difficultyLevel}
              </span>
            )}
            <span className="text-[9px] flex items-center gap-0.5 ml-1">
              <Coins className="w-2.5 h-2.5 text-amber-400" />
              <span className="text-green-400">+{config.QUIZ_CORRECT}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-400">{config.QUIZ_WRONG}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Credit change animation */}
            <AnimatePresence>
              {creditChange !== null && (
                <motion.span
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`text-xs font-bold ${creditChange > 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {creditChange > 0 ? '+' : ''}{creditChange}
                </motion.span>
              )}
            </AnimatePresence>
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
        <div className="p-3 sm:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`question-${currentIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {/* Channel & Difficulty badges */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <button
                  onClick={() => currentTest && onViewChannel(currentTest.channelId)}
                  className="px-2 py-0.5 bg-primary/10 rounded flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
                >
                  <span className="text-primary">{channelConfig && iconMap[channelConfig.icon]}</span>
                  <span className="text-[11px] sm:text-xs font-medium">{channelConfig?.name || currentTest?.channelName}</span>
                </button>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  currentQuestion.difficulty === 'beginner' ? 'bg-green-500/10 text-green-600' :
                  currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-red-500/10 text-red-600'
                }`}>
                  {currentQuestion.difficulty}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  currentQuestion.type === 'multiple' 
                    ? 'bg-purple-500/10 text-purple-500' 
                    : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {currentQuestion.type === 'multiple' ? 'Multi' : 'Single'}
                </span>
                {/* History icon */}
                {currentQuestion.questionId && (
                  <QuestionHistoryIcon 
                    questionId={currentQuestion.questionId} 
                    questionType="test"
                    size="sm"
                  />
                )}
                {/* Feedback flag */}
                {currentQuestion.questionId && (
                  <QuestionFeedback questionId={currentQuestion.questionId} className="ml-auto" />
                )}
              </div>

              {/* Question text */}
              <h3 className="font-medium text-sm sm:text-base leading-snug mb-2.5">
                {currentQuestion.question}
              </h3>

              {/* Options - More compact */}
              <div className="space-y-1.5">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const showCorrect = showFeedback && option.isCorrect;
                  const showWrong = showFeedback === 'incorrect' && isSelected && !option.isCorrect;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={showFeedback !== null}
                      className={`w-full p-2.5 sm:p-3 text-left border rounded-lg transition-all text-sm ${
                        showCorrect
                          ? 'border-green-500 bg-green-500/20'
                          : showWrong
                          ? 'border-red-500 bg-red-500/20'
                          : isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      } ${showFeedback ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          showCorrect
                            ? 'border-green-500 bg-green-500'
                            : showWrong
                            ? 'border-red-500 bg-red-500'
                            : isSelected 
                            ? 'border-primary bg-primary' 
                            : 'border-muted-foreground/30'
                        }`}>
                          {showCorrect && <Check className="w-3 h-3 text-white" />}
                          {showWrong && <X className="w-3 h-3 text-white" />}
                          {!showFeedback && isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-medium text-foreground">💡 </span>
                      {currentQuestion.explanation}
                    </div>
                    <ListenIconButton 
                      text={currentQuestion.explanation} 
                      size="sm"
                      className="flex-shrink-0 mt-0.5"
                    />
                  </div>
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

// Continue Learning Section - shows all subscribed channels with dynamic sizing
function ContinueLearningSection({ 
  channels, 
  questionCounts,
  onChannelClick,
  onUnsubscribe,
  onSeeAll,
  fillHeight = false
}: { 
  channels: any[];
  questionCounts: Record<string, number>;
  onChannelClick: (id: string) => void;
  onUnsubscribe: (id: string) => void;
  onSeeAll: () => void;
  fillHeight?: boolean;
}) {
  // Show all channels - let CSS grid and scroll handle the layout
  const visibleChannels = channels;
  const [scrollState, setScrollState] = useState({ hasTop: false, hasBottom: false });
  
  // Calculate optimal height based on content
  const mobileRowHeight = 72; // Approximate height of each channel row on mobile
  const desktopCardHeight = 120; // Approximate height of each channel card on desktop
  const desktopCols = 3; // lg:grid-cols-3
  const tabletCols = 2; // sm:grid-cols-2
  
  // Calculate dynamic heights
  const mobileOptimalHeight = Math.min(visibleChannels.length * mobileRowHeight, 400);
  const desktopRows = Math.ceil(visibleChannels.length / desktopCols);
  const tabletRows = Math.ceil(visibleChannels.length / tabletCols);
  const desktopOptimalHeight = Math.min(desktopRows * desktopCardHeight + 32, 400); // +32 for padding
  const tabletOptimalHeight = Math.min(tabletRows * desktopCardHeight + 32, 400);
  
  // Use CSS custom properties for dynamic heights
  const dynamicStyle = {
    '--mobile-height': `${mobileOptimalHeight}px`,
    '--tablet-height': `${tabletOptimalHeight}px`,
    '--desktop-height': `${desktopOptimalHeight}px`,
  } as React.CSSProperties;
  
  // Handle scroll events to show/hide fade indicators
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setScrollState({
      hasTop: scrollTop > 0,
      hasBottom: scrollTop < scrollHeight - clientHeight - 1
    });
  };

  return (
    <section className={fillHeight ? 'lg:flex-1 lg:min-h-0 lg:flex lg:flex-col' : 'mb-3'}>
      <div className={`bg-card rounded-xl border border-border overflow-hidden ${fillHeight ? 'lg:flex-1 lg:flex lg:flex-col lg:min-h-0' : ''}`}>
        <button 
          onClick={onSeeAll}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border-b border-border/50 flex items-center justify-between hover:bg-muted/30 transition-colors flex-shrink-0"
        >
          <h3 className="font-semibold text-sm sm:text-base">Your Channels</h3>
          <div className="flex items-center gap-1 text-xs sm:text-sm text-primary">
            Manage <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
        </button>
        
        {/* Mobile: List with dynamic height scroll */}
        <div className={`sm:hidden scroll-container ${scrollState.hasTop ? 'has-scroll-top' : ''} ${scrollState.hasBottom ? 'has-scroll-bottom' : ''}`} style={dynamicStyle}>
          <div className="overflow-y-auto force-scrollbar divide-y divide-border/50 dynamic-mobile-height" onScroll={handleScroll}>
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
        </div>
        
        {/* Tablet: Grid with dynamic height scroll */}
        <div className={`hidden sm:block lg:hidden scroll-container ${scrollState.hasTop ? 'has-scroll-top' : ''} ${scrollState.hasBottom ? 'has-scroll-bottom' : ''}`} style={dynamicStyle}>
          <div className="overflow-y-auto force-scrollbar dynamic-tablet-height" onScroll={handleScroll}>
            <div className="grid grid-cols-2 gap-3 p-3 sm:p-4">
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
          </div>
        </div>
        
        {/* Desktop: Grid with dynamic height scroll */}
        <div className={`hidden lg:block scroll-container ${scrollState.hasTop ? 'has-scroll-top' : ''} ${scrollState.hasBottom ? 'has-scroll-bottom' : ''}`} style={dynamicStyle}>
          <div className="overflow-y-auto force-scrollbar dynamic-desktop-height" onScroll={handleScroll}>
            <div className="grid grid-cols-3 gap-3 p-3 sm:p-4">
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
          </div>
        </div>
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
          <div className="text-right">
            <span className="text-lg font-bold text-primary">{progress}%</span>
            <div className="text-[9px] text-red-400 flex items-center justify-end gap-0.5">
              <Coins className="w-2.5 h-2.5" />-2/q
            </div>
          </div>
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
        className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 border border-border opacity-60 group-hover:opacity-100 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all"
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
            <div className="flex items-center gap-2 ml-2">
              <span className="text-[9px] text-red-400 flex items-center gap-0.5">
                <Coins className="w-2.5 h-2.5" />-2
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">{progress}%</span>
            </div>
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

// Coding Challenge CTA - Compact version for sidebar
function CodingChallengeCardCompact({ onStart }: { onStart: () => void }) {
  return (
    <button
      onClick={onStart}
      className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 p-3 flex flex-col items-center gap-2 hover:from-purple-500/15 hover:to-blue-500/15 transition-colors text-center"
    >
      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
        <Code className="w-5 h-5 text-purple-500" />
      </div>
      <div>
        <h3 className="font-semibold text-xs sm:text-sm">Coding</h3>
        <p className="text-[10px] text-muted-foreground">Practice</p>
      </div>
    </button>
  );
}

// Certification CTA - Compact version for sidebar
function CertificationCardCompact({ onStart }: { onStart: () => void }) {
  return (
    <button
      onClick={onStart}
      className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 p-3 flex flex-col items-center gap-2 hover:from-amber-500/15 hover:to-orange-500/15 transition-colors text-center"
    >
      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
        <Award className="w-5 h-5 text-amber-500" />
      </div>
      <div>
        <h3 className="font-semibold text-xs sm:text-sm">Certs</h3>
        <p className="text-[10px] text-muted-foreground">AWS, K8s</p>
      </div>
    </button>
  );
}

// Training Mode - Compact version for grid
function TrainingModeCardCompact({ onStart }: { onStart: () => void }) {
  return (
    <button
      onClick={onStart}
      className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-3 flex flex-col items-center gap-2 hover:from-blue-500/15 hover:to-purple-500/15 transition-colors text-center"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-blue-500" />
      </div>
      <div>
        <h3 className="font-semibold text-xs sm:text-sm">Training</h3>
        <p className="text-[10px] text-muted-foreground">Read & speak</p>
      </div>
    </button>
  );
}

// Quick Links - Compact inline version
function QuickLinksCompact({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="bg-card rounded-xl border border-border p-2 flex flex-wrap justify-center gap-1.5">
      <button
        onClick={() => onNavigate('/badges')}
        className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        title="Badges"
      >
        <Award className="w-4 h-4 text-yellow-500" />
      </button>
      <button
        onClick={() => onNavigate('/bookmarks')}
        className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        title="Bookmarks"
      >
        <BookOpen className="w-4 h-4 text-blue-500" />
      </button>
      <button
        onClick={() => onNavigate('/tests')}
        className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        title="Tests"
      >
        <Target className="w-4 h-4 text-green-500" />
      </button>
      <button
        onClick={() => onNavigate('/stats')}
        className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        title="Stats"
      >
        <Activity className="w-4 h-4 text-purple-500" />
      </button>
    </div>
  );
}

// Voice Interview CTA - Compact for sidebar
function VoiceInterviewCard({ onStart }: { onStart: () => void }) {
  const [, setLocation] = useLocation();
  
  return (
    <section className="mb-3">
      <div className="bg-gradient-to-r from-primary/20 via-primary/15 to-emerald-500/20 rounded-xl border border-primary/30 p-3">
        <button
          onClick={onStart}
          className="w-full flex items-center gap-3 hover:opacity-90 transition-all group"
        >
          {/* Animated mic icon */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-primary/30 animate-ping opacity-30" />
          </div>
          
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-sm">Voice Interview</h3>
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-bold rounded-full">
                EARN
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                <Coins className="w-3 h-3" />+5
              </span>
              <span className="flex items-center gap-0.5 text-green-400 font-semibold">
                +15 bonus
              </span>
            </div>
          </div>
          
          <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
        </button>
        
        {/* Session mode link */}
        <div className="mt-2 pt-2 border-t border-primary/20 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Focused practice?</span>
          <button
            onClick={() => setLocation('/voice-session')}
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            <Target className="w-2.5 h-2.5" />
            Micro Sessions
          </button>
        </div>
      </div>
    </section>
  );
}

// Training Mode CTA - Read and record answers
function TrainingModeCard({ onStart }: { onStart: () => void }) {
  return (
    <section className="mb-3">
      <div className="bg-gradient-to-r from-blue-500/20 via-blue-500/15 to-purple-500/20 rounded-xl border border-blue-500/30 p-3">
        <button
          onClick={onStart}
          className="w-full flex items-center gap-3 hover:opacity-90 transition-all group"
        >
          {/* Animated book icon */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-blue-500/30 animate-ping opacity-30" />
          </div>
          
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-sm">Training Mode</h3>
              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded-full">
                NEW
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Read answers & record yourself speaking
            </p>
          </div>
          
          <ArrowRight className="w-5 h-5 text-blue-500 flex-shrink-0" />
        </button>
        
        {/* Features */}
        <div className="mt-2 pt-2 border-t border-blue-500/20 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Eye className="w-3 h-3" />
              Full answers
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Volume2 className="w-3 h-3" />
              Live transcript
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Welcome Card for new users
function WelcomeCard({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="mb-3">
      <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl p-5 sm:p-8 border border-primary/20">
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
    <section className="mb-3">
      <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Popular Topics</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {popularTopics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic.id)}
            className="p-3 sm:p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors text-left flex items-center gap-3"
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
