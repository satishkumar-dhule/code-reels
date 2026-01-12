/**
 * Extreme UX Question Panel - Completely Redesigned
 * Immersive, cinematic experience with bold visuals
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Target, Flame, Bookmark, Clock, Check, Building2, 
  Hash, Sparkles, Star, Trophy, Brain, Eye, Layers, CheckCircle
} from 'lucide-react';
import type { Question } from '../../lib/data';
import { QuestionHistoryIcon } from '../unified/QuestionHistory';
import { QuestionFeedback } from '../QuestionFeedback';
import { 
  getCard, recordReview, addToSRS,
  getMasteryLabel, getMasteryColor,
  type ReviewCard, type ConfidenceRating 
} from '../../lib/spaced-repetition';

interface ExtremeQuestionPanelProps {
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

function renderWithInlineCode(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/`([^`]+)`/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <code 
          key={index}
          className="px-2 py-1 mx-1 bg-primary/10 text-primary rounded-md text-[0.95em] font-mono border border-primary/20"
        >
          {part}
        </code>
      );
    }
    return part;
  });
}

export function ExtremeQuestionPanel({ 
  question, 
  questionNumber, 
  totalQuestions,
  isMarked,
  isCompleted,
  onToggleMark,
  onTapQuestion,
  timerEnabled,
  timeLeft
}: ExtremeQuestionPanelProps) {
  const [srsCard, setSrsCard] = useState<ReviewCard | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const [showRatingButtons, setShowRatingButtons] = useState(false);
  const [showParticles, setShowParticles] = useState(true);

  useEffect(() => {
    if (question?.id) {
      const card = getCard(question.id, question.channel, question.difficulty);
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

  const handleSRSRate = (rating: ConfidenceRating) => {
    if (!question) return;
    const updatedCard = recordReview(question.id, question.channel, question.difficulty, rating);
    setSrsCard(updatedCard);
    setHasRated(true);
    setShowRatingButtons(false);
  };

  const handleAddToSRS = () => {
    if (!question) return;
    const card = addToSRS(question.id, question.channel, question.difficulty);
    setSrsCard(card);
    setShowRatingButtons(true);
  };

  const getDifficultyConfig = () => {
    switch (question.difficulty) {
      case 'beginner':
        return { 
          icon: Zap, 
          color: 'text-green-500', 
          bg: 'bg-green-500/10', 
          border: 'border-green-500/30',
          glow: 'shadow-green-500/20',
          label: 'Easy',
          gradient: 'from-green-500/10 to-emerald-500/10'
        };
      case 'intermediate':
        return { 
          icon: Target, 
          color: 'text-yellow-500', 
          bg: 'bg-yellow-500/10', 
          border: 'border-yellow-500/30',
          glow: 'shadow-yellow-500/20',
          label: 'Medium',
          gradient: 'from-yellow-500/10 to-orange-500/10'
        };
      case 'advanced':
        return { 
          icon: Flame, 
          color: 'text-red-500', 
          bg: 'bg-red-500/10', 
          border: 'border-red-500/30',
          glow: 'shadow-red-500/20',
          label: 'Hard',
          gradient: 'from-red-500/10 to-pink-500/10'
        };
      default:
        return { 
          icon: Target, 
          color: 'text-muted-foreground', 
          bg: 'bg-muted', 
          border: 'border-border',
          glow: 'shadow-muted/20',
          label: 'Unknown',
          gradient: 'from-muted/10 to-muted/10'
        };
    }
  };

  const difficultyConfig = getDifficultyConfig();
  const DifficultyIcon = difficultyConfig.icon;

  return (
    <div 
      className="w-full h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20"
      data-testid="extreme-question-panel"
      onClick={onTapQuestion}
    >
      {/* Animated Background Particles */}
      {showParticles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/40 rounded-full"
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000)],
                opacity: [0.2, 0.4, 0.2],
                scale: [null, Math.random() * 1.5 + 0.5]
              }}
              transition={{ 
                duration: Math.random() * 15 + 15, 
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Top Bar - Single Row with All Info */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border"
        >
          {/* Left: Meta Info */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Difficulty */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${difficultyConfig.bg} border ${difficultyConfig.border}`}>
              <DifficultyIcon className={`w-3.5 h-3.5 ${difficultyConfig.color}`} />
              <span className={`text-xs font-bold ${difficultyConfig.color}`}>{difficultyConfig.label}</span>
            </div>

            {/* Status Badges */}
            {question.isNew && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 border border-primary/30 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">NEW</span>
              </div>
            )}

            {isCompleted && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              </div>
            )}
          </div>

          {/* Right: Actions - Horizontal */}
          <div className="flex items-center gap-1.5">
            {/* Report Issue */}
            <QuestionFeedback questionId={question.id} />

            {/* SRS Compact */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border border-border rounded-lg">
              <Brain className="w-3.5 h-3.5 text-primary" />
              {srsCard && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${getMasteryColor(srsCard.masteryLevel)} font-medium`}>
                  {getMasteryLabel(srsCard.masteryLevel).slice(0, 3)}
                </span>
              )}
              {!hasRated && showRatingButtons && srsCard ? (
                <div className="flex items-center gap-0.5">
                  {[
                    { rating: 'again' as ConfidenceRating, label: '😕' },
                    { rating: 'hard' as ConfidenceRating, label: '🤔' },
                    { rating: 'good' as ConfidenceRating, label: '👍' },
                    { rating: 'easy' as ConfidenceRating, label: '🎯' },
                  ].map((btn) => (
                    <button
                      key={btn.rating}
                      onClick={(e) => { e.stopPropagation(); handleSRSRate(btn.rating); }}
                      className="w-5 h-5 flex items-center justify-center rounded text-[10px] hover:bg-muted transition-all"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              ) : !hasRated && !showRatingButtons ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddToSRS(); }}
                  className="px-2 py-0.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[9px] font-bold rounded transition-all"
                >
                  +
                </button>
              ) : (
                <span className="text-[10px] text-green-500">✓</span>
              )}
            </div>

            {/* History */}
            <QuestionHistoryIcon 
              questionId={question.id} 
              questionType="question"
              size="sm"
            />

            {/* Bookmark */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); onToggleMark(); }}
              className={`p-2 rounded-lg transition-all ${
                isMarked
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-card text-muted-foreground hover:text-primary border border-border'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bookmark className={`w-4 h-4 ${isMarked ? 'fill-current' : ''}`} />
            </motion.button>
          </div>
        </motion.div>

        {/* Main Question Area */}
        <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full">
          
          {/* Companies */}
          {question.companies && question.companies.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-4 flex-wrap"
            >
              <Building2 className="w-3.5 h-3.5 text-primary" />
              {question.companies.map((company, idx) => (
                <span 
                  key={idx} 
                  className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20"
                >
                  {company}
                </span>
              ))}
            </motion.div>
          )}

          {/* Question Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`font-black text-foreground leading-[1.2] mb-4 ${
              question.question.length > 200 
                ? 'text-xl sm:text-2xl lg:text-3xl' 
                : question.question.length > 100
                ? 'text-2xl sm:text-3xl lg:text-4xl'
                : 'text-3xl sm:text-4xl lg:text-5xl'
            }`}
          >
            {renderWithInlineCode(question.question)}
          </motion.h1>

          {/* Sub-channel */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-3"
          >
            <span className="text-xs sm:text-sm text-primary uppercase tracking-wider font-bold">
              {question.subChannel}
            </span>
          </motion.div>

          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-1.5"
            >
              {question.tags.slice(0, 8).map((tag, idx) => (
                <span 
                  key={tag} 
                  className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] sm:text-xs font-mono rounded border border-border"
                >
                  {tag}
                </span>
              ))}
              {question.tags.length > 8 && (
                <span className="text-[10px] text-muted-foreground py-0.5">+{question.tags.length - 8}</span>
              )}
            </motion.div>
          )}

          {/* Timer */}
          {timerEnabled && timeLeft > 0 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mt-6 inline-flex items-center gap-3 px-5 py-3 bg-primary/10 border border-primary/30 rounded-xl self-start"
            >
              <Clock className="w-5 h-5 text-primary" />
              <div className="text-2xl font-mono font-black text-primary tabular-nums">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom Hint */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center pt-4 border-t border-border mt-4"
        >
          <p className="text-[10px] text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[9px] font-mono mx-1">→</kbd> or tap to reveal answer
          </p>
        </motion.div>
      </div>
    </div>
  );
}
