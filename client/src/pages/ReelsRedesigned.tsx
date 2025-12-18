import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { getChannel } from '../lib/data';
import { useQuestionsWithPrefetch, useSubChannels, useCompaniesWithCounts } from '../hooks/use-questions';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '../components/SEOHead';
import { QuestionPanel } from '../components/QuestionPanel';
import { AnswerPanel } from '../components/AnswerPanel';
import { trackQuestionView, trackAnswerRevealed } from '../hooks/use-analytics';
import { 
  ArrowLeft, ArrowRight, Share2, ChevronDown, Check, List, 
  Flag, Grid3X3, LayoutList, Zap, Target, Flame, Star, AlertCircle, 
  Terminal, Bookmark, Settings, Building2, Search
} from 'lucide-react';
import { SearchModal } from '../components/SearchModal';
import { useProgress, trackActivity } from '../hooks/use-progress';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '../context/UserPreferencesContext';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';

// Swipe detection hook - only horizontal swipes, ignores vertical
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const minSwipeDistance = 50;
  const maxVerticalDistance = 100; // Ignore if vertical movement is too large

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;
    
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = Math.abs(touchStartY.current - touchEndY.current);
    
    // Only trigger horizontal swipe if vertical movement is minimal
    // This prevents swipe up/down from changing questions
    if (distanceY > maxVerticalDistance) {
      // Vertical swipe detected - ignore
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      touchEndY.current = null;
      return;
    }
    
    // Check if horizontal movement is dominant (more horizontal than vertical)
    if (Math.abs(distanceX) < distanceY) {
      // Vertical movement is dominant - ignore
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      touchEndY.current = null;
      return;
    }
    
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    
    if (isLeftSwipe) onSwipeLeft();
    else if (isRightSwipe) onSwipeRight();
    
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default function ReelsRedesigned() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/channel/:id/:index?');
  const channelId = params?.id;
  const hasIndexInUrl = params?.index !== undefined && params?.index !== '';
  const paramIndex = hasIndexInUrl ? parseInt(params.index || '0') : null;
  
  const staticChannel = getChannel(channelId || '');
  const { subChannels: apiSubChannels } = useSubChannels(channelId || '');
  
  // Build channel object with dynamic subchannels
  const channel = staticChannel ? {
    ...staticChannel,
    subChannels: [
      { id: 'all', name: 'All Topics' },
      ...apiSubChannels.map(sc => ({ 
        id: sc, 
        name: sc.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      }))
    ]
  } : null;
  
  const [selectedSubChannel, setSelectedSubChannel] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(paramIndex ?? 0);
  
  // Get companies for this channel (dynamically based on current filters)
  const { companiesWithCounts } = useCompaniesWithCounts(
    channelId || '',
    selectedSubChannel,
    selectedDifficulty
  );
  
  // Use the new API-based hook
  const { question: currentQuestion, questionIds, totalQuestions, loading, error } = useQuestionsWithPrefetch(
    channelId || '',
    currentIndex,
    selectedSubChannel,
    selectedDifficulty,
    selectedCompany
  );

  // Reset index when filters change and ensure it's within bounds
  useEffect(() => {
    if (totalQuestions > 0 && currentIndex >= totalQuestions) {
      setCurrentIndex(0);
    }
  }, [totalQuestions, currentIndex]);

  // Handler for subchannel change - ensures clean state transition
  const handleSubChannelChange = (newSubChannel: string) => {
    setCurrentIndex(0);
    setSelectedSubChannel(newSubChannel);
    setShowAnswer(false);
  };

  // Handler for difficulty change - ensures clean state transition
  const handleDifficultyChange = (newDifficulty: string) => {
    setCurrentIndex(0);
    setSelectedDifficulty(newDifficulty);
    setShowAnswer(false);
  };

  // Handler for company change - ensures clean state transition
  const handleCompanyChange = (newCompany: string) => {
    setCurrentIndex(0);
    setSelectedCompany(newCompany);
    setShowAnswer(false);
  };
  
  const { completed, markCompleted, lastVisitedIndex, saveLastVisitedIndex } = useProgress(channelId || '');
  const { toast } = useToast();
  const { getSubscribedChannels } = useUserPreferences();
  const [showAnswer, setShowAnswer] = useState(false);
  // Disable timer on mobile devices
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const [timerEnabled, setTimerEnabled] = useState(!isMobile);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [isActive, setIsActive] = useState(true);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [seatMapView, setSeatMapView] = useState(true);
  
  // Dropdown open states - to close them on keyboard navigation
  const [subChannelDropdownOpen, setSubChannelDropdownOpen] = useState(false);
  const [difficultyDropdownOpen, setDifficultyDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  
  // Search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [markedQuestions, setMarkedQuestions] = useState<string[]>(() => {
    const saved = localStorage.getItem(`marked-${channelId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const toggleMark = (questionId: string) => {
    setMarkedQuestions(prev => {
      const newMarked = prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId];
      localStorage.setItem(`marked-${channelId}`, JSON.stringify(newMarked));
      return newMarked;
    });
  };

  const remainingQuestions = totalQuestions - currentIndex - 1;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  
  // Navigation hint state - shows after 10 seconds on same question
  const [showNavHint, setShowNavHint] = useState(false);
  const navHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Show navigation hint after 10 seconds on same question (not on last question)
  useEffect(() => {
    // Clear any existing timeout
    if (navHintTimeoutRef.current) {
      clearTimeout(navHintTimeoutRef.current);
      navHintTimeoutRef.current = null;
    }
    setShowNavHint(false);
    
    // Don't show hint on last question (check inline to avoid dependency issues)
    const isLast = totalQuestions > 0 && currentIndex === totalQuestions - 1;
    if (isLast || totalQuestions === 0) return;
    
    // Set timeout to show hint after 10 seconds
    navHintTimeoutRef.current = setTimeout(() => {
      setShowNavHint(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowNavHint(false), 5000);
    }, 10000);
    
    return () => {
      if (navHintTimeoutRef.current) {
        clearTimeout(navHintTimeoutRef.current);
        navHintTimeoutRef.current = null;
      }
    };
  }, [currentIndex, totalQuestions]);

  // Load timer settings (disabled on mobile)
  useEffect(() => {
    if (isMobile) {
      setTimerEnabled(false);
      setShowAnswer(true);
    } else {
      const savedTimerEnabled = localStorage.getItem('timer-enabled');
      const savedTimerDuration = localStorage.getItem('timer-duration');
      if (savedTimerEnabled !== null) setTimerEnabled(savedTimerEnabled === 'true');
      if (savedTimerDuration !== null) setTimerDuration(parseInt(savedTimerDuration));
    }
    trackActivity();
  }, [isMobile]);

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

  // Sync currentIndex with URL on initial load or URL change
  const lastSyncedIndexRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (totalQuestions === 0) return;
    
    if (hasIndexInUrl && paramIndex !== null) {
      const validIndex = paramIndex >= totalQuestions ? 0 : Math.max(0, paramIndex);
      // Only update if the URL index is different from what we last synced
      if (lastSyncedIndexRef.current !== validIndex) {
        setCurrentIndex(validIndex);
        lastSyncedIndexRef.current = validIndex;
      }
    } else if (lastSyncedIndexRef.current === null) {
      // Only set from lastVisitedIndex on first load without URL index
      const idx = (lastVisitedIndex > 0 && lastVisitedIndex < totalQuestions) ? lastVisitedIndex : 0;
      setCurrentIndex(idx);
      lastSyncedIndexRef.current = idx;
    }
  }, [hasIndexInUrl, paramIndex, totalQuestions, lastVisitedIndex]);

  // Update URL when currentIndex changes from user interaction
  useEffect(() => {
    if (channelId && totalQuestions > 0) {
      // Only update URL if currentIndex differs from what's in the URL
      const urlIndex = hasIndexInUrl ? paramIndex : null;
      if (urlIndex !== currentIndex) {
        setLocation(`/channel/${channelId}/${currentIndex}`, { replace: true });
      }
      saveLastVisitedIndex(currentIndex);
      lastSyncedIndexRef.current = currentIndex;
    }
  }, [currentIndex, channelId, totalQuestions, hasIndexInUrl, paramIndex, saveLastVisitedIndex]);

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

  useEffect(() => {
    setShowAnswer(!timerEnabled);
    setTimeLeft(timerDuration);
    setIsActive(true);
  }, [currentIndex, timerDuration, timerEnabled]);

  useEffect(() => {
    if (currentQuestion) {
      trackQuestionView(currentQuestion.id, currentQuestion.channel, currentQuestion.difficulty);
      markCompleted(currentQuestion.id);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!timerEnabled) setShowAnswer(true);
  }, [timerEnabled]);

  // Close all dropdowns helper
  const closeAllDropdowns = useCallback(() => {
    setSubChannelDropdownOpen(false);
    setDifficultyDropdownOpen(false);
    setCompanyDropdownOpen(false);
    setShowQuestionPicker(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
        return;
      }
      
      // Don't handle navigation if search modal is open
      if (showSearchModal) return;
      
      // Close dropdowns on any arrow key navigation
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        closeAllDropdowns();
      }
      
      if (e.key === 'ArrowDown') nextQuestion();
      else if (e.key === 'ArrowUp') prevQuestion();
      else if (e.key === 'ArrowRight') {
        if (!showAnswer) {
          setShowAnswer(true);
          if (currentQuestion) {
            trackAnswerRevealed(currentQuestion.id, timeLeft);
            markCompleted(currentQuestion.id);
            trackActivity();
          }
        }
      }
      else if (e.key === 'ArrowLeft') goBack();
      else if (e.key === 'Escape') setLocation('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, showAnswer, totalQuestions, closeAllDropdowns, showSearchModal]);

  const nextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // At last question - navigate to next subscribed channel
      const subscribedChannels = getSubscribedChannels();
      const currentChannelIndex = subscribedChannels.findIndex(c => c.id === channelId);
      
      if (currentChannelIndex !== -1 && currentChannelIndex < subscribedChannels.length - 1) {
        // Go to next channel
        const nextChannel = subscribedChannels[currentChannelIndex + 1];
        setLocation(`/channel/${nextChannel.id}/0`);
      } else if (subscribedChannels.length > 1) {
        // Loop back to first channel
        const firstChannel = subscribedChannels[0];
        setLocation(`/channel/${firstChannel.id}/0`);
      }
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    // Simple inline feedback instead of blocking toast
    toast({
      title: "✓ Copied",
      description: "",
    });
  };

  const handleSwipeLeft = useCallback(() => {
    nextQuestion();
  }, [currentIndex, totalQuestions]);

  const handleSwipeRight = useCallback(() => {
    prevQuestion();
  }, [currentIndex]);

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe(handleSwipeLeft, handleSwipeRight);

  // Redirect to home if channel not found
  useEffect(() => {
    if (!staticChannel && channelId) {
      const timer = setTimeout(() => {
        setLocation('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [staticChannel, channelId, setLocation]);

  if (!channel) return (
    <div className="h-screen flex flex-col items-center justify-center font-mono text-white bg-black">
      <div className="text-center">
        <div className="text-2xl mb-4 text-red-400">ERR: CHANNEL_NOT_FOUND</div>
        <div className="text-sm text-white/50 mb-6">
          The channel "{channelId}" does not exist or has no questions.
        </div>
        <div className="text-xs text-white/30 mb-4">Redirecting to home in 3 seconds...</div>
        <button 
          onClick={() => setLocation('/')}
          className="px-4 py-2 bg-primary text-black text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
        >
          Go Home Now
        </button>
      </div>
    </div>
  );

  // currentQuestion is now provided by the useQuestionsWithPrefetch hook
  
  // Show loading state
  if (loading && !currentQuestion) {
    return (
      <div className="h-screen w-full bg-black text-white flex flex-col font-mono">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary">
            <span className="border border-white/20 p-1 px-2">ESC</span> Home
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/50">
            <div className="animate-pulse text-xl mb-2">LOADING...</div>
            <div className="text-xs">Fetching question data</div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen w-full bg-black text-white flex flex-col font-mono">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary">
            <span className="border border-white/20 p-1 px-2">ESC</span> Home
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/50">
            <div className="text-xl mb-2 text-red-400">ERROR</div>
            <div className="text-xs">{error?.message || 'Something went wrong'}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-primary text-black text-xs font-bold rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!currentQuestion || totalQuestions === 0) {
    return (
      <div className="h-screen w-full bg-black text-white flex flex-col font-mono" data-testid="no-questions-view">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary">
            <span className="border border-white/20 p-1 px-2">ESC</span> Home
          </button>
          <span className="text-xs text-white/50 uppercase tracking-widest">{channel?.name}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/50">
            <div className="text-xl mb-2">NO_DATA_FOUND</div>
            <div className="text-xs mb-4">No questions available for this channel or filter</div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button 
                onClick={() => { setSelectedSubChannel('all'); setSelectedDifficulty('all'); setSelectedCompany('all'); setCurrentIndex(0); }}
                className="px-4 py-2 bg-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors border border-white/20"
              >
                Reset Filters
              </button>
              <button 
                onClick={() => setLocation('/')}
                className="px-4 py-2 bg-primary text-black text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = completed.includes(currentQuestion.id);

  // Generate structured data for SEO
  const questionStructuredData = currentQuestion ? {
    "@context": "https://schema.org",
    "@type": "Question",
    "name": currentQuestion.question,
    "text": currentQuestion.question,
    "answerCount": 1,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": currentQuestion.answer || currentQuestion.explanation?.substring(0, 200)
    },
    "author": {
      "@type": "Organization",
      "name": "Code Reels"
    }
  } : undefined;

  return (
    <>
      <SEOHead
        title={`${currentQuestion?.question?.substring(0, 55) || 'Question'}... | ${channel?.name || 'Interview'} Questions - Code Reels`}
        description={`${currentQuestion?.answer?.substring(0, 120) || `Practice ${currentQuestion?.channel || 'technical'} interview questions`}. ${currentQuestion?.difficulty?.charAt(0).toUpperCase()}${currentQuestion?.difficulty?.slice(1) || 'Intermediate'} level. Asked at: ${currentQuestion?.companies?.slice(0, 3).join(', ') || 'top tech companies'}.`}
        keywords={`${currentQuestion?.channel} interview questions, ${currentQuestion?.subChannel} interview, ${currentQuestion?.tags?.slice(0, 5).join(' interview, ') || 'technical interviews'}, ${currentQuestion?.companies?.slice(0, 5).join(', ') || 'FAANG interview'}, ${currentQuestion?.difficulty} interview questions`}
        canonical={`https://reel-interview.github.io/channel/${channelId}/${currentIndex}`}
        structuredData={questionStructuredData}
      />
      
      <div className="h-screen w-full bg-black text-white overflow-hidden flex flex-col font-mono">
        {/* Top Navigation Bar - Compact on mobile */}
        <div className="h-11 sm:h-14 px-2 sm:px-4 z-50 flex justify-between items-center border-b border-white/10 bg-black/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors group shrink-0"
            >
              <span className="border border-white/20 px-2 py-1 group-hover:border-primary transition-colors">ESC</span> 
              <span className="hidden sm:inline">Home</span>
            </button>
            
            <div className="h-4 w-px bg-white/20 hidden sm:block shrink-0" />
            
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-primary shrink-0">{channel.name}</span>
              
              {/* Subchannel dropdown - hidden on very small screens */}
              {channel.subChannels && (
                <div className="hidden xs:flex items-center gap-1">
                  <span className="text-white/30 hidden sm:inline">›</span>
                  <DropdownMenu.Root open={subChannelDropdownOpen} onOpenChange={setSubChannelDropdownOpen}>
                    <DropdownMenu.Trigger className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest hover:text-white text-white/70 outline-none">
                      <span className="truncate max-w-[60px] sm:max-w-[100px]">{channel.subChannels.find(s => s.id === selectedSubChannel)?.name}</span>
                      <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content className="bg-black border border-white/20 p-1 z-[100] min-w-[200px] shadow-xl" align="start">
                      {channel.subChannels.map(sub => (
                        <DropdownMenu.Item 
                          key={sub.id} 
                          className="text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex justify-between outline-none"
                          onSelect={() => handleSubChannelChange(sub.id)}
                        >
                          {sub.name}
                          {selectedSubChannel === sub.id && <Check className="w-3 h-3 text-primary" />}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>
              )}

              <div className="h-4 w-px bg-white/20 hidden sm:block shrink-0" />
              
              {/* Difficulty dropdown */}
              <DropdownMenu.Root open={difficultyDropdownOpen} onOpenChange={setDifficultyDropdownOpen}>
                <DropdownMenu.Trigger className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest hover:text-white text-white/70 outline-none p-1">
                  {selectedDifficulty === 'all' && <Target className="w-3 h-3 shrink-0" />}
                  {selectedDifficulty === 'beginner' && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                  {selectedDifficulty === 'intermediate' && <Target className="w-3 h-3 text-yellow-400 shrink-0" />}
                  {selectedDifficulty === 'advanced' && <Flame className="w-3 h-3 text-red-400 shrink-0" />}
                  <span className="hidden sm:inline truncate">
                    {selectedDifficulty === 'all' ? 'All' : selectedDifficulty}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content className="bg-black border border-white/20 p-1 z-[100] min-w-[150px] shadow-xl" align="start">
                  <DropdownMenu.Item className="text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none" onSelect={() => handleDifficultyChange('all')}>
                    <Target className="w-3 h-3" /> All
                    {selectedDifficulty === 'all' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none" onSelect={() => handleDifficultyChange('beginner')}>
                    <Zap className="w-3 h-3 text-green-400" /> Beginner
                    {selectedDifficulty === 'beginner' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none" onSelect={() => handleDifficultyChange('intermediate')}>
                    <Target className="w-3 h-3 text-yellow-400" /> Intermediate
                    {selectedDifficulty === 'intermediate' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none" onSelect={() => handleDifficultyChange('advanced')}>
                    <Flame className="w-3 h-3 text-red-400" /> Advanced
                    {selectedDifficulty === 'advanced' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>

              {/* Company filter dropdown - dynamically shows companies with question counts */}
              {companiesWithCounts.length > 0 && (
                <>
                  <div className="h-4 w-px bg-white/20 hidden sm:block shrink-0" />
                  <DropdownMenu.Root open={companyDropdownOpen} onOpenChange={setCompanyDropdownOpen}>
                    <DropdownMenu.Trigger className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest hover:text-white text-white/70 outline-none p-1">
                      <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="hidden sm:inline truncate max-w-[80px]">
                        {selectedCompany === 'all' ? 'Company' : selectedCompany}
                      </span>
                      {selectedCompany !== 'all' && (
                        <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1 rounded">
                          {companiesWithCounts.find(c => c.name === selectedCompany)?.count || 0}
                        </span>
                      )}
                      <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content className="bg-black border border-white/20 p-1 z-[100] min-w-[200px] max-h-[300px] overflow-y-auto shadow-xl custom-scrollbar" align="start">
                      <DropdownMenu.Item 
                        className="text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none" 
                        onSelect={() => handleCompanyChange('all')}
                      >
                        <Building2 className="w-3 h-3" /> All Companies
                        <span className="text-[10px] text-white/40 ml-auto mr-2">
                          {companiesWithCounts.reduce((sum, c) => sum + c.count, 0)} Q
                        </span>
                        {selectedCompany === 'all' && <Check className="w-3 h-3 text-primary" />}
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="h-px bg-white/10 my-1" />
                      {companiesWithCounts.map(({ name, count }) => (
                        <DropdownMenu.Item 
                          key={name}
                          className="text-xs text-white p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2 outline-none" 
                          onSelect={() => handleCompanyChange(name)}
                        >
                          <span className="w-4 h-4 flex items-center justify-center text-[10px] bg-blue-500/20 text-blue-400 rounded font-bold">
                            {name.charAt(0)}
                          </span>
                          <span className="flex-1">{name}</span>
                          <span className="text-[10px] text-white/40 tabular-nums">{count}</span>
                          {selectedCompany === name && <Check className="w-3 h-3 text-primary ml-1" />}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Search button - hidden on mobile */}
            <button 
              onClick={() => setShowSearchModal(true)}
              className="hidden sm:flex items-center gap-1.5 p-1.5 hover:bg-white/10 border border-white/10 rounded transition-colors group"
              title="Search questions (⌘K)"
            >
              <Search className="w-4 h-4 text-white/70 group-hover:text-white" />
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] text-white/40 bg-white/5 border border-white/10 rounded">
                ⌘K
              </kbd>
            </button>
            
            {/* GitHub links - hidden on mobile */}
            <div className="hidden sm:flex gap-1 mr-2">
              <a href="https://github.com/satishkumar-dhule/code-reels/issues/new" target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-white/10 border border-white/10 rounded transition-colors" title="Report Issue">
                <AlertCircle className="w-4 h-4" />
              </a>
              <a href="https://github.com/satishkumar-dhule/code-reels" target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-white/10 border border-white/10 rounded transition-colors" title="Star on GitHub">
                <Star className="w-4 h-4" />
              </a>
            </div>
            {/* Navigation buttons */}
            <div className="flex gap-1">
              <button onClick={prevQuestion} disabled={currentIndex === 0} className="p-1.5 hover:bg-white/10 border border-white/10 rounded disabled:opacity-30 transition-colors" title="Previous">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button onClick={nextQuestion} className="p-1.5 hover:bg-white/10 border border-white/10 rounded transition-colors" title={isLastQuestion ? "Next Channel" : "Next"}>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Question Picker - Simplified on mobile */}
            <Popover.Root open={showQuestionPicker} onOpenChange={setShowQuestionPicker}>
              <Popover.Trigger asChild>
                <button className="flex items-center gap-1 sm:gap-2 hover:text-primary transition-colors group">
                  <List className="w-4 h-4 opacity-50 group-hover:opacity-100 hidden sm:block" />
                  <span className="text-[10px] sm:text-xs font-mono text-white/50 group-hover:text-white">
                    {currentIndex + 1}/{totalQuestions}
                  </span>
                  {isLastQuestion && <Flag className="w-3 h-3 text-primary animate-pulse hidden sm:block" />}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="bg-black border border-white/20 p-3 w-96 max-h-[70vh] z-50 shadow-xl" sideOffset={5} align="end">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest">
                        <span className="text-white/50">Progress</span>
                        <span className="text-primary">{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[9px] border-t border-white/10 pt-2">
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
                    </div>

                    <div className="border-t border-white/10 pt-2">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/50">Jump to Question</div>
                        <div className="flex gap-1">
                          <button onClick={() => setSeatMapView(true)} className={`p-1 rounded ${seatMapView ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}>
                            <Grid3X3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setSeatMapView(false)} className={`p-1 rounded ${!seatMapView ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}>
                            <LayoutList className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {seatMapView ? (
                        <div className="grid grid-cols-10 gap-1 max-h-[40vh] overflow-y-auto custom-scrollbar p-1">
                          {questionIds.map((qId, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isMarked = markedQuestions.includes(qId);
                            const isCompletedQ = completed.includes(qId);
                            
                            let bgClass = 'bg-white/10 border-white/20 hover:bg-white/20';
                            if (isCurrent) bgClass = 'bg-primary border-primary text-black';
                            else if (isCompletedQ) bgClass = 'bg-green-500/30 border-green-500 text-green-400';
                            else if (isMarked) bgClass = 'bg-blue-500/30 border-blue-500 text-blue-400';
                            
                            return (
                              <button
                                key={qId}
                                onClick={() => { setCurrentIndex(idx); setShowQuestionPicker(false); }}
                                className={`w-8 h-8 rounded border text-[10px] font-mono font-bold transition-all ${bgClass} relative`}
                                title={`Question ${idx + 1}`}
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
                        <div className="max-h-[40vh] overflow-y-auto custom-scrollbar space-y-1">
                          {questionIds.map((qId, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isMarked = markedQuestions.includes(qId);
                            const isCompletedQ = completed.includes(qId);
                            
                            let borderClass = 'hover:bg-white/10 text-white/70';
                            if (isCurrent) borderClass = 'bg-primary/20 text-primary border border-primary/30';
                            else if (isCompletedQ) borderClass = 'bg-green-500/10 text-green-400 border border-green-500/30';
                            else if (isMarked) borderClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
                            
                            return (
                              <button
                                key={qId}
                                onClick={() => { setCurrentIndex(idx); setShowQuestionPicker(false); }}
                                className={`w-full text-left p-2 text-xs rounded transition-colors flex items-start gap-2 ${borderClass}`}
                              >
                                <span className="font-mono text-[10px] opacity-50 shrink-0 w-6">{String(idx + 1).padStart(2, '0')}</span>
                                <span className="line-clamp-2 flex-1">Question {idx + 1}</span>
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
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* Timer Settings - Hidden on mobile */}
            <div className="hidden sm:block">
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button className="flex items-center gap-2 hover:text-primary transition-colors" title="Timer Settings">
                    <Settings className="w-4 h-4 opacity-50" />
                    {timerEnabled ? (
                      <span className="font-mono text-xs text-primary">{String(timeLeft).padStart(2, '0')}s</span>
                    ) : (
                      <span className="text-xs text-white/30">OFF</span>
                    )}
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content className="bg-black border border-white/20 p-4 w-72 z-50 shadow-xl" sideOffset={5}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/70">Enable Timer</label>
                        <Switch.Root checked={timerEnabled} onCheckedChange={handleTimerEnabledChange} className="w-[42px] h-[25px] bg-white/10 rounded-full relative data-[state=checked]:bg-primary outline-none cursor-default">
                          <Switch.Thumb className="block w-[21px] h-[21px] bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[19px]" />
                        </Switch.Root>
                      </div>

                      <div className={`space-y-3 ${!timerEnabled ? 'opacity-30 pointer-events-none' : ''}`}>
                        <div className="flex justify-between">
                          <label className="text-xs font-bold uppercase tracking-widest text-white/70">Duration</label>
                          <span className="text-xs font-mono text-primary">{timerDuration}s</span>
                        </div>
                        <Slider.Root className="relative flex items-center select-none touch-none w-full h-5" defaultValue={[timerDuration]} max={300} min={10} step={10} onValueChange={handleTimerDurationChange} disabled={!timerEnabled}>
                          <Slider.Track className="bg-white/10 relative grow rounded-full h-[3px]">
                            <Slider.Range className="absolute bg-primary rounded-full h-full" />
                          </Slider.Track>
                          <Slider.Thumb className="block w-4 h-4 bg-white rounded-full hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
                        </Slider.Root>
                        <div className="flex justify-between text-[10px] text-white/30">
                          <span>10s</span>
                          <span>300s</span>
                        </div>
                      </div>
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            </div>

            <button onClick={handleShare} className="hidden sm:block hover:text-primary transition-colors" title="Share">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content - Split View */}
        <div 
          className="flex-1 w-full flex flex-col lg:flex-row overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <AnimatePresence mode="wait" custom={currentIndex}>
            <motion.div
              key={currentQuestion.id}
              initial={isMobile ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={isMobile ? undefined : { opacity: 0 }}
              transition={{ duration: isMobile ? 0 : 0.2 }}
              className="w-full h-full flex flex-col lg:flex-row overflow-hidden"
            >
              {/* Left: Question Panel - Compact on mobile, smart height based on question length */}
              <div className={`w-full lg:w-[35%] h-auto ${
                currentQuestion.question.length > 200 
                  ? 'max-h-[35vh]' // More space for long questions (reduced from 40vh)
                  : 'max-h-[25vh]' // Less space for short questions (reduced from 30vh)
              } lg:max-h-none lg:h-full border-b lg:border-b-0 lg:border-r border-white/10 bg-gradient-to-br from-black to-black/95 shrink-0 overflow-y-auto lg:overflow-y-visible custom-scrollbar`}>
                <QuestionPanel
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={totalQuestions}
                  isMarked={markedQuestions.includes(currentQuestion.id)}
                  isCompleted={isCompleted}
                  onToggleMark={() => toggleMark(currentQuestion.id)}
                  timerEnabled={timerEnabled}
                  timeLeft={timeLeft}
                />
              </div>

              {/* Right: Answer Panel - Takes remaining space */}
              <div className="w-full lg:w-[65%] flex-1 lg:h-full bg-black/50 relative flex flex-col overflow-hidden">
                {!showAnswer ? (
                  <button 
                    onClick={() => {
                      setShowAnswer(true);
                      trackAnswerRevealed(currentQuestion.id, timeLeft);
                      markCompleted(currentQuestion.id);
                      trackActivity();
                    }}
                    className="w-full h-full min-h-[120px] sm:min-h-[200px] flex flex-col items-center justify-center group hover:bg-white/5 transition-all cursor-pointer"
                  >
                    {isMobile ? (
                      <div className="flex flex-col items-center px-4">
                        <Terminal className="w-10 h-10 mb-3 text-white/20" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white/50 text-center">
                          Tap to Reveal
                        </span>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center px-4"
                      >
                        <Terminal className="w-16 h-16 mb-6 text-white/10 group-hover:text-primary/50 transition-colors duration-300" />
                        <span className="text-sm font-bold uppercase tracking-widest text-white/30 group-hover:text-white transition-colors text-center">
                          Tap to Reveal Answer
                        </span>
                        <span className="mt-4 text-xs text-white/20 font-mono">[OR PRESS →]</span>
                      </motion.div>
                    )}
                  </button>
                ) : (
                  <AnswerPanel question={currentQuestion} isCompleted={isCompleted} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Unified Footer with Status Bar */}
        <div className="border-t border-white/10 bg-black shrink-0">
          {/* Status notification bar - shows contextual messages */}
          <AnimatePresence mode="wait">
            {isLastQuestion && showAnswer ? (
              <motion.div
                key="complete"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="h-8 px-2 sm:px-4 flex items-center justify-between bg-primary/10 border-b border-primary/20">
                  <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-primary">
                    <Flag className="w-3 h-3" />
                    <span>🎉 Complete! {completed.length}/{totalQuestions}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={nextQuestion}
                      className="px-2 py-0.5 bg-primary text-black text-[9px] font-bold uppercase rounded hover:bg-primary/90"
                    >
                      Next →
                    </button>
                    <button
                      onClick={() => setLocation('/')}
                      className="px-2 py-0.5 bg-white/10 text-white/70 text-[9px] font-bold uppercase rounded hover:bg-white/20"
                    >
                      Home
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : showNavHint && !isLastQuestion ? (
              <motion.div
                key="hint"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="h-6 px-2 sm:px-4 flex items-center justify-center bg-primary/10 border-b border-primary/20">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                    {isMobile ? '← Swipe for next →' : '↓ Press down for next'}
                  </span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          
          {/* Main footer */}
          <div className="h-7 sm:h-8 px-2 sm:px-4 flex justify-between items-center text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white/30">
            <div className="flex gap-4 sm:gap-6">
              <span className="hidden sm:flex items-center gap-1"><span className="text-primary">↑↓</span> NAV</span>
              <span className="hidden sm:flex items-center gap-1"><span className="text-primary">→</span> REVEAL</span>
              <span className="sm:hidden text-white/40">← SWIPE →</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className={isLastQuestion ? 'text-primary' : 'text-white/40'}>
                {isLastQuestion ? 'FINAL' : `${remainingQuestions} LEFT`}
              </span>
              <span className="text-white/20 hidden sm:inline">|</span>
              <span className="hidden sm:inline">v3.0</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </>
  );
}
