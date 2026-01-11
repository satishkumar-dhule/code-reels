/**
 * Certification Exam Practice
 * Focused, exam-like experience with certification-specific questions
 * Features: Timer, domain tracking, exam simulation mode
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getCertificationById,
  CertificationConfig 
} from '../lib/certifications-config';
import {
  getQuestionsForCertification,
  getExamConfig,
  generatePracticeSession,
  CertificationQuestion,
  CertificationDomain,
  CertificationExamConfig,
} from '../lib/certification-questions';
import { useCredits } from '../context/CreditsContext';
import { SEOHead } from '../components/SEOHead';
import {
  ArrowLeft, Award, Clock, Target, CheckCircle, XCircle,
  ChevronRight, ChevronLeft, Lightbulb, BarChart3, Play,
  Pause, RotateCcw, Flag, BookOpen, Zap, Trophy, AlertCircle
} from 'lucide-react';
import { useUnifiedToast } from '../hooks/use-unified-toast';

type ExamMode = 'practice' | 'timed' | 'review';
type SessionState = 'setup' | 'active' | 'results';

interface AnswerRecord {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  timeSpent: number;
}

export default function CertificationExam() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/certification/:id/exam');
  const certificationId = params?.id;

  const certification = certificationId ? getCertificationById(certificationId) : undefined;
  const examConfig = certificationId ? getExamConfig(certificationId) : undefined;
  const allQuestions = certificationId ? getQuestionsForCertification(certificationId) : [];

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [examMode, setExamMode] = useState<ExamMode>('practice');
  const [questionCount, setQuestionCount] = useState(10);
  
  // Active session
  const [questions, setQuestions] = useState<CertificationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const { toast } = useUnifiedToast();

  // Redirect to home when certification not found
  useEffect(() => {
    if (!certification && certificationId) {
      toast({
        title: "Certification not found",
        description: "Redirecting to home page...",
        variant: "warning",
      });
      const timer = setTimeout(() => {
        setLocation('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [certification, certificationId, toast, setLocation]);

  // Timer effect
  useEffect(() => {
    if (sessionState !== 'active' || examMode !== 'timed' || isPaused) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, examMode, isPaused]);

  const currentQuestion = questions[currentIndex];
  const isAnswered = answers.some(a => a.questionId === currentQuestion?.id);
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);

  // Start exam session
  const startSession = useCallback(() => {
    const sessionQuestions = generatePracticeSession(certificationId!, questionCount);
    setQuestions(sessionQuestions);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowExplanation(false);
    setFlaggedQuestions(new Set());
    setQuestionStartTime(Date.now());
    
    if (examMode === 'timed' && examConfig) {
      // Scale time based on question count vs full exam
      const timePerQuestion = (examConfig.timeLimit * 60) / examConfig.totalQuestions;
      setTimeRemaining(Math.round(timePerQuestion * questionCount));
    }
    
    setSessionState('active');
  }, [certificationId, questionCount, examMode, examConfig]);

  // Submit answer
  const submitAnswer = useCallback((optionId: string) => {
    if (!currentQuestion || isAnswered) return;

    const correctOption = currentQuestion.options.find(o => o.isCorrect);
    const isCorrect = optionId === correctOption?.id;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      selectedOptionId: optionId,
      isCorrect,
      timeSpent,
    };

    setAnswers(prev => [...prev, record]);
    setSelectedOption(optionId);
    
    if (examMode === 'practice') {
      setShowExplanation(true);
    }
  }, [currentQuestion, isAnswered, questionStartTime, examMode]);

  // Navigation
  const goToNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, questions.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      const prevAnswer = answers.find(a => a.questionId === questions[currentIndex - 1]?.id);
      setSelectedOption(prevAnswer?.selectedOptionId || null);
      setShowExplanation(false);
    }
  }, [currentIndex, answers, questions]);

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index);
    const answer = answers.find(a => a.questionId === questions[index]?.id);
    setSelectedOption(answer?.selectedOptionId || null);
    setShowExplanation(false);
    setQuestionStartTime(Date.now());
  }, [answers, questions]);

  const toggleFlag = useCallback(() => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentIndex)) {
        newSet.delete(currentIndex);
      } else {
        newSet.add(currentIndex);
      }
      return newSet;
    });
  }, [currentIndex]);

  const finishExam = useCallback(() => {
    setSessionState('results');
  }, []);

  // Results calculations
  const results = useMemo(() => {
    const correct = answers.filter(a => a.isCorrect).length;
    const total = questions.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = examConfig ? percentage >= examConfig.passingScore : percentage >= 70;
    const totalTime = answers.reduce((sum, a) => sum + a.timeSpent, 0);
    const avgTime = answers.length > 0 ? Math.round(totalTime / answers.length) : 0;

    // Domain breakdown
    const domainResults: Record<string, { correct: number; total: number; percentage: number }> = {};
    if (examConfig) {
      examConfig.domains.forEach(domain => {
        const domainQuestions = questions.filter(q => q.domain === domain.id);
        const domainAnswers = answers.filter(a => 
          domainQuestions.some(q => q.id === a.questionId)
        );
        const domainCorrect = domainAnswers.filter(a => a.isCorrect).length;
        domainResults[domain.id] = {
          correct: domainCorrect,
          total: domainQuestions.length,
          percentage: domainQuestions.length > 0 ? Math.round((domainCorrect / domainQuestions.length) * 100) : 0,
        };
      });
    }

    return { correct, total, percentage, passed, totalTime, avgTime, domainResults };
  }, [answers, questions, examConfig]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!certification) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold mb-2">Certification not found</h2>
          <p className="text-muted-foreground text-sm">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
          <h2 className="text-xl font-semibold mb-2">Questions Coming Soon</h2>
          <p className="text-muted-foreground mb-4">
            We're preparing certification-specific questions for {certification.name}. 
            In the meantime, try the general practice mode.
          </p>
          <button 
            onClick={() => setLocation(`/certification/${certificationId}`)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go to Practice Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={`${certification.name} Exam Practice`} 
        description={`Practice exam for ${certification.name} certification`} 
      />

      <div className="min-h-screen bg-background">
        {/* Setup Screen */}
        {sessionState === 'setup' && (
          <SetupScreen
            certification={certification}
            examConfig={examConfig}
            totalQuestions={allQuestions.length}
            examMode={examMode}
            setExamMode={setExamMode}
            questionCount={questionCount}
            setQuestionCount={setQuestionCount}
            onStart={startSession}
            onBack={() => setLocation(`/certification/${certificationId}`)}
          />
        )}

        {/* Active Exam */}
        {sessionState === 'active' && currentQuestion && (
          <ActiveExam
            certification={certification}
            examMode={examMode}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            currentQuestion={currentQuestion}
            selectedOption={selectedOption}
            isAnswered={isAnswered}
            currentAnswer={currentAnswer}
            showExplanation={showExplanation}
            flaggedQuestions={flaggedQuestions}
            timeRemaining={timeRemaining}
            isPaused={isPaused}
            answers={answers}
            questions={questions}
            onSelectOption={submitAnswer}
            onNext={goToNext}
            onPrev={goToPrev}
            onGoToQuestion={goToQuestion}
            onToggleFlag={toggleFlag}
            onTogglePause={() => setIsPaused(!isPaused)}
            onFinish={finishExam}
            formatTime={formatTime}
          />
        )}

        {/* Results Screen */}
        {sessionState === 'results' && (
          <ResultsScreen
            certification={certification}
            examConfig={examConfig}
            results={results}
            questions={questions}
            answers={answers}
            onRetry={() => {
              setSessionState('setup');
            }}
            onReview={() => {
              setExamMode('review');
              setCurrentIndex(0);
              setSessionState('active');
            }}
            onBack={() => setLocation(`/certification/${certificationId}`)}
          />
        )}
      </div>
    </>
  );
}


