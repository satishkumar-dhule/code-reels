/**
 * Voice Interview Practice Page
 * - Uses Web Speech API for browser-based transcription
 * - Compares spoken answer with ideal answer
 * - Provides hire/no-hire feedback with detailed scoring
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Play, Square, RotateCcw, Home, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Volume2, Loader2, Sparkles,
  ThumbsUp, ThumbsDown, Minus, Clock, Target, MessageSquare, Coins, Edit3
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { getAllQuestionsAsync } from '../lib/questions-loader';
import { useCredits } from '../context/CreditsContext';
import { CreditsDisplay } from '../components/CreditsDisplay';
import { ListenButton } from '../components/ListenButton';
import type { Question } from '../types';

interface EvaluationResult {
  score: number; // 0-100
  verdict: 'strong-hire' | 'hire' | 'lean-hire' | 'lean-no-hire' | 'no-hire';
  keyPointsCovered: string[];
  keyPointsMissed: string[];
  feedback: string;
  strengths: string[];
  improvements: string[];
}

type InterviewState = 'loading' | 'ready' | 'recording' | 'editing' | 'processing' | 'evaluated';

// Check if Web Speech API is supported
const isSpeechSupported = typeof window !== 'undefined' && 
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export default function VoiceInterview() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<InterviewState>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [earnedCredits, setEarnedCredits] = useState<{ total: number; bonus: number } | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { onVoiceInterview, config } = useCredits();

  const currentQuestion = questions[currentIndex];

  // Load random questions for interview practice
  useEffect(() => {
    async function loadQuestions() {
      try {
        const allQuestions = await getAllQuestionsAsync();
        
        // Filter to questions suitable for voice interview
        // Prioritize questions with voiceSuitable=true and voiceKeywords
        const suitable = allQuestions.filter((q: Question) => {
          // If voiceSuitable is explicitly set, use it
          if (q.voiceSuitable === false) return false;
          if (q.voiceSuitable === true && q.voiceKeywords && q.voiceKeywords.length > 0) return true;
          
          // Fallback: filter by channel for questions not yet processed
          return ['behavioral', 'system-design', 'sre', 'devops'].includes(q.channel) &&
            q.answer && q.answer.length > 100;
        });
        
        // Shuffle and take 10 random questions
        const shuffled = suitable.sort(() => Math.random() - 0.5).slice(0, 10);
        setQuestions(shuffled);
        setState('ready');
      } catch (err) {
        setError('Failed to load interview questions');
        console.error(err);
      }
    }
    loadQuestions();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechSupported) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (final) {
        setTranscript(prev => prev + final);
      }
      setInterimTranscript(interim);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access and try again.');
      }
    };
    
    recognition.onend = () => {
      if (state === 'recording') {
        // Restart if still in recording state (handles auto-stop)
        try {
          recognition.start();
        } catch (e) {
          // Already started, ignore
        }
      }
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      recognition.stop();
    };
  }, [state]);

  // Recording timer
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    setEvaluation(null);
    setError(null);
    
    try {
      recognitionRef.current.start();
      setState('recording');
    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    // Go to editing state to allow user to fix transcript
    setState('editing');
  }, []);

  // Submit the edited transcript for evaluation
  const submitAnswer = useCallback(() => {
    if (!currentQuestion || !transcript.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }
    
    setState('processing');
    
    // Evaluate the answer using voiceKeywords from database if available
    setTimeout(() => {
      const result = evaluateAnswer(transcript, currentQuestion.answer, currentQuestion.voiceKeywords);
      setEvaluation(result);
      
      // Award credits for the attempt
      const credits = onVoiceInterview(result.verdict);
      setEarnedCredits({ total: credits.totalCredits, bonus: credits.bonusCredits });
      
      setState('evaluated');
    }, 500);
  }, [transcript, currentQuestion, onVoiceInterview]);

  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTranscript('');
      setInterimTranscript('');
      setEvaluation(null);
      setEarnedCredits(null);
      setRecordingTime(0);
      setState('ready');
    }
  }, [currentIndex, questions.length]);

  const retryQuestion = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setEvaluation(null);
    setRecordingTime(0);
    setState('ready');
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render unsupported browser message
  if (!isSpeechSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Browser Not Supported</h1>
          <p className="text-muted-foreground mb-4">
            Voice interview requires the Web Speech API which is not supported in your browser.
            Please use Chrome, Edge, or Safari for the best experience.
          </p>
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (state === 'loading' || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading interview questions...</p>
        </div>
      </div>
    );
  }

  if (error && !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Voice Interview Practice | Code Reels"
        description="Practice answering interview questions out loud with AI-powered feedback"
        canonical="https://open-interview.github.io/voice-interview"
      />

      <div className="min-h-screen bg-background text-foreground font-mono">
        {/* Header */}
        <header className="border-b border-border p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/')}
                className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-bold flex items-center gap-2">
                  <Mic className="w-5 h-5 text-primary" />
                  Voice Interview
                </h1>
                <p className="text-xs text-muted-foreground">
                  Question {currentIndex + 1} of {questions.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Credits Display */}
              <CreditsDisplay compact onClick={() => setLocation('/profile')} />
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  currentQuestion?.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                  currentQuestion?.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {currentQuestion?.difficulty}
                </span>
                <span className="px-2 py-1 text-xs bg-primary/20 text-primary rounded">
                  {currentQuestion?.channel}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto p-4">
          {/* Question Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-6 mb-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <h2 className="text-lg font-medium">{currentQuestion?.question}</h2>
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">
                {error}
              </div>
            )}
          </motion.div>

          {/* Recording Interface */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            {/* Recording Status */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {state === 'recording' && (
                <>
                  <div className="flex items-center gap-2 text-red-500">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-mono">{formatTime(recordingTime)}</span>
                  </div>
                </>
              )}
              
              {state === 'editing' && (
                <div className="flex items-center gap-2 text-amber-500">
                  <span className="text-sm">Edit your answer below, then submit for evaluation</span>
                </div>
              )}
              
              {state === 'processing' && (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing your answer...</span>
                </div>
              )}
            </div>

            {/* Transcript Display - Editable in editing state */}
            {(state === 'recording' || state === 'editing' || transcript) && state !== 'evaluated' && (
              <div className="mb-6">
                {state === 'editing' ? (
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full p-4 bg-muted/20 border border-amber-500/30 rounded-lg min-h-[150px] max-h-[300px] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    placeholder="Edit your transcribed answer here..."
                  />
                ) : (
                  <div className="p-4 bg-muted/20 rounded-lg min-h-[120px] max-h-[200px] overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">
                      {transcript}
                      <span className="text-muted-foreground">{interimTranscript}</span>
                      {state === 'recording' && <span className="animate-pulse">|</span>}
                    </p>
                  </div>
                )}
                {state === 'editing' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Fix any transcription errors before submitting
                  </p>
                )}
              </div>
            )}

            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-4">
              {state === 'ready' && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-all hover:scale-105"
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </button>
              )}
              
              {state === 'recording' && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-all hover:scale-105"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </button>
              )}
              
              {state === 'editing' && (
                <div className="flex gap-3">
                  <button
                    onClick={retryQuestion}
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Re-record
                  </button>
                  <button
                    onClick={submitAnswer}
                    disabled={!transcript.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Submit Answer
                  </button>
                </div>
              )}
              
              {state === 'evaluated' && (
                <div className="flex gap-3">
                  <button
                    onClick={retryQuestion}
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </button>
                  {currentIndex < questions.length - 1 && (
                    <button
                      onClick={nextQuestion}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Next Question
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Evaluation Results */}
          <AnimatePresence>
            {evaluation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Credits Earned Banner */}
                {earnedCredits && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="font-bold text-amber-400">+{earnedCredits.total} Credits Earned!</div>
                        <div className="text-xs text-muted-foreground">
                          {earnedCredits.bonus > 0 
                            ? `${config.VOICE_ATTEMPT} base + ${earnedCredits.bonus} success bonus`
                            : 'Thanks for practicing!'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Verdict Card */}
                <div className={`p-6 rounded-lg border ${getVerdictStyle(evaluation.verdict)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getVerdictIcon(evaluation.verdict)}
                      <div>
                        <h3 className="font-bold text-lg">{getVerdictLabel(evaluation.verdict)}</h3>
                        <p className="text-sm opacity-80">Interview Assessment</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{evaluation.score}%</div>
                      <div className="text-xs opacity-70">Match Score</div>
                    </div>
                  </div>
                  
                  {/* Score Bar */}
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden mb-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${evaluation.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full ${getScoreBarColor(evaluation.score)}`}
                    />
                  </div>
                  
                  <p className="text-sm">{evaluation.feedback}</p>
                </div>

                {/* Key Points */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Covered Points */}
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <h4 className="font-bold text-green-400 flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4" />
                      Key Points Covered ({evaluation.keyPointsCovered.length})
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.keyPointsCovered.map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>{point}</span>
                        </li>
                      ))}
                      {evaluation.keyPointsCovered.length === 0 && (
                        <li className="text-sm text-muted-foreground">No key points identified</li>
                      )}
                    </ul>
                  </div>

                  {/* Missed Points */}
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h4 className="font-bold text-red-400 flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4" />
                      Key Points Missed ({evaluation.keyPointsMissed.length})
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.keyPointsMissed.map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-red-400 mt-1">✗</span>
                          <span>{point}</span>
                        </li>
                      ))}
                      {evaluation.keyPointsMissed.length === 0 && (
                        <li className="text-sm text-muted-foreground">Great job covering all points!</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Strengths & Improvements */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <h4 className="font-bold flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {evaluation.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-card border border-border rounded-lg">
                    <h4 className="font-bold flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-blue-400" />
                      Areas to Improve
                    </h4>
                    <ul className="space-y-1">
                      {evaluation.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Ideal Answer Reference */}
                <details className="p-4 bg-muted/20 border border-border rounded-lg">
                  <summary className="cursor-pointer font-bold flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    View Ideal Answer
                  </summary>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-end">
                      <ListenButton 
                        text={currentQuestion?.answer || ''} 
                        label="Listen to Answer"
                        size="sm"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {currentQuestion?.answer}
                    </div>
                  </div>
                </details>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}


// Helper functions for verdict display
function getVerdictStyle(verdict: EvaluationResult['verdict']): string {
  switch (verdict) {
    case 'strong-hire':
      return 'bg-green-500/20 border-green-500/50 text-green-100';
    case 'hire':
      return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100';
    case 'lean-hire':
      return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100';
    case 'lean-no-hire':
      return 'bg-orange-500/20 border-orange-500/50 text-orange-100';
    case 'no-hire':
      return 'bg-red-500/20 border-red-500/50 text-red-100';
  }
}

function getVerdictIcon(verdict: EvaluationResult['verdict']) {
  switch (verdict) {
    case 'strong-hire':
    case 'hire':
      return <ThumbsUp className="w-8 h-8 text-green-400" />;
    case 'lean-hire':
      return <Minus className="w-8 h-8 text-yellow-400" />;
    case 'lean-no-hire':
    case 'no-hire':
      return <ThumbsDown className="w-8 h-8 text-red-400" />;
  }
}

function getVerdictLabel(verdict: EvaluationResult['verdict']): string {
  switch (verdict) {
    case 'strong-hire': return 'Strong Hire';
    case 'hire': return 'Hire';
    case 'lean-hire': return 'Lean Hire';
    case 'lean-no-hire': return 'Lean No Hire';
    case 'no-hire': return 'No Hire';
  }
}

function getScoreBarColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 55) return 'bg-emerald-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

// Evaluate answer by comparing with mandatory keywords from database
// This runs entirely in the browser (edge) - no API calls
// Uses fuzzy matching to handle pronunciation variations
function evaluateAnswer(userAnswer: string, idealAnswer: string, voiceKeywords?: string[]): EvaluationResult {
  const userWords = userAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const idealWords = idealAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  // Use voiceKeywords from database if available, otherwise fall back to extraction
  const mandatoryKeywords = voiceKeywords && voiceKeywords.length > 0 
    ? voiceKeywords 
    : extractKeyTerms(idealAnswer);
  
  // Use fuzzy matching for keyword coverage (handles pronunciation errors)
  const coveredTerms: string[] = [];
  const missedTerms: string[] = [];
  
  for (const keyword of mandatoryKeywords) {
    if (fuzzyMatch(userAnswer.toLowerCase(), keyword.toLowerCase())) {
      coveredTerms.push(keyword);
    } else {
      missedTerms.push(keyword);
    }
  }
  
  // Calculate keyword coverage - this is the PRIMARY scoring factor
  const keywordCoverage = mandatoryKeywords.length > 0 
    ? coveredTerms.length / mandatoryKeywords.length
    : 0;
  
  // Calculate fuzzy word overlap as secondary factor
  let matchedWords = 0;
  for (const userWord of userWords) {
    for (const idealWord of idealWords) {
      if (fuzzyWordMatch(userWord, idealWord)) {
        matchedWords++;
        break;
      }
    }
  }
  const wordOverlap = Math.min(matchedWords / Math.max(idealWords.length * 0.2, 1), 1);
  
  // Calculate length score - need substantial answer (at least 40 words for full credit)
  const minWords = 40;
  const lengthScore = Math.min(userWords.length / minWords, 1);
  
  // Penalize very short answers heavily
  const shortAnswerPenalty = userWords.length < 10 ? 0.2 : userWords.length < 20 ? 0.5 : userWords.length < 30 ? 0.8 : 1;
  
  // Combined score - keyword coverage is PRIMARY (60%), rest is secondary
  let score = (
    keywordCoverage * 60 +   // Mandatory keywords are most important
    wordOverlap * 20 +       // Word overlap as secondary
    lengthScore * 20         // Length shows effort
  ) * shortAnswerPenalty;
  
  score = Math.min(Math.round(score), 100);
  
  // Verdict based on keyword coverage primarily
  let verdict: EvaluationResult['verdict'];
  const keywordPercent = mandatoryKeywords.length > 0 ? (coveredTerms.length / mandatoryKeywords.length) * 100 : 0;
  
  if (keywordPercent >= 70 && score >= 70) verdict = 'strong-hire';
  else if (keywordPercent >= 50 && score >= 55) verdict = 'hire';
  else if (keywordPercent >= 35 && score >= 40) verdict = 'lean-hire';
  else if (keywordPercent >= 20 && score >= 25) verdict = 'lean-no-hire';
  else verdict = 'no-hire';
  
  // Generate feedback
  const feedback = generateFeedback(score, coveredTerms.length, mandatoryKeywords.length, userWords.length);
  
  // Generate strengths and improvements
  const strengths = generateStrengths(score, coveredTerms, userWords.length, idealWords.length);
  const improvements = generateImprovements(score, missedTerms, userWords.length, idealWords.length);
  
  return {
    score,
    verdict,
    keyPointsCovered: coveredTerms.slice(0, 5),
    keyPointsMissed: missedTerms.slice(0, 5),
    feedback,
    strengths,
    improvements
  };
}

