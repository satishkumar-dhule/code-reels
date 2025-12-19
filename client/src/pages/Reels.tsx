import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { getQuestions, getChannel } from '../lib/data';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTag } from '../lib/utils';
import { Mermaid } from '../components/Mermaid';
import { SEOHead } from '../components/SEOHead';
import { trackQuestionView, trackAnswerRevealed, trackLinkedInShare, trackLinkedInDownload, trackGitHubClick, trackTimerUsage } from '../hooks/use-analytics';
import { ArrowLeft, ArrowRight, Share2, Terminal, ChevronRight, Hash, ChevronDown, Check, Timer, List, Flag, Bookmark, Grid3X3, LayoutList, Zap, Target, Flame, Star, AlertCircle } from 'lucide-react';
import { useProgress, trackActivity } from '../hooks/use-progress';
import { useToast } from '@/hooks/use-toast';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';

// Custom hook for swipe detection
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distanceX = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    
    if (isLeftSwipe) {
      onSwipeLeft();
    } else if (isRightSwipe) {
      onSwipeRight();
    }
    
    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default function Reels() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/channel/:id/:index?');
  const channelId = params?.id;
  const hasIndexInUrl = params?.index !== undefined && params?.index !== '';
  const paramIndex = hasIndexInUrl ? parseInt(params.index || '0') : null;
  
  const channel = getChannel(channelId || '');
  
  const [selectedSubChannel, setSelectedSubChannel] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const channelQuestions = getQuestions(channelId || '', selectedSubChannel, selectedDifficulty);
  
  const { completed, markCompleted, lastVisitedIndex, saveLastVisitedIndex } = useProgress(channelId || '');
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(paramIndex ?? 0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [isActive, setIsActive] = useState(true);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [seatMapView, setSeatMapView] = useState(true); // true = grid, false = list
  const [markedQuestions, setMarkedQuestions] = useState<string[]>(() => {
    const saved = localStorage.getItem(`marked-${channelId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Toggle bookmark for current question
  const toggleMark = (questionId: string) => {
    setMarkedQuestions(prev => {
      const newMarked = prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId];
      localStorage.setItem(`marked-${channelId}`, JSON.stringify(newMarked));
      return newMarked;
    });
  };

  // Progress calculations
  const totalQuestions = channelQuestions.length;
  const remainingQuestions = totalQuestions - currentIndex - 1;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  // Swipe hint state - show on first visit
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    const hasSeenHint = localStorage.getItem('swipe-hint-seen');
    return !hasSeenHint;
  });

  // Hide swipe hint after 4 seconds or on first swipe
  useEffect(() => {
    if (showSwipeHint) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('swipe-hint-seen', 'true');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint]);

  // Load timer settings and track session start
  useEffect(() => {
    const savedTimerEnabled = localStorage.getItem('timer-enabled');
    const savedTimerDuration = localStorage.getItem('timer-duration');
    if (savedTimerEnabled !== null) setTimerEnabled(savedTimerEnabled === 'true');
    if (savedTimerDuration !== null) setTimerDuration(parseInt(savedTimerDuration));
    
    // Track that user started a learning session
    trackActivity();
  }, []);

  // Save timer settings
  const handleTimerEnabledChange = (enabled: boolean) => {
    setTimerEnabled(enabled);
    localStorage.setItem('timer-enabled', String(enabled));
  };

  const handleTimerDurationChange = (value: number[]) => {
    const duration = value[0];
    setTimerDuration(duration);
    setTimeLeft(duration);
    localStorage.setItem('timer-duration', String(duration));
  };

  // Sync state with URL params - restore last visited position
  useEffect(() => {
    if (channelQuestions.length === 0) return;

    // If URL has explicit index
    if (hasIndexInUrl && paramIndex !== null) {
      // If index is out of bounds, reset to 0
      if (paramIndex >= channelQuestions.length) {
        setCurrentIndex(0);
      } else if (paramIndex >= 0) {
        setCurrentIndex(paramIndex);
      }
    } else {
      // No index in URL - restore last visited position
      if (lastVisitedIndex > 0 && lastVisitedIndex < channelQuestions.length) {
        setCurrentIndex(lastVisitedIndex);
        setLocation(`/channel/${channelId}/${lastVisitedIndex}`, { replace: true });
      } else {
        // Default to first question
        setCurrentIndex(0);
      }
    }
  }, [hasIndexInUrl, paramIndex, channelQuestions.length, lastVisitedIndex, channelId]);

  // Update URL and save position when index changes
  useEffect(() => {
    if (channelId && channelQuestions.length > 0) {
      const urlIndex = hasIndexInUrl ? paramIndex : null;
      if (currentIndex !== urlIndex) {
        setLocation(`/channel/${channelId}/${currentIndex}`, { replace: true });
      }
      saveLastVisitedIndex(currentIndex);
    }
  }, [currentIndex, channelId, channelQuestions.length]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0 && !showAnswer && timerEnabled) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerEnabled) {
      setShowAnswer(true);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, showAnswer, timerEnabled]);

  // Reset state when index changes
  useEffect(() => {
    // If timer is disabled, show answer directly
    setShowAnswer(!timerEnabled);
    setTimeLeft(timerDuration);
    setIsActive(true);
  }, [currentIndex, timerDuration, timerEnabled]);

  // Track question view when it changes and mark as completed
  useEffect(() => {
    if (currentQuestion) {
      trackQuestionView(currentQuestion.id, currentQuestion.channel, currentQuestion.difficulty);
      markCompleted(currentQuestion.id);
    }
  }, [currentIndex]);

  // When timer is toggled off, show answer immediately
  useEffect(() => {
    if (!timerEnabled) {
      setShowAnswer(true);
    }
  }, [timerEnabled]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        nextQuestion();
      } else if (e.key === 'ArrowUp') {
        prevQuestion();
      } else if (e.key === 'ArrowRight') {
        if (!showAnswer) {
          setShowAnswer(true);
          trackAnswerRevealed(channelQuestions[currentIndex].id, timeLeft);
          markCompleted(channelQuestions[currentIndex].id);
          trackActivity(); // Track user activity
        }
      } else if (e.key === 'ArrowLeft') {
        setLocation('/');
      } else if (e.key === 'Escape') {
        setLocation('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, showAnswer, channelQuestions.length]);

  const nextQuestion = () => {
    if (currentIndex < channelQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "LINK_COPIED",
      description: "URL saved to clipboard.",
    });
  };

  // Swipe handlers for mobile navigation
  const handleSwipeLeft = useCallback(() => {
    // Swipe left = next question
    if (showSwipeHint) {
      setShowSwipeHint(false);
      localStorage.setItem('swipe-hint-seen', 'true');
    }
    nextQuestion();
  }, [currentIndex, channelQuestions.length, showSwipeHint]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = previous question
    if (showSwipeHint) {
      setShowSwipeHint(false);
      localStorage.setItem('swipe-hint-seen', 'true');
    }
    prevQuestion();
  }, [currentIndex, showSwipeHint]);

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe(handleSwipeLeft, handleSwipeRight);

  if (!channel) return (
    <div className="h-screen flex items-center justify-center font-mono text-white">
      ERR: MODULE_NOT_FOUND
    </div>
  );

  const currentQuestion = channelQuestions[currentIndex];
  // Handle case where filter returns no questions
  if (!currentQuestion) {
     return (
        <div className="h-screen w-full bg-black text-white flex flex-col font-mono">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                 <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary">
                    <span className="border border-white/20 p-1 px-2">ESC</span> Home
                 </button>
                 {channel.subChannels && (
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary outline-none">
                            Topic: {channel.subChannels.find(s => s.id === selectedSubChannel)?.name} <ChevronDown className="w-3 h-3" />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content className="bg-black border border-white/20 p-1 z-50 min-w-[200px]" align="end">
                            {channel.subChannels.map(sub => (
                                <DropdownMenu.Item 
                                    key={sub.id} 
                                    className="text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex justify-between outline-none"
                                    onSelect={() => {
                                        setSelectedSubChannel(sub.id);
                                        setCurrentIndex(0);
                                    }}
                                >
                                    {sub.name}
                                    {selectedSubChannel === sub.id && <Check className="w-3 h-3" />}
                                </DropdownMenu.Item>
                            ))}
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                 )}
            </div>
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white/50">
                    <div className="text-xl mb-2">NO_DATA_FOUND</div>
                    <div className="text-xs">Try selecting a different topic</div>
                </div>
            </div>
        </div>
     )
  }

  const isCompleted = completed.includes(currentQuestion.id);

  // Render markdown explanation with code highlighting and mermaid support
  const renderExplanation = (text: string) => {
    return (
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');
            const isInline = !match && !String(children).includes('\n');
            
            // Handle inline code
            if (isInline) {
              return (
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-primary text-[0.9em]" {...props}>
                  {children}
                </code>
              );
            }
            
            // Handle mermaid diagrams
            if (language === 'mermaid') {
              return (
                <div className="my-4 bg-black/40 border border-white/10 p-2 sm:p-4 rounded-lg overflow-x-auto">
                  <Mermaid chart={codeContent} />
                </div>
              );
            }
            
            // Handle other code blocks
            return (
              <div className="my-4 rounded overflow-hidden border border-white/10 text-xs">
                <SyntaxHighlighter
                  language={language || 'text'}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1rem', background: '#0a0a0a' }}
                >
                  {codeContent}
                </SyntaxHighlighter>
              </div>
            );
          },
          p({ children }) {
            return <p className="mb-4">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-bold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-white/90">{children}</em>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-white/80">{children}</li>;
          },
          a({ href, children }) {
            return <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  return (
    <>
      <SEOHead
        title={`${currentQuestion?.question || 'Question'} - Code Reels Interview Prep`}
        description={`Practice ${currentQuestion?.channel || 'technical'} interview questions on Code Reels. Difficulty: ${currentQuestion?.difficulty || 'intermediate'}`}
        keywords={`${currentQuestion?.channel}, ${currentQuestion?.subChannel}, interview prep, ${currentQuestion?.tags?.join(', ') || 'technical interviews'}`}
        canonical={`https://reel-interview.github.io/channel/${channelId}`}
      />
      <div className="h-screen w-full bg-black text-white overflow-hidden flex font-mono">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 w-full h-11 sm:h-14 px-2 sm:px-4 z-50 flex justify-between items-center border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1">
          <button 
            onClick={() => setLocation('/')}
            className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors group shrink-0"
          >
            <span className="border border-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1 group-hover:border-primary transition-colors">ESC</span> 
            <span className="hidden sm:inline">Home</span>
          </button>
          
          <div className="h-4 w-px bg-white/20 hidden sm:block shrink-0" />
          
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary truncate">{channel.name}</span>
              
              {channel.subChannels && (
                <>
                    <ChevronRight className="w-3 h-3 text-white/30 shrink-0 hidden sm:block" />
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger className="flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:text-white text-white/70 outline-none min-w-0">
                            <span className="truncate max-w-[60px] sm:max-w-none">{channel.subChannels.find(s => s.id === selectedSubChannel)?.name}</span>
                            <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content className="bg-black border border-white/20 p-1 z-50 min-w-[180px] sm:min-w-[200px] shadow-xl animate-in fade-in zoom-in-95 duration-100" align="start">
                            {channel.subChannels.map(sub => (
                                <DropdownMenu.Item 
                                    key={sub.id} 
                                    className="text-[11px] sm:text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex justify-between outline-none data-[highlighted]:bg-white/10"
                                    onSelect={() => {
                                        setSelectedSubChannel(sub.id);
                                        setCurrentIndex(0);
                                    }}
                                >
                                    {sub.name}
                                    {selectedSubChannel === sub.id && <Check className="w-3 h-3 text-primary" />}
                                </DropdownMenu.Item>
                            ))}
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </>
              )}

              {/* Difficulty Filter */}
              <div className="h-4 w-px bg-white/20 hidden sm:block shrink-0" />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger className="flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:text-white text-white/70 outline-none">
                  {selectedDifficulty === 'all' && <Target className="w-3 h-3 shrink-0" />}
                  {selectedDifficulty === 'beginner' && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                  {selectedDifficulty === 'intermediate' && <Target className="w-3 h-3 text-yellow-400 shrink-0" />}
                  {selectedDifficulty === 'advanced' && <Flame className="w-3 h-3 text-red-400 shrink-0" />}
                  <span className="hidden sm:inline truncate">
                    {selectedDifficulty === 'all' ? 'All Levels' : selectedDifficulty}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content className="bg-black border border-white/20 p-1 z-50 min-w-[150px] shadow-xl animate-in fade-in zoom-in-95 duration-100" align="start">
                  <DropdownMenu.Item 
                    className="text-[11px] sm:text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none data-[highlighted]:bg-white/10"
                    onSelect={() => { setSelectedDifficulty('all'); setCurrentIndex(0); }}
                  >
                    <Target className="w-3 h-3" /> All Levels
                    {selectedDifficulty === 'all' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item 
                    className="text-[11px] sm:text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none data-[highlighted]:bg-white/10"
                    onSelect={() => { setSelectedDifficulty('beginner'); setCurrentIndex(0); }}
                  >
                    <Zap className="w-3 h-3 text-green-400" /> Beginner
                    {selectedDifficulty === 'beginner' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item 
                    className="text-[11px] sm:text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none data-[highlighted]:bg-white/10"
                    onSelect={() => { setSelectedDifficulty('intermediate'); setCurrentIndex(0); }}
                  >
                    <Target className="w-3 h-3 text-yellow-400" /> Intermediate
                    {selectedDifficulty === 'intermediate' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item 
                    className="text-[11px] sm:text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none data-[highlighted]:bg-white/10"
                    onSelect={() => { setSelectedDifficulty('advanced'); setCurrentIndex(0); }}
                  >
                    <Flame className="w-3 h-3 text-red-400" /> Advanced
                    {selectedDifficulty === 'advanced' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex gap-1 sm:gap-2 mr-1 sm:mr-4">
            <a 
              href="https://github.com/satishkumar-dhule/code-reels/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 sm:p-1.5 hover:bg-white/10 border border-white/10 rounded transition-colors"
              title="Report Issue"
            >
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            </a>
            <a 
              href="https://github.com/satishkumar-dhule/code-reels"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 sm:p-1.5 hover:bg-white/10 border border-white/10 rounded transition-colors"
              title="Star on GitHub"
            >
              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
            </a>
            <button 
                onClick={prevQuestion}
                disabled={currentIndex === 0}
                className="p-1 sm:p-1.5 hover:bg-white/10 border border-white/10 rounded disabled:opacity-30 transition-colors"
                title="Previous Question"
            >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button 
                onClick={nextQuestion}
                disabled={currentIndex === channelQuestions.length - 1}
                className="p-1 sm:p-1.5 hover:bg-white/10 border border-white/10 rounded disabled:opacity-30 transition-colors"
                title="Next Question"
            >
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Question Progress & Picker */}
          <Popover.Root open={showQuestionPicker} onOpenChange={setShowQuestionPicker}>
            <Popover.Trigger asChild>
              <button 
                className="flex items-center gap-1 sm:gap-2 hover:text-primary transition-colors group"
                title="Jump to question"
              >
                <List className="w-3 h-3 sm:w-4 sm:h-4 opacity-50 group-hover:opacity-100" />
                <span className="text-[10px] sm:text-xs font-mono text-white/50 group-hover:text-white">
                  {String(currentIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
                </span>
                {isLastQuestion && <Flag className="w-3 h-3 text-primary animate-pulse" />}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                className="bg-black border border-white/20 p-2 sm:p-3 w-80 sm:w-96 max-h-[70vh] z-50 shadow-xl animate-in fade-in zoom-in-95 duration-100" 
                sideOffset={5}
                align="end"
              >
                <div className="space-y-2 sm:space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] sm:text-[10px] uppercase tracking-widest">
                      <span className="text-white/50">Progress</span>
                      <span className="text-primary">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] sm:text-[9px] text-white/30">
                      <span>{currentIndex + 1} of {totalQuestions}</span>
                      <span>{remainingQuestions} remaining</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 text-[8px] sm:text-[9px] border-t border-white/10 pt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-primary border border-primary"></div>
                      <span className="text-white/50">Current</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500"></div>
                      <span className="text-white/50">Completed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500"></div>
                      <span className="text-white/50">Marked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-white/10 border border-white/20"></div>
                      <span className="text-white/50">Not Visited</span>
                    </div>
                  </div>

                  {/* View Toggle & Question Grid/List */}
                  <div className="border-t border-white/10 pt-2">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/50">Jump to Question</div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSeatMapView(true)}
                          className={`p-1 rounded ${seatMapView ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                          title="Grid View"
                        >
                          <Grid3X3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSeatMapView(false)}
                          className={`p-1 rounded ${!seatMapView ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                          title="List View"
                        >
                          <LayoutList className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Seat Map Grid View */}
                    {seatMapView ? (
                      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-[40vh] overflow-y-auto custom-scrollbar p-1">
                        {channelQuestions.map((q, idx) => {
                          const isCurrent = idx === currentIndex;
                          const isMarked = markedQuestions.includes(q.id);
                          const isCompletedQ = completed.includes(q.id);
                          
                          let bgClass = 'bg-white/10 border-white/20 hover:bg-white/20';
                          if (isCurrent) bgClass = 'bg-primary border-primary text-black';
                          else if (isCompletedQ) bgClass = 'bg-green-500/30 border-green-500 text-green-400';
                          else if (isMarked) bgClass = 'bg-blue-500/30 border-blue-500 text-blue-400';
                          
                          return (
                            <button
                              key={q.id}
                              onClick={() => {
                                setCurrentIndex(idx);
                                setShowQuestionPicker(false);
                              }}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded border text-[9px] sm:text-[10px] font-mono font-bold transition-all ${bgClass} relative`}
                              title={q.question.substring(0, 50) + '...'}
                            >
                              {idx + 1}
                              {isMarked && !isCurrent && (
                                <Bookmark className="w-2 h-2 absolute -top-0.5 -right-0.5 text-blue-400 fill-blue-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* List View */
                      <div className="max-h-[40vh] overflow-y-auto custom-scrollbar space-y-1">
                        {channelQuestions.map((q, idx) => {
                          const isCurrent = idx === currentIndex;
                          const isMarked = markedQuestions.includes(q.id);
                          const isCompletedQ = completed.includes(q.id);
                          
                          let borderClass = 'hover:bg-white/10 text-white/70';
                          if (isCurrent) borderClass = 'bg-primary/20 text-primary border border-primary/30';
                          else if (isCompletedQ) borderClass = 'bg-green-500/10 text-green-400 border border-green-500/30';
                          else if (isMarked) borderClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
                          
                          return (
                            <button
                              key={q.id}
                              onClick={() => {
                                setCurrentIndex(idx);
                                setShowQuestionPicker(false);
                              }}
                              className={`w-full text-left p-2 text-[10px] sm:text-xs rounded transition-colors flex items-start gap-2 ${borderClass}`}
                            >
                              <span className="font-mono text-[9px] sm:text-[10px] opacity-50 shrink-0 w-6">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="line-clamp-2 flex-1">{q.question}</span>
                              <div className="flex gap-1 shrink-0">
                                {isMarked && <Bookmark className="w-3 h-3 text-blue-400 fill-blue-400" />}
                                {isCompletedQ && <Check className="w-3 h-3 text-green-500" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Stats summary */}
                  <div className="flex justify-between text-[8px] sm:text-[9px] text-white/40 border-t border-white/10 pt-2">
                    <span className="text-green-400">{completed.length} completed</span>
                    <span className="text-blue-400">{markedQuestions.length} marked</span>
                    <span>{totalQuestions - completed.length} remaining</span>
                  </div>
                </div>
                <Popover.Arrow className="fill-white/20" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Timer Toggle in Top Bar - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-4">
            <Timer className={`w-4 h-4 ${timerEnabled ? 'text-primary' : 'text-white/30'}`} />
            <Switch.Root 
              checked={timerEnabled}
              onCheckedChange={handleTimerEnabledChange}
              className="w-[36px] h-[20px] bg-white/10 rounded-full relative data-[state=checked]:bg-primary outline-none cursor-pointer"
              title={timerEnabled ? "Disable Timer" : "Enable Timer"}
            >
              <Switch.Thumb className="block w-[16px] h-[16px] bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[17px]" />
            </Switch.Root>
          </div>

          {/* Timer Settings Popover */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button 
                className="hover:text-primary transition-colors flex items-center gap-1 sm:gap-2"
                title="Timer Settings"
              >
                {timerEnabled ? (
                   <span className="font-mono text-[10px] sm:text-xs text-primary">{String(timeLeft).padStart(2, '0')}s</span>
                ) : (
                   <span className="text-[10px] sm:text-xs text-white/30">OFF</span>
                )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="bg-black border border-white/20 p-3 sm:p-4 w-64 sm:w-72 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-100" sideOffset={5}>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/70" htmlFor="timer-toggle">
                      Enable Timer
                    </label>
                    <Switch.Root 
                      id="timer-toggle"
                      checked={timerEnabled}
                      onCheckedChange={handleTimerEnabledChange}
                      className="w-[36px] sm:w-[42px] h-[20px] sm:h-[25px] bg-white/10 rounded-full relative data-[state=checked]:bg-primary outline-none cursor-default"
                    >
                      <Switch.Thumb className="block w-[16px] sm:w-[21px] h-[16px] sm:h-[21px] bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[17px] sm:data-[state=checked]:translate-x-[19px]" />
                    </Switch.Root>
                  </div>

                  <div className={`space-y-2 sm:space-y-3 ${!timerEnabled ? 'opacity-30 pointer-events-none' : ''}`}>
                    <div className="flex justify-between">
                      <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/70">
                        Duration
                      </label>
                      <span className="text-[10px] sm:text-xs font-mono text-primary">{timerDuration}s</span>
                    </div>
                    <Slider.Root 
                      className="relative flex items-center select-none touch-none w-full h-5"
                      defaultValue={[timerDuration]}
                      max={300}
                      min={10}
                      step={10}
                      onValueChange={handleTimerDurationChange}
                      disabled={!timerEnabled}
                    >
                      <Slider.Track className="bg-white/10 relative grow rounded-full h-[3px]">
                        <Slider.Range className="absolute bg-primary rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-4 h-4 bg-white rounded-full hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
                    </Slider.Root>
                    <div className="flex justify-between text-[9px] sm:text-[10px] text-white/30">
                      <span>10s</span>
                      <span>300s</span>
                    </div>
                  </div>
                </div>
                <Popover.Arrow className="fill-white/20" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <button 
            onClick={handleShare}
            className="hover:text-primary transition-colors"
          >
            <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Swipe Hint Overlay - Mobile Only */}
      <AnimatePresence>
        {showSwipeHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none sm:hidden flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div 
              className="relative flex flex-col items-center gap-4 text-white"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              {/* Swipe animation */}
              <div className="flex items-center gap-6">
                <motion.div
                  animate={{ x: [-20, 0, -20] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-8 h-8 text-primary" />
                  <span className="text-xs uppercase tracking-widest">Prev</span>
                </motion.div>
                
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center"
                >
                  <span className="text-2xl">👆</span>
                </motion.div>
                
                <motion.div
                  animate={{ x: [20, 0, 20] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xs uppercase tracking-widest">Next</span>
                  <ArrowRight className="w-8 h-8 text-primary" />
                </motion.div>
              </div>
              
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-sm font-bold uppercase tracking-widest text-center"
              >
                Swipe to Navigate
              </motion.p>
              
              <button
                onClick={() => {
                  setShowSwipeHint(false);
                  localStorage.setItem('swipe-hint-seen', 'true');
                }}
                className="mt-2 px-4 py-2 bg-primary text-black text-xs font-bold uppercase tracking-widest rounded pointer-events-auto"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area - Split View */}
      <div 
        className="flex-1 w-full flex flex-col md:flex-row pt-11 sm:pt-14 pb-7 sm:pb-10 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" custom={currentIndex}>
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col md:flex-row overflow-hidden"
          >
            {/* Left Panel: Question */}
            <div className="w-full md:w-[30%] min-h-[20vh] md:min-h-0 md:h-full p-3 sm:p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10 relative shrink-0">
               <div className="absolute top-2 left-3 sm:top-6 sm:left-6 md:top-8 md:left-8 flex flex-wrap items-center gap-2 sm:gap-3">
                 <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-primary uppercase tracking-widest opacity-70">
                   <Hash className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                   {currentQuestion.id}
                 </div>
                 {/* Difficulty Badge */}
                 <span className={`px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded ${
                   currentQuestion.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                   currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                   'bg-red-500/20 text-red-400 border border-red-500/30'
                 }`}>
                   {currentQuestion.difficulty === 'beginner' && <Zap className="w-2.5 h-2.5 inline mr-0.5" />}
                   {currentQuestion.difficulty === 'intermediate' && <Target className="w-2.5 h-2.5 inline mr-0.5" />}
                   {currentQuestion.difficulty === 'advanced' && <Flame className="w-2.5 h-2.5 inline mr-0.5" />}
                   {currentQuestion.difficulty}
                 </span>
                 {/* SubChannel Badge */}
                 <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-white/5 text-white/50 border border-white/10 rounded">
                   {currentQuestion.subChannel}
                 </span>
                 <button
                   onClick={() => toggleMark(currentQuestion.id)}
                   className={`p-1 rounded transition-colors ${
                     markedQuestions.includes(currentQuestion.id)
                       ? 'text-blue-400 bg-blue-500/20'
                       : 'text-white/30 hover:text-blue-400 hover:bg-blue-500/10'
                   }`}
                   title={markedQuestions.includes(currentQuestion.id) ? 'Remove bookmark' : 'Bookmark this question'}
                 >
                   <Bookmark className={`w-3 h-3 sm:w-4 sm:h-4 ${markedQuestions.includes(currentQuestion.id) ? 'fill-blue-400' : ''}`} />
                 </button>
               </div>

               <div className="flex-1 flex flex-col justify-center space-y-2 sm:space-y-6 max-w-2xl mx-auto w-full pt-6 md:pt-0">
                  <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold leading-snug sm:leading-tight tracking-tight">
                    {currentQuestion.question}
                  </h1>

                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {currentQuestion.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="px-1 sm:px-2 py-0.5 bg-white/5 text-[8px] sm:text-[10px] font-bold tracking-widest border border-white/10 text-white/60">
                        {formatTag(tag)}
                      </span>
                    ))}
                    {currentQuestion.tags.length > 4 && (
                      <span className="px-1 sm:px-2 py-0.5 text-[8px] sm:text-[10px] text-white/40">
                        +{currentQuestion.tags.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Timer Display (Large) - Hidden on mobile when answer not shown */}
                  {!showAnswer && timerEnabled && (
                    <div className="hidden sm:block border-l-2 border-primary pl-3 sm:pl-4 py-2 opacity-80">
                       <div className="text-[9px] sm:text-[10px] text-white/50 mb-1 tracking-widest uppercase">Time Remaining</div>
                       <div className="text-lg sm:text-xl font-mono">{String(timeLeft).padStart(2, '0')}s</div>
                    </div>
                  )}
               </div>
            </div>

            {/* Right Panel: Answer */}
            <div className="w-full md:w-[70%] flex-1 md:h-full bg-white/5 relative flex flex-col overflow-hidden min-h-0">
               {!showAnswer ? (
                  <button 
                    onClick={() => {
                      setShowAnswer(true);
                      trackAnswerRevealed(currentQuestion.id, timeLeft);
                      markCompleted(currentQuestion.id);
                      trackActivity(); // Track user activity
                    }}
                    className="w-full h-full min-h-[120px] sm:min-h-[200px] flex flex-col items-center justify-center group hover:bg-white/10 transition-all cursor-pointer active:bg-white/10"
                  >
                    <Terminal className="w-6 h-6 sm:w-12 sm:h-12 mb-2 sm:mb-6 text-white/20 group-hover:text-primary transition-colors duration-300" />
                    <span className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                      Tap to Reveal
                    </span>
                    {timerEnabled && (
                      <span className="mt-2 text-xs sm:text-sm text-primary font-mono sm:hidden">{String(timeLeft).padStart(2, '0')}s</span>
                    )}
                    <span className="mt-2 text-[9px] sm:text-[10px] text-white/20 font-mono hidden sm:block">[OR PRESS ARROW RIGHT]</span>
                  </button>
               ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full h-full overflow-y-auto p-3 sm:p-6 md:p-8 custom-scrollbar"
                  >
                    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-16 sm:pb-20">
                      {/* Diagram - full width on top */}
                      {currentQuestion.diagram && (
                        <div className="bg-black/30 border border-white/10 p-3 sm:p-4 rounded-lg overflow-x-auto">
                          <Mermaid chart={currentQuestion.diagram} />
                        </div>
                      )}

                      {/* Explanation - below diagram */}
                      <div className="text-[11px] sm:text-sm md:text-base text-white/80 leading-5 sm:leading-7">
                        {renderExplanation(currentQuestion.explanation)}
                      </div>
                      
                      {isCompleted && (
                        <div className="flex items-center gap-2 text-green-500 text-[9px] sm:text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/10">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" /> Completed
                        </div>
                      )}
                    </div>
                  </motion.div>
               )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Congratulations Overlay - only on last question */}
      <AnimatePresence>
        {isLastQuestion && showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-12 sm:bottom-14 right-4 sm:right-6 z-40 pointer-events-auto"
          >
            <div className="bg-black/80 backdrop-blur-sm border border-primary/50 rounded-lg p-3 sm:p-4 shadow-lg shadow-primary/10">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Flag className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </motion.div>
                <div>
                  <div className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-widest">
                    🎉 Module Complete!
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-white/60 mt-0.5">
                    {completed.length}/{totalQuestions} questions done
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocation('/')}
                  className="ml-2 px-3 py-1.5 bg-primary text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded hover:bg-primary/90"
                >
                  Home
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Navigation */}
      <div className="absolute bottom-0 w-full h-7 sm:h-10 px-2 sm:px-4 border-t border-white/10 flex justify-between items-center text-[7px] sm:text-[10px] font-bold uppercase tracking-widest text-white/30 bg-black z-50">
         <div className="flex gap-2 sm:gap-6">
            <span className="hidden sm:flex items-center gap-1"><span className="text-primary">↑</span> PREV</span>
            <span className="hidden sm:flex items-center gap-1"><span className="text-primary">↓</span> NEXT</span>
            <span className="hidden sm:flex items-center gap-1"><span className="text-primary">→</span> REVEAL</span>
            <span className="sm:hidden text-white/40">← SWIPE →</span>
         </div>
         <div className="flex items-center gap-2 sm:gap-4">
            {/* Remaining questions indicator */}
            <span className={`${isLastQuestion ? 'text-primary' : 'text-white/40'}`}>
              {isLastQuestion ? (
                <span className="flex items-center gap-1">
                  <Flag className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> FINAL
                </span>
              ) : (
                <span>{remainingQuestions} LEFT</span>
              )}
            </span>
            <span className="text-white/20">|</span>
            <span>v2.4</span>
         </div>
      </div>
      </div>
    </>
  );
}