import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, Flame, Bookmark, Clock, Check, Building2, Hash, TrendingUp, Brain } from 'lucide-react';
import type { Question } from '../lib/data';
import { formatTag } from '../lib/utils';
import { 
  getCard, recordReview, addToSRS,
  getMasteryLabel, getMasteryColor, getNextReviewPreview,
  type ReviewCard, type ConfidenceRating 
} from '../lib/spaced-repetition';

/**
 * Renders text with inline code (backticks) as styled code elements
 */
function renderWithInlineCode(text: string): React.ReactNode {
  if (!text) return null;
  
  // Split by backticks, alternating between text and code
  const parts = text.split(/`([^`]+)`/g);
  
  return parts.map((part, index) => {
    // Odd indices are code (content between backticks)
    if (index % 2 === 1) {
      return (
        <code 
          key={index}
          className="px-1.5 py-0.5 mx-0.5 bg-primary/15 text-primary rounded text-[0.9em] font-mono"
        >
          {part}
        </code>
      );
    }
    // Even indices are regular text
    return part;
  });
}

interface QuestionPanelProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  isMarked: boolean;
  isCompleted: boolean;
  onToggleMark: () => void;
  onTapQuestion?: () => void;
  timerEnabled: boolean;
  timeLeft: number;
}

// Background mascot SVGs based on difficulty/emotion - hidden on mobile to save space
function BackgroundMascot({ difficulty }: { difficulty: string }) {
  // Hide on mobile - only show on larger screens
  const baseClasses = "hidden sm:block absolute bottom-8 right-8 w-32 h-32 lg:w-40 lg:h-40 opacity-[0.06] pointer-events-none select-none z-0";
  
  // Thinking robot for easy - curious and friendly
  if (difficulty === 'beginner') {
    return (
      <svg 
        className={baseClasses}
        viewBox="0 0 100 100" 
        fill="currentColor"
        aria-hidden="true"
      >
        {/* Happy robot with lightbulb */}
        <circle cx="50" cy="45" r="28" strokeWidth="3" stroke="currentColor" fill="none" />
        <rect x="42" y="73" width="16" height="12" rx="2" />
        <rect x="38" y="85" width="24" height="6" rx="2" />
        {/* Eyes - happy */}
        <circle cx="40" cy="42" r="5" />
        <circle cx="60" cy="42" r="5" />
        {/* Smile */}
        <path d="M38 52 Q50 62 62 52" strokeWidth="3" stroke="currentColor" fill="none" />
        {/* Antenna with lightbulb */}
        <line x1="50" y1="17" x2="50" y2="8" strokeWidth="2" stroke="currentColor" />
        <circle cx="50" cy="5" r="4" />
        {/* Ears */}
        <rect x="18" y="38" width="6" height="14" rx="2" />
        <rect x="76" y="38" width="6" height="14" rx="2" />
      </svg>
    );
  }
  
  // Focused robot for medium - determined
  if (difficulty === 'intermediate') {
    return (
      <svg 
        className={baseClasses}
        viewBox="0 0 100 100" 
        fill="currentColor"
        aria-hidden="true"
      >
        {/* Focused robot with gear */}
        <circle cx="50" cy="45" r="28" strokeWidth="3" stroke="currentColor" fill="none" />
        <rect x="42" y="73" width="16" height="12" rx="2" />
        <rect x="38" y="85" width="24" height="6" rx="2" />
        {/* Eyes - focused/determined */}
        <rect x="35" y="40" width="10" height="6" rx="1" />
        <rect x="55" y="40" width="10" height="6" rx="1" />
        {/* Straight mouth - concentrating */}
        <line x1="40" y1="55" x2="60" y2="55" strokeWidth="3" stroke="currentColor" />
        {/* Antenna */}
        <line x1="50" y1="17" x2="50" y2="8" strokeWidth="2" stroke="currentColor" />
        <polygon points="50,2 46,8 54,8" />
        {/* Gear on side */}
        <circle cx="82" cy="50" r="8" strokeWidth="2" stroke="currentColor" fill="none" />
        <circle cx="82" cy="50" r="3" />
      </svg>
    );
  }
  
  // Intense robot for hard - sweating but determined
  return (
    <svg 
      className={baseClasses}
      viewBox="0 0 100 100" 
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Intense robot */}
      <circle cx="50" cy="45" r="28" strokeWidth="3" stroke="currentColor" fill="none" />
      <rect x="42" y="73" width="16" height="12" rx="2" />
      <rect x="38" y="85" width="24" height="6" rx="2" />
      {/* Eyes - intense/worried */}
      <ellipse cx="40" cy="42" rx="6" ry="7" />
      <ellipse cx="60" cy="42" rx="6" ry="7" />
      <circle cx="42" cy="41" r="2" fill="white" />
      <circle cx="62" cy="41" r="2" fill="white" />
      {/* Worried mouth */}
      <path d="M38 56 Q50 52 62 56" strokeWidth="3" stroke="currentColor" fill="none" />
      {/* Sweat drops */}
      <ellipse cx="78" cy="35" rx="3" ry="5" />
      <ellipse cx="82" cy="45" rx="2" ry="4" />
      {/* Antenna - alert */}
      <line x1="50" y1="17" x2="50" y2="5" strokeWidth="2" stroke="currentColor" />
      <circle cx="50" cy="3" r="3" />
      {/* Lightning bolt */}
      <polygon points="85,20 80,30 84,30 79,42 88,28 84,28" />
    </svg>
  );
}

export function QuestionPanel({ 
  question, 
  questionNumber, 
  totalQuestions,
  isMarked,
  isCompleted,
  onToggleMark,
  onTapQuestion,
  timerEnabled,
  timeLeft
}: QuestionPanelProps) {
  const [srsCard, setSrsCard] = useState<ReviewCard | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const [showRatingButtons, setShowRatingButtons] = useState(false);

  // Load or create SRS card when question changes
  useEffect(() => {
    if (question?.id) {
      const card = getCard(question.id, question.channel, question.difficulty);
      // Only update state if the card is different (compare by questionId)
      setSrsCard(prev => {
        if (prev?.questionId === card.questionId && prev?.totalReviews === card.totalReviews) {
          return prev;
        }
        return card;
      });
      setHasRated(false);
      setShowRatingButtons(card.totalReviews > 0);
    }
  }, [question?.id, question?.channel, question?.difficulty]);

  // Handle SRS rating
  const handleSRSRate = (rating: ConfidenceRating) => {
    if (!question) return;
    const updatedCard = recordReview(question.id, question.channel, question.difficulty, rating);
    setSrsCard(updatedCard);
    setHasRated(true);
    setShowRatingButtons(false);
  };

  // Add to SRS and show rating buttons
  const handleAddToSRS = () => {
    if (!question) return;
    const card = addToSRS(question.id, question.channel, question.difficulty);
    setSrsCard(card);
    setShowRatingButtons(true);
  };

  const getDifficultyConfig = () => {
    switch (question.difficulty) {
      case 'beginner':
        return { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Easy' };
      case 'intermediate':
        return { icon: Target, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Medium' };
      case 'advanced':
        return { icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Hard' };
      default:
        return { icon: Target, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: 'Unknown' };
    }
  };

  const difficultyConfig = getDifficultyConfig();
  const DifficultyIcon = difficultyConfig.icon;

  return (
    <div className="w-full h-full flex flex-col px-3 sm:px-4 lg:px-6 py-3 sm:py-4 overflow-y-auto relative" data-testid="question-panel">
      
      {/* Background mascot */}
      <BackgroundMascot difficulty={question.difficulty} />
      
      {/* Top bar - Compact */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Question ID - Desktop only */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-muted/50 border border-border rounded-md">
            <Hash className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground">{question.id}</span>
          </div>

          {/* Progress pill */}
          <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
            <span className="text-xs font-medium text-muted-foreground">
              {questionNumber}<span className="text-muted-foreground/50">/</span>{totalQuestions}
            </span>
          </div>
          
          {/* Difficulty badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${difficultyConfig.bg} border ${difficultyConfig.border}`}>
            <DifficultyIcon className={`w-3 h-3 ${difficultyConfig.color}`} />
            <span className={`text-xs font-medium ${difficultyConfig.color}`}>{difficultyConfig.label}</span>
          </div>

          {/* Completed indicator */}
          {isCompleted && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md">
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-xs font-medium text-green-500">Done</span>
            </div>
          )}
        </div>

        {/* Bookmark button */}
        <button
          onClick={onToggleMark}
          className={`p-1.5 rounded-md transition-colors ${
            isMarked
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-muted text-muted-foreground hover:text-primary'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Main content area - Question */}
      <div 
        className={`flex-1 flex flex-col justify-center max-w-2xl w-full ${onTapQuestion ? 'cursor-pointer lg:cursor-default' : ''}`}
        onClick={onTapQuestion}
      >
        
        {/* Companies */}
        {question.companies && question.companies.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            {question.companies.map((company, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full">
                {company}
              </span>
            ))}
          </div>
        )}

        {/* Question text - Tighter line height */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`font-bold text-foreground leading-tight ${
            question.question.length > 200 
              ? 'text-sm sm:text-base lg:text-lg' 
              : question.question.length > 100
              ? 'text-base sm:text-lg lg:text-xl'
              : 'text-lg sm:text-xl lg:text-2xl'
          }`}
        >
          {renderWithInlineCode(question.question)}
        </motion.h1>

        {/* Sub-channel */}
        <div className="mt-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {question.subChannel}
          </span>
        </div>

        {/* Tags - Compact */}
        {question.tags && question.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {question.tags.slice(0, 5).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-muted text-[9px] sm:text-[10px] font-mono text-muted-foreground rounded border border-border">
                {formatTag(tag)}
              </span>
            ))}
            {question.tags.length > 5 && (
              <span className="text-[9px] text-muted-foreground py-0.5">+{question.tags.length - 5}</span>
            )}
          </div>
        )}

        {/* Timer */}
        {timerEnabled && timeLeft > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg self-start">
            <Clock className="w-4 h-4 text-primary" />
            <div className="text-lg font-mono font-bold text-primary tabular-nums">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>
        )}
      </div>

      {/* SRS Card - Compact */}
      <div className="mt-auto pt-3 flex justify-start mb-12 sm:mb-0">
        <div className="inline-flex items-center gap-2 bg-purple-500/5 border border-purple-500/20 rounded-lg px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[10px] font-semibold text-purple-500">SRS</span>
            {srsCard && (
              <span className={`text-[9px] px-1 py-0.5 rounded ${getMasteryColor(srsCard.masteryLevel)} bg-muted/50`}>
                {getMasteryLabel(srsCard.masteryLevel)}
              </span>
            )}
          </div>
          
          {hasRated ? (
            <span className="text-[10px] text-green-500 font-medium">✓</span>
          ) : showRatingButtons && srsCard ? (
            <div className="flex items-center gap-0.5">
              {[
                { rating: 'again' as ConfidenceRating, label: '😕', color: 'bg-red-500/10 text-red-500 hover:bg-red-500/20' },
                { rating: 'hard' as ConfidenceRating, label: '🤔', color: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' },
                { rating: 'good' as ConfidenceRating, label: '👍', color: 'bg-green-500/10 text-green-500 hover:bg-green-500/20' },
                { rating: 'easy' as ConfidenceRating, label: '🎯', color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
              ].map((btn) => (
                <button
                  key={btn.rating}
                  onClick={(e) => { e.stopPropagation(); handleSRSRate(btn.rating); }}
                  className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${btn.color}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleAddToSRS(); }}
              className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-medium rounded hover:bg-purple-600"
            >
              +Add
            </button>
          )}
        </div>
      </div>

      {/* Bottom hint - desktop only */}
      <div className="mt-3 text-center hidden sm:block">
        <p className="text-[10px] text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">→</kbd> to reveal answer
        </p>
      </div>
    </div>
  );
}