// Fuzzy match a term in text (handles pronunciation variations)
function fuzzyMatch(text: string, term: string): boolean {
  // Direct match
  if (text.includes(term)) return true;
  
  // Check for common pronunciation variations
  const variations = getPronunciationVariations(term);
  for (const variation of variations) {
    if (text.includes(variation)) return true;
  }
  
  // Check if words are similar (Levenshtein-like)
  const textWords = text.split(/\s+/);
  for (const word of textWords) {
    if (similarEnough(word, term)) return true;
  }
  
  return false;
}

// Check if two words are similar enough (handles typos/pronunciation)
function fuzzyWordMatch(word1: string, word2: string): boolean {
  if (word1 === word2) return true;
  if (word1.length < 3 || word2.length < 3) return word1 === word2;
  
  // Check if one contains the other
  if (word1.includes(word2) || word2.includes(word1)) return true;
  
  // Check similarity
  return similarEnough(word1, word2);
}

// Simple similarity check (prefix/suffix matching + edit distance approximation)
function similarEnough(a: string, b: string): boolean {
  if (a === b) return true;
  
  const minLen = Math.min(a.length, b.length);
  const maxLen = Math.max(a.length, b.length);
  
  // If lengths are very different, not similar
  if (maxLen - minLen > 3) return false;
  
  // Check common prefix (at least 60% match)
  let commonPrefix = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) commonPrefix++;
    else break;
  }
  if (commonPrefix >= minLen * 0.6) return true;
  
  // Check if most characters match (simple approximation)
  let matches = 0;
  const aChars = a.split('');
  const bChars = b.split('');
  for (const char of aChars) {
    const idx = bChars.indexOf(char);
    if (idx !== -1) {
      matches++;
      bChars.splice(idx, 1);
    }
  }
  
  return matches >= minLen * 0.7;
}

// Get common pronunciation variations for technical terms
function getPronunciationVariations(term: string): string[] {
  const variations: string[] = [term];
  const lower = term.toLowerCase();
  
  // Common speech-to-text errors and variations
  const mappings: Record<string, string[]> = {
    'api': ['a p i', 'apa', 'apy', 'apis'],
    'sql': ['sequel', 's q l', 'sequel'],
    'nosql': ['no sequel', 'no sql', 'nosql'],
    'aws': ['a w s', 'amazon web services', 'amazon'],
    'gcp': ['g c p', 'google cloud', 'google'],
    'azure': ['asure', 'azur', 'microsoft azure'],
    'kubernetes': ['k8s', 'kube', 'kuber', 'kubernete', 'kubernetes'],
    'docker': ['dokker', 'dockr', 'containers'],
    'ci/cd': ['ci cd', 'cicd', 'continuous integration', 'continuous deployment'],
    'graphql': ['graph ql', 'graph', 'graphical'],
    'rest': ['restful', 'rest api', 'representational'],
    'jwt': ['j w t', 'json web token', 'token'],
    'oauth': ['o auth', 'o off', 'authentication'],
    'cdn': ['c d n', 'content delivery', 'cloudfront'],
    'redis': ['red is', 'redus', 'cache'],
    'kafka': ['cafka', 'kafca', 'message queue'],
    'mongodb': ['mongo', 'mongo db', 'document database'],
    'postgresql': ['postgres', 'post gres', 'postgre'],
    'mysql': ['my sequel', 'my sql', 'maria'],
    'microservice': ['micro service', 'microservices', 'micro'],
    'monolith': ['monolithic', 'mono', 'single service'],
    'scalability': ['scale', 'scaling', 'scalable'],
    'availability': ['available', 'uptime', 'high availability'],
    'reliability': ['reliable', 'dependable'],
    'latency': ['delay', 'response time', 'lag'],
    'throughput': ['through put', 'bandwidth', 'capacity'],
    'load balancer': ['load balance', 'balancer', 'lb', 'nginx'],
    'authentication': ['auth', 'login', 'sign in'],
    'authorization': ['authz', 'permissions', 'access control'],
    'monitoring': ['monitor', 'observability', 'metrics'],
    'logging': ['logs', 'log', 'audit'],
    'terraform': ['terra form', 'infrastructure as code', 'iac'],
    'ansible': ['ansible', 'configuration management'],
    'pipeline': ['pipe line', 'workflow', 'build'],
    'deployment': ['deploy', 'release', 'ship'],
    'container': ['containers', 'containerized', 'containerization'],
    'serverless': ['server less', 'lambda', 'functions'],
    'lambda': ['lamba', 'function', 'serverless'],
    'ec2': ['e c 2', 'ec two', 'instance', 'virtual machine'],
    's3': ['s 3', 's three', 'bucket', 'storage'],
    'queue': ['q', 'message queue', 'messaging'],
    'pub/sub': ['pub sub', 'publish subscribe', 'pubsub'],
    'event-driven': ['event driven', 'events', 'reactive'],
    'circuit breaker': ['circuit break', 'breaker', 'fallback'],
    'cqrs': ['c q r s', 'command query', 'separation'],
    'saga': ['sagas', 'distributed transaction'],
    'stakeholder': ['stake holder', 'stakeholders', 'business'],
    'collaboration': ['collaborate', 'teamwork', 'working together'],
    'communication': ['communicate', 'talking', 'discussion'],
    'leadership': ['leader', 'leading', 'manage'],
    'prioritize': ['priority', 'priorities', 'prioritization'],
    'deadline': ['deadlines', 'timeline', 'due date'],
    'conflict': ['conflicts', 'disagreement', 'issue'],
    'resolution': ['resolve', 'solving', 'solution'],
    'feedback': ['feed back', 'review', 'input'],
  };
  
  if (mappings[lower]) {
    variations.push(...mappings[lower]);
  }
  
  // Add plural/singular variations
  if (lower.endsWith('s')) {
    variations.push(lower.slice(0, -1));
  } else {
    variations.push(lower + 's');
  }
  
  // Add common suffix variations
  if (lower.endsWith('ing')) {
    variations.push(lower.slice(0, -3));
    variations.push(lower.slice(0, -3) + 'e');
  }
  if (lower.endsWith('tion')) {
    variations.push(lower.slice(0, -4) + 'te');
  }
  
  return variations;
}

