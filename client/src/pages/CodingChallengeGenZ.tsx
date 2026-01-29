/**
 * Coding Challenge GenZ - Gen Z themed coding interface
 * Pure black background, neon accents, glassmorphism
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, RotateCcw, Eye, EyeOff, Clock, CheckCircle, XCircle,
  Code, Lightbulb, ChevronRight, Zap, Trophy, AlertCircle, Copy, Check,
  TrendingUp, Sparkles, Brain, Flame, Target, Award
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { AppLayout } from '../components/layout/AppLayout';
import { CodeEditor, CodeDisplay } from '../components/CodeEditor';
import {
  CodingChallenge as Challenge, Language, TestResult,
  getAllChallengesAsync, getChallengeById, getRandomChallenge,
  runTestsAsync, saveChallengeAttempt, analyzeCodeComplexity,
  getCodingStats, getSolvedChallengeIds, ComplexityAnalysis,
} from '../lib/coding-challenges';
import { useCredits } from '../context/CreditsContext';

type ViewState = 'list' | 'challenge';

const CODING_LANGUAGE_KEY = 'coding-preferred-language';
const CODING_PROGRESS_PREFIX = 'coding-progress-';

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(CODING_LANGUAGE_KEY);
    if (stored === 'javascript' || stored === 'python') return stored;
  } catch {}
  return 'javascript';
}

function getStoredCode(challengeId: string, language: Language): string | null {
  try {
    const key = `${CODING_PROGRESS_PREFIX}${challengeId}-${language}`;
    return localStorage.getItem(key);
  } catch {}
  return null;
}

function saveCodeProgress(challengeId: string, language: Language, code: string): void {
  try {
    const key = `${CODING_PROGRESS_PREFIX}${challengeId}-${language}`;
    localStorage.setItem(key, code);
  } catch {}
}

export default function CodingChallengeGenZ() {
  const { id } = useParams<{ id?: string }>();
  const [_, setLocation] = useLocation();

  const [viewState, setViewState] = useState<ViewState>(id ? 'challenge' : 'list');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userComplexity, setUserComplexity] = useState<ComplexityAnalysis | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => getSolvedChallengeIds());
  const [startTime, setStartTime] = useState<number>(Date.now());

  const stats = getCodingStats();
  const { balance, formatCredits } = useCredits();

  // Load challenges
  useEffect(() => {
    async function loadChallenges() {
      try {
        const loaded = await getAllChallengesAsync();
        setChallenges(loaded);
      } catch (error) {
        console.error('Failed to load challenges:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadChallenges();
  }, []);

  // Save language preference
  useEffect(() => {
    try {
      localStorage.setItem(CODING_LANGUAGE_KEY, language);
    } catch {}
  }, [language]);

  // Auto-save code progress
  useEffect(() => {
    if (!currentChallenge || !code) return;
    const timer = setTimeout(() => {
      saveCodeProgress(currentChallenge.id, language, code);
    }, 500);
    return () => clearTimeout(timer);
  }, [code, currentChallenge, language]);

  // Load challenge by ID
  useEffect(() => {
    if (id && !isLoading) {
      const challenge = getChallengeById(id) || challenges.find(c => c.id === id);
      if (challenge) {
        setCurrentChallenge(challenge);
        const savedCode = getStoredCode(challenge.id, language);
        setCode(savedCode || challenge.starterCode[language]);
        setViewState('challenge');
        setStartTime(Date.now());
        setTestResults([]);
        setShowSolution(false);
        setShowHints(false);
        setHintIndex(0);
        setUserComplexity(null);
        setShowSuccessModal(false);
      }
    }
  }, [id, isLoading, challenges, language]);

  // Update code when language changes
  useEffect(() => {
    if (currentChallenge) {
      const savedCode = getStoredCode(currentChallenge.id, language);
      setCode(savedCode || currentChallenge.starterCode[language]);
      setTestResults([]);
    }
  }, [language, currentChallenge]);

  // Auto-analyze complexity
  useEffect(() => {
    if (!code || code === currentChallenge?.starterCode[language]) {
      setUserComplexity(null);
      return;
    }
    const timer = setTimeout(() => {
      const analysis = analyzeCodeComplexity(code);
      setUserComplexity(analysis);
    }, 500);
    return () => clearTimeout(timer);
  }, [code, currentChallenge, language]);

  const startChallenge = useCallback((challenge: Challenge) => {
    setCurrentChallenge(challenge);
    setCode(challenge.starterCode[language]);
    setTestResults([]);
    setShowSolution(false);
    setShowHints(false);
    setHintIndex(0);
    setUserComplexity(null);
    setShowSuccessModal(false);
    setViewState('challenge');
    setLocation(`/coding/${challenge.id}`);
  }, [language, setLocation]);

  const startRandom = useCallback((difficulty?: 'easy' | 'medium') => {
    const challenge = getRandomChallenge(difficulty);
    startChallenge(challenge);
  }, [startChallenge]);

  const runCode = useCallback(async () => {
    if (!currentChallenge) return;
    setIsRunning(true);
    setShowSuccessModal(false);

    try {
      const results = await runTestsAsync(code, currentChallenge, language);
      setTestResults(results);

      const allPassed = results.every((r) => r.passed);
      if (allPassed) {
        saveChallengeAttempt({
          challengeId: currentChallenge.id,
          code,
          language,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          passed: true,
          testResults: results,
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  }, [code, currentChallenge, language]);

  const resetCode = useCallback(() => {
    if (currentChallenge) {
      setCode(currentChallenge.starterCode[language]);
      setTestResults([]);
      setShowSolution(false);
      setUserComplexity(null);
      try {
        const key = `${CODING_PROGRESS_PREFIX}${currentChallenge.id}-${language}`;
        localStorage.removeItem(key);
      } catch {}
    }
  }, [currentChallenge, language]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const goBack = () => {
    if (viewState === 'challenge') {
      setViewState('list');
      setLocation('/coding');
    } else {
      setLocation('/');
    }
  };

  const allPassed = testResults.length > 0 && testResults.every((r) => r.passed);
  const someTests = testResults.length > 0;
  const passedCount = testResults.filter((r) => r.passed).length;

  // Group challenges by difficulty
  const easyChallenges = challenges.filter(c => c.difficulty === 'easy');
  const mediumChallenges = challenges.filter(c => c.difficulty === 'medium');

  return (
    <>
      <SEOHead
        title="Coding Challenges | Code Reels"
        description="Practice coding interview problems with instant feedback"
        canonical="https://open-interview.github.io/coding"
      />

      <AppLayout fullWidth hideNav>
        <div className="min-h-screen bg-background text-foreground pt-safe">
          {/* List View */}
          {viewState === 'list' && (
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-safe">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 md:mb-12"
              >
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 md:mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-semibold">HOME</span>
                </button>
                
                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Code className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl md:text-4xl font-black mb-1 md:mb-2">CODING CHALLENGES</h1>
                    <p className="text-sm md:text-base text-muted-foreground">Master algorithms & data structures</p>
                  </div>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-12"
              >
                <div className="p-4 md:p-6 bg-muted/50 border border-border rounded-2xl">
                  <Trophy className="w-6 h-6 md:w-8 md:h-8 text-[#ffd700] mb-2 md:mb-3" />
                  <div className="text-2xl md:text-3xl font-black mb-1">{stats.passedChallenges}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Solved</div>
                </div>
                <div className="p-4 md:p-6 bg-muted/50 border border-border rounded-2xl">
                  <Target className="w-6 h-6 md:w-8 md:h-8 text-cyan-500 mb-2 md:mb-3" />
                  <div className="text-2xl md:text-3xl font-black mb-1">{stats.totalAttempts}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Attempts</div>
                </div>
                <div className="p-4 md:p-6 bg-muted/50 border border-border rounded-2xl">
                  <Flame className="w-6 h-6 md:w-8 md:h-8 text-[#ff0080] mb-2 md:mb-3" />
                  <div className="text-2xl md:text-3xl font-black mb-1">{challenges.length}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Total Challenges</div>
                </div>
                <div className="p-4 md:p-6 bg-gradient-to-br from-[#ffd700]/20 to-[#ff0080]/20 border border-[#ffd700]/30 rounded-2xl">
                  <Award className="w-6 h-6 md:w-8 md:h-8 text-[#ffd700] mb-2 md:mb-3" />
                  <div className="text-2xl md:text-3xl font-black mb-1">{formatCredits(balance)}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Credits</div>
                </div>
              </motion.div>

              {/* Quick Start */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8 md:mb-12"
              >
                <h2 className="text-lg md:text-xl font-black mb-3 md:mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  QUICK START
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <button
                    onClick={() => startRandom()}
                    className="p-4 md:p-6 bg-gradient-to-br from-primary/20 to-cyan-500/20 border border-primary/30 rounded-2xl hover:from-primary/30 hover:to-cyan-500/30 transition-all group"
                  >
                    <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary mb-2 md:mb-3 group-hover:scale-110 transition-transform" />
                    <div className="text-base md:text-lg font-black mb-1">Random Challenge</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Surprise me!</div>
                  </button>
                  <button
                    onClick={() => startRandom('easy')}
                    className="p-4 md:p-6 bg-muted/50 border border-primary/30 rounded-2xl hover:bg-muted transition-all group"
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#00ff88]/20 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform">
                      <span className="text-primary font-black text-sm md:text-base">E</span>
                    </div>
                    <div className="text-base md:text-lg font-black mb-1">Easy Mode</div>
                    <div className="text-xs md:text-sm text-muted-foreground">{easyChallenges.length} challenges</div>
                  </button>
                  <button
                    onClick={() => startRandom('medium')}
                    className="p-4 md:p-6 bg-muted/50 border border-[#ffd700]/30 rounded-2xl hover:bg-muted transition-all group"
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#ffd700]/20 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform">
                      <span className="text-[#ffd700] font-black text-sm md:text-base">M</span>
                    </div>
                    <div className="text-base md:text-lg font-black mb-1">Medium Mode</div>
                    <div className="text-xs md:text-sm text-muted-foreground">{mediumChallenges.length} challenges</div>
                  </button>
                </div>
              </motion.div>

              {/* Challenge List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-lg md:text-xl font-black mb-3 md:mb-4">ALL CHALLENGES</h2>
                <div className="space-y-2 md:space-y-3">
                  {challenges.map((challenge, idx) => {
                    const isSolved = solvedIds.has(challenge.id);
                    return (
                      <motion.button
                        key={challenge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        onClick={() => startChallenge(challenge)}
                        className="w-full p-4 md:p-5 bg-muted/50 border border-border rounded-2xl hover:border-primary/50 hover:bg-muted transition-all group text-left"
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isSolved 
                              ? 'bg-[#00ff88]/20 border border-primary/30' 
                              : 'bg-muted/50 border border-border'
                          }`}>
                            {isSolved ? (
                              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                            ) : (
                              <Code className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base md:text-lg mb-1 group-hover:text-primary transition-colors truncate">
                              {challenge.title}
                            </h3>
                            <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">{challenge.description}</p>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                            <span className={`px-2 md:px-3 py-1 rounded-lg text-xs font-bold ${
                              challenge.difficulty === 'easy'
                                ? 'bg-[#00ff88]/20 text-primary border border-primary/30'
                                : 'bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30'
                            }`}>
                              {challenge.difficulty.toUpperCase()}
                            </span>
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}

          {/* Challenge View */}
          {viewState === 'challenge' && currentChallenge && (
            <div className="h-screen flex flex-col pb-safe">
              {/* Header */}
              <header className="border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-50 pt-safe">
                <div className="px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2 md:gap-4">
                  <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                    <button
                      onClick={goBack}
                      className="p-2 hover:bg-muted rounded-xl transition-colors flex-shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-black text-sm md:text-lg truncate">{currentChallenge.title}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                          currentChallenge.difficulty === 'easy'
                            ? 'bg-[#00ff88]/20 text-primary border border-primary/30'
                            : 'bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30'
                        }`}>
                          {currentChallenge.difficulty.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{currentChallenge.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="bg-muted/50 border border-border rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-foreground cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/20 transition-colors"
                    >
                      <option value="javascript" className="bg-background">JavaScript</option>
                      <option value="python" className="bg-background">Python</option>
                    </select>
                  </div>
                </div>
              </header>

              {/* Main Content - Split View on Desktop, Stacked on Mobile */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel - Problem Description */}
                <div className="md:w-[450px] border-b md:border-b-0 md:border-r border-border flex flex-col overflow-hidden max-h-[40vh] md:max-h-none">
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-xs md:text-sm font-black text-primary mb-2 md:mb-3 uppercase tracking-wider">Problem</h3>
                      <p className="text-sm md:text-base text-foreground leading-relaxed whitespace-pre-wrap">
                        {currentChallenge.description}
                      </p>
                    </div>

                    {/* Examples */}
                    <div>
                      <h3 className="text-xs md:text-sm font-black text-cyan-500 mb-2 md:mb-3 uppercase tracking-wider">Examples</h3>
                      <div className="space-y-2 md:space-y-3">
                        {currentChallenge.testCases.slice(0, 2).map((tc, idx) => (
                          <div key={tc.id} className="bg-muted/50 border border-border rounded-xl p-3 md:p-4">
                            <div className="text-xs text-muted-foreground mb-2">Example {idx + 1}</div>
                            <div className="font-mono text-xs md:text-sm space-y-1">
                              <div>
                                <span className="text-cyan-500">Input:</span>{' '}
                                <span className="text-foreground">{tc.input}</span>
                              </div>
                              <div>
                                <span className="text-primary">Output:</span>{' '}
                                <span className="text-foreground font-bold">{tc.expectedOutput}</span>
                              </div>
                              {tc.description && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  {tc.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hints */}
                    <div>
                      <button
                        onClick={() => setShowHints(!showHints)}
                        className="flex items-center gap-2 text-sm font-bold text-[#ffd700] hover:text-[#ffd700]/80 transition-colors mb-3"
                      >
                        <Lightbulb className="w-4 h-4" />
                        {showHints ? 'Hide Hints' : `Show Hints (${currentChallenge.hints.length})`}
                      </button>
                      <AnimatePresence>
                        {showHints && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                          >
                            {currentChallenge.hints.slice(0, hintIndex + 1).map((hint, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-xl p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <Lightbulb className="w-4 h-4 text-[#ffd700] flex-shrink-0 mt-0.5" />
                                  <div>
                                    <div className="text-xs font-bold text-[#ffd700] mb-1">Hint {i + 1}</div>
                                    <div className="text-sm text-foreground">{hint}</div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                            {hintIndex < currentChallenge.hints.length - 1 && (
                              <button
                                onClick={() => setHintIndex(hintIndex + 1)}
                                className="text-sm text-[#ffd700] hover:underline"
                              >
                                Show next hint →
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Live Complexity Analysis */}
                    {userComplexity && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <h3 className="text-sm font-black text-[#ff0080] mb-3 uppercase tracking-wider flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          Your Code Analysis
                        </h3>
                        <div className="bg-[#ff0080]/10 border border-[#ff0080]/30 rounded-xl p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Time Complexity:</span>
                            <span className="font-mono font-bold text-[#ff0080]">{userComplexity.time}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Space Complexity:</span>
                            <span className="font-mono font-bold text-[#ff0080]">{userComplexity.space}</span>
                          </div>
                          <div className="text-xs text-muted-foreground pt-2 border-t border-[#ff0080]/20">
                            {userComplexity.explanation}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Optimal Complexity */}
                    {showSolution && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <h3 className="text-sm font-black text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Optimal Solution
                        </h3>
                        <div className="bg-[#00ff88]/10 border border-primary/30 rounded-xl p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-mono font-bold text-primary">{currentChallenge.complexity.time}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Space:</span>
                            <span className="font-mono font-bold text-primary">{currentChallenge.complexity.space}</span>
                          </div>
                          <div className="text-xs text-muted-foreground pt-2 border-t border-primary/20">
                            {currentChallenge.complexity.explanation}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Right Panel - Code Editor */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-border bg-muted/50">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="flex gap-1.5 md:gap-2">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#ff0080]" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#ffd700]" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#00ff88]" />
                      </div>
                      <span className="text-xs md:text-sm font-mono text-muted-foreground">
                        {language === 'javascript' ? 'solution.js' : 'solution.py'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      <button
                        onClick={copyCode}
                        className="p-1.5 md:p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Copy code"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={resetCode}
                        className="p-1.5 md:p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Reset code"
                      >
                        <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Monaco Editor */}
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      value={code}
                      onChange={setCode}
                      language={language}
                      height="100%"
                    />
                  </div>

                  {/* Test Results */}
                  {someTests && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-t border-border p-3 md:p-4 max-h-48 md:max-h-64 overflow-y-auto bg-background/50"
                    >
                      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                        {allPassed ? (
                          <>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-sm md:text-base text-primary">All Tests Passed!</div>
                              <div className="text-xs md:text-sm text-muted-foreground">{testResults.length} test cases</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#ff0080]/20 flex items-center justify-center flex-shrink-0">
                              <XCircle className="w-5 h-5 md:w-6 md:h-6 text-[#ff0080]" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-sm md:text-base text-[#ff0080]">
                                {passedCount}/{testResults.length} Tests Passed
                              </div>
                              <div className="text-xs md:text-sm text-muted-foreground">Keep trying!</div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="space-y-2">
                        {testResults.map((result, i) => {
                          const tc = currentChallenge.testCases[i];
                          return (
                            <div
                              key={result.testCaseId}
                              className={`p-2 md:p-3 rounded-xl border ${
                                result.passed
                                  ? 'bg-[#00ff88]/10 border-primary/30'
                                  : 'bg-[#ff0080]/10 border-[#ff0080]/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {result.passed ? (
                                  <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#ff0080] flex-shrink-0" />
                                )}
                                <span className="font-mono font-bold text-xs md:text-sm">Test {i + 1}</span>
                                {result.executionTime !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    {result.executionTime.toFixed(2)}ms
                                  </span>
                                )}
                              </div>
                              {!result.passed && (
                                <div className="pl-5 md:pl-6 text-xs font-mono space-y-1">
                                  {result.error ? (
                                    <div className="text-[#ff0080] break-words">{result.error}</div>
                                  ) : (
                                    <>
                                      <div className="break-words"><span className="text-cyan-500">Input:</span> {tc?.input}</div>
                                      <div className="break-words"><span className="text-primary">Expected:</span> {tc?.expectedOutput}</div>
                                      <div className="break-words"><span className="text-[#ff0080]">Got:</span> {result.actualOutput}</div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Action Bar */}
                  <div className="border-t border-border p-3 md:p-4 flex items-center justify-between bg-background/95 pb-safe">
                    <button
                      onClick={() => setShowSolution(!showSolution)}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                    >
                      {showSolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span className="hidden sm:inline">{showSolution ? 'Hide Solution' : 'Show Solution'}</span>
                    </button>
                    <button
                      onClick={runCode}
                      disabled={isRunning}
                      className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground font-black text-sm md:text-base rounded-xl hover:from-primary/90 hover:to-cyan-500/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRunning ? (
                        <>
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span className="hidden sm:inline">{language === 'python' ? 'Loading Python...' : 'Running...'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 md:w-5 md:h-5" />
                          <span>Run Tests</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Solution Modal */}
          <AnimatePresence>
            {showSolution && currentChallenge && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
                onClick={() => setShowSolution(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-background border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] md:max-h-[80vh] overflow-hidden"
                >
                  <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
                    <h2 className="font-black text-lg md:text-xl flex items-center gap-2">
                      <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      Sample Solution
                    </h2>
                    <button
                      onClick={() => setShowSolution(false)}
                      className="p-2 hover:bg-muted rounded-xl transition-colors"
                    >
                      <XCircle className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(85vh-120px)] md:max-h-[60vh]">
                    <CodeDisplay
                      code={currentChallenge.sampleSolution[language]}
                      language={language}
                      height="300px"
                    />
                    <div className="mt-4 md:mt-6 p-4 md:p-6 bg-[#00ff88]/10 border border-primary/30 rounded-2xl">
                      <h3 className="text-xs md:text-sm font-black text-primary mb-3 md:mb-4 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Complexity Analysis
                      </h3>
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex justify-between text-sm md:text-base">
                          <span className="text-muted-foreground">Time Complexity:</span>
                          <span className="font-mono font-bold text-foreground">{currentChallenge.complexity.time}</span>
                        </div>
                        <div className="flex justify-between text-sm md:text-base">
                          <span className="text-muted-foreground">Space Complexity:</span>
                          <span className="font-mono font-bold text-foreground">{currentChallenge.complexity.space}</span>
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground pt-2 md:pt-3 border-t border-primary/20">
                          {currentChallenge.complexity.explanation}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Modal */}
          <AnimatePresence>
            {showSuccessModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-background border border-primary/30 rounded-2xl max-w-md w-full p-6 md:p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center mx-auto mb-4 md:mb-6"
                  >
                    <Trophy className="w-10 h-10 md:w-12 md:h-12 text-black" />
                  </motion.div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2">Challenge Complete!</h2>
                  <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                    Amazing work! You've solved this challenge.
                  </p>

                  {userComplexity && (
                    <div className="bg-muted/50 border border-border rounded-xl p-3 md:p-4 mb-4 md:mb-6 text-left">
                      <div className="text-xs font-bold text-muted-foreground mb-2 md:mb-3 uppercase tracking-wider">
                        Your Solution
                      </div>
                      <div className="flex justify-between mb-2 text-sm md:text-base">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-mono font-bold text-foreground">{userComplexity.time}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span className="text-muted-foreground">Space:</span>
                        <span className="font-mono font-bold text-foreground">{userComplexity.space}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        setShowSuccessModal(false);
                        setTestResults([]);
                        startRandom();
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground font-black text-sm md:text-base rounded-xl hover:from-primary/90 hover:to-cyan-500/90 transition-all"
                    >
                      Next Challenge →
                    </button>
                    <button
                      onClick={() => {
                        setShowSuccessModal(false);
                        setTestResults([]);
                        setViewState('list');
                        setLocation('/coding');
                      }}
                      className="flex-1 py-3 border border-border rounded-xl hover:bg-muted transition-colors text-sm md:text-base"
                    >
                      Back to List
                    </button>
                  </div>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full mt-3 py-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Review Problem
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AppLayout>
    </>
  );
}
