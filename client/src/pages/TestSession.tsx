/**
 * Test Session Page - Quiz interface for knowledge assessment
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Clock, CheckCircle, XCircle, Trophy,
  Share2, RotateCcw, Home, AlertCircle, Check, X, Zap, ExternalLink, Eye
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import {
  Test, TestQuestion, getTestForChannel, getSessionQuestions,
  calculateScore, saveTestAttempt, TestAttempt, getTestProgress,
  generateShareableBadge, generateSocialShare
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
    
    saveTestAttempt(test.id, test.channelId, attempt);
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

      <div className="min-h-screen bg-background text-foreground font-mono">
        {/* Ready State */}
        {sessionState === 'ready' && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full border border-border bg-card rounded-lg p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-xl font-bold mb-2">{test.title}</h1>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </div>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">Questions</span>
                  <span className="font-bold">15 (random from {test.questions.length})</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">Passing Score</span>
                  <span className="font-bold">{test.passingScore}%</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">Question Types</span>
                  <span className="font-bold">Single & Multiple Choice</span>
                </div>
                {progress && (
                  <div className="flex justify-between p-2 bg-primary/10 rounded">
                    <span className="text-muted-foreground">Your Best</span>
                    <span className="font-bold text-primary">{progress.bestScore}%</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={startTest}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90 transition-colors"
                >
                  Start Test
                </button>
                <button
                  onClick={() => setLocation(`/channel/${channelId}`)}
                  className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  Back to Channel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* In Progress State */}
        {sessionState === 'in-progress' && currentQuestion && (
          <div className="min-h-screen flex flex-col">
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
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="max-w-2xl mx-auto">
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
                      <span className={`px-2 py-0.5 text-[10px] uppercase rounded ${
                        currentQuestion.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                        currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {currentQuestion.difficulty}
                      </span>
                    </div>

                    {/* Question text */}
                    <h2 className="text-lg font-bold mb-6">{renderWithInlineCode(currentQuestion.question)}</h2>

                    {/* Options */}
                    <div className="space-y-2">
                      {currentQuestion.options.map((option, i) => {
                        const isSelected = (answers[currentQuestion.id] || []).includes(option.id);
                        const showCorrect = showFeedback && option.isCorrect;
                        const showWrong = showFeedback === 'incorrect' && isSelected && !option.isCorrect;
                        
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
                              <div className={`w-6 h-6 rounded-${currentQuestion.type === 'multiple' ? 'md' : 'full'} border-2 flex items-center justify-center flex-shrink-0 ${
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
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation */}
            <footer className="border-t border-border p-3">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
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
                  <button
                    onClick={submitTest}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded hover:bg-primary/90 transition-colors"
                  >
                    Submit Test
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

        {/* Review State - Show all questions with correct/incorrect */}
        {sessionState === 'review' && result && (
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-primary" />
                <h1 className="font-bold">Review Answers</h1>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                result.passed ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'
              }`}>
                {result.score}% ({result.correct}/{result.total})
              </div>
            </header>

            {/* Questions Review */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto space-y-4">
                {getQuestionResults().map((item, idx) => (
                  <motion.div
                    key={item.question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 border rounded-lg ${
                      item.isCorrect 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    {/* Question header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {item.isCorrect ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <X className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">Q{idx + 1}</span>
                          <span className={`px-1.5 py-0.5 text-[9px] uppercase rounded ${
                            item.question.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                            item.question.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {item.question.difficulty}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{renderWithInlineCode(item.question.question)}</p>
                      </div>
                    </div>

                    {/* Options review */}
                    <div className="space-y-1.5 ml-9 mb-3">
                      {item.question.options.map(opt => {
                        const wasSelected = item.userAnswers.includes(opt.id);
                        const isCorrectOption = opt.isCorrect;
                        
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${
                              isCorrectOption
                                ? 'bg-green-500/20 text-green-400'
                                : wasSelected
                                ? 'bg-red-500/20 text-red-400'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {isCorrectOption && <CheckCircle className="w-3 h-3" />}
                            {wasSelected && !isCorrectOption && <XCircle className="w-3 h-3" />}
                            {!isCorrectOption && !wasSelected && <span className="w-3" />}
                            <span>{renderWithInlineCode(opt.text)}</span>
                            {wasSelected && <span className="ml-auto text-[10px] opacity-70">(your answer)</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation if wrong */}
                    {!item.isCorrect && item.question.explanation && (
                      <div className="ml-9 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Explanation:</span> {item.question.explanation}
                      </div>
                    )}

                    {/* Link to main question */}
                    {item.question.questionId && (
                      <div className="ml-9 mt-2">
                        <a
                          href={`/channel/${test.channelId}?q=${item.question.questionId}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View full question & answer
                        </a>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-border p-4">
              <div className="max-w-2xl mx-auto flex gap-3">
                <button
                  onClick={() => setSessionState('completed')}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Continue to Results
                </button>
              </div>
            </footer>
          </div>
        )}

        {/* Completed State */}
        {sessionState === 'completed' && result && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full border border-border bg-card rounded-lg p-6"
            >
              <div className="text-center mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  result.passed ? 'bg-green-500/20' : 'bg-orange-500/20'
                }`}>
                  {result.passed ? (
                    <Trophy className="w-10 h-10 text-green-500" />
                  ) : (
                    <AlertCircle className="w-10 h-10 text-orange-500" />
                  )}
                </div>
                <h1 className="text-2xl font-bold mb-1">
                  {result.passed ? 'Congratulations!' : 'Keep Practicing!'}
                </h1>
                <p className="text-muted-foreground">
                  {result.passed 
                    ? 'You passed the test!' 
                    : `You need ${test.passingScore}% to pass`}
                </p>
              </div>

              {/* Score display */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none" stroke="currentColor" strokeWidth="8"
                    className="text-muted/20"
                  />
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke={result.passed ? '#22c55e' : '#f97316'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.score / 100) * 352} 352`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{result.score}%</span>
                  <span className="text-xs text-muted-foreground">
                    {result.correct}/{result.total}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">Time Spent</span>
                  <span className="font-bold">{formatTime(timeSpent)}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
                  <span className="text-muted-foreground">Correct Answers</span>
                  <span className="font-bold text-green-500">{result.correct}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/20 rounded">
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
                  className="flex-1 py-2 border border-border rounded text-center text-sm hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                >
                  <Share2 className="w-4 h-4" /> Share on X
                </a>
                <a
                  href={generateSocialShare(test.channelName, result.score, result.passed)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 border border-border rounded text-center text-sm hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                >
                  <Share2 className="w-4 h-4" /> Share
                </a>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setSessionState('review')}
                  className="w-full py-2 bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Review Answers
                </button>
                <button
                  onClick={startTest}
                  className="w-full py-2 border border-primary text-primary font-bold rounded hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
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
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