// ============================================
// SETUP SCREEN
// ============================================

interface SetupScreenProps {
  certification: CertificationConfig;
  examConfig: CertificationExamConfig | undefined;
  totalQuestions: number;
  examMode: ExamMode;
  setExamMode: (mode: ExamMode) => void;
  questionCount: number;
  setQuestionCount: (count: number) => void;
  onStart: () => void;
  onBack: () => void;
}

function SetupScreen({
  certification,
  examConfig,
  totalQuestions,
  examMode,
  setExamMode,
  questionCount,
  setQuestionCount,
  onStart,
  onBack,
}: SetupScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to certification
          </button>
          
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Award className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">{certification.name}</h1>
          <p className="text-muted-foreground">{certification.provider}</p>
        </div>

        {/* Exam Info */}
        {examConfig && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Exam Details
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Questions</div>
                <div className="font-semibold">{examConfig.totalQuestions}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Time Limit</div>
                <div className="font-semibold">{examConfig.timeLimit} min</div>
              </div>
              <div>
                <div className="text-muted-foreground">Passing</div>
                <div className="font-semibold">{examConfig.passingScore}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Mode Selection */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold">Practice Mode</h3>
          
          <button
            onClick={() => setExamMode('practice')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              examMode === 'practice' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                examMode === 'practice' ? 'bg-primary text-white' : 'bg-muted'
              }`}>
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium">Learning Mode</div>
                <div className="text-sm text-muted-foreground">See explanations after each answer</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setExamMode('timed')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              examMode === 'timed' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                examMode === 'timed' ? 'bg-primary text-white' : 'bg-muted'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium">Exam Simulation</div>
                <div className="text-sm text-muted-foreground">Timed test, results at the end</div>
              </div>
            </div>
          </button>
        </div>

        {/* Question Count */}
        <div className="mb-8">
          <h3 className="font-semibold mb-3">Questions ({totalQuestions} available)</h3>
          <div className="flex gap-2">
            {[5, 10, 15, 20].filter(n => n <= totalQuestions).map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  questionCount === count
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Play className="w-5 h-5" />
          Start Practice
        </button>
      </motion.div>
    </div>
  );
}

// ============================================
// ACTIVE EXAM
// ============================================

interface ActiveExamProps {
  certification: CertificationConfig;
  examMode: ExamMode;
  currentIndex: number;
  totalQuestions: number;
  currentQuestion: CertificationQuestion;
  selectedOption: string | null;
  isAnswered: boolean;
  currentAnswer: AnswerRecord | undefined;
  showExplanation: boolean;
  flaggedQuestions: Set<number>;
  timeRemaining: number;
  isPaused: boolean;
  answers: AnswerRecord[];
  questions: CertificationQuestion[];
  onSelectOption: (optionId: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onGoToQuestion: (index: number) => void;
  onToggleFlag: () => void;
  onTogglePause: () => void;
  onFinish: () => void;
  formatTime: (seconds: number) => string;
}

function ActiveExam({
  certification,
  examMode,
  currentIndex,
  totalQuestions,
  currentQuestion,
  selectedOption,
  isAnswered,
  currentAnswer,
  showExplanation,
  flaggedQuestions,
  timeRemaining,
  isPaused,
  answers,
  questions,
  onSelectOption,
  onNext,
  onPrev,
  onGoToQuestion,
  onToggleFlag,
  onTogglePause,
  onFinish,
  formatTime,
}: ActiveExamProps) {
  const [showNav, setShowNav] = useState(false);
  const isFlagged = flaggedQuestions.has(currentIndex);
  const correctOption = currentQuestion.options.find(o => o.isCorrect);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {certification.name}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {examMode === 'timed' && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  timeRemaining < 60 ? 'bg-red-500/10 text-red-500' : 'bg-muted'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                  <button onClick={onTogglePause} className="ml-1">
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowNav(!showNav)}
                className="px-3 py-1.5 bg-muted rounded-lg text-sm font-medium"
              >
                {currentIndex + 1}/{totalQuestions}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Question Navigator Overlay */}
      <AnimatePresence>
        {showNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNav(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-3" />
                <h3 className="font-semibold">Question Navigator</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, i) => {
                  const answer = answers.find(a => a.questionId === questions[i].id);
                  const isCurrent = i === currentIndex;
                  const isFlag = flaggedQuestions.has(i);
                  
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        onGoToQuestion(i);
                        setShowNav(false);
                      }}
                      className={`relative aspect-square rounded-lg font-medium text-sm transition-all ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : answer
                          ? answer.isCorrect
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {i + 1}
                      {isFlag && (
                        <Flag className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-4 text-xs text-muted-foreground justify-center">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500/20" /> Correct
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500/20" /> Wrong
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-muted" /> Unanswered
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Domain & Difficulty */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
            {currentQuestion.domain.replace(/-/g, ' ')}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            currentQuestion.difficulty === 'beginner' ? 'bg-green-500/10 text-green-500' :
            currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-500' :
            'bg-red-500/10 text-red-500'
          }`}>
            {currentQuestion.difficulty}
          </span>
          <button
            onClick={onToggleFlag}
            className={`ml-auto p-1.5 rounded-lg transition-colors ${
              isFlagged ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>

        {/* Question */}
        <h2 className="text-lg font-medium mb-6 leading-relaxed">
          {currentQuestion.question}
        </h2>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOption === option.id;
            const showResult = isAnswered && (examMode === 'practice' || examMode === 'review');
            const isCorrect = option.isCorrect;
            
            return (
              <button
                key={option.id}
                onClick={() => !isAnswered && onSelectOption(option.id)}
                disabled={isAnswered && examMode !== 'review'}
                className={`w-full p-4 text-left border-2 rounded-xl transition-all ${
                  showResult
                    ? isCorrect
                      ? 'border-green-500 bg-green-500/10'
                      : isSelected
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-border'
                    : isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${isAnswered && examMode !== 'review' ? 'cursor-default' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    showResult && isCorrect ? 'border-green-500 bg-green-500' :
                    showResult && isSelected && !isCorrect ? 'border-red-500 bg-red-500' :
                    isSelected ? 'border-primary bg-primary' :
                    'border-muted-foreground/30'
                  }`}>
                    {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-white" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-white" />}
                    {!showResult && isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm leading-relaxed">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && currentQuestion.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-500 mb-1">Explanation</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {currentIndex === totalQuestions - 1 ? (
            <button
              onClick={onFinish}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              <Trophy className="w-5 h-5" />
              Finish
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!isAnswered && examMode === 'practice'}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}


// ============================================
// RESULTS SCREEN
// ============================================

interface ResultsScreenProps {
  certification: CertificationConfig;
  examConfig: CertificationExamConfig | undefined;
  results: {
    correct: number;
    total: number;
    percentage: number;
    passed: boolean;
    totalTime: number;
    avgTime: number;
    domainResults: Record<string, { correct: number; total: number; percentage: number }>;
  };
  questions: CertificationQuestion[];
  answers: AnswerRecord[];
  onRetry: () => void;
  onReview: () => void;
  onBack: () => void;
}

function ResultsScreen({
  certification,
  examConfig,
  results,
  questions,
  answers,
  onRetry,
  onReview,
  onBack,
}: ResultsScreenProps) {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Result Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
            results.passed 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
              : 'bg-gradient-to-br from-red-500 to-rose-600'
          }`}>
            {results.passed ? (
              <Trophy className="w-12 h-12 text-white" />
            ) : (
              <RotateCcw className="w-12 h-12 text-white" />
            )}
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {results.passed ? '🎉 Congratulations!' : 'Keep Practicing!'}
          </h1>
          
          <p className="text-muted-foreground mb-4">
            {results.passed 
              ? `You passed the ${certification.name} practice exam!`
              : `You need ${examConfig?.passingScore || 70}% to pass. Keep studying!`
            }
          </p>

          {/* Score Circle */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${results.percentage * 3.52} 352`}
                className={results.passed ? 'text-green-500' : 'text-red-500'}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{results.percentage}%</span>
              <span className="text-xs text-muted-foreground">
                {results.correct}/{results.total}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Target className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{results.correct}</div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{results.avgTime}s</div>
            <div className="text-xs text-muted-foreground">Avg Time</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{examConfig?.passingScore || 70}%</div>
            <div className="text-xs text-muted-foreground">Pass Mark</div>
          </div>
        </div>

        {/* Domain Breakdown */}
        {examConfig && Object.keys(results.domainResults).length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Domain Performance
            </h3>
            <div className="space-y-3">
              {examConfig.domains.map(domain => {
                const domainResult = results.domainResults[domain.id];
                if (!domainResult || domainResult.total === 0) return null;
                
                return (
                  <div key={domain.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{domain.name}</span>
                      <span className={`font-medium ${
                        domainResult.percentage >= 70 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {domainResult.correct}/{domainResult.total} ({domainResult.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          domainResult.percentage >= 70 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${domainResult.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onReview}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Review Answers
          </button>
          
          <button
            onClick={onRetry}
            className="w-full py-3 bg-muted rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
          
          <button
            onClick={onBack}
            className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Certification
          </button>
        </div>
      </div>
    </div>
  );
}
