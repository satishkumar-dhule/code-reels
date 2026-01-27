/**
 * Coding Challenge Page - Interactive coding problems with in-browser testing
 * Uses Monaco Editor (VS Code's editor) for professional code editing
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  Code,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Trophy,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  FileText,
  Mic,
  Coins,
  Search,
  X,
  Layers,
  Hash,
  Database,
  GitBranch,
  Binary,
  Braces,
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { CodeEditor, CodeDisplay } from '../components/CodeEditor';
import { QuestionHistoryIcon } from '../components/unified/QuestionHistory';
import { DesktopSidebarWrapper } from '../components/layout/DesktopSidebarWrapper';
import {
  CodingChallenge as Challenge,
  Language,
  TestResult,
  getAllChallenges,
  getAllChallengesAsync,
  getChallengeById,
  getChallengeByIdAsync,
  getRandomChallenge,
  runTestsAsync,
  saveChallengeAttempt,
  analyzeCodeComplexity,
  getCodingStats,
  getSolvedChallengeIds,
  ComplexityAnalysis,
} from '../lib/coding-challenges';
import { GiscusComments } from '../components/GiscusComments';
import { mascotEvents } from '../components/PixelMascot';
import { useCredits } from '../context/CreditsContext';

type ViewState = 'list' | 'challenge';

// Storage keys for persistence
const CODING_LANGUAGE_KEY = 'coding-preferred-language';
const CODING_PROGRESS_PREFIX = 'coding-progress-';

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  arrays: { icon: Layers, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30', label: 'Arrays' },
  strings: { icon: Hash, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30', label: 'Strings' },
  stacks: { icon: Database, color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/30', label: 'Stacks & Queues' },
  searching: { icon: Search, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 border-cyan-500/30', label: 'Searching' },
  'dynamic-programming': { icon: GitBranch, color: 'text-pink-500', bgColor: 'bg-pink-500/10 border-pink-500/30', label: 'Dynamic Programming' },
  basics: { icon: Binary, color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30', label: 'Basics' },
  'linked-lists': { icon: GitBranch, color: 'text-teal-500', bgColor: 'bg-teal-500/10 border-teal-500/30', label: 'Linked Lists' },
  math: { icon: Binary, color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/30', label: 'Math' },
  sorting: { icon: Layers, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10 border-indigo-500/30', label: 'Sorting' },
  'two-pointers': { icon: ChevronRight, color: 'text-rose-500', bgColor: 'bg-rose-500/10 border-rose-500/30', label: 'Two Pointers' },
  default: { icon: Braces, color: 'text-gray-500', bgColor: 'bg-gray-500/10 border-gray-500/30', label: 'Other' },
};

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

export default function CodingChallenge() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [timeSpent, setTimeSpent] = useState<number>(0);
  
  // Load challenges from JSON on mount
  useEffect(() => {
    async function loadChallenges() {
      try {
        const { getAllChallengesAsync } = await import('../lib/coding-challenges');
        const loaded = await getAllChallengesAsync();
        setChallenges(loaded);
      } catch (error) {
        console.error('Failed to load challenges:', error);
        // Fallback to sync version
        setChallenges(getAllChallenges());
      } finally {
        setIsLoading(false);
      }
    }
    loadChallenges();
  }, []);
  
  // Mobile collapsible states
  const [isProblemCollapsed, setIsProblemCollapsed] = useState(false);
  const [isCodeCollapsed, setIsCodeCollapsed] = useState(false);
  
  // Reset collapse states when switching to desktop view
  useEffect(() => {
    const handleResize = () => {
      // lg breakpoint is 1024px
      if (window.innerWidth >= 1024) {
        setIsProblemCollapsed(false);
        setIsCodeCollapsed(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    // Check on mount too
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const stats = getCodingStats();
  const { balance, formatCredits, config } = useCredits();

  // Normalize tag to handle singular/plural
  const normalizeTag = (tag: string): string => {
    const normalized = tag.toLowerCase().trim();
    // Map plural to singular or normalize variations
    const tagMap: Record<string, string> = {
      'arrays': 'array',
      'strings': 'string',
      'stacks': 'stack',
      'linked-lists': 'linked-list',
      'hash-map': 'hashmap',
      'hash-set': 'hashset',
      'two-pointers': 'two-pointers',
      'divide-conquer': 'divide-and-conquer',
    };
    return tagMap[normalized] || normalized;
  };

  // Define organized category hierarchy (using normalized names)
  const CATEGORY_HIERARCHY: Record<string, { label: string; topics: string[] }> = {
    'data-structures': {
      label: '📁 Data Structures',
      topics: ['array', 'string', 'linked-list', 'stack', 'hashmap', 'hashset', 'tree', 'graph', 'queue']
    },
    'algorithms': {
      label: '📁 Algorithms', 
      topics: ['searching', 'sorting', 'binary-search', 'dynamic-programming', 'recursion', 'divide-and-conquer', 'greedy', 'backtracking']
    },
    'techniques': {
      label: '📁 Techniques',
      topics: ['two-pointers', 'sliding-window', 'in-place', 'memoization', 'iteration', 'traversal']
    },
    'math': {
      label: '📁 Math & Logic',
      topics: ['math', 'prime-factors', 'factorization', 'modular-arithmetic', 'digits', 'exponents', 'floating-point', 'perfect-square', 'product', 'fibonacci']
    },
    'misc': {
      label: '📁 Other',
      topics: ['basics', 'simulation', 'validation', 'parsing', 'pattern-matching', 'compression', 'manipulation', 'counting', 'finance', 'circular', 'rotation', 'reverse', 'node-deletion', 'pointers', 'frequency', 'custom-comparator', 'bit-manipulation', 'binary', 'regex']
    }
  };

  // Filter challenges based on search query
  const filteredChallenges = challenges.filter((challenge) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      challenge.title.toLowerCase().includes(query) ||
      challenge.description.toLowerCase().includes(query) ||
      challenge.category.toLowerCase().includes(query) ||
      challenge.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Group challenges into hierarchy
  const organizedChallenges = Object.entries(CATEGORY_HIERARCHY).reduce((acc, [groupKey, group]) => {
    const topicMap: Record<string, Challenge[]> = {};
    
    filteredChallenges.forEach((challenge) => {
      const allTags = [...(challenge.tags || []), challenge.category].map(t => normalizeTag(t));
      
      allTags.forEach((tag) => {
        if (group.topics.includes(tag)) {
          if (!topicMap[tag]) topicMap[tag] = [];
          if (!topicMap[tag].find(c => c.id === challenge.id)) {
            topicMap[tag].push(challenge);
          }
        }
      });
    });
    
    // Only include groups that have challenges
    const nonEmptyTopics = Object.entries(topicMap).filter(([_, challenges]) => challenges.length > 0);
    if (nonEmptyTopics.length > 0) {
      acc[groupKey] = {
        label: group.label,
        topics: Object.fromEntries(nonEmptyTopics.sort((a, b) => b[1].length - a[1].length))
      };
    }
    
    return acc;
  }, {} as Record<string, { label: string; topics: Record<string, Challenge[]> }>);

  // Toggle expansion for groups and topics
  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Expand all when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allKeys = new Set<string>();
      Object.keys(organizedChallenges).forEach(group => {
        allKeys.add(group);
        Object.keys(organizedChallenges[group].topics).forEach(topic => {
          allKeys.add(`${group}/${topic}`);
        });
      });
      setExpandedCategories(allKeys);
    }
  }, [searchQuery]);

  // Refresh solved IDs when returning to list or after solving
  useEffect(() => {
    if (viewState === 'list' || showSuccessModal) {
      setSolvedIds(getSolvedChallengeIds());
    }
  }, [viewState, showSuccessModal]);

  // Save language preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem(CODING_LANGUAGE_KEY, language);
    } catch {}
  }, [language]);

  // Auto-save code progress (debounced)
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
        // Restore saved code or use starter code
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
  }, [id, isLoading, challenges]);

  // Update code when language changes
  useEffect(() => {
    if (currentChallenge) {
      // Restore saved code for this language or use starter code
      const savedCode = getStoredCode(currentChallenge.id, language);
      setCode(savedCode || currentChallenge.starterCode[language]);
      setTestResults([]);
    }
  }, [language, currentChallenge]);



  // Auto-analyze complexity when code changes (debounced)
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

  const startChallenge = useCallback(
    (challenge: Challenge) => {
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
    },
    [language, setLocation]
  );

  const startRandom = useCallback(
    (difficulty?: 'easy' | 'medium') => {
      const challenge = getRandomChallenge(difficulty);
      startChallenge(challenge);
    },
    [startChallenge]
  );

  const runCode = useCallback(async () => {
    if (!currentChallenge) return;
    setIsRunning(true);
    setShowSuccessModal(false);

    try {
      // Use async version that supports both JS and Python (via Pyodide)
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
        mascotEvents.celebrate(); // Mascot celebrates on success!
      } else {
        mascotEvents.disappointed(); // Mascot is sad when tests fail
      }
    } catch (error) {
      console.error('Error running tests:', error);
      mascotEvents.disappointed(); // Mascot is sad on error
    } finally {
      setIsRunning(false);
    }
  }, [code, currentChallenge, language, startTime, timeSpent]);

  const resetCode = useCallback(() => {
    if (currentChallenge) {
      setCode(currentChallenge.starterCode[language]);
      setTestResults([]);
      setShowSolution(false);
      setUserComplexity(null);
      // Clear saved progress for this challenge/language
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
      window.history.back();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const allPassed = testResults.length > 0 && testResults.every((r) => r.passed);
  const someTests = testResults.length > 0;
  const passedCount = testResults.filter((r) => r.passed).length;

  return (
    <>
      <SEOHead
        title="Coding Challenges - Practice Interview Problems | Code Reels"
        description="Practice coding interview problems with instant feedback. Test your solutions in the browser and learn optimal approaches."
        canonical="https://open-interview.github.io/coding"
      />

      <DesktopSidebarWrapper>
      <div className="min-h-screen bg-background text-foreground">
        {/* Challenge List View */}
        {viewState === 'list' && (
          <main className="p-3 sm:p-4">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <header className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setLocation('/')}
                  className="flex items-center gap-1.5 hover:text-primary text-[10px] uppercase tracking-widest font-bold font-mono"
                  data-testid="back-home"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Home
                </button>
                <h1 className="text-base sm:text-xl font-bold uppercase font-mono" data-testid="page-title">
                  <span className="text-primary">&gt;</span> Coding Challenges
                </h1>
                <div className="w-16" />
              </header>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6"
                data-testid="stats-grid"
              >
                <div className="border border-border p-3 bg-card rounded-lg text-center">
                  <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold" data-testid="stat-solved">
                    {stats.passedChallenges}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase">Solved</div>
                </div>
                <div className="border border-border p-3 bg-card rounded-lg text-center">
                  <Code className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <div className="text-lg font-bold" data-testid="stat-attempts">
                    {stats.totalAttempts}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase">Attempts</div>
                </div>
                <div className="border border-border p-3 bg-card rounded-lg text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-green-500" />
                  <div className="text-lg font-bold" data-testid="stat-time">
                    {formatTime(stats.averageTime)}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase">Avg Time</div>
                </div>
                <button 
                  onClick={() => setLocation('/profile')}
                  className="border border-amber-500/30 p-3 bg-amber-500/10 rounded-lg text-center hover:bg-amber-500/20 transition-colors"
                >
                  <Coins className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <div className="text-lg font-bold text-amber-500">{formatCredits(balance)}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Credits</div>
                </button>
              </motion.div>

              {/* Voice Interview CTA */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => setLocation('/voice-interview')}
                className="w-full mb-6 p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 hover:from-emerald-500/20 hover:to-teal-500/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-sm">Try Voice Interview</h3>
                  <p className="text-[10px] text-muted-foreground">Practice system design & behavioral questions</p>
                </div>
                <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                  <Coins className="w-3 h-3" />+{config.VOICE_ATTEMPT}
                </span>
              </motion.button>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search challenges by name, category, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  data-testid="search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Start */}
              <div className="flex gap-2 mb-6" data-testid="quick-start">
                <button
                  onClick={() => startRandom()}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  data-testid="random-challenge-btn"
                >
                  <Zap className="w-4 h-4" /> Random Challenge
                </button>
                <button
                  onClick={() => startRandom('easy')}
                  className="px-4 py-3 border border-green-500/50 text-green-500 font-bold rounded-lg hover:bg-green-500/10 transition-colors"
                  data-testid="easy-btn"
                >
                  Easy
                </button>
                <button
                  onClick={() => startRandom('medium')}
                  className="px-4 py-3 border border-yellow-500/50 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500/10 transition-colors"
                  data-testid="medium-btn"
                >
                  Medium
                </button>
              </div>

              {/* Ultra Compact Hierarchical Tree View */}
              <div className="font-mono text-xs border border-border rounded-lg bg-card overflow-hidden" data-testid="challenge-list">
                {filteredChallenges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No challenges found</p>
                  </div>
                ) : (
                  <div>
                    {Object.entries(organizedChallenges).map(([groupKey, group]) => {
                      const isGroupExpanded = expandedCategories.has(groupKey);
                      const totalInGroup = Object.values(group.topics).flat().length;
                      const solvedInGroup = Object.values(group.topics).flat().filter(c => solvedIds.has(c.id)).length;
                      
                      return (
                        <div key={groupKey} className="border-b border-border/30 last:border-b-0">
                          {/* Group Header */}
                          <button
                            onClick={() => toggleCategory(groupKey)}
                            className="w-full px-2 py-1.5 flex items-center gap-1 hover:bg-muted/50 transition-colors text-left font-medium"
                          >
                            {isGroupExpanded ? (
                              <ChevronDown className="w-3 h-3 text-primary" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className="flex-1">{group.label}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {solvedInGroup}/{totalInGroup}
                            </span>
                          </button>

                          {/* Topics */}
                          {isGroupExpanded && (
                            <div className="bg-muted/10">
                              {Object.entries(group.topics).map(([topic, topicChallenges]) => {
                                const topicKey = `${groupKey}/${topic}`;
                                const isTopicExpanded = expandedCategories.has(topicKey);
                                const solvedInTopic = topicChallenges.filter(c => solvedIds.has(c.id)).length;
                                const displayTopic = topic.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                                return (
                                  <div key={topicKey}>
                                    {/* Topic Row */}
                                    <button
                                      onClick={() => toggleCategory(topicKey)}
                                      className="w-full pl-4 pr-2 py-1 flex items-center gap-1 hover:bg-muted/30 transition-colors text-left text-muted-foreground"
                                    >
                                      <span className="text-border select-none">├</span>
                                      {isTopicExpanded ? (
                                        <ChevronDown className="w-2.5 h-2.5" />
                                      ) : (
                                        <ChevronRight className="w-2.5 h-2.5" />
                                      )}
                                      <span className="flex-1 truncate">{displayTopic}</span>
                                      <span className="text-[9px] tabular-nums">
                                        {solvedInTopic}/{topicChallenges.length}
                                      </span>
                                      {solvedInTopic === topicChallenges.length && (
                                        <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                                      )}
                                    </button>

                                    {/* Challenge Files */}
                                    {isTopicExpanded && (
                                      <div>
                                        {topicChallenges.map((challenge, idx) => {
                                          const isSolved = solvedIds.has(challenge.id);
                                          const isLast = idx === topicChallenges.length - 1;
                                          return (
                                            <button
                                              key={`${topicKey}-${challenge.id}`}
                                              onClick={() => startChallenge(challenge)}
                                              className="w-full pl-8 pr-2 py-0.5 flex items-center gap-1 hover:bg-primary/10 transition-colors text-left group"
                                            >
                                              <span className="text-border/50 select-none text-[10px]">{isLast ? '└' : '├'}</span>
                                              {isSolved ? (
                                                <CheckCircle className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                                              ) : (
                                                <Code className="w-2.5 h-2.5 text-muted-foreground/60 flex-shrink-0" />
                                              )}
                                              <span className={`flex-1 truncate text-[11px] ${isSolved ? 'text-green-600 dark:text-green-400' : 'text-foreground/80'}`}>
                                                {challenge.title}
                                              </span>
                                              <span
                                                className={`text-[8px] w-3 text-center ${
                                                  challenge.difficulty === 'easy' ? 'text-green-500' : 'text-yellow-500'
                                                }`}
                                              >
                                                {challenge.difficulty === 'easy' ? '●' : '◆'}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </main>
        )}

        {/* Challenge View */}
        {viewState === 'challenge' && currentChallenge && (
          <main className="h-screen flex flex-col" data-testid="challenge-view">
            {/* Header */}
            <header className="border-b border-border p-3 flex items-center justify-between flex-shrink-0">
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 hover:text-primary text-[10px] uppercase tracking-widest font-bold font-mono"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-sm hidden sm:block">{currentChallenge.title}</h2>
                <span
                  className={`px-2 py-0.5 text-[10px] uppercase rounded font-bold ${
                    currentChallenge.difficulty === 'easy'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-yellow-500/20 text-yellow-500'
                  }`}
                  data-testid="challenge-difficulty"
                >
                  {currentChallenge.difficulty}
                </span>
                <QuestionHistoryIcon 
                  questionId={currentChallenge.id} 
                  questionType="coding"
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="appearance-none bg-card border border-border rounded-lg px-3 py-1.5 pr-8 text-xs font-mono text-foreground cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                  }}
                  data-testid="language-select"
                >
                  <option value="javascript" className="bg-card text-foreground">JavaScript</option>
                  <option value="python" className="bg-card text-foreground">Python</option>
                </select>
              </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Problem Description Panel - Collapsible on Mobile */}
              <div className="lg:w-[400px] xl:w-[450px] border-b lg:border-b-0 lg:border-r border-border flex flex-col overflow-hidden flex-shrink-0">
                {/* Mobile Collapsible Header */}
                <button
                  onClick={() => setIsProblemCollapsed(!isProblemCollapsed)}
                  className="lg:hidden flex items-center justify-between p-3 bg-muted/20 border-b border-border hover:bg-muted/30 transition-colors"
                  data-testid="problem-collapse-toggle"
                  aria-expanded={!isProblemCollapsed}
                  aria-controls="problem-description-content"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">Problem Description</span>
                  </div>
                  {isProblemCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                
                <AnimatePresence initial={false}>
                  {!isProblemCollapsed && (
                    <motion.div
                      id="problem-description-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 overflow-hidden lg:overflow-y-auto lg:!h-auto lg:!opacity-100"
                      data-testid="problem-content"
                    >
                      <div className="p-4 max-h-[40vh] overflow-y-auto lg:max-h-none lg:overflow-visible">
                  <h1 className="text-lg font-bold mb-3" data-testid="challenge-title">
                    {currentChallenge.title}
                  </h1>
                  <p
                    className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap leading-relaxed"
                    data-testid="challenge-description"
                  >
                    {currentChallenge.description}
                  </p>

                  {/* Test Cases Preview */}
                  <div className="mb-4">
                    <h3 className="text-xs uppercase text-muted-foreground mb-2 font-bold tracking-wider">
                      Examples
                    </h3>
                    <div className="space-y-2" data-testid="examples">
                      {currentChallenge.testCases.slice(0, 2).map((tc) => (
                        <div
                          key={tc.id}
                          className="bg-muted/30 rounded-lg p-3 text-xs font-mono border border-border/50"
                        >
                          <div className="text-muted-foreground mb-1">
                            <span className="text-blue-400">Input:</span>{' '}
                            <span className="text-foreground">{tc.input}</span>
                          </div>
                          <div className="text-muted-foreground">
                            <span className="text-green-400">Output:</span>{' '}
                            <span className="text-green-500 font-semibold">{tc.expectedOutput}</span>
                          </div>
                          {tc.description && (
                            <div className="text-muted-foreground/60 mt-1 text-[10px]">
                              // {tc.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hints */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowHints(!showHints)}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-yellow-500 transition-colors"
                      data-testid="hints-toggle"
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
                          className="mt-2 space-y-2"
                          data-testid="hints-container"
                        >
                          {currentChallenge.hints.slice(0, hintIndex + 1).map((hint, i) => (
                            <div
                              key={i}
                              className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs"
                            >
                              <span className="text-yellow-500 font-bold">💡 Hint {i + 1}:</span>{' '}
                              {hint}
                            </div>
                          ))}
                          {hintIndex < currentChallenge.hints.length - 1 && (
                            <button
                              onClick={() => setHintIndex(hintIndex + 1)}
                              className="text-xs text-yellow-500 hover:underline"
                              data-testid="next-hint-btn"
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
                      className="mb-4"
                      data-testid="live-complexity"
                    >
                      <h3 className="text-xs uppercase text-muted-foreground mb-2 font-bold tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" />
                        Your Code Analysis (Live)
                      </h3>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time Complexity:</span>
                          <span className="font-mono font-bold text-blue-400">{userComplexity.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Space Complexity:</span>
                          <span className="font-mono font-bold text-blue-400">{userComplexity.space}</span>
                        </div>
                        <div className="text-muted-foreground/80 mt-2 pt-2 border-t border-blue-500/20">
                          {userComplexity.explanation}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Optimal Complexity (shown after solution reveal) */}
                  {showSolution && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-4"
                      data-testid="complexity-info"
                    >
                      <h3 className="text-xs uppercase text-muted-foreground mb-2 font-bold tracking-wider">
                        ✨ Optimal Solution Complexity
                      </h3>
                      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-mono font-bold text-primary">
                            {currentChallenge.complexity.time}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Space:</span>
                          <span className="font-mono font-bold text-primary">
                            {currentChallenge.complexity.space}
                          </span>
                        </div>
                        <div className="text-muted-foreground/80 mt-2 pt-2 border-t border-primary/20">
                          {currentChallenge.complexity.explanation}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Discussion Section */}
                  <div className="pt-4 border-t border-border">
                    <GiscusComments questionId={`coding-${currentChallenge.id}`} />
                  </div>
                </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Code Editor Panel - Collapsible on Mobile */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Mobile Collapsible Header */}
                <button
                  onClick={() => setIsCodeCollapsed(!isCodeCollapsed)}
                  className="lg:hidden flex items-center justify-between p-3 bg-muted/20 border-b border-border hover:bg-muted/30 transition-colors"
                  data-testid="code-collapse-toggle"
                  aria-expanded={!isCodeCollapsed}
                  aria-controls="code-editor-content"
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">Code Editor</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({language === 'javascript' ? 'JS' : 'PY'})
                    </span>
                  </div>
                  {isCodeCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                
                <AnimatePresence initial={false}>
                  {!isCodeCollapsed && (
                    <motion.div
                      id="code-editor-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col overflow-hidden lg:!h-auto lg:!opacity-100"
                      data-testid="code-content"
                    >
                {/* Editor Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/10 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono ml-2">
                      {language === 'javascript' ? 'solution.js' : 'solution.py'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copyCode}
                      className="p-2 min-w-[32px] min-h-[32px] hover:bg-muted/30 rounded transition-colors flex items-center justify-center"
                      title="Copy code"
                      data-testid="copy-btn"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={resetCode}
                      className="p-2 min-w-[32px] min-h-[32px] hover:bg-muted/30 rounded transition-colors flex items-center justify-center"
                      title="Reset code"
                      data-testid="reset-btn"
                    >
                      <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 overflow-hidden min-h-[300px]" data-testid="code-editor-container">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={language}
                    height="100%"
                  />
                </div>

                {/* Test Results */}
                {someTests && (
                  <div
                    className="border-t border-border p-3 max-h-48 overflow-y-auto bg-muted/5 flex-shrink-0"
                    data-testid="test-results"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {allPassed ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-bold ${allPassed ? 'text-green-500' : 'text-red-500'}`}
                        data-testid="test-summary"
                      >
                        {allPassed
                          ? '✓ All tests passed!'
                          : `${passedCount}/${testResults.length} tests passed`}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {testResults.map((result, i) => {
                        const tc = currentChallenge.testCases[i];
                        return (
                          <div
                            key={result.testCaseId}
                            className={`text-xs p-2 rounded-lg ${
                              result.passed ? 'bg-green-500/10' : 'bg-red-500/10'
                            }`}
                            data-testid={`test-result-${i}`}
                          >
                            <div className="flex items-center gap-2">
                              {result.passed ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                              <span className="font-mono font-semibold">Test {i + 1}</span>
                              {result.executionTime !== undefined && (
                                <span className="text-muted-foreground">
                                  ({result.executionTime.toFixed(2)}ms)
                                </span>
                              )}
                            </div>
                            {!result.passed && (
                              <div className="mt-1 pl-5 text-muted-foreground font-mono">
                                {result.error ? (
                                  <span className="text-red-400">Error: {result.error}</span>
                                ) : (
                                  <div className="space-y-0.5">
                                    <div>
                                      <span className="text-blue-400">Input:</span> {tc?.input}
                                    </div>
                                    <div>
                                      <span className="text-green-400">Expected:</span> {tc?.expectedOutput}
                                    </div>
                                    <div>
                                      <span className="text-red-400">Got:</span> {result.actualOutput}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t border-border p-3 flex items-center justify-between flex-shrink-0 bg-card">
                  <button
                    onClick={() => setShowSolution(!showSolution)}
                    className="flex items-center gap-2 px-3 py-2 min-h-[36px] text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/20"
                    data-testid="reveal-solution-btn"
                  >
                    {showSolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showSolution ? 'Hide Solution' : 'Reveal Solution'}
                  </button>
                  <button
                    onClick={runCode}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-5 py-2.5 min-h-[36px] bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="run-tests-btn"
                  >
                    {isRunning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        {language === 'python' ? 'Loading Python...' : 'Running...'}
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Run Tests
                      </>
                    )}
                  </button>
                </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Solution Modal */}
            <AnimatePresence>
              {showSolution && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => setShowSolution(false)}
                  data-testid="solution-modal"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
                  >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h2 className="font-bold text-lg">✨ Sample Solution</h2>
                      <button
                        onClick={() => setShowSolution(false)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/20"
                        data-testid="close-solution-btn"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[60vh]">
                      <CodeDisplay
                        code={currentChallenge.sampleSolution[language]}
                        language={language}
                        height="250px"
                      />
                      <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-xl">
                        <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Complexity Analysis
                        </h3>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time Complexity:</span>
                            <span className="font-mono font-bold">{currentChallenge.complexity.time}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Space Complexity:</span>
                            <span className="font-mono font-bold">{currentChallenge.complexity.space}</span>
                          </div>
                          <div className="text-muted-foreground mt-3 pt-3 border-t border-primary/20 text-xs">
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
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  data-testid="success-modal"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-card border border-border rounded-xl max-w-md w-full p-6 text-center shadow-2xl"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
                    >
                      <Trophy className="w-10 h-10 text-green-500" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">🎉 Challenge Complete!</h2>
                    <p className="text-muted-foreground mb-4">
                      Great job solving this challenge!
                    </p>

                    {userComplexity && (
                      <div className="bg-muted/30 rounded-xl p-4 mb-4 text-left">
                        <div className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wider">
                          Your Solution
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Time:</span>
                          <span className="font-mono font-bold">{userComplexity.time}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Space:</span>
                          <span className="font-mono font-bold">{userComplexity.space}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowSuccessModal(false);
                          setTestResults([]);
                          startRandom();
                        }}
                        className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors"
                        data-testid="next-challenge-btn"
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
                        className="flex-1 py-3 border border-border rounded-xl hover:bg-muted/20 transition-colors"
                        data-testid="back-to-list-btn"
                      >
                        Back to List
                      </button>
                    </div>
                    <button
                      onClick={() => setShowSuccessModal(false)}
                      className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="review-problem-btn"
                    >
                      Review Problem
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        )}
      </div>
      </DesktopSidebarWrapper>
    </>
  );
}
