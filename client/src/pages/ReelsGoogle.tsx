/**
 * Redesigned Question Viewer - Google-style clean interface
 * Split view with question on left, answer on right
 * Mobile: Swipeable cards
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { getChannel } from '../lib/data';
import { useQuestionsWithPrefetch, useSubChannels, useCompaniesWithCounts } from '../hooks/use-questions';
import { useProgress, trackActivity } from '../hooks/use-progress';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { SEOHead } from '../components/SEOHead';
import { QuestionPanel } from '../components/QuestionPanel';
import { AnswerPanel } from '../components/AnswerPanel';
import { SearchModal } from '../components/SearchModal';
import { trackQuestionView, trackAnswerRevealed } from '../hooks/use-analytics';
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Home, Search,
  Filter, ChevronDown, Check, Share2, Bookmark, Grid, List,
  Zap, Target, Flame, Building2, X, Menu, MoreVertical
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function ReelsGoogle() {
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
  const [showAnswer, setShowAnswer] = useState(true);
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

  const { completed, markCompleted, lastVisitedIndex, saveLastVisitedIndex } = useProgress(channelId || '');
  const { getSubscribedChannels } = useUserPreferences();

  const [markedQuestions, setMarkedQuestions] = useState<string[]>(() => {
    const saved = localStorage.getItem(`marked-${channelId}`);
    return saved ? JSON.parse(saved) : [];
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
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
        canonical={`https://reel-interview.github.io/channel/${channelId}/${currentIndex}`}
      />

      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <Header
          channel={channel}
          onBack={() => setLocation('/')}
          onSearch={() => setShowSearchModal(true)}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          progress={progress}
        />

        {/* Filters Bar */}
        <FiltersBar
          channel={channel}
          selectedSubChannel={selectedSubChannel}
          selectedDifficulty={selectedDifficulty}
          selectedCompany={selectedCompany}
          companiesWithCounts={companiesWithCounts}
          onFilterChange={handleFilterChange}
        />

        {/* Main Content - Desktop: Split View, Mobile: Tabs */}
        <div className="flex-1 flex overflow-hidden" data-testid="reels-content">
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
          <div className="flex-1 flex flex-col lg:hidden">
            {/* Mobile Tabs */}
            <div className="flex border-b border-border">
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
            {/* Mobile Content */}
            <div className="flex-1 overflow-hidden">
              {mobileView === 'question' ? (
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

      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </>
  );
}

// Header Component
function Header({ channel, onBack, onSearch, currentIndex, totalQuestions, progress }: any) {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 shrink-0">
      <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold truncate">{channel.name}</h1>
        {totalQuestions > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{currentIndex + 1} of {totalQuestions}</span>
            <div className="flex-1 max-w-[100px] h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <button onClick={onSearch} className="p-2 hover:bg-muted rounded-lg transition-colors">
        <Search className="w-5 h-5" />
      </button>
    </header>
  );
}

// Filters Bar Component
function FiltersBar({ channel, selectedSubChannel, selectedDifficulty, selectedCompany, companiesWithCounts, onFilterChange }: any) {
  return (
    <div className="h-12 bg-card/50 border-b border-border flex items-center px-4 gap-2 overflow-x-auto shrink-0">
      {/* Subchannel Filter */}
      {channel.subChannels?.length > 1 && (
        <FilterDropdown
          label={channel.subChannels.find((s: any) => s.id === selectedSubChannel)?.name || 'Topic'}
          options={channel.subChannels.map((s: any) => ({ id: s.id, label: s.name }))}
          selected={selectedSubChannel}
          onSelect={(v) => onFilterChange('sub', v)}
        />
      )}

      {/* Difficulty Filter */}
      <FilterDropdown
        label={selectedDifficulty === 'all' ? 'Difficulty' : selectedDifficulty}
        options={[
          { id: 'all', label: 'All Levels', icon: <Target className="w-3 h-3" /> },
          { id: 'beginner', label: 'Beginner', icon: <Zap className="w-3 h-3 text-green-500" /> },
          { id: 'intermediate', label: 'Intermediate', icon: <Target className="w-3 h-3 text-yellow-500" /> },
          { id: 'advanced', label: 'Advanced', icon: <Flame className="w-3 h-3 text-red-500" /> },
        ]}
        selected={selectedDifficulty}
        onSelect={(v) => onFilterChange('diff', v)}
      />

      {/* Company Filter */}
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

// Navigation Footer Component
function NavigationFooter({ currentIndex, totalQuestions, onPrev, onNext, onShare, isMarked, onToggleMark }: any) {
  return (
    <footer className="h-16 bg-card border-t border-border flex items-center justify-between px-4 shrink-0">
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMark}
          className={`p-2 rounded-lg transition-colors ${
            isMarked ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-muted'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${isMarked ? 'fill-current' : ''}`} />
        </button>
        <button onClick={onShare} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <button
        onClick={onNext}
        disabled={currentIndex === totalQuestions - 1}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-5 h-5" />
      </button>
    </footer>
  );
}
