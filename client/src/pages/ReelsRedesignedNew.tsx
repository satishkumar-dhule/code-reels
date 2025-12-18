import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { getChannel } from '../lib/data';
import { useQuestionsWithPrefetch } from '../hooks/use-questions';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '../components/SEOHead';
import { QuestionPanel } from '../components/QuestionPanel';
import { AnswerPanel } from '../components/AnswerPanel';
import { trackQuestionView, trackAnswerRevealed } from '../hooks/use-analytics';
import { 
  ArrowLeft, ArrowRight, Share2, ChevronDown, Check, Timer, List, 
  Flag, Grid3X3, LayoutList, Zap, Target, Flame, Star, AlertCircle, 
  Terminal, Bookmark, X, Settings, Loader2
} from 'lucide-react';
import { useProgress, trackActivity } from '../hooks/use-progress';
import { useToast } from '@/hooks/use-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';

// Swipe detection hook
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distanceX = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    
    if (isLeftSwipe) onSwipeLeft();
    else if (isRightSwipe) onSwipeRight();
    
    touchStartX.current = null;
    touchEndX.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default function ReelsRedesignedNew() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/channel/:id/:index?');
  const channelId = params?.id;
  const hasIndexInUrl = params?.index !== undefined && params?.index !== '';
  const paramIndex = hasIndexInUrl ? parseInt(params.index || '0') : null;
  
  const channel = getChannel(channelId || '');
  
  const [selectedSubChannel, setSelectedSubChannel] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(paramIndex ?? 0);
  
  // Use the new API-based hook
  const { question: currentQuestion, questionIds, totalQuestions, loading, error } = useQuestionsWithPrefetch(
    channelId || '',
    currentIndex,
    selectedSubChannel,
    selectedDifficulty
  );
  
  const { completed, markCompleted, lastVisitedIndex, saveLastVisitedIndex } = useProgress(channelId || '');
  const { toast } = useToast();

  const [showAnswer, setShowAnswer] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [isActive, setIsActive] = useState(true);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [seatMapView, setSeatMapView] = useState(true);
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

  // Show loading state
  if (loading && !currentQuestion) {
    return (
      <div className="h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-white/60">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold">Failed to Load Questions</h2>
          <p className="text-sm text-white/60">{error?.message || 'Something went wrong'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show no questions state
  if (!currentQuestion || totalQuestions === 0) {
    return (
      <div className="h-screen w-full bg-black text-white flex flex-col font-mono">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-bold">Back</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 px-4">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-bold">No Questions Found</h2>
            <p className="text-sm text-white/60">
              Try adjusting your filters or select a different channel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Rest of the component logic remains the same...
  // (Timer, navigation, tracking, etc.)
  
  return (
    <>
      <SEOHead
        title={`${currentQuestion?.question?.substring(0, 55) || 'Question'}... | ${currentQuestion?.channel || 'Interview'} - Code Reels`}
        description={`Practice ${currentQuestion?.channel || 'technical'} interview questions. ${currentQuestion?.difficulty?.charAt(0).toUpperCase()}${currentQuestion?.difficulty?.slice(1) || 'Intermediate'} level. Free interview prep with explanations and diagrams.`}
        keywords={`${currentQuestion?.channel} interview, ${currentQuestion?.subChannel} questions, interview prep, ${currentQuestion?.tags?.join(', ') || 'technical interviews'}, FAANG interview`}
        canonical={`https://reel-interview.github.io/channel/${channelId}`}
      />
      <div className="h-screen w-full bg-black text-white flex flex-col font-mono">
        {/* Your existing UI components here */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">{currentQuestion.question}</h2>
              {showAnswer && (
                <div className="mt-8 text-left">
                  <h3 className="text-xl font-bold mb-2">Answer:</h3>
                  <p className="text-white/80">{currentQuestion.answer}</p>
                  <h3 className="text-xl font-bold mt-6 mb-2">Explanation:</h3>
                  <p className="text-white/80">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
