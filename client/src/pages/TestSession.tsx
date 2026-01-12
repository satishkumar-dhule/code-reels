/**
 * Test Session Page - Quiz interface for knowledge assessment
 * Vibrant channel-based theming with pass expiration tracking
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Clock, CheckCircle, XCircle, Trophy,
  Share2, RotateCcw, Home, AlertCircle, Check, X, Zap, ExternalLink, Eye,
  Sparkles, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { QuestionFeedback } from '../components/QuestionFeedback';
import { QuestionHistoryIcon } from '../components/unified/QuestionHistory';
import { DesktopSidebarWrapper } from '../components/layout/DesktopSidebarWrapper';
import {
  Test, TestQuestion, getTestForChannel, getSessionQuestions,
  calculateScore, saveTestAttempt, TestAttempt, getTestProgress,
  generateShareableBadge, generateSocialShare, getChannelTheme, checkTestExpiration
} from '../lib/tests';
import { mascotEvents } from '../components/PixelMascot';

/**
 * Renders text with inline code (backticks) as styled code elements
 */
function renderWithInlineCode(text: string): React.ReactNode {
  if (!text) return null;
  
  // Split by backticks, alternating between text and code
  const parts = text.split(/`([^`]+)`/g);
  
  return parts.map((part, index) => {
    // Odd indices are code (content between backticks)
    if (index % 2 === 1) {
      return (
        <code 
          key={index}
          className="px-1.5 py-0.5 mx-0.5 bg-primary/15 text-primary rounded text-[0.9em] font-mono"
        >
          {part}
        </code>
      );
    }
    // Even indices are regular text
    return part;
  });
}

type SessionState = 'loading' | 'ready' | 'in-progress' | 'review' | 'completed';

// Auto-submit preference storage
const AUTO_SUBMIT_KEY = 'test-auto-submit';
function getAutoSubmitPref(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_SUBMIT_KEY);
    return stored === null ? true : stored === 'true'; // Default ON
  } catch {
    return true;
  }
}
function setAutoSubmitPref(value: boolean): void {
  localStorage.setItem(AUTO_SUBMIT_KEY, String(value));
}

export default function TestSession() {
  const { channelId } = useParams<{ channelId: string }>();
  const [_, setLocation] = useLocation();
  
  const [test, setTest] = useState<Test | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [startTime, setStartTime] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [result, setResult] = useState<{ score: number; correct: number; total: number; passed: boolean } | null>(null);
  const [autoSubmit, setAutoSubmit] = useState(getAutoSubmitPref);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  // Load test
  useEffect(() => {
    if (!channelId) return;
    
    getTestForChannel(channelId).then(t => {
      if (t) {
        setTest(t);
        setSessionState('ready');
      } else {
        setSessionState('loading');
      }
    });
  }, [channelId]);

  // Timer
  useEffect(() => {
    if (sessionState !== 'in-progress') return;
    
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionState, startTime]);

  const startTest = useCallback(() => {
    if (!test) return;
    // Select 15 random questions from the pool for each session
    const sessionQuestions = getSessionQuestions(test, 15);
    setQuestions(sessionQuestions);
    setAnswers({});
    setCurrentIndex(0);
    setStartTime(Date.now());
    setTimeSpent(0);
    setResult(null);
    setSessionState('in-progress');
  }, [test]);

  const currentQuestion = questions[currentIndex];
  const progress = getTestProgress(test?.id || '');
  const theme = test ? getChannelTheme(test.channelId) : getChannelTheme('default');
  const isExpired = test && progress ? checkTestExpiration(test, progress) : false;

  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) return;
    
    const current = answers[currentQuestion.id] || [];
    
    if (currentQuestion.type === 'single') {
      const newAnswers = { ...answers, [currentQuestion.id]: [optionId] };
      setAnswers(newAnswers);
      
      // Auto-submit for single choice if enabled
      if (autoSubmit) {
        // Check if answer is correct for feedback
        const correctOption = currentQuestion.options.find(o => o.isCorrect);
        const isCorrect = correctOption?.id === optionId;
        setShowFeedback(isCorrect ? 'correct' : 'incorrect');
        
        // Auto-advance after brief feedback
        setTimeout(() => {
          setShowFeedback(null);
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
        }, 600);
      }
    } else {
      // Multiple choice - toggle
      if (current.includes(optionId)) {
        setAnswers({ ...answers, [currentQuestion.id]: current.filter(id => id !== optionId) });
      } else {
        setAnswers({ ...answers, [currentQuestion.id]: [...current, optionId] });
      }
    }
  };

  const toggleAutoSubmit = () => {
    const newValue = !autoSubmit;
    setAutoSubmit(newValue);
    setAutoSubmitPref(newValue);
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Confirm answer for multiple choice questions (shows feedback then advances)
  const confirmMultipleChoice = () => {
    if (!currentQuestion || currentQuestion.type !== 'multiple') return;
    
    const userAnswers = answers[currentQuestion.id] || [];
    if (userAnswers.length === 0) return;
    
    // Check if all correct options are selected and no incorrect ones
    const correctIds = currentQuestion.options.filter(o => o.isCorrect).map(o => o.id);
    const allCorrectSelected = correctIds.every(id => userAnswers.includes(id));
    const noIncorrectSelected = userAnswers.every(id => correctIds.includes(id));
    const isCorrect = allCorrectSelected && noIncorrectSelected;
    
    setShowFeedback(isCorrect ? 'correct' : 'incorrect');
    
    // Auto-advance after brief feedback
    setTimeout(() => {
      setShowFeedback(null);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 800);
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const submitTest = () => {
    if (!test) return;
    
    const calcResult = calculateScore({ ...test, questions }, answers);
    setResult(calcResult);
    
    const attempt: TestAttempt = {
      testId: test.id,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      answers,
      score: calcResult.score,
      passed: calcResult.passed,
      timeSpent,
    };
    
    // Pass test version for expiration tracking
    saveTestAttempt(test.id, test.channelId, attempt, test.version);
    setSessionState('review'); // Go to review first
    
    // Trigger mascot reaction based on result
    if (calcResult.passed) {
      mascotEvents.celebrate();
    } else {
      mascotEvents.disappointed();
    }
  };

  // Get question results for review
  const getQuestionResults = () => {
    return questions.map(q => {
      const userAnswers = answers[q.id] || [];
      const correctOptions = q.options.filter(o => o.isCorrect);
      const correctIds = correctOptions.map(o => o.id);
      
      let isCorrect = false;
      if (q.type === 'single') {
        isCorrect = userAnswers.length === 1 && correctIds.includes(userAnswers[0]);
      } else {
        const allCorrectSelected = correctIds.every(id => userAnswers.includes(id));
        const noIncorrectSelected = userAnswers.every(id => correctIds.includes(id));
        isCorrect = allCorrectSelected && noIncorrectSelected && userAnswers.length > 0;
      }
      
      return {
        question: q,
        userAnswers,
        correctOptions,
        isCorrect
      };
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;

  if (sessionState === 'loading' || !test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">
            {!test ? 'No test available for this channel yet' : 'Loading test...'}
          </p>
          <button
            onClick={() => setLocation('/')}
            className="mt-4 text-primary hover:underline text-sm"
          >
            Go back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${test.title} | Code Reels`}
        description={test.description}
        canonical={`https://open-interview.github.io/test/${channelId}`}
      />

      <DesktopSidebarWrapper>
      <div className="min-h-screen bg-background text-foreground font-mono w-full overflow-x-hidden">
        {/* Ready State - Vibrant Channel Theme */}
        {sessionState === 'ready' && (
          <div className="min-h-screen flex items-center justify-center p-4 w-full overflow-x-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`max-w-md w-full border bg-card rounded-lg p-6 relative overflow-hidden ${
                isExpired ? 'border-amber-500/50' : 'border-border'
              }`}
            >
              {/* Vibrant gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-30`} />
              
              <div className="relative z-10">
                {/* Expired banner */}
                {isExpired && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center gap-2"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-500">Pass Expired!</p>
                      <p className="text-xs text-muted-foreground">New questions added - retake to recertify</p>
                    </div>
                  </motion.div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-16 h-16 rounded-xl ${theme.secondary} flex items-center justify-center mx-auto mb-4 shadow-lg ${theme.glow}`}>
                    <span className="text-3xl">{theme.icon}</span>
                  </div>
                  <h1 className={`text-xl font-bold mb-2 ${theme.primary}`}>{test.title}</h1>
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                  {test.version > 1 && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                      <Sparkles className="w-3 h-3" /> v{test.version} - Updated
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-6 text-sm">
                  <div className={`flex justify-between p-2 rounded ${theme.secondary}`}>
                    <span className="text-muted-foreground">Questions</span>
                    <span className="font-bold">15 (random from {test.questions.length})</span>
                  </div>
                  <div className={`flex justify-between p-2 rounded ${theme.secondary}`}>
                    <span className="text-muted-foreground">Passing Score</span>
                    <span className="font-bold">{test.passingScore}%</span>
                  </div>
                  <div className={`flex justify-between p-2 rounded ${theme.secondary}`}>
                    <span className="text-muted-foreground">Question Types</span>
                    <span className="font-bold">Single & Multiple Choice</span>
                  </div>
                  {progress && !isExpired && (
                    <div className="flex justify-between p-2 bg-green-500/10 rounded border border-green-500/30">
                      <span className="text-muted-foreground">Your Best</span>
                      <span className="font-bold text-green-500">{progress.bestScore}%</span>
                    </div>
                  )}
                  {progress && isExpired && (
                    <div className="flex justify-between p-2 bg-amber-500/10 rounded border border-amber-500/30">
                      <span className="text-muted-foreground">Previous Best</span>
                      <span className="font-bold text-amber-500">{progress.bestScore}% (expired)</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={startTest}
                    className={`w-full py-3 ${theme.badge} text-white font-bold rounded hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg ${theme.glow}`}
                  >
                    {isExpired ? (
                      <>
                        <RefreshCw className="w-5 h-5" /> Retake Test
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" /> Start Test
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setLocation(`/channel/${channelId}`)}
                    className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    Back to Channel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* In Progress State */}
        {sessionState === 'in-progress' && currentQuestion && (
          <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
            {/* Header */}
            <header className="border-b border-border p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} / {questions.length}
                </span>
                <div className="h-1 w-24 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Auto-submit toggle */}
              <button
                onClick={toggleAutoSubmit}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
                  autoSubmit 
                    ? 'bg-primary/20 text-primary border border-primary/30' 
                    : 'bg-muted/30 text-muted-foreground border border-transparent'
                }`}
                title={autoSubmit ? 'Auto-advance ON' : 'Auto-advance OFF'}
              >
                <Zap className={`w-3 h-3 ${autoSubmit ? 'text-primary' : ''}`} />
                <span className="hidden sm:inline">Auto</span>
              </button>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono">{formatTime(timeSpent)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {answeredCount}/{questions.length} answered
              </span>
            </header>

            {/* Question */}
            <div className="flex-1 p-4 overflow-y-auto w-full overflow-x-hidden">
              <div className="max-w-2xl mx-auto w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {/* Question type badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 text-[10px] uppercase rounded ${
                        currentQuestion.type === 'multiple' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {currentQuestion.type === 'multiple' ? 'Select all that apply' : 'Single choice'}
                      </span>
                      {currentQuestion.type === 'multiple' && (
                        <span className="text-[10px] text-muted-foreground">
                          ({(answers[currentQuestion.id] || []).length} selected)
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] uppercase rounded ${
                        currentQuestion.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                        currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {currentQuestion.difficulty}
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
                    <h2 className="text-lg font-bold mb-6">{renderWithInlineCode(currentQuestion.question)}</h2>

                    {/* Options */}
                    <div className="space-y-2">
                      {currentQuestion.options.map((option, i) => {
                        const isSelected = (answers[currentQuestion.id] || []).includes(option.id);
                        const showCorrect = showFeedback && option.isCorrect;
                        const showWrong = showFeedback === 'incorrect' && isSelected && !option.isCorrect;
                        const isMultiple = currentQuestion.type === 'multiple';
                        
                        return (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(option.id)}
                            disabled={showFeedback !== null}
                            className={`w-full p-4 text-left border rounded-lg transition-all ${
                              showCorrect
                                ? 'border-green-500 bg-green-500/20'
                                : showWrong
                                ? 'border-red-500 bg-red-500/20'
                                : isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            } ${showFeedback ? 'cursor-default' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 ${isMultiple ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center flex-shrink-0 ${
                                showCorrect
                                  ? 'border-green-500 bg-green-500'
                                  : showWrong
                                  ? 'border-red-500 bg-red-500'
                                  : isSelected 
                                  ? 'border-primary bg-primary' 
                                  : 'border-muted-foreground/30'
                              }`}>
                                {showCorrect && <Check className="w-4 h-4 text-white" />}
                                {showWrong && <X className="w-4 h-4 text-white" />}
                                {!showFeedback && isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                              </div>
                              <span className="text-sm">{renderWithInlineCode(option.text)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Helper text for multiple choice */}
                    {currentQuestion.type === 'multiple' && !showFeedback && (
                      <p className="mt-3 text-xs text-muted-foreground text-center">
                        Select all correct answers, then click "Confirm" to continue
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation */}
            <footer className="border-t border-border p-3 w-full overflow-x-hidden">
              <div className="max-w-2xl mx-auto flex items-center justify-between w-full">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-4 py-2 text-sm disabled:opacity-30 hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>

                {/* Question dots */}
                <div className="flex gap-1 flex-wrap justify-center max-w-xs">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentIndex
                          ? 'bg-primary'
                          : answers[q.id]
                          ? 'bg-primary/50'
                          : 'bg-muted/30'
                      }`}
                    />
                  ))}
                </div>

                {currentIndex === questions.length - 1 ? (
                  currentQuestion?.type === 'multiple' ? (
                    <button
                      onClick={() => {
                        // For last multiple choice question, show feedback then submit
                        const userAnswers = answers[currentQuestion.id] || [];
                        if (userAnswers.length === 0) return;
                        
                        const correctIds = currentQuestion.options.filter(o => o.isCorrect).map(o => o.id);
                        const allCorrectSelected = correctIds.every(id => userAnswers.includes(id));
                        const noIncorrectSelected = userAnswers.every(id => correctIds.includes(id));
                        const isCorrect = allCorrectSelected && noIncorrectSelected;
                        
                        setShowFeedback(isCorrect ? 'correct' : 'incorrect');
                        setTimeout(() => {
                          setShowFeedback(null);
                          submitTest();
                        }, 800);
                      }}
                      disabled={(answers[currentQuestion.id] || []).length === 0 || showFeedback !== null}
                      className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Confirm & Submit
                    </button>
                  ) : (
                    <button
                      onClick={submitTest}
                      className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded hover:bg-primary/90 transition-colors"
                    >
                      Submit Test
                    </button>
                  )
                ) : currentQuestion?.type === 'multiple' ? (
                  <button
                    onClick={confirmMultipleChoice}
                    disabled={(answers[currentQuestion.id] || []).length === 0 || showFeedback !== null}
                    className="flex items-center gap-1 px-4 py-2 text-sm bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Confirm <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={goNext}
                    className="flex items-center gap-1 px-4 py-2 text-sm hover:text-primary transition-colors"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </footer>
          </div>
        )}

        {/* Review State - Magical Collapsible Answer Review */}
        {sessionState === 'review' && result && (
          <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20 w-full overflow-x-hidden">
            {/* Vibrant Header with Score Summary */}
            <header className={`border-b p-4 relative overflow-hidden ${
              result.passed ? 'border-green-500/30' : 'border-orange-500/30'
            }`}>
              {/* Animated gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-r ${
                result.passed 
                  ? 'from-green-500/10 via-emerald-500/5 to-teal-500/10' 
                  : 'from-orange-500/10 via-amber-500/5 to-yellow-500/10'
              }`} />
              
              <div className="relative z-10 max-w-3xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                        result.passed 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30' 
                          : 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/30'
                      }`}
                    >
                      <Eye className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h1 className="font-bold text-lg">Review Answers</h1>
                      <p className="text-xs text-muted-foreground">
                        Tap any question to expand details
                      </p>
                    </div>
                  </div>
                  
                  {/* Score Badge */}
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
                      result.passed 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : 'bg-orange-500/20 border border-orange-500/30'
                    }`}
                  >
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${result.passed ? 'text-green-500' : 'text-orange-500'}`}>
                        {result.score}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {result.correct}/{result.total} correct
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Filter Tabs & Quick Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                  <div className="flex bg-muted/30 rounded-lg p-1 gap-1">
                    {(['all', 'incorrect', 'correct'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setReviewFilter(filter)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          reviewFilter === filter
                            ? filter === 'correct' 
                              ? 'bg-green-500 text-white shadow-sm'
                              : filter === 'incorrect'
                              ? 'bg-red-500 text-white shadow-sm'
                              : 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {filter === 'all' ? `All (${result.total})` : 
                         filter === 'correct' ? `✓ ${result.correct}` : 
                         `✗ ${result.total - result.correct}`}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex-1" />
                  
                  <button
                    onClick={() => {
                      const questionResults = getQuestionResults();
                      const allIndices = questionResults
                        .map((_, i) => i)
                        .filter(i => {
                          const item = questionResults[i];
                          if (reviewFilter === 'correct') return item.isCorrect;
                          if (reviewFilter === 'incorrect') return !item.isCorrect;
                          return true;
                        });
                      if (expandedQuestions.size === allIndices.length) {
                        setExpandedQuestions(new Set());
                      } else {
                        setExpandedQuestions(new Set(allIndices));
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-all hover:bg-muted/30"
                  >
                    {expandedQuestions.size > 0 ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>
              </div>
            </header>

            {/* Questions Review - Collapsible Cards */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-3xl mx-auto space-y-2">
                {getQuestionResults()
                  .map((item, idx) => ({ item, idx }))
                  .filter(({ item }) => {
                    if (reviewFilter === 'correct') return item.isCorrect;
                    if (reviewFilter === 'incorrect') return !item.isCorrect;
                    return true;
                  })
                  .map(({ item, idx }) => {
                    const isExpanded = expandedQuestions.has(idx);
                    
                    return (
                      <motion.div
                        key={item.question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`rounded-xl overflow-hidden border transition-all duration-300 ${
                          item.isCorrect 
                            ? 'border-green-500/30 hover:border-green-500/50' 
                            : 'border-red-500/30 hover:border-red-500/50'
                        } ${isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
                      >
                        {/* Collapsed Header - Always Visible */}
                        <button
                          onClick={() => {
                            setExpandedQuestions(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(idx)) {
                                newSet.delete(idx);
                              } else {
                                newSet.add(idx);
                              }
                              return newSet;
                            });
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${
                            item.isCorrect 
                              ? 'bg-gradient-to-r from-green-500/10 to-transparent hover:from-green-500/20' 
                              : 'bg-gradient-to-r from-red-500/10 to-transparent hover:from-red-500/20'
                          }`}
                        >
                          {/* Status Icon */}
                          <motion.div 
                            animate={{ 
                              scale: isExpanded ? 1.1 : 1,
                              rotate: isExpanded ? 360 : 0 
                            }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              item.isCorrect 
                                ? 'bg-green-500 shadow-lg shadow-green-500/30' 
                                : 'bg-red-500 shadow-lg shadow-red-500/30'
                            }`}
                          >
                            {item.isCorrect ? (
                              <Check className="w-5 h-5 text-white" />
                            ) : (
                              <X className="w-5 h-5 text-white" />
                            )}
                          </motion.div>
                          
                          {/* Question Preview */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-sm font-bold ${item.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                                Q{idx + 1}
                              </span>
                              <span className={`px-1.5 py-0.5 text-[9px] uppercase rounded-full font-medium ${
                                item.question.difficulty === 'beginner' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : item.question.difficulty === 'intermediate' 
                                  ? 'bg-yellow-500/20 text-yellow-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {item.question.difficulty}
                              </span>
                            </div>
                            <p className={`text-sm truncate ${isExpanded ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {item.question.question}
                            </p>
                          </div>

                          {/* Expand Indicator */}
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isExpanded ? 'bg-primary/20' : 'bg-muted/30'
                            }`}
                          >
                            <ChevronDown className={`w-5 h-5 ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`} />
                          </motion.div>
                        </button>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 bg-card border-t border-border/50">
                                {/* Full Question */}
                                <p className="font-medium mb-4 leading-relaxed">{renderWithInlineCode(item.question.question)}</p>

                                {/* Options */}
                                <div className="space-y-2">
                                  {item.question.options.map((opt, optIdx) => {
                                    const wasSelected = item.userAnswers.includes(opt.id);
                                    const isCorrectOption = opt.isCorrect;
                                    
                                    return (
                                      <motion.div
                                        key={opt.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: optIdx * 0.05 }}
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                          isCorrectOption
                                            ? 'bg-green-500/10 border-green-500/40'
                                            : wasSelected
                                            ? 'bg-red-500/10 border-red-500/40'
                                            : 'bg-muted/10 border-border/50'
                                        }`}
                                      >
                                        {/* Option indicator */}
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                          isCorrectOption
                                            ? 'bg-green-500 text-white'
                                            : wasSelected
                                            ? 'bg-red-500 text-white'
                                            : 'bg-muted/50 text-muted-foreground'
                                        }`}>
                                          {isCorrectOption ? (
                                            <CheckCircle className="w-4 h-4" />
                                          ) : wasSelected ? (
                                            <XCircle className="w-4 h-4" />
                                          ) : (
                                            <span className="text-xs font-medium">{String.fromCharCode(65 + optIdx)}</span>
                                          )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                          <span className={`text-sm ${
                                            isCorrectOption 
                                              ? 'text-green-400 font-medium' 
                                              : wasSelected 
                                              ? 'text-red-400' 
                                              : 'text-muted-foreground'
                                          }`}>
                                            {renderWithInlineCode(opt.text)}
                                          </span>
                                        </div>

                                        {/* Labels */}
                                        <div className="flex gap-1 flex-shrink-0">
                                          {isCorrectOption && (
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] uppercase rounded-full font-medium">
                                              ✓ Correct
                                            </span>
                                          )}
                                          {wasSelected && !isCorrectOption && (
                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[9px] uppercase rounded-full font-medium">
                                              Your Pick
                                            </span>
                                          )}
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>

                                {/* Explanation */}
                                {item.question.explanation && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className={`mt-4 p-3 rounded-lg border ${
                                      item.isCorrect 
                                        ? 'bg-blue-500/10 border-blue-500/30' 
                                        : 'bg-amber-500/10 border-amber-500/30'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                                        item.isCorrect ? 'text-blue-400' : 'text-amber-400'
                                      }`} />
                                      <div>
                                        <span className={`text-xs font-bold uppercase ${
                                          item.isCorrect ? 'text-blue-400' : 'text-amber-400'
                                        }`}>
                                          {item.isCorrect ? '💡 Why this is correct' : '📚 Learn from this'}
                                        </span>
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {item.question.explanation}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}

                                {/* Action Links */}
                                {item.question.questionId && (
                                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                                    <a
                                      href={`/channel/${test.channelId}?q=${item.question.questionId}`}
                                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>Study full question</span>
                                    </a>
                                    <QuestionFeedback questionId={item.question.questionId} />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                
                {/* Empty State for Filters */}
                {getQuestionResults().filter(item => {
                  if (reviewFilter === 'correct') return item.isCorrect;
                  if (reviewFilter === 'incorrect') return !item.isCorrect;
                  return true;
                }).length === 0 && (
                  <div className="text-center py-12">
                    <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                      reviewFilter === 'correct' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {reviewFilter === 'correct' ? (
                        <Trophy className="w-8 h-8 text-green-500" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {reviewFilter === 'correct' 
                        ? 'No correct answers to show' 
                        : 'No incorrect answers - Perfect score! 🎉'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <footer className={`border-t p-4 bg-background/95 backdrop-blur ${
              result.passed ? 'border-green-500/30' : 'border-orange-500/30'
            }`}>
              <div className="max-w-3xl mx-auto flex gap-3">
                <button
                  onClick={startTest}
                  className="flex-1 py-3 border border-border rounded-xl font-medium hover:bg-muted/50 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
                <button
                  onClick={() => setSessionState('completed')}
                  className={`flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${
                    result.passed 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/30 hover:shadow-green-500/50' 
                      : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-orange-500/30 hover:shadow-orange-500/50'
                  }`}
                >
                  <Trophy className="w-4 h-4" /> View Results
                </button>
              </div>
            </footer>
          </div>
        )}

        {/* Completed State - Vibrant Results */}
        {sessionState === 'completed' && result && (
          <div className="min-h-screen flex items-center justify-center p-4 w-full overflow-x-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full border border-border bg-card rounded-lg p-6 relative overflow-hidden"
            >
              {/* Vibrant gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${
                result.passed 
                  ? 'from-green-500/20 via-emerald-500/10 to-teal-500/20' 
                  : 'from-orange-500/20 via-amber-500/10 to-yellow-500/20'
              } opacity-50`} />
              
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className={`w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
                      result.passed 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30' 
                        : 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/30'
                    }`}
                  >
                    {result.passed ? (
                      <Trophy className="w-10 h-10 text-white" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-white" />
                    )}
                  </motion.div>
                  <h1 className="text-2xl font-bold mb-1">
                    {result.passed ? '🎉 Congratulations!' : 'Keep Practicing!'}
                  </h1>
                  <p className="text-muted-foreground">
                    {result.passed 
                      ? 'You passed the test!' 
                      : `You need ${test.passingScore}% to pass`}
                  </p>
                </div>

                {/* Score display - Vibrant ring */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64" cy="64" r="56"
                      fill="none" stroke="currentColor" strokeWidth="8"
                      className="text-muted/20"
                    />
                    <motion.circle
                      cx="64" cy="64" r="56"
                      fill="none"
                      stroke={result.passed ? '#22c55e' : '#f97316'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 352' }}
                      animate={{ strokeDasharray: `${(result.score / 100) * 352} 352` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className={`text-3xl font-bold ${result.passed ? 'text-green-500' : 'text-orange-500'}`}
                    >
                      {result.score}%
                    </motion.span>
                    <span className="text-xs text-muted-foreground">
                      {result.correct}/{result.total}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-6 text-sm">
                  <div className={`flex justify-between p-2 rounded ${theme.secondary}`}>
                    <span className="text-muted-foreground">Time Spent</span>
                    <span className="font-bold">{formatTime(timeSpent)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-500/10 rounded">
                    <span className="text-muted-foreground">Correct Answers</span>
                    <span className="font-bold text-green-500">{result.correct}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-red-500/10 rounded">
                    <span className="text-muted-foreground">Incorrect</span>
                    <span className="font-bold text-red-500">{result.total - result.correct}</span>
                  </div>
                </div>

                {/* Share buttons */}
                <div className="flex gap-2 mb-4">
                  <a
                    href={generateShareableBadge(test.channelName, result.score, result.passed)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 py-2 border rounded text-center text-sm hover:opacity-80 transition-all flex items-center justify-center gap-1 ${
                      result.passed ? 'border-green-500/30 text-green-500' : 'border-border'
                    }`}
                  >
                    <Share2 className="w-4 h-4" /> Share on X
                  </a>
                  <a
                    href={generateSocialShare(test.channelName, result.score, result.passed)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 py-2 border rounded text-center text-sm hover:opacity-80 transition-all flex items-center justify-center gap-1 ${
                      result.passed ? 'border-green-500/30 text-green-500' : 'border-border'
                    }`}
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </a>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setSessionState('review')}
                    className={`w-full py-2 font-bold rounded transition-all flex items-center justify-center gap-2 ${
                      result.passed 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <Eye className="w-4 h-4" /> Review Answers
                  </button>
                  <button
                    onClick={startTest}
                    className={`w-full py-2 border font-bold rounded transition-all flex items-center justify-center gap-2 ${
                      result.passed 
                        ? 'border-green-500 text-green-500 hover:bg-green-500/10' 
                        : 'border-primary text-primary hover:bg-primary/10'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </button>
                  <button
                    onClick={() => setLocation(`/channel/${channelId}`)}
                    className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" /> Back to Channel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      </DesktopSidebarWrapper>
    </>
  );
}