function extractKeyTerms(text: string): string[] {
  // Common technical terms and patterns to look for
  const patterns = [
    // Technical concepts
    /\b(api|rest|graphql|grpc|websocket|http|https|tcp|udp)\b/gi,
    /\b(database|sql|nosql|mongodb|postgresql|mysql|redis|cache)\b/gi,
    /\b(kubernetes|docker|container|microservice|monolith)\b/gi,
    /\b(aws|azure|gcp|cloud|serverless|lambda|ec2|s3)\b/gi,
    /\b(ci\/cd|pipeline|deployment|devops|terraform|ansible)\b/gi,
    /\b(scalability|availability|reliability|latency|throughput)\b/gi,
    /\b(load balancer|cdn|proxy|gateway|firewall)\b/gi,
    /\b(authentication|authorization|oauth|jwt|security)\b/gi,
    /\b(monitoring|logging|alerting|metrics|observability)\b/gi,
    /\b(queue|kafka|rabbitmq|sqs|pub\/sub|event-driven)\b/gi,
    // Architecture patterns
    /\b(singleton|factory|observer|strategy|adapter)\b/gi,
    /\b(cqrs|event sourcing|saga|circuit breaker)\b/gi,
    // Behavioral keywords
    /\b(stakeholder|communication|collaboration|leadership)\b/gi,
    /\b(prioritize|deadline|conflict|resolution|feedback)\b/gi,
  ];
  
  const terms = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => terms.add(m.toLowerCase()));
    }
  }
  
  // Also extract capitalized terms (likely proper nouns/technologies)
  const capitalizedPattern = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g;
  const capitalizedMatches = text.match(capitalizedPattern);
  if (capitalizedMatches) {
    capitalizedMatches
      .filter(m => m.length > 3 && !['The', 'This', 'That', 'When', 'What', 'How', 'Why'].includes(m))
      .slice(0, 10)
      .forEach(m => terms.add(m.toLowerCase()));
  }
  
  return Array.from(terms);
}

