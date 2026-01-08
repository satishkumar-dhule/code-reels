/**
 * Certification Practice Page
 * Practice questions for a specific certification track
 * Includes embedded mini-tests that must be passed to proceed
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getCertificationById, 
  getPrerequisiteCertifications,
} from '../lib/certifications-config';
import { useCredits } from '../context/CreditsContext';
import { SEOHead } from '../components/SEOHead';
import { QuestionPanel } from '../components/QuestionPanel';
import { AnswerPanel } from '../components/AnswerPanel';
import { trackQuestionView } from '../hooks/use-analytics';
import { useToast } from '../hooks/use-toast';
import { useSwipe } from '../hooks/use-swipe';
import { ChannelService } from '../services/api.service';
import { loadTests, getSessionQuestions, TestQuestion, Test } from '../lib/tests';
import { generateProgressiveSequence } from '../lib/progressive-quiz';
import { spendCredits } from '../lib/credits';
import type { Question } from '../types';
import {
  ChevronLeft, ChevronRight, Award, ExternalLink,
  Check, ArrowLeft, Info, X, AlertTriangle, Coins, Zap,
  SkipForward, Lock, Unlock, CheckCircle, XCircle, RefreshCw,
  ChevronDown, ChevronUp, Lightbulb
} from 'lucide-react';

const SKIP_TEST_PENALTY = 50;
const QUESTIONS_PER_TEST = 5;
const TEST_QUESTIONS_COUNT = 3;
const FEEDBACK_DELAY = 800; // ms before auto-advance

interface TestAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  correctOptionId: string;
}

export default function CertificationPractice() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute('/certification/:id/:questionIndex?');
  const certificationId = params?.id;

  const certification = certificationId ? getCertificationById(certificationId) : null;
  const prerequisites = certification ? getPrerequisiteCertifications(certification.id) : [];

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [mobileView, setMobileView] = useState<'question' | 'answer'>('question');
  const [showInfo, setShowInfo] = useState(false);
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());

  // Test state
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [showTest, setShowTest] = useState(false);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<TestAnswer[]>([]);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<TestAnswer | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [passedCheckpoints, setPassedCheckpoints] = useState<Set<number>>(new Set());
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  const { toast } = useToast();
  const { onQuestionSwipe, onQuestionView, balance, formatCredits, refreshBalance } = useCredits();

  const progressKey = `cert-progress-${certificationId}`;
  const checkpointsKey = `cert-checkpoints-${certificationId}`;
  
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(progressKey);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(checkpointsKey);
      if (saved) setPassedCheckpoints(new Set(JSON.parse(saved)));
    } catch {}
  }, [checkpointsKey]);

  useEffect(() => {
    if (certificationId) {
      localStorage.setItem(progressKey, JSON.stringify(Array.from(completedIds)));
    }
  }, [completedIds, certificationId, progressKey]);

  useEffect(() => {
    if (certificationId) {
      localStorage.setItem(checkpointsKey, JSON.stringify(Array.from(passedCheckpoints)));
    }
  }, [passedCheckpoints, certificationId, checkpointsKey]);

  // Fetch questions and tests
  useEffect(() => {
    if (!certification) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const allQuestions: Question[] = [];
        const channelIds: string[] = [];
        
        for (const mapping of certification.channelMappings) {
          try {
            const data = await ChannelService.getData(mapping.channelId);
            let channelQuestions = data.questions;
            channelIds.push(mapping.channelId);
            
            if (mapping.subChannels && mapping.subChannels.length > 0) {
              channelQuestions = channelQuestions.filter((q: Question) => 
                mapping.subChannels!.includes(q.subChannel)
              );
            }
            
            const count = Math.ceil(channelQuestions.length * (mapping.weight / 100));
            allQuestions.push(...channelQuestions.slice(0, count));
          } catch {}
        }

        const allTests = await loadTests();
        setAvailableTests(allTests.filter(t => channelIds.includes(t.channelId)));

        const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.id, q])).values());
        const seed = sessionStorage.getItem(`cert-seed-${certificationId}`) || Date.now().toString();
        sessionStorage.setItem(`cert-seed-${certificationId}`, seed);
        
        // Use progressive RAG-based selection instead of random shuffle
        const progressiveQuestions = generateProgressiveSequence(uniqueQuestions, uniqueQuestions.length);
        setQuestions(progressiveQuestions);
      } catch (err) {
        setError('Failed to load certification questions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [certification, certificationId]);

  const filteredQuestions = useMemo(() => {
    if (selectedDifficulty === 'all') return questions;
    return questions.filter(q => q.difficulty === selectedDifficulty);
  }, [questions, selectedDifficulty]);

  const currentQuestion = filteredQuestions[currentIndex];
  const totalQuestions = filteredQuestions.length;

  const isTestCheckpoint = useCallback((index: number) => index > 0 && index % QUESTIONS_PER_TEST === 0, []);
  const isCheckpointPassed = useCallback((index: number) => passedCheckpoints.has(index), [passedCheckpoints]);

  const getTestForCheckpoint = useCallback(() => {
    if (availableTests.length === 0) return [];
    const randomTest = availableTests[Math.floor(Math.random() * availableTests.length)];
    return getSessionQuestions(randomTest, TEST_QUESTIONS_COUNT);
  }, [availableTests]);

  const startTest = useCallback(() => {
    const qs = getTestForCheckpoint();
    if (qs.length > 0) {
      setTestQuestions(qs);
      setCurrentTestIndex(0);
      setTestAnswers([]);
      setShowingFeedback(false);
      setLastAnswer(null);
      setShowResults(false);
      setExpandedResults(new Set());
      setShowTest(true);
    } else {
      setPassedCheckpoints(prev => new Set(Array.from(prev).concat(currentIndex)));
      toast({ title: 'Checkpoint passed!' });
    }
  }, [getTestForCheckpoint, currentIndex, toast]);

  // ONE-CLICK: Select answer = submit immediately, show feedback, auto-advance
  const handleAnswerClick = useCallback((optionId: string) => {
    if (showingFeedback) return;
    
    const currentQ = testQuestions[currentTestIndex];
    const correctOption = currentQ.options.find(o => o.isCorrect);
    const isCorrect = optionId === correctOption?.id;
    
    const answer: TestAnswer = {
      questionId: currentQ.id,
      selectedOptionId: optionId,
      isCorrect,
      correctOptionId: correctOption?.id || ''
    };
    
    setTestAnswers(prev => [...prev, answer]);
    setLastAnswer(answer);
    setShowingFeedback(true);
    
    // Auto-advance after brief feedback
    setTimeout(() => {
      setShowingFeedback(false);
      setLastAnswer(null);
      
      if (currentTestIndex < testQuestions.length - 1) {
        setCurrentTestIndex(prev => prev + 1);
      } else {
        setShowResults(true);
      }
    }, FEEDBACK_DELAY);
  }, [showingFeedback, testQuestions, currentTestIndex]);

  const testResults = useMemo(() => {
    const correct = testAnswers.filter(a => a.isCorrect).length;
    return { correct, total: testQuestions.length, passed: correct === testQuestions.length };
  }, [testAnswers, testQuestions.length]);

  const retryTest = useCallback(() => {
    const qs = getTestForCheckpoint();
    setTestQuestions(qs);
    setCurrentTestIndex(0);
    setTestAnswers([]);
    setShowingFeedback(false);
    setLastAnswer(null);
    setShowResults(false);
    setExpandedResults(new Set());
  }, [getTestForCheckpoint]);

  const skipTestWithPenalty = useCallback(() => {
    const result = spendCredits(SKIP_TEST_PENALTY, `Skipped checkpoint test`);
    if (result.success) {
      setPassedCheckpoints(prev => new Set(Array.from(prev).concat(currentIndex)));
      setShowTest(false);
      setShowSkipConfirm(false);
      refreshBalance();
      toast({ title: 'Test Skipped', description: `-${SKIP_TEST_PENALTY} credits` });
    } else {
      toast({ title: 'Insufficient Credits', description: `Need ${SKIP_TEST_PENALTY} credits` });
    }
  }, [currentIndex, refreshBalance, toast]);

  const closeTestAndContinue = useCallback(() => {
    if (testResults.passed) {
      setPassedCheckpoints(prev => new Set(Array.from(prev).concat(currentIndex)));
    }
    setShowTest(false);
  }, [testResults.passed, currentIndex]);

  const toggleResultExpand = (index: number) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  };

  // Navigation
  const goToNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      const nextIndex = currentIndex + 1;
      if (isTestCheckpoint(nextIndex) && !isCheckpointPassed(nextIndex)) {
        setCurrentIndex(nextIndex);
        startTest();
        return;
      }
      setCurrentIndex(nextIndex);
      setMobileView('question');
      onQuestionSwipe?.();
    }
  }, [currentIndex, totalQuestions, isTestCheckpoint, isCheckpointPassed, startTest, onQuestionSwipe]);

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setMobileView('question');
    }
  };

  const markCompleted = () => {
    if (currentQuestion) {
      setCompletedIds(prev => new Set(Array.from(prev).concat(currentQuestion.id)));
      onQuestionView?.();
    }
  };

  const toggleMark = () => {
    if (currentQuestion) {
      setMarkedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.has(currentQuestion.id) ? newSet.delete(currentQuestion.id) : newSet.add(currentQuestion.id);
        return newSet;
      });
    }
  };

  const swipeHandlers = useSwipe({ onSwipeLeft: goToNext, onSwipeRight: goToPrev });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showTest) return;
      if (e.key === 'ArrowRight' || e.key === 'j') goToNext();
      if (e.key === 'ArrowLeft' || e.key === 'k') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTest, goToNext]);

  useEffect(() => {
    if (currentQuestion && !showTest) {
      trackQuestionView(currentQuestion.id, currentQuestion.channel, currentQuestion.difficulty);
    }
  }, [currentQuestion, showTest]);

  useEffect(() => {
    if (isTestCheckpoint(currentIndex) && !isCheckpointPassed(currentIndex) && !showTest && !loading) {
      startTest();
    }
  }, [currentIndex, isTestCheckpoint, isCheckpointPassed, showTest, loading, startTest]);

  if (!certification) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold mb-2">Certification not found</h2>
          <button onClick={() => setLocation('/certifications')} className="text-primary hover:underline">
            Browse all certifications
          </button>
        </div>
      </div>
    );
  }

  const progress = totalQuestions > 0 ? Math.round((completedIds.size / totalQuestions) * 100) : 0;
  const isCompleted = currentQuestion ? completedIds.has(currentQuestion.id) : false;
  const isMarked = currentQuestion ? markedQuestions.has(currentQuestion.id) : false;
  const currentTestQuestion = testQuestions[currentTestIndex];

  // Streamlined Test Modal - One click to answer, auto-advance
  const TestModal = () => {
    if (!showTest) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-border bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  showResults ? (testResults.passed ? 'bg-green-500/20' : 'bg-red-500/20') : 'bg-amber-500/20'
                }`}>
                  {showResults ? (
                    testResults.passed ? <Unlock className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-red-500" />
                  ) : (
                    <Zap className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold">
                    {showResults ? (testResults.passed ? '🎉 Passed!' : '❌ Failed') : 'Checkpoint Test'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {showResults ? `${testResults.correct}/${testResults.total} correct` : `Q${currentTestIndex + 1}/${testQuestions.length} • Tap answer to submit`}
                  </p>
                </div>
              </div>
              
              {!showResults && (
                <div className="flex items-center gap-1">
                  {testQuestions.map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${
                      i < testAnswers.length
                        ? testAnswers[i]?.isCorrect ? 'bg-green-500' : 'bg-red-500'
                        : i === currentTestIndex ? 'bg-primary' : 'bg-muted'
                    }`} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {showResults ? (
              // Results - expandable review
              <div className="space-y-3">
                {!testResults.passed && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
                    <span className="font-medium text-red-500">Need 100% to proceed.</span>
                    <span className="text-muted-foreground ml-1">Review below, then retry or skip.</span>
                  </div>
                )}

                {testQuestions.map((q, index) => {
                  const answer = testAnswers[index];
                  const isExpanded = expandedResults.has(index);
                  const correctOption = q.options.find(o => o.isCorrect);
                  const selectedOption = q.options.find(o => o.id === answer?.selectedOptionId);

                  return (
                    <div key={q.id} className={`border rounded-xl overflow-hidden ${
                      answer?.isCorrect ? 'border-green-500/30' : 'border-red-500/30'
                    }`}>
                      <button
                        onClick={() => toggleResultExpand(index)}
                        className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/30"
                      >
                        {answer?.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-sm line-clamp-1">{q.question}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden border-t border-border/50"
                          >
                            <div className="p-3 space-y-2 text-sm">
                              <div className={`p-2 rounded ${answer?.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                <span className="text-xs text-muted-foreground">Your answer: </span>
                                <span className={answer?.isCorrect ? 'text-green-500' : 'text-red-500'}>{selectedOption?.text}</span>
                              </div>
                              {!answer?.isCorrect && (
                                <div className="p-2 rounded bg-green-500/10">
                                  <span className="text-xs text-muted-foreground">Correct: </span>
                                  <span className="text-green-500">{correctOption?.text}</span>
                                </div>
                              )}
                              {q.explanation && (
                                <div className="p-2 rounded bg-blue-500/10 flex gap-2">
                                  <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground">{q.explanation}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Question - tap to answer (no submit button)
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    currentTestQuestion?.difficulty === 'beginner' ? 'bg-green-500/10 text-green-500' :
                    currentTestQuestion?.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {currentTestQuestion?.difficulty}
                  </span>
                </div>
                
                <h4 className="font-medium mb-5">{currentTestQuestion?.question}</h4>
                
                <div className="space-y-2">
                  {currentTestQuestion?.options.map((option) => {
                    const isSelected = lastAnswer?.selectedOptionId === option.id;
                    const isCorrect = option.isCorrect;
                    const showResult = showingFeedback && (isSelected || isCorrect);
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleAnswerClick(option.id)}
                        disabled={showingFeedback}
                        className={`w-full p-4 text-left border-2 rounded-xl transition-all ${
                          showResult
                            ? isCorrect
                              ? 'border-green-500 bg-green-500/10'
                              : isSelected
                              ? 'border-red-500 bg-red-500/10'
                              : 'border-border'
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                        } ${showingFeedback ? 'cursor-default' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            showResult && isCorrect ? 'border-green-500 bg-green-500' :
                            showResult && isSelected && !isCorrect ? 'border-red-500 bg-red-500' :
                            'border-muted-foreground/30'
                          }`}>
                            {showResult && isCorrect && <Check className="w-3 h-3 text-white" />}
                            {showResult && isSelected && !isCorrect && <X className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm">{option.text}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {showingFeedback && lastAnswer && !lastAnswer.isCorrect && currentTestQuestion?.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm flex gap-2"
                  >
                    <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{currentTestQuestion.explanation}</span>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/30">
            {showResults ? (
              <div className="flex gap-3">
                {testResults.passed ? (
                  <button onClick={closeTestAndContinue} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                    <Unlock className="w-5 h-5" /> Continue
                  </button>
                ) : (
                  <>
                    <button onClick={retryTest} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Retry
                    </button>
                    <button onClick={() => setShowSkipConfirm(true)} className="flex-1 py-3 bg-muted rounded-xl font-medium flex items-center justify-center gap-2 text-muted-foreground">
                      <SkipForward className="w-4 h-4" /> Skip (-{SKIP_TEST_PENALTY})
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <button onClick={() => setShowSkipConfirm(true)} className="flex items-center gap-1 hover:text-foreground">
                  <SkipForward className="w-4 h-4" /> Skip (-{SKIP_TEST_PENALTY})
                </button>
                <span>Tap an answer to submit</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  // Skip Confirmation
  const SkipConfirmModal = () => (
    <AnimatePresence>
      {showSkipConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowSkipConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-card border border-border rounded-2xl w-full max-w-sm p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-500" />
              <h3 className="font-bold mb-2">Skip Test?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Cost: <span className="text-red-500 font-bold">{SKIP_TEST_PENALTY} credits</span>
              </p>
              <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-muted/50 rounded-lg text-sm">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Balance: <b>{formatCredits(balance)}</b></span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowSkipConfirm(false)} className="flex-1 py-2.5 bg-muted rounded-xl font-medium">
                  Cancel
                </button>
                <button
                  onClick={skipTestWithPenalty}
                  disabled={balance < SKIP_TEST_PENALTY}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <SEOHead title={`${certification.name} Practice`} description={certification.description} />
      <TestModal />
      <SkipConfirmModal />

      <div className="min-h-screen bg-background">
        {/* Compact Header - Single row with integrated progress */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-3 py-2">
            {/* Main row: Back, Title, Progress, Credits */}
            <div className="flex items-center gap-2">
              <button onClick={() => setLocation('/certifications')} className="p-1.5 hover:bg-muted rounded-md shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-sm truncate">{certification.name}</h1>
                  <span className="text-[10px] text-muted-foreground shrink-0">{certification.provider}</span>
                </div>
                {/* Inline progress bar */}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground tabular-nums">Q{currentIndex + 1}/{totalQuestions}</span>
                  <div className="relative flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
                    {Array.from({ length: Math.floor(totalQuestions / QUESTIONS_PER_TEST) }).map((_, i) => {
                      const idx = (i + 1) * QUESTIONS_PER_TEST;
                      const pos = (idx / totalQuestions) * 100;
                      const passed = passedCheckpoints.has(idx);
                      return (
                        <div key={i} className={`absolute top-1/2 w-1.5 h-1.5 rounded-full ${passed ? 'bg-green-500' : 'bg-amber-500'}`}
                          style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }} />
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-primary font-medium tabular-nums">{progress}%</span>
                </div>
              </div>

              {/* Right side: Difficulty pills + Credits */}
              <div className="flex items-center gap-1 shrink-0">
                {['all', 'beginner', 'intermediate', 'advanced'].map(diff => (
                  <button key={diff} onClick={() => { setSelectedDifficulty(diff); setCurrentIndex(0); }}
                    className={`px-2 py-0.5 text-[10px] rounded-md capitalize hidden sm:block ${
                      selectedDifficulty === diff 
                        ? diff === 'beginner' ? 'bg-green-500/20 text-green-500' 
                          : diff === 'intermediate' ? 'bg-yellow-500/20 text-yellow-500'
                          : diff === 'advanced' ? 'bg-red-500/20 text-red-500'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}>
                    {diff === 'all' ? 'All' : diff === 'beginner' ? 'Easy' : diff === 'intermediate' ? 'Med' : 'Hard'}
                  </button>
                ))}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md ml-1">
                  <Coins className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-500 tabular-nums">{formatCredits(balance)}</span>
                </div>
                <button onClick={() => setShowInfo(!showInfo)} className="p-1 hover:bg-muted rounded-md">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile difficulty filter - only on small screens */}
            <div className="flex items-center gap-1 mt-1.5 sm:hidden overflow-x-auto no-scrollbar">
              {['all', 'beginner', 'intermediate', 'advanced'].map(diff => (
                <button key={diff} onClick={() => { setSelectedDifficulty(diff); setCurrentIndex(0); }}
                  className={`px-2 py-0.5 text-[10px] rounded-md capitalize shrink-0 ${
                    selectedDifficulty === diff 
                      ? diff === 'beginner' ? 'bg-green-500/20 text-green-500' 
                        : diff === 'intermediate' ? 'bg-yellow-500/20 text-yellow-500'
                        : diff === 'advanced' ? 'bg-red-500/20 text-red-500'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}>
                  {diff === 'all' ? 'All' : diff === 'beginner' ? 'Easy' : diff === 'intermediate' ? 'Medium' : 'Hard'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Collapsible Info - More compact */}
        {showInfo && (
          <div className="bg-muted/30 border-b border-border px-3 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-4">
                <span><span className="text-muted-foreground">Level:</span> <span className="font-medium capitalize">{certification.difficulty}</span></span>
                <span><span className="text-muted-foreground">Time:</span> <span className="font-medium">{certification.estimatedHours}h</span></span>
                <span><span className="text-muted-foreground">Done:</span> <span className="font-medium">{completedIds.size}/{totalQuestions}</span></span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Test every {QUESTIONS_PER_TEST}Q • Skip: {SKIP_TEST_PENALTY}cr</span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[60vh] text-center">
            <div><p className="text-red-500 mb-2">{error}</p><button onClick={() => window.location.reload()} className="text-primary">Retry</button></div>
          </div>
        ) : totalQuestions === 0 ? (
          <div className="flex items-center justify-center h-[60vh] text-center">
            <div><Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" /><p>No questions yet</p></div>
          </div>
        ) : (
          <>
            {/* Desktop - Optimized split layout */}
            <div className="hidden lg:flex h-[calc(100vh-100px)]">
              <div className="w-[40%] border-r border-border overflow-y-auto">
                {currentQuestion && <QuestionPanel question={currentQuestion} questionNumber={currentIndex + 1} totalQuestions={totalQuestions} isMarked={isMarked} isCompleted={isCompleted} onToggleMark={toggleMark} timerEnabled={false} timeLeft={0} />}
              </div>
              <div className="w-[60%] overflow-y-auto">
                {currentQuestion && <AnswerPanel question={currentQuestion} isCompleted={isCompleted} />}
              </div>
            </div>

            {/* Mobile */}
            <div className="lg:hidden flex flex-col h-[calc(100vh-140px)]">
              <div className="flex border-b border-border">
                <button onClick={() => setMobileView('question')} className={`flex-1 py-2 text-sm font-medium ${mobileView === 'question' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>Question</button>
                <button onClick={() => setMobileView('answer')} className={`flex-1 py-2 text-sm font-medium ${mobileView === 'answer' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>Answer</button>
              </div>
              <div className="flex-1 overflow-y-auto pb-14" onTouchStart={swipeHandlers.onTouchStart} onTouchMove={swipeHandlers.onTouchMove} onTouchEnd={swipeHandlers.onTouchEnd}>
                {mobileView === 'question' ? (
                  currentQuestion && <QuestionPanel question={currentQuestion} questionNumber={currentIndex + 1} totalQuestions={totalQuestions} isMarked={isMarked} isCompleted={isCompleted} onToggleMark={toggleMark} onTapQuestion={() => setMobileView('answer')} timerEnabled={false} timeLeft={0} />
                ) : (
                  currentQuestion && <AnswerPanel question={currentQuestion} isCompleted={isCompleted} />
                )}
              </div>
            </div>

            {/* Nav - Minimal */}
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border py-1.5 px-3">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="flex items-center gap-1 px-2.5 py-1.5 bg-muted rounded-md disabled:opacity-40 text-xs">
                  <ChevronLeft className="w-4 h-4" />Prev
                </button>
                <button onClick={markCompleted} disabled={isCompleted} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium ${isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-primary text-primary-foreground'}`}>
                  <Check className="w-3.5 h-3.5" />{isCompleted ? 'Done' : 'Mark Done'}
                </button>
                <button onClick={goToNext} disabled={currentIndex === totalQuestions - 1} className="flex items-center gap-1 px-2.5 py-1.5 bg-muted rounded-md disabled:opacity-40 text-xs">
                  Next<ChevronRight className="w-4 h-4" />
                  {isTestCheckpoint(currentIndex + 1) && !isCheckpointPassed(currentIndex + 1) && <Lock className="w-3 h-3 text-amber-500" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let s = seed;
  const rand = () => { const x = Math.sin(s++) * 10000; return x - Math.floor(x); };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
