/**
 * Voice Interview Practice Page - Redesigned
 * Modern GitHub-inspired dark theme with polished UI
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Play, Square, RotateCcw, Home, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Volume2, Loader2, Sparkles,
  ThumbsUp, ThumbsDown, Minus, Target, MessageSquare, Coins, Edit3,
  SkipForward, ExternalLink, Shuffle, ChevronLeft, MoreHorizontal, User,
  BarChart3, Brain, Lightbulb, Zap, Award
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { getAllQuestionsAsync } from '../lib/questions-loader';
import { useCredits } from '../context/CreditsContext';
import { useAchievementContext } from '../context/AchievementContext';
import { useUserPreferences } from '../hooks/use-user-preferences';
import { CreditsDisplay } from '../components/CreditsDisplay';
import { ListenButton } from '../components/ListenButton';
import { evaluateVoiceAnswer, type EvaluationResult } from '../lib/voice-evaluation';
import { DesktopSidebarWrapper } from '../components/layout/DesktopSidebarWrapper';
import { QuestionHistoryIcon } from '../components/unified/QuestionHistory';
import type { Question } from '../types';

interface InterviewerComments {
  skip: string[];
  shuffle: string[];
  quick_answer: string[];
  long_pause: string[];
  retry: string[];
  good_score: string[];
  bad_score: string[];
  first_question: string[];
  last_question: string[];
  idle: string[];
}

type InterviewState = 'loading' | 'ready' | 'recording' | 'editing' | 'processing' | 'evaluated';

const isSpeechSupported = typeof window !== 'undefined' && 
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

function getRandomComment(comments: string[]): string {
  return comments[Math.floor(Math.random() * comments.length)];
}

function getQuestionType(channel: string): 'technical' | 'behavioral' | 'system-design' {
  if (channel === 'behavioral' || channel === 'engineering-management') return 'behavioral';
  if (channel === 'system-design') return 'system-design';
  return 'technical';
}

export default function VoiceInterview() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<InterviewState>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earnedCredits, setEarnedCredits] = useState<{ total: number; bonus: number } | null>(null);
  const [interviewerComment, setInterviewerComment] = useState<string | null>(null);
  const [comments, setComments] = useState<InterviewerComments | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [sessionId, setSessionId] = useState<string>('voice-session-state');
  const [showAnswer, setShowAnswer] = useState(false); // Hide answer until after recording
  
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const commentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { onVoiceInterview, config } = useCredits();
  const { trackEvent } = useAchievementContext();
  const { preferences } = useUserPreferences();

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    fetch('/data/interviewer-comments.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => setComments(data))
      .catch(() => setComments(null));
  }, []);

  const showComment = useCallback((category: keyof InterviewerComments) => {
    if (!comments || !comments[category]) return;
    if (commentTimeoutRef.current) clearTimeout(commentTimeoutRef.current);
    const comment = getRandomComment(comments[category]);
    setInterviewerComment(comment);
    commentTimeoutRef.current = setTimeout(() => setInterviewerComment(null), 4000);
  }, [comments]);

  useEffect(() => {
    async function loadQuestions() {
      try {
        // Check for saved session first
        const savedData = localStorage.getItem(sessionId);
        if (savedData) {
          try {
            const sessionData = JSON.parse(savedData);
            if (sessionData.questions && sessionData.questions.length > 0) {
              setQuestions(sessionData.questions);
              setCurrentIndex(sessionData.currentIndex || 0);
              setState('ready');
              return;
            }
          } catch (e) {
            console.error('Invalid session data:', e);
            localStorage.removeItem(sessionId);
          }
        }

        // Load new questions
        const allQuestions = await getAllQuestionsAsync();
        const subscribedChannelIds = preferences.subscribedChannels;
        const suitable = allQuestions.filter((q: Question) => {
          if (!subscribedChannelIds.includes(q.channel)) return false;
          if (q.voiceSuitable === false) return false;
          if (q.voiceSuitable === true && q.voiceKeywords && q.voiceKeywords.length > 0) return true;
          return ['behavioral', 'system-design', 'sre', 'devops'].includes(q.channel) &&
            q.answer && q.answer.length > 100;
        });
        const shuffled = suitable.sort(() => Math.random() - 0.5).slice(0, 10);
        setQuestions(shuffled);
        setState('ready');
      } catch (err) {
        setError('Failed to load interview questions');
        console.error(err);
      }
    }
    loadQuestions();
  }, [preferences.subscribedChannels, sessionId]);

  useEffect(() => {
    if (state === 'ready' && currentIndex === 0 && questions.length > 0 && comments) {
      const timer = setTimeout(() => showComment('first_question'), 500);
      return () => clearTimeout(timer);
    }
  }, [state, currentIndex, questions.length, comments, showComment]);

  useEffect(() => {
    if (!isSpeechSupported) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      console.log('Speech recognition result received:', event.results.length);
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
          console.log('Final transcript:', result[0].transcript);
        } else {
          interim += result[0].transcript;
          console.log('Interim transcript:', result[0].transcript);
        }
      }
      if (final) {
        setTranscript(prev => {
          const updated = prev + final;
          console.log('Updated transcript:', updated);
          return updated;
        });
      }
      setInterimTranscript(interim);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access and try again.');
        setState('ready');
      } else if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended, state:', state);
      if (state === 'recording') {
        try { 
          console.log('Restarting recognition...');
          recognition.start(); 
        } catch (e) { 
          console.error('Failed to restart recognition:', e);
        }
      }
    };
    
    recognitionRef.current = recognition;
    return () => { 
      try {
        recognition.stop(); 
      } catch (e) {
        console.log('Recognition already stopped');
      }
    };
  }, [state]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (commentTimeoutRef.current) clearTimeout(commentTimeoutRef.current);
    };
  }, [state]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setInterimTranscript('');
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
    setState('editing');
  }, []);

  const submitAnswer = useCallback(() => {
    if (!currentQuestion || !transcript.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }
    setState('processing');
    setTimeout(() => {
      const questionType = getQuestionType(currentQuestion.channel);
      const result = evaluateVoiceAnswer(transcript, currentQuestion.answer, currentQuestion.voiceKeywords, questionType);
      setEvaluation(result);
      const credits = onVoiceInterview(result.verdict);
      setEarnedCredits({ total: credits.totalCredits, bonus: credits.bonusCredits });
      trackEvent({ type: 'voice_interview_completed', timestamp: new Date().toISOString() });
      if (result.score >= 60) showComment('good_score');
      else showComment('bad_score');
      setShowAnswer(true); // Reveal answer after evaluation
      setState('evaluated');
    }, 800);
  }, [transcript, currentQuestion, onVoiceInterview, showComment, trackEvent]);

  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTranscript('');
      setInterimTranscript('');
      setEvaluation(null);
      setEarnedCredits(null);
      setShowAnswer(false); // Hide answer for next question
      setState('ready');
      saveSessionProgress();
    } else {
      // Clear session when completed
      localStorage.removeItem(sessionId);
    }
  }, [currentIndex, questions.length, sessionId]);

  const previousQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setTranscript('');
      setInterimTranscript('');
      setEvaluation(null);
      setEarnedCredits(null);
      setShowAnswer(false); // Hide answer for previous question
      setState('ready');
      setShowActions(false);
      saveSessionProgress();
    }
  }, [currentIndex]);

  const skipQuestion = useCallback(() => {
    if (recognitionRef.current && state === 'recording') recognitionRef.current.stop();
    if (currentIndex < questions.length - 1) {
      showComment('skip');
      setCurrentIndex(prev => prev + 1);
      setTranscript('');
      setInterimTranscript('');
      setEvaluation(null);
      setEarnedCredits(null);
      setShowAnswer(false); // Hide answer for skipped question
      setEarnedCredits(null);
      setState('ready');
      setShowActions(false);
      saveSessionProgress();
    }
  }, [currentIndex, questions.length, state, showComment]);

  const saveSessionProgress = useCallback(() => {
    if (questions.length === 0) return;
    
    const sessionData = {
      questions,
      currentIndex,
      startedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(sessionId, JSON.stringify(sessionData));
  }, [questions, currentIndex, sessionId]);

  const exitInterview = useCallback(() => {
    saveSessionProgress();
    setLocation('/');
  }, [saveSessionProgress, setLocation]);

  const goToOriginalQuestion = useCallback(() => {
    if (currentQuestion) setLocation(`/channel/${currentQuestion.channel}/${currentQuestion.id}`);
  }, [currentQuestion, setLocation]);

  const shuffleQuestions = useCallback(() => {
    showComment('shuffle');
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setTranscript('');
    setInterimTranscript('');
    setEvaluation(null);
    setEarnedCredits(null);
    setState('ready');
    setShowActions(false);
  }, [questions, showComment]);

  const retryQuestion = useCallback(() => {
    showComment('retry');
    setTranscript('');
    setInterimTranscript('');
    setEvaluation(null);
    setShowAnswer(false); // Hide answer when retrying
    setState('ready');
  }, [showComment]);



  // Unsupported browser
  if (!isSpeechSupported) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#d29922]/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-[#d29922]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Browser Not Supported</h1>
          <p className="text-[#8b949e] mb-6">
            Voice interview requires the Web Speech API. Please use Chrome, Edge, or Safari.
          </p>
          <button
            onClick={() => setLocation('/')}
            className="px-6 py-3 bg-[#238636] text-white font-medium rounded-xl hover:bg-[#2ea043] transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (state === 'loading' || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#58a6ff]/20 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#58a6ff]" />
          </div>
          <p className="text-[#8b949e]">Loading interview questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !currentQuestion) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#f85149]/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-[#f85149]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Error</h1>
          <p className="text-[#8b949e] mb-6">{error}</p>
          <button
            onClick={() => setLocation('/')}
            className="px-6 py-3 bg-[#238636] text-white font-medium rounded-xl hover:bg-[#2ea043] transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <>
      <SEOHead
        title="Voice Interview Practice | Code Reels"
        description="Practice answering interview questions out loud with AI-powered feedback"
        canonical="https://open-interview.github.io/voice-interview"
      />

      <DesktopSidebarWrapper>
      {/* iPhone 13 FIX: Ensure content fits within viewport with safe areas */}
      <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] overflow-x-hidden w-full">
        {/* Header - COMPACT */}
        <header className="sticky top-0 z-50 border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-3 h-14 flex items-center justify-between w-full" style={{ maxWidth: '100vw' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={exitInterview}
                className="p-1.5 hover:bg-[#21262d] rounded-lg transition-colors"
                title="Exit and save progress"
              >
                <Home className="w-4 h-4 text-[#8b949e]" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f85149] to-[#ff7b72] flex items-center justify-center">
                  <Mic className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-white text-sm">Voice Interview</h1>
                  <p className="text-[10px] text-[#8b949e]">
                    Q{currentIndex + 1}/{questions.length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocation('/voice-session')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#21262d] text-[#8b949e] hover:text-white rounded-lg border border-[#30363d] hover:border-[#58a6ff]/50 transition-all"
              >
                <Target className="w-3.5 h-3.5" />
                Sessions
              </button>
              <CreditsDisplay compact onClick={() => setLocation('/profile')} />
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-lg ${
                currentQuestion?.difficulty === 'beginner' ? 'bg-[#238636]/20 text-[#3fb950]' :
                currentQuestion?.difficulty === 'intermediate' ? 'bg-[#d29922]/20 text-[#d29922]' :
                'bg-[#f85149]/20 text-[#f85149]'
              }`}>
                {currentQuestion?.difficulty}
              </span>
              {currentQuestion?.id && (
                <QuestionHistoryIcon 
                  questionId={currentQuestion.id} 
                  questionType="question"
                  size="sm"
                />
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="max-w-4xl mx-auto px-3 pb-2 w-full" style={{ maxWidth: '100vw' }}>
            <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-[#58a6ff] to-[#a371f7] rounded-full"
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-6 w-full overflow-x-hidden" style={{ maxWidth: '100vw' }}>

          {/* Question Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#30363d] bg-[#161b22] overflow-hidden mb-6 w-full"
            style={{ maxWidth: '100%' }}
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2.5 rounded-xl bg-[#58a6ff]/10 flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-[#58a6ff]" />
                  </div>
                  <h2 className="text-lg font-medium text-white leading-relaxed">{currentQuestion?.question}</h2>
                </div>
                <button
                  onClick={goToOriginalQuestion}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#21262d] rounded-lg transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">View Details</span>
                </button>
              </div>
              
              {/* Question Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-[#30363d]/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6e7681] font-mono">Q{currentIndex + 1}/{questions.length}</span>
                  
                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowActions(!showActions)}
                      className="p-1.5 text-[#6e7681] hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    <AnimatePresence>
                      {showActions && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 top-full mt-1 bg-[#161b22] border border-[#30363d] rounded-xl shadow-xl py-1 z-10 min-w-[160px]"
                        >
                          <button
                            onClick={previousQuestion}
                            disabled={currentIndex === 0}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors disabled:opacity-30"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </button>
                          <button
                            onClick={skipQuestion}
                            disabled={currentIndex >= questions.length - 1}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors disabled:opacity-30"
                          >
                            <SkipForward className="w-4 h-4" />
                            Skip Question
                          </button>
                          <button
                            onClick={shuffleQuestions}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
                          >
                            <Shuffle className="w-4 h-4" />
                            Shuffle All
                          </button>
                          <div className="border-t border-[#30363d] my-1" />
                          <button
                            onClick={goToOriginalQuestion}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Full Question
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <ListenButton text={currentQuestion?.question || ''} label="Listen" size="sm" />
                  {currentQuestion?.voiceKeywords && currentQuestion.voiceKeywords.length > 0 && (
                    <span className="text-xs text-[#6e7681]">
                      {currentQuestion.voiceKeywords.length} key terms
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mx-6 mb-6 p-4 bg-[#f85149]/10 border border-[#f85149]/30 rounded-xl text-[#f85149] text-sm">
                {error}
              </div>
            )}
          </motion.div>

          {/* Interviewer Comment */}
          <AnimatePresence>
            {interviewerComment && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="mb-6 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a371f7] to-[#f778ba] flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 p-4 bg-[#21262d] border border-[#30363d] rounded-2xl rounded-tl-none">
                  <p className="text-sm italic text-[#8b949e]">"{interviewerComment}"</p>
                  <p className="text-[10px] text-[#6e7681] mt-2">— Your Interviewer</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording Interface */}
          <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 mb-6 w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            {/* Recording Status */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {state === 'recording' && (
                <div className="flex items-center gap-3 px-4 py-2 bg-[#f85149]/10 border border-[#f85149]/30 rounded-full">
                  <span className="w-3 h-3 bg-[#f85149] rounded-full animate-pulse" />
                  <span className="text-sm text-[#f85149]">Recording</span>
                  {!transcript && !interimTranscript && (
                    <span className="text-xs text-[#6e7681]">(Listening...)</span>
                  )}
                </div>
              )}
              
              {state === 'editing' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#d29922]/10 border border-[#d29922]/30 rounded-full">
                  <Edit3 className="w-4 h-4 text-[#d29922]" />
                  <span className="text-sm text-[#d29922]">Edit your answer, then submit</span>
                </div>
              )}
              
              {state === 'processing' && (
                <div className="flex items-center gap-3 px-4 py-2 bg-[#58a6ff]/10 border border-[#58a6ff]/30 rounded-full">
                  <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff]" />
                  <span className="text-sm text-[#58a6ff]">Analyzing your answer...</span>
                </div>
              )}
            </div>

            {/* Transcript Display */}
            {(state === 'recording' || state === 'editing' || transcript) && state !== 'evaluated' && (
              <div className="mb-6">
                {state === 'editing' ? (
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full p-4 bg-[#0d1117] border border-[#d29922]/30 rounded-xl min-h-[150px] max-h-[300px] text-sm text-[#e6edf3] resize-y focus:outline-none focus:ring-2 focus:ring-[#d29922]/50 focus:border-[#d29922]"
                    placeholder="Edit your transcribed answer here..."
                  />
                ) : (
                  <div className="p-4 bg-[#0d1117] rounded-xl min-h-[120px] max-h-[200px] overflow-y-auto border border-[#30363d]">
                    {transcript || interimTranscript ? (
                      <p className="text-sm text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
                        {transcript}
                        <span className="text-[#6e7681]">{interimTranscript}</span>
                        {state === 'recording' && <span className="animate-pulse text-[#58a6ff]">|</span>}
                      </p>
                    ) : (
                      <p className="text-sm text-[#6e7681] italic">
                        {state === 'recording' 
                          ? 'Start speaking... Your words will appear here.'
                          : 'No transcript yet'}
                      </p>
                    )}
                  </div>
                )}
                {state === 'editing' && (
                  <p className="text-xs text-[#6e7681] mt-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-[#d29922]" />
                    Fix any transcription errors before submitting
                  </p>
                )}
              </div>
            )}

            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-4">
              {state === 'ready' && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#f85149] to-[#ff7b72] text-white font-semibold rounded-2xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-[#f85149]/20"
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </button>
              )}
              
              {state === 'recording' && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-3 px-8 py-4 bg-[#f85149] text-white font-semibold rounded-2xl hover:bg-[#da3633] transition-all"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </button>
              )}
              
              {state === 'editing' && (
                <div className="flex gap-3">
                  <button
                    onClick={retryQuestion}
                    className="flex items-center gap-2 px-5 py-3 border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#8b949e] rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Re-record
                  </button>
                  <button
                    onClick={submitAnswer}
                    disabled={!transcript.trim()}
                    className="flex items-center gap-3 px-8 py-3 bg-[#238636] text-white font-semibold rounded-xl hover:bg-[#2ea043] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex items-center gap-2 px-5 py-3 border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#8b949e] rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </button>
                  {currentIndex < questions.length - 1 && (
                    <button
                      onClick={nextQuestion}
                      className="flex items-center gap-2 px-6 py-3 bg-[#238636] text-white font-semibold rounded-xl hover:bg-[#2ea043] transition-colors"
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-gradient-to-r from-[#d29922]/20 to-[#f1c40f]/20 border border-[#d29922]/30 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#d29922]/20 flex items-center justify-center">
                        <Coins className="w-6 h-6 text-[#d29922]" />
                      </div>
                      <div>
                        <div className="font-bold text-[#d29922] text-lg">+{earnedCredits.total} Credits Earned!</div>
                        <div className="text-xs text-[#8b949e]">
                          {earnedCredits.bonus > 0 
                            ? `${config.VOICE_ATTEMPT} base + ${earnedCredits.bonus} success bonus`
                            : 'Thanks for practicing!'}
                        </div>
                      </div>
                    </div>
                    <Award className="w-8 h-8 text-[#d29922]/50" />
                  </motion.div>
                )}

                {/* Verdict Card */}
                <div className={`p-6 rounded-2xl border ${getVerdictStyle(evaluation.verdict)}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getVerdictBgStyle(evaluation.verdict)}`}>
                        {getVerdictIcon(evaluation.verdict)}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-white">{getVerdictLabel(evaluation.verdict)}</h3>
                        <p className="text-sm text-[#8b949e]">Interview Assessment</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-white">{evaluation.score}%</div>
                      <div className="text-xs text-[#6e7681]">Overall Score</div>
                    </div>
                  </div>
                  
                  {/* Score Bar */}
                  <div className="h-2 bg-[#21262d] rounded-full overflow-hidden mb-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${evaluation.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full ${getScoreBarColor(evaluation.score)}`}
                    />
                  </div>
                  
                  <p className="text-sm text-[#8b949e] leading-relaxed">{evaluation.feedback}</p>
                </div>

                {/* Multi-Dimensional Scores */}
                {evaluation.scores && (
                  <div className="p-6 rounded-2xl border border-[#30363d] bg-[#161b22]">
                    <h4 className="font-semibold text-white flex items-center gap-2 mb-5">
                      <BarChart3 className="w-5 h-5 text-[#58a6ff]" />
                      Detailed Analysis
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ScoreDimension 
                        label="Technical" 
                        score={evaluation.scores.technical} 
                        icon={<Brain className="w-4 h-4" />}
                        description="Accuracy & depth"
                      />
                      <ScoreDimension 
                        label="Completeness" 
                        score={evaluation.scores.completeness} 
                        icon={<Target className="w-4 h-4" />}
                        description="Coverage of concepts"
                      />
                      <ScoreDimension 
                        label="Structure" 
                        score={evaluation.scores.structure} 
                        icon={<Lightbulb className="w-4 h-4" />}
                        description="Organization"
                      />
                      <ScoreDimension 
                        label="Communication" 
                        score={evaluation.scores.communication} 
                        icon={<MessageSquare className="w-4 h-4" />}
                        description="Clarity & fluency"
                      />
                    </div>
                    
                    {/* Structure Analysis */}
                    {evaluation.structureAnalysis && (
                      <div className="mt-5 pt-5 border-t border-[#30363d]">
                        <div className="flex flex-wrap gap-2">
                          {evaluation.structureAnalysis.hasIntroduction && (
                            <span className="px-3 py-1.5 text-xs bg-[#238636]/20 text-[#3fb950] rounded-lg font-medium">✓ Introduction</span>
                          )}
                          {evaluation.structureAnalysis.hasExamples && (
                            <span className="px-3 py-1.5 text-xs bg-[#238636]/20 text-[#3fb950] rounded-lg font-medium">✓ Examples</span>
                          )}
                          {evaluation.structureAnalysis.hasConclusion && (
                            <span className="px-3 py-1.5 text-xs bg-[#238636]/20 text-[#3fb950] rounded-lg font-medium">✓ Conclusion</span>
                          )}
                          {evaluation.structureAnalysis.usesSTAR && (
                            <span className="px-3 py-1.5 text-xs bg-[#a371f7]/20 text-[#a371f7] rounded-lg font-medium">⭐ STAR Method</span>
                          )}
                          {evaluation.fluencyMetrics && evaluation.fluencyMetrics.fillerWordCount > 3 && (
                            <span className="px-3 py-1.5 text-xs bg-[#d29922]/20 text-[#d29922] rounded-lg font-medium">
                              ⚠ {evaluation.fluencyMetrics.fillerWordCount} filler words
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Key Points */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Covered Points */}
                  <div className="p-5 rounded-2xl bg-[#238636]/10 border border-[#238636]/30">
                    <h4 className="font-semibold text-[#3fb950] flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5" />
                      Concepts Covered ({evaluation.keyPointsCovered.length})
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.keyPointsCovered.map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 text-[#8b949e]">
                          <span className="text-[#3fb950] mt-0.5">✓</span>
                          <span>
                            {typeof point === 'object' && 'concept' in point 
                              ? `${point.concept}${point.confidence !== 'exact' ? ` (as "${point.matchedAs}")` : ''}`
                              : point}
                          </span>
                        </li>
                      ))}
                      {evaluation.keyPointsCovered.length === 0 && (
                        <li className="text-sm text-[#6e7681]">No key concepts identified</li>
                      )}
                    </ul>
                  </div>

                  {/* Missed Points */}
                  <div className="p-5 rounded-2xl bg-[#f85149]/10 border border-[#f85149]/30">
                    <h4 className="font-semibold text-[#f85149] flex items-center gap-2 mb-4">
                      <XCircle className="w-5 h-5" />
                      Concepts to Include ({evaluation.keyPointsMissed.length})
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.keyPointsMissed.map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 text-[#8b949e]">
                          <span className="text-[#f85149] mt-0.5">✗</span>
                          <span>{point}</span>
                        </li>
                      ))}
                      {evaluation.keyPointsMissed.length === 0 && (
                        <li className="text-sm text-[#6e7681]">Great job covering all concepts!</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Strengths & Improvements */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl border border-[#30363d] bg-[#161b22]">
                    <h4 className="font-semibold text-white flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-[#f1c40f]" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-[#8b949e] flex items-start gap-2">
                          <Zap className="w-4 h-4 text-[#f1c40f] flex-shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl border border-[#30363d] bg-[#161b22]">
                    <h4 className="font-semibold text-white flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-[#58a6ff]" />
                      Areas to Improve
                    </h4>
                    <ul className="space-y-2">
                      {evaluation.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-[#8b949e] flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[#58a6ff] flex-shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Ideal Answer Reference - Only show after answer is revealed */}
                {showAnswer && (
                  <details className="p-5 rounded-2xl border border-[#30363d] bg-[#161b22] group">
                    <summary className="cursor-pointer font-semibold text-white flex items-center gap-2 list-none">
                      <Volume2 className="w-5 h-5 text-[#a371f7]" />
                      View Ideal Answer
                      <ChevronRight className="w-4 h-4 text-[#6e7681] ml-auto transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="mt-4 pt-4 border-t border-[#30363d] space-y-3">
                      <div className="flex justify-end">
                        <ListenButton text={currentQuestion?.answer || ''} label="Listen to Answer" size="sm" />
                      </div>
                      <div className="text-sm text-[#8b949e] whitespace-pre-wrap leading-relaxed bg-[#0d1117] p-4 rounded-xl">
                        {currentQuestion?.answer}
                      </div>
                    </div>
                  </details>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      </DesktopSidebarWrapper>
    </>
  );
}

// Score dimension component
function ScoreDimension({ label, score, icon, description }: { 
  label: string; score: number; icon: React.ReactNode; description: string;
}) {
  const getColor = (s: number) => {
    if (s >= 70) return 'text-[#3fb950]';
    if (s >= 50) return 'text-[#d29922]';
    if (s >= 30) return 'text-[#f0883e]';
    return 'text-[#f85149]';
  };
  
  const getBgColor = (s: number) => {
    if (s >= 70) return 'bg-[#238636]';
    if (s >= 50) return 'bg-[#d29922]';
    if (s >= 30) return 'bg-[#f0883e]';
    return 'bg-[#f85149]';
  };
  
  return (
    <div className="text-center p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
      <div className={`flex items-center justify-center gap-1.5 mb-2 ${getColor(score)}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{score}%</div>
      <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden mt-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`h-full ${getBgColor(score)}`}
        />
      </div>
      <div className="text-[10px] text-[#6e7681] mt-2">{description}</div>
    </div>
  );
}

// Helper functions
function getVerdictStyle(verdict: EvaluationResult['verdict']): string {
  switch (verdict) {
    case 'strong-hire': return 'bg-[#238636]/20 border-[#238636]/50';
    case 'hire': return 'bg-[#3fb950]/20 border-[#3fb950]/50';
    case 'lean-hire': return 'bg-[#d29922]/20 border-[#d29922]/50';
    case 'lean-no-hire': return 'bg-[#f0883e]/20 border-[#f0883e]/50';
    case 'no-hire': return 'bg-[#f85149]/20 border-[#f85149]/50';
  }
}

function getVerdictBgStyle(verdict: EvaluationResult['verdict']): string {
  switch (verdict) {
    case 'strong-hire':
    case 'hire': return 'bg-[#238636]/30';
    case 'lean-hire': return 'bg-[#d29922]/30';
    case 'lean-no-hire':
    case 'no-hire': return 'bg-[#f85149]/30';
  }
}

function getVerdictIcon(verdict: EvaluationResult['verdict']) {
  switch (verdict) {
    case 'strong-hire':
    case 'hire': return <ThumbsUp className="w-7 h-7 text-[#3fb950]" />;
    case 'lean-hire': return <Minus className="w-7 h-7 text-[#d29922]" />;
    case 'lean-no-hire':
    case 'no-hire': return <ThumbsDown className="w-7 h-7 text-[#f85149]" />;
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
  if (score >= 70) return 'bg-gradient-to-r from-[#238636] to-[#3fb950]';
  if (score >= 55) return 'bg-gradient-to-r from-[#3fb950] to-[#d29922]';
  if (score >= 40) return 'bg-gradient-to-r from-[#d29922] to-[#f0883e]';
  if (score >= 25) return 'bg-gradient-to-r from-[#f0883e] to-[#f85149]';
  return 'bg-[#f85149]';
}