function generateFeedback(score: number, covered: number, total: number, wordCount: number): string {
  if (score >= 70) {
    return `Great answer! You covered ${covered} key concepts. Your response shows solid understanding of the topic.`;
  } else if (score >= 55) {
    return `Good answer! You mentioned ${covered} key concepts. Consider adding a few more specific details.`;
  } else if (score >= 40) {
    return `Decent attempt with ${covered} key points covered. Try to expand on the core concepts more.`;
  } else if (score >= 25) {
    return `You touched on some points but could go deeper. ${covered} concepts were identified. Review the ideal answer for more ideas.`;
  } else {
    return `Keep practicing! Try to mention more specific technical terms and concepts in your answer.`;
  }
}

function generateStrengths(score: number, coveredTerms: string[], userWordCount: number, idealWordCount: number): string[] {
  const strengths: string[] = [];
  
  if (coveredTerms.length > 0) {
    strengths.push(`Mentioned key terms: ${coveredTerms.slice(0, 3).join(', ')}`);
  }
  
  if (userWordCount >= idealWordCount * 0.7) {
    strengths.push('Good answer length with sufficient detail');
  }
  
  if (score >= 60) {
    strengths.push('Demonstrated understanding of core concepts');
  }
  
  if (coveredTerms.length >= 3) {
    strengths.push('Covered multiple relevant technical areas');
  }
  
  if (strengths.length === 0) {
    strengths.push('Attempted to answer the question');
  }
  
  return strengths;
}

function generateImprovements(score: number, missedTerms: string[], userWordCount: number, idealWordCount: number): string[] {
  const improvements: string[] = [];
  
  if (missedTerms.length > 0) {
    improvements.push(`Consider mentioning: ${missedTerms.slice(0, 3).join(', ')}`);
  }
  
  if (userWordCount < idealWordCount * 0.5) {
    improvements.push('Provide more detailed explanations');
  }
  
  if (score < 60) {
    improvements.push('Study the core concepts more thoroughly');
  }
  
  if (score < 80) {
    improvements.push('Add specific examples from your experience');
  }
  
  improvements.push('Practice structuring answers with STAR method for behavioral questions');
  
  return improvements.slice(0, 4);
}
