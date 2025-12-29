/**
 * Voice Interview Session Page
 * 
 * Session-based voice interview with related questions:
 * - Sessions contain 4-6 related questions on a topic
 * - Questions progress from basic to advanced
 * - Each question expects a focused 1-2 sentence answer
 * - Immediate feedback with keyword matching
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, RotateCcw, Home, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Loader2,
  Target, MessageSquare, Edit3,
  BarChart3, Sparkles, Play, ArrowRight, BookOpen, Volume2
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { getAllQuestionsAsync } from '../lib/questions-loader';
import { useCredits } from '../context/CreditsContext';
import { useUserPreferences } from '../hooks/use-user-preferences';
import { CreditsDisplay } from '../components/CreditsDisplay';
import { ListenButton } from '../components/ListenButton';
import {
  type VoiceSession,
  type SessionState,
  type SessionResult,
  type SessionQuestion,
  loadVoiceSessions,
  generateSessionsFromQuestions,
  buildSessionQuestions,
  startSession,
  beginSession,
  submitAnswer,
  nextQuestion,
  getCurrentQuestion,
  completeSession,
  saveSessionState,
  loadSessionState,
  clearSessionState,
  saveSessionToHistory
} from '../lib/voice-interview-session';
import type { Question } from '../types';

type PageState = 'loading' | 'select' | 'intro' | 'recording' | 'editing' | 'feedback' | 'practice' | 'results';

const isSpeechSupported = typeof window !== 'undefined' && 
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export default function VoiceSession() {
  const [, setLocation] = useLocation();
  const params = useParams<{ questionId?: string }>();
  const { preferences } = useUserPreferences();
  
  const [pageState, setPageState] = useState<PageState>('loading');
  const [availableSessions, setAvailableSessions] = useState<VoiceSession[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [practiceTranscript, setPracticeTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { onVoiceInterview } = useCredits();

  const currentQuestion = sessionState ? getCurrentQuestion(sessionState) : null;


  // Load sessions and questions
  useEffect(() => {
    async function loadData() {
      try {
        // Load all questions first
        const questions = await getAllQuestionsAsync();
        setAllQuestions(questions);
        
        // Try to load pre-built sessions
        let sessions = await loadVoiceSessions();
        
        // If no pre-built sessions, generate from questions
        if (sessions.length === 0) {
          sessions = generateSessionsFromQuestions(questions);
        }
        
        // Filter to subscribed channels
        const subscribedChannels = preferences.subscribedChannels;
        const filteredSessions = sessions.filter(s => 
          subscribedChannels.includes(s.channel)
        );
        
        setAvailableSessions(filteredSessions);
        
        // Check for saved session state
        const saved = loadSessionState();
        if (saved && saved.status !== 'completed') {
          setSessionState(saved);
          setPageState('intro');
          return;
        }
        
        setPageState('select');
      } catch (err) {
        setError('Failed to load sessions');
        console.error(err);
      }
    }
    loadData();
  }, [preferences.subscribedChannels]);

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
        // Use practice transcript if in practice mode
        if (pageState === 'practice') {
          setPracticeTranscript(prev => prev + final);
        } else {
          setTranscript(prev => prev + final);
        }
      }
      setInterimTranscript(interim);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied.');
      }
    };
    
    recognition.onend = () => {
      if (pageState === 'recording' || pageState === 'practice') {
        try { recognition.start(); } catch (e) { /* ignore */ }
      }
    };
    
    recognitionRef.current = recognition;
    return () => { recognition.stop(); };
  }, [pageState]);

  // Recording timer
  useEffect(() => {
    if (pageState === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pageState]);

  const startNewSession = useCallback((session: VoiceSession) => {
    // Build session questions from the question data
    const sessionQuestions = buildSessionQuestions(session, allQuestions);
    
    if (sessionQuestions.length < 3) {
      setError('Not enough questions available for this session');
      return;
    }
    
    const newState = startSession(session, sessionQuestions);
    setSessionState(newState);
    saveSessionState(newState);
    setPageState('intro');
  }, [allQuestions]);

  const beginQuestions = useCallback(() => {
    if (!sessionState) return;
    const updated = beginSession(sessionState);
    setSessionState(updated);
    saveSessionState(updated);
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    
    // Start recording immediately
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setPageState('recording');
      } catch (err) {
        setError('Failed to start recording.');
        setPageState('editing');
      }
    }
  }, [sessionState]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setPageState('editing');
  }, []);

  const submitCurrentAnswer = useCallback(() => {
    if (!sessionState || !transcript.trim()) {
      setError('Please provide an answer.');
      return;
    }
    
    const updated = submitAnswer(sessionState, transcript.trim());
    setSessionState(updated);
    saveSessionState(updated);
    setPageState('feedback');
  }, [sessionState, transcript]);

  const goToNextQuestion = useCallback(() => {
    if (!sessionState) return;
    
    // Check if session is complete
    if (sessionState.currentQuestionIndex >= sessionState.questions.length - 1) {
      // Complete the session
      const result = completeSession(sessionState);
      setSessionResult(result);
      saveSessionToHistory(result);
      clearSessionState();
      
      // Award credits
      const verdict = result.overallScore >= 60 ? 'hire' : 'no-hire';
      onVoiceInterview(verdict);
      
      setPageState('results');
    } else {
      // Move to next question
      const updated = nextQuestion(sessionState);
      setSessionState(updated);
      saveSessionState(updated);
      setTranscript('');
      setInterimTranscript('');
      setRecordingTime(0);
      
      // Start recording
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setPageState('recording');
        } catch (err) {
          setPageState('editing');
        }
      }
    }
  }, [sessionState, onVoiceInterview]);

  const retryQuestion = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setPageState('recording');
      } catch (err) {
        setPageState('editing');
      }
    }
  }, []);

  const exitSession = useCallback(() => {
    clearSessionState();
    setSessionState(null);
    setSessionResult(null);
    setPageState('select');
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Unsupported browser
  if (!isSpeechSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Browser Not Supported</h1>
          <p className="text-muted-foreground mb-4">
            Voice sessions require the Web Speech API. Use Chrome, Edge, or Safari.
          </p>
          <button onClick={() => setLocation('/')} className="px-4 py-2 bg-primary text-primary-foreground rounded">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  // Session selection
  if (pageState === 'select') {
    // Group sessions by channel
    const byChannel: Record<string, VoiceSession[]> = {};
    for (const session of availableSessions) {
      if (!byChannel[session.channel]) byChannel[session.channel] = [];
      byChannel[session.channel].push(session);
    }

    return (
      <>
        <SEOHead
          title="Voice Sessions | Code Reels"
          description="Practice interview topics with focused question sessions"
          canonical="https://open-interview.github.io/voice-session"
        />
        <div className="min-h-screen bg-background text-foreground font-mono">
          <header className="border-b border-border p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setLocation('/')} className="p-2 hover:bg-muted/20 rounded-lg">
                  <Home className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Voice Sessions
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {availableSessions.length} sessions available
                  </p>
                </div>
              </div>
              <CreditsDisplay compact onClick={() => setLocation('/profile')} />
            </div>
          </header>

          <main className="max-w-4xl mx-auto p-4">
            {availableSessions.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sessions available for your subscribed channels.</p>
                <button
                  onClick={() => setLocation('/channels')}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
                >
                  Subscribe to Channels
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(byChannel).map(([channel, sessions]) => (
                  <div key={channel}>
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
                      {channel.replace(/-/g, ' ')}
                    </h2>
                    <div className="grid gap-3">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => startNewSession(session)}
                          className="p-4 bg-card border border-border rounded-lg text-left hover:border-primary/50 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="font-medium group-hover:text-primary">
                                {session.topic}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {session.description}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  session.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                                  session.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {session.difficulty}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {session.totalQuestions} questions
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ~{session.estimatedMinutes} min
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </>
    );
  }

  // Session intro
  if (pageState === 'intro' && sessionState) {
    return (
      <>
        <SEOHead title={`${sessionState.session.topic} | Voice Session`} description="Voice interview session practice" />
        <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg w-full bg-card border border-border rounded-lg p-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl font-bold mb-2">{sessionState.session.topic}</h1>
              <p className="text-sm text-muted-foreground">
                {sessionState.questions.length} related questions • ~{sessionState.session.estimatedMinutes} min
              </p>
            </div>

            <div className="bg-muted/20 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium mb-2">{sessionState.session.description}</h3>
              <p className="text-xs text-muted-foreground">
                Questions progress from basic to advanced concepts.
              </p>
            </div>

            <div className="space-y-2 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Answer each question in 1-2 sentences</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Use specific technical terms</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Get instant feedback after each answer</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={exitSession} className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted/20">
                Back
              </button>
              <button
                onClick={beginQuestions}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }


  // Recording/Editing
  if ((pageState === 'recording' || pageState === 'editing') && sessionState && currentQuestion) {
    const progress = ((sessionState.currentQuestionIndex + 1) / sessionState.questions.length) * 100;
    
    return (
      <>
        <SEOHead title={`Q${sessionState.currentQuestionIndex + 1} | ${sessionState.session.topic}`} description="Answer the interview question" />
        <div className="min-h-screen bg-background text-foreground font-mono">
          <header className="border-b border-border p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button onClick={exitSession} className="p-2 hover:bg-muted/20 rounded-lg">
                    <Home className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="font-bold text-sm">{sessionState.session.topic}</h1>
                    <p className="text-xs text-muted-foreground">
                      Question {sessionState.currentQuestionIndex + 1} of {sessionState.questions.length}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  currentQuestion.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                  currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto p-4">
            {/* Question */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-6 mb-6"
            >
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-lg font-medium">{currentQuestion.question}</h2>
                  <div className="flex items-center gap-3 mt-3">
                    <ListenButton text={currentQuestion.question} label="Listen" size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {currentQuestion.criticalPoints.length} key points
                    </span>
                  </div>
                </div>
              </div>
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </motion.div>

            {/* Recording Interface */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                {pageState === 'recording' && (
                  <div className="flex items-center gap-2 text-red-500">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-mono">{formatTime(recordingTime)}</span>
                  </div>
                )}
                {pageState === 'editing' && (
                  <div className="flex items-center gap-2 text-amber-500">
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm">Edit, then submit</span>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="mb-6">
                {pageState === 'editing' ? (
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full p-4 bg-muted/20 border border-amber-500/30 rounded-lg min-h-[100px] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    placeholder="Edit your answer..."
                  />
                ) : (
                  <div className="p-4 bg-muted/20 rounded-lg min-h-[80px]">
                    <p className="text-sm whitespace-pre-wrap">
                      {transcript}
                      <span className="text-muted-foreground">{interimTranscript}</span>
                      {pageState === 'recording' && <span className="animate-pulse">|</span>}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Keep it brief: 1-2 sentences with key terms
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                {pageState === 'recording' && (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-bold rounded-full hover:bg-red-600"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </button>
                )}
                {pageState === 'editing' && (
                  <div className="flex gap-3">
                    <button
                      onClick={retryQuestion}
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted/20"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Re-record
                    </button>
                    <button
                      onClick={submitCurrentAnswer}
                      disabled={!transcript.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Submit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }


  // Feedback after answering
  if (pageState === 'feedback' && sessionState) {
    const lastAnswer = sessionState.answers[sessionState.answers.length - 1];
    const answeredQuestion = sessionState.questions[sessionState.currentQuestionIndex];
    const isLastQuestion = sessionState.currentQuestionIndex >= sessionState.questions.length - 1;
    
    const startPracticeMode = () => {
      setPracticeTranscript('');
      setInterimTranscript('');
      setRecordingTime(0);
      setPageState('practice');
      
      // Start recording for practice
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) { /* ignore */ }
      }
    };
    
    return (
      <>
        <SEOHead title="Feedback | Voice Session" description="Review your answer feedback" />
        <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full bg-card border border-border rounded-lg p-6"
          >
            {/* Score */}
            <div className="text-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                lastAnswer.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {lastAnswer.isCorrect ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
              <div className="text-3xl font-bold mb-1">{lastAnswer.score}%</div>
              <p className="text-sm text-muted-foreground">
                {lastAnswer.isCorrect ? 'Good answer!' : 'Needs improvement'}
              </p>
            </div>

            {/* Feedback */}
            <div className="bg-muted/20 rounded-lg p-4 mb-4">
              <p className="text-sm">{lastAnswer.feedback}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                Score: {lastAnswer.weightedScore}/{lastAnswer.maxPossibleScore} weighted points
              </div>
            </div>

            {/* Critical Points */}
            <div className="space-y-3 mb-4">
              {lastAnswer.pointsCovered.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Covered
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {lastAnswer.pointsCovered.map((point, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                        {point.phrase}
                        <span className="opacity-60">×{point.weight}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {lastAnswer.pointsMissed.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Missed
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {lastAnswer.pointsMissed.map((point, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded flex items-center gap-1">
                        {point.phrase}
                        <span className="opacity-60">×{point.weight}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Practice Mode CTA */}
            {answeredQuestion.idealAnswer && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-400 mb-1">Practice the Ideal Answer</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Read the ideal answer aloud to practice pronunciation and memorize key terms.
                    </p>
                    <button
                      onClick={startPracticeMode}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded hover:bg-blue-500/30 transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Practice Reading Aloud
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={retryQuestion}
                className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted/20 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={goToNextQuestion}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                {isLastQuestion ? (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Results
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // Practice Mode - Read ideal answer aloud
  if (pageState === 'practice' && sessionState) {
    const answeredQuestion = sessionState.questions[sessionState.currentQuestionIndex];
    const isLastQuestion = sessionState.currentQuestionIndex >= sessionState.questions.length - 1;
    
    const stopPractice = () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setPageState('feedback');
    };
    
    const finishPractice = () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setPracticeTranscript('');
      setInterimTranscript('');
      goToNextQuestion();
    };
    
    return (
      <>
        <SEOHead title="Practice Mode | Voice Session" description="Practice reading the ideal answer" />
        <div className="min-h-screen bg-background text-foreground font-mono">
          <header className="border-b border-border p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={stopPractice} className="p-2 hover:bg-muted/20 rounded-lg">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
                <div>
                  <h1 className="font-bold text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    Practice Mode
                  </h1>
                  <p className="text-xs text-muted-foreground">Read the ideal answer aloud</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-red-500">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono text-sm">{formatTime(recordingTime)}</span>
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto p-4">
            {/* Ideal Answer to Read */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Read This Aloud
                </h2>
                <ListenButton text={answeredQuestion.idealAnswer} label="Listen" size="sm" />
              </div>
              <p className="text-lg leading-relaxed">{answeredQuestion.idealAnswer}</p>
              
              {/* Keywords to emphasize */}
              <div className="mt-4 pt-4 border-t border-blue-500/20">
                <p className="text-xs text-muted-foreground mb-2">Key points to emphasize:</p>
                <div className="flex flex-wrap gap-1">
                  {answeredQuestion.criticalPoints.map((point, i) => (
                    <span key={i} className={`px-2 py-0.5 text-xs rounded font-medium flex items-center gap-1 ${
                      point.weight === 3 ? 'bg-blue-500/30 text-blue-300' :
                      point.weight === 2 ? 'bg-blue-500/20 text-blue-400' :
                      'bg-blue-500/10 text-blue-400/80'
                    }`}>
                      {point.phrase}
                      {point.weight > 1 && <span className="opacity-60">×{point.weight}</span>}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Your Recording */}
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Mic className="w-4 h-4 text-red-400" />
                Your Recording
              </h3>
              <div className="p-4 bg-muted/20 rounded-lg min-h-[100px]">
                <p className="text-sm whitespace-pre-wrap">
                  {practiceTranscript}
                  <span className="text-muted-foreground">{interimTranscript}</span>
                  <span className="animate-pulse">|</span>
                </p>
                {!practiceTranscript && !interimTranscript && (
                  <p className="text-muted-foreground text-sm">Start reading the answer above...</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <button
                onClick={stopPractice}
                className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted/20 flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" />
                Back to Feedback
              </button>
              <button
                onClick={finishPractice}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                {isLastQuestion ? (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Finish Session
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Done, Next Question
                  </>
                )}
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  // Final results
  if (pageState === 'results' && sessionResult) {
    return (
      <>
        <SEOHead title="Results | Voice Session" description="Your session results and score" />
        <div className="min-h-screen bg-background text-foreground font-mono">
          <header className="border-b border-border p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <h1 className="font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Session Complete
              </h1>
              <CreditsDisplay compact onClick={() => setLocation('/profile')} />
            </div>
          </header>

          <main className="max-w-4xl mx-auto p-4">
            {/* Overall Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-6 mb-6 text-center"
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                sessionResult.verdict === 'excellent' ? 'bg-green-500/20' :
                sessionResult.verdict === 'good' ? 'bg-blue-500/20' :
                sessionResult.verdict === 'needs-work' ? 'bg-yellow-500/20' : 'bg-red-500/20'
              }`}>
                <span className={`text-4xl font-bold ${
                  sessionResult.verdict === 'excellent' ? 'text-green-400' :
                  sessionResult.verdict === 'good' ? 'text-blue-400' :
                  sessionResult.verdict === 'needs-work' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {sessionResult.overallScore}%
                </span>
              </div>
              
              <h2 className="text-xl font-bold mb-2">{sessionResult.topic}</h2>
              <p className={`text-sm font-medium ${
                sessionResult.verdict === 'excellent' ? 'text-green-400' :
                sessionResult.verdict === 'good' ? 'text-blue-400' :
                sessionResult.verdict === 'needs-work' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {sessionResult.verdict === 'excellent' ? '🌟 Excellent!' :
                 sessionResult.verdict === 'good' ? '👍 Good Job!' :
                 sessionResult.verdict === 'needs-work' ? '📚 Keep Practicing' : '🔄 Review Topic'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{sessionResult.summary}</p>
            </motion.div>

            {/* Question Breakdown */}
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="font-bold mb-4">Question Breakdown</h3>
              <div className="space-y-3">
                {sessionResult.answers.map((answer, index) => (
                  <div key={answer.questionId} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        answer.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm">Question {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${answer.score >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                        {answer.score}%
                      </span>
                      {answer.isCorrect ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {sessionResult.strengths.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h4 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Strengths
                  </h4>
                  <ul className="space-y-2">
                    {sessionResult.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sessionResult.areasToImprove.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h4 className="font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" /> To Improve
                  </h4>
                  <ul className="space-y-2">
                    {sessionResult.areasToImprove.map((a, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setLocation('/')} className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted/20">
                <Home className="w-4 h-4 inline mr-2" />
                Home
              </button>
              <button onClick={exitSession} className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90">
                <Target className="w-4 h-4 inline mr-2" />
                New Session
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  return null;
}
