/**
 * Question Viewer - Clean interface
 * Split view with question on left, answer on right
 * Mobile: Swipeable cards
 */

import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { getChannel } from '../lib/data';
import { useQuestionsWithPrefetch, useSubChannels, useCompaniesWithCounts } from '../hooks/use-questions';
import { useProgress, trackActivity } from '../hooks/use-progress';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { SEOHead } from '../components/SEOHead';
import { QuestionPanel } from '../components/QuestionPanel';
import { AnswerPanel } from '../components/AnswerPanel';
import { UnifiedSearch } from '../components/UnifiedSearch';
import { trackQuestionView } from '../hooks/use-analytics';
import { useToast } from '../hooks/use-toast';
import { useSwipe } from '../hooks/use-swipe';
import {
  ChevronLeft, ChevronRight, Search,
  ChevronDown, Check, Share2, Bookmark,
  Zap, Target, Flame, Building2
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function QuestionViewer() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/channel/:id/:index?');
  const channelId = params?.id;
  const hasIndexInUrl = params?.index !== undefined && params?.index !== '';
  const paramIndex = hasIndexInUrl ? parseInt(params.index || '0') : null;

  const staticChannel = getChannel(channelId || '');
  const { subChannels: apiSubChannels } = useSubChannels(channelId || '');

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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [mobileView, setMobileView] = useState<'question' | 'answer'>('question');

  const { companiesWithCounts } = useCompaniesWithCounts(
    channelId || '',
    selectedSubChannel,
    selectedDifficulty
  );

  const { question: currentQuestion, totalQuestions, loading, error } = useQuestionsWithPrefetch(
    channelId || '',
    currentIndex,
    selectedSubChannel,
    selectedDifficulty,
    selectedCompany
  );

  const { completed, markCompleted, saveLastVisitedIndex } = useProgress(channelId || '');
  const { isSubscribed, subscribeChannel } = useUserPreferences();
  const { toast } = useToast();

  // Auto-subscribe to channel if not subscribed
  useEffect(() => {
    if (channelId && channel && !isSubscribed(channelId)) {
      subscribeChannel(channelId);
      toast({
        title: "Channel added",
        description: `${channel.name} added to your channels`,
      });
    }
  }, [channelId, channel]);

  const [markedQuestions, setMarkedQuestions] = useState<string[]>(() => {
    const saved = localStorage.getItem(`marked-${channelId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Mobile swipe to switch between question and answer
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => setMobileView('answer'),
    onSwipeRight: () => setMobileView('question'),
  });

  // Reset index when filters change
  useEffect(() => {
    if (totalQuestions > 0 && currentIndex >= totalQuestions) {
      setCurrentIndex(0);
    }
  }, [totalQuestions, currentIndex]);

  // Sync with URL
  useEffect(() => {
    if (channelId && totalQuestions > 0 && currentIndex !== paramIndex) {
      setLocation(`/channel/${channelId}/${currentIndex}`, { replace: true });
      saveLastVisitedIndex(currentIndex);
    }
  }, [currentIndex, channelId, totalQuestions]);

  // Track question view
  useEffect(() => {
    if (currentQuestion) {
      trackQuestionView(currentQuestion.id, currentQuestion.channel, currentQuestion.difficulty);
      markCompleted(currentQuestion.id);
      trackActivity();
    }
  }, [currentIndex, currentQuestion?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
        return;
      }
      if (showSearchModal) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevQuestion();
      } else if (e.key === 'Escape') {
        setLocation('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalQuestions, showSearchModal]);

  const nextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setMobileView('question');
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setMobileView('question');
    }
  };

  const toggleMark = () => {
    if (!currentQuestion) return;
    setMarkedQuestions(prev => {
      const newMarked = prev.includes(currentQuestion.id)
        ? prev.filter(id => id !== currentQuestion.id)
        : [...prev, currentQuestion.id];
      localStorage.setItem(`marked-${channelId}`, JSON.stringify(newMarked));
      return newMarked;
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Question link copied to clipboard",
      });
    } catch {
      toast({
        title: "Share",
        description: window.location.href,
      });
    }
  };

  const handleFilterChange = (type: 'sub' | 'diff' | 'company', value: string) => {
    setCurrentIndex(0);
    if (type === 'sub') setSelectedSubChannel(value);
    else if (type === 'diff') setSelectedDifficulty(value);
    else setSelectedCompany(value);
  };

  // Loading state
  if (loading && !currentQuestion) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !channel) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Channel not found</h2>
          <p className="text-muted-foreground mb-4">The channel "{channelId}" doesn't exist.</p>
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // No questions state
  if (!currentQuestion || totalQuestions === 0) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header
          channel={channel}
          onBack={() => setLocation('/')}
          onSearch={() => setShowSearchModal(true)}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">No questions found</h2>
            <p className="text-muted-foreground mb-4">Try adjusting your filters.</p>
            <button
              onClick={() => {
                setSelectedSubChannel('all');
                setSelectedDifficulty('all');
                setSelectedCompany('all');
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMarked = markedQuestions.includes(currentQuestion.id);
  const isCompleted = completed.includes(currentQuestion.id);
  const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <>
      <SEOHead
        title={`${currentQuestion.question.substring(0, 55)}... | ${channel.name} - Code Reels`}
        description={currentQuestion.answer?.substring(0, 120) || 'Practice interview questions'}
        canonical={`https://open-interview.github.io/channel/${channelId}/${currentIndex}`}
      />

      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Header with integrated filters */}
        <Header
          channel={channel}
          onBack={() => setLocation('/')}
          onSearch={() => setShowSearchModal(true)}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          progress={progress}
          filters={{
            selectedSubChannel,
            selectedDifficulty,
            selectedCompany,
            companiesWithCounts,
            onFilterChange: handleFilterChange
          }}
        />

        {/* Main Content - Desktop: Split View, Mobile: Tabs */}
        <div className="flex-1 flex overflow-hidden isolate" data-testid="reels-content">
          {/* Desktop Split View */}
          <div className="hidden lg:flex flex-1">
            {/* Question Panel */}
            <div className="w-1/2 border-r border-border overflow-hidden">
              <QuestionPanel
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={totalQuestions}
                isMarked={isMarked}
                isCompleted={isCompleted}
                onToggleMark={toggleMark}
                timerEnabled={false}
                timeLeft={0}
              />
            </div>
            {/* Answer Panel */}
            <div className="w-1/2 overflow-hidden">
              <AnswerPanel question={currentQuestion} isCompleted={isCompleted} />
            </div>
          </div>

          {/* Mobile Tab View */}
          <div className="flex-1 flex flex-col lg:hidden overflow-hidden">
            {/* Mobile Tabs */}
            <div className="flex border-b border-border bg-background relative z-10">
              <button
                onClick={() => setMobileView('question')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  mobileView === 'question'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                Question
              </button>
              <button
                onClick={() => setMobileView('answer')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  mobileView === 'answer'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                Answer
              </button>
            </div>
            {/* Mobile Content - Swipeable */}
            <div 
              className="flex-1 overflow-y-auto overflow-x-hidden bg-background relative z-0 pb-20"
              onTouchStart={swipeHandlers.onTouchStart}
              onTouchMove={swipeHandlers.onTouchMove}
              onTouchEnd={swipeHandlers.onTouchEnd}
            >
              {mobileView === 'question' ? (
                <QuestionPanel
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={totalQuestions}
                  isMarked={isMarked}
                  isCompleted={isCompleted}
                  onToggleMark={toggleMark}
                  onTapQuestion={() => setMobileView('answer')}
                  timerEnabled={false}
                  timeLeft={0}
                />
              ) : (
                <AnswerPanel question={currentQuestion} isCompleted={isCompleted} />
              )}
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <NavigationFooter
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          onPrev={prevQuestion}
          onNext={nextQuestion}
          onShare={handleShare}
          isMarked={isMarked}
          onToggleMark={toggleMark}
        />
      </div>

      <UnifiedSearch isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </>
  );
}

// Header Component with integrated filters
function Header({ channel, onBack, onSearch, currentIndex, totalQuestions, progress, filters }: any) {
  const { selectedSubChannel, selectedDifficulty, selectedCompany, companiesWithCounts, onFilterChange } = filters || {};
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Check if any filter is active
  const hasActiveFilter = selectedSubChannel !== 'all' || selectedDifficulty !== 'all' || selectedCompany !== 'all';
  
  return (
    <header className="bg-card border-b border-border shrink-0">
      {/* Main header row */}
      <div className="h-14 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="shrink-0 min-w-0">
          <h1 className="font-semibold text-sm sm:text-base truncate">{channel.name}</h1>
          {totalQuestions > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{currentIndex + 1} of {totalQuestions}</span>
              <div className="w-12 sm:w-16 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Desktop Filters - hidden on mobile */}
        {filters && (
          <div className="hidden sm:flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar mx-2">
            {channel.subChannels?.length > 1 && (
              <FilterDropdown
                label={channel.subChannels.find((s: any) => s.id === selectedSubChannel)?.name || 'Topic'}
                options={channel.subChannels.map((s: any) => ({ id: s.id, label: s.name }))}
                selected={selectedSubChannel}
                onSelect={(v) => onFilterChange('sub', v)}
              />
            )}
            <FilterDropdown
              label={selectedDifficulty === 'all' ? 'Difficulty' : selectedDifficulty}
              options={[
                { id: 'all', label: 'All Levels', icon: <Target className="w-3 h-3" /> },
                { id: 'beginner', label: 'Easy', icon: <Zap className="w-3 h-3 text-green-500" /> },
                { id: 'intermediate', label: 'Medium', icon: <Target className="w-3 h-3 text-yellow-500" /> },
                { id: 'advanced', label: 'Hard', icon: <Flame className="w-3 h-3 text-red-500" /> },
              ]}
              selected={selectedDifficulty}
              onSelect={(v) => onFilterChange('diff', v)}
            />
            {companiesWithCounts.length > 0 && (
              <FilterDropdown
                label={selectedCompany === 'all' ? 'Company' : selectedCompany}
                options={[
                  { id: 'all', label: 'All Companies', icon: <Building2 className="w-3 h-3" /> },
                  ...companiesWithCounts.map((c: any) => ({ id: c.name, label: `${c.name} (${c.count})` }))
                ]}
                selected={selectedCompany}
                onSelect={(v) => onFilterChange('company', v)}
              />
            )}
          </div>
        )}

        {/* Mobile filter toggle button */}
        {filters && (
          <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`sm:hidden p-2 rounded-lg transition-colors ${
              showMobileFilters || hasActiveFilter ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
          </button>
        )}

        <button onClick={onSearch} className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0">
          <Search className="w-5 h-5" />
        </button>
      </div>
      
      {/* Mobile filters row - collapsible */}
      {filters && showMobileFilters && (
        <div className="sm:hidden px-3 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {channel.subChannels?.length > 1 && (
            <FilterDropdown
              label={channel.subChannels.find((s: any) => s.id === selectedSubChannel)?.name || 'Topic'}
              options={channel.subChannels.map((s: any) => ({ id: s.id, label: s.name }))}
              selected={selectedSubChannel}
              onSelect={(v) => onFilterChange('sub', v)}
            />
          )}
          <FilterDropdown
            label={selectedDifficulty === 'all' ? 'Level' : selectedDifficulty.slice(0, 4)}
            options={[
              { id: 'all', label: 'All Levels', icon: <Target className="w-3 h-3" /> },
              { id: 'beginner', label: 'Easy', icon: <Zap className="w-3 h-3 text-green-500" /> },
              { id: 'intermediate', label: 'Medium', icon: <Target className="w-3 h-3 text-yellow-500" /> },
              { id: 'advanced', label: 'Hard', icon: <Flame className="w-3 h-3 text-red-500" /> },
            ]}
            selected={selectedDifficulty}
            onSelect={(v) => onFilterChange('diff', v)}
          />
          {companiesWithCounts.length > 0 && (
            <FilterDropdown
              label={selectedCompany === 'all' ? 'Company' : selectedCompany.slice(0, 8)}
              options={[
                { id: 'all', label: 'All Companies', icon: <Building2 className="w-3 h-3" /> },
                ...companiesWithCounts.map((c: any) => ({ id: c.name, label: `${c.name} (${c.count})` }))
              ]}
              selected={selectedCompany}
              onSelect={(v) => onFilterChange('company', v)}
            />
          )}
        </div>
      )}
    </header>
  );
}

// Filter Dropdown Component
interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}

function FilterDropdown({ label, options, selected, onSelect }: FilterDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-sm transition-colors whitespace-nowrap">
          {label}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[180px] max-h-[300px] overflow-y-auto bg-card border border-border rounded-lg shadow-lg p-1 z-50"
          sideOffset={4}
        >
          {options.map((opt: any) => (
            <DropdownMenu.Item
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer outline-none text-sm ${
                selected === opt.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              {opt.icon}
              <span className="flex-1">{opt.label}</span>
              {selected === opt.id && <Check className="w-4 h-4" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Navigation Footer Component - Minimal floating controls
function NavigationFooter({ currentIndex, totalQuestions, onPrev, onNext, onShare, isMarked, onToggleMark }: any) {
  const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  
  return (
    <>
      {/* Mobile: Minimal horizontal pill at bottom center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none lg:hidden">
        <div className="pointer-events-auto flex items-center gap-0.5 p-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full shadow-xl">
          {/* Previous button */}
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-full hover:bg-white/10 transition-all disabled:opacity-20 active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 text-white/80" />
          </button>

          {/* Progress pill */}
          <div className="flex items-center gap-1.5 px-2 py-1">
            <div className="relative w-10 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-white/60 tabular-nums">
              {currentIndex + 1}/{totalQuestions}
            </span>
          </div>

          {/* Next button - Primary */}
          <button
            onClick={onNext}
            disabled={currentIndex === totalQuestions - 1}
            className="p-2 bg-primary text-white rounded-full hover:bg-primary/80 transition-all disabled:opacity-20 active:scale-90"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop: Horizontal pill at bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none hidden lg:block">
        <div className="pointer-events-auto flex items-center gap-1 px-2 py-1.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full shadow-xl">
          {/* Previous button */}
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-full hover:bg-white/10 transition-all disabled:opacity-20 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-white/80" />
          </button>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 px-2">
            <div className="relative w-16 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-white/60 tabular-nums">
              {currentIndex + 1}/{totalQuestions}
            </span>
          </div>

          {/* Bookmark */}
          <button
            onClick={onToggleMark}
            className={`p-2 rounded-full transition-all active:scale-95 ${
              isMarked ? 'text-primary' : 'hover:bg-white/10 text-white/60'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-current' : ''}`} />
          </button>

          {/* Share */}
          <button 
            onClick={onShare} 
            className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Next button */}
          <button
            onClick={onNext}
            disabled={currentIndex === totalQuestions - 1}
            className="flex items-center gap-1 pl-3 pr-2 py-1.5 bg-primary text-white rounded-full hover:bg-primary/80 transition-all disabled:opacity-20 active:scale-95 text-sm font-medium"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
