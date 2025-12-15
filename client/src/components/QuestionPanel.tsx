import { motion } from 'framer-motion';
import { Hash, Zap, Target, Flame, Bookmark, Clock } from 'lucide-react';
import type { Question } from '../lib/data';

interface QuestionPanelProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  isMarked: boolean;
  onToggleMark: () => void;
  timerEnabled: boolean;
  timeLeft: number;
}

export function QuestionPanel({ 
  question, 
  questionNumber, 
  totalQuestions,
  isMarked,
  onToggleMark,
  timerEnabled,
  timeLeft
}: QuestionPanelProps) {
  const getDifficultyConfig = () => {
    switch (question.difficulty) {
      case 'beginner':
        return {
          icon: Zap,
          color: 'text-green-400',
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          label: 'Beginner'
        };
      case 'intermediate':
        return {
          icon: Target,
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          label: 'Intermediate'
        };
      case 'advanced':
        return {
          icon: Flame,
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          label: 'Advanced'
        };
      default:
        return {
          icon: Target,
          color: 'text-white/50',
          bg: 'bg-white/5',
          border: 'border-white/10',
          label: 'Unknown'
        };
    }
  };

  const difficultyConfig = getDifficultyConfig();
  const DifficultyIcon = difficultyConfig.icon;

  return (
    <div className="w-full h-full flex flex-col justify-center px-2 sm:px-6 md:px-10 lg:px-16 py-2 sm:py-6 relative overflow-y-auto custom-scrollbar" data-testid="question-panel">
      {/* Header badges - Compact on mobile */}
      <div className="absolute top-1.5 sm:top-4 left-2 sm:left-6 md:left-10 lg:left-16 right-2 sm:right-4 flex flex-wrap items-center gap-1 sm:gap-2">
        {/* Question ID - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded">
          <Hash className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-mono text-white/70">{question.id}</span>
        </div>

        {/* Progress - Compact on mobile */}
        <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/5 border border-white/10 rounded">
          <span className="text-[9px] sm:text-[10px] font-mono text-white/70">
            {questionNumber}/{totalQuestions}
          </span>
        </div>

        {/* Difficulty - Icon only on mobile */}
        <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 ${difficultyConfig.bg} border ${difficultyConfig.border} rounded`}>
          <DifficultyIcon className={`w-3 h-3 ${difficultyConfig.color}`} />
          <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider ${difficultyConfig.color}`}>
            {difficultyConfig.label}
          </span>
        </div>

        {/* SubChannel - Hidden on mobile */}
        <div className="hidden sm:block px-2 py-1 bg-white/5 border border-white/10 rounded">
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
            {question.subChannel}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bookmark - Smaller on mobile */}
        <button
          onClick={onToggleMark}
          className={`p-1 sm:p-1.5 rounded transition-all ${
            isMarked
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-white/5 text-white/30 hover:text-blue-400 hover:bg-blue-500/10 border border-white/10'
          }`}
          title={isMarked ? 'Remove bookmark' : 'Bookmark this question'}
        >
          <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isMarked ? 'fill-blue-400' : ''}`} />
        </button>
      </div>

      {/* Main question content - Tighter spacing on mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`max-w-3xl mx-auto w-full mt-6 sm:mt-0 ${
          question.question.length > 200 ? 'space-y-1.5 sm:space-y-3' : 'space-y-2 sm:space-y-6'
        }`}
      >
        {/* Question text - Smart sizing based on length */}
        <h1 className={`font-bold text-white ${
          question.question.length > 250 
            ? 'text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed' // Very long questions
            : question.question.length > 150
            ? 'text-sm sm:text-base md:text-lg lg:text-xl leading-snug' // Long questions
            : question.question.length > 80
            ? 'text-base sm:text-lg md:text-xl lg:text-2xl leading-snug sm:leading-tight' // Medium questions
            : 'text-base sm:text-xl md:text-2xl lg:text-3xl leading-tight tracking-tight' // Short questions
        }`}>
          {question.question}
        </h1>

        {/* Tags - Hidden on mobile for compactness */}
        {question.tags && question.tags.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1.5 sm:gap-2">
            {question.tags.slice(0, 4).map(tag => (
              <span 
                key={tag} 
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white/5 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider border border-white/10 text-white/50 rounded"
              >
                #{tag}
              </span>
            ))}
            {question.tags.length > 4 && (
              <span className="px-2 py-0.5 text-[9px] sm:text-xs text-white/30">
                +{question.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Timer display - Hidden on mobile */}
        {timerEnabled && timeLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:inline-flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 bg-primary/5 border-l-4 border-primary rounded"
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/50 mb-0.5">Time Left</div>
              <div className="text-lg sm:text-2xl font-mono font-bold text-primary tabular-nums">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom hint - Hidden on mobile for compactness */}
      <div className="absolute bottom-2 sm:bottom-4 left-3 sm:left-6 md:left-10 lg:left-16 right-3 sm:right-4 hidden sm:block">
        <div className="text-[9px] sm:text-[10px] text-white/20 uppercase tracking-widest">
          Press → to reveal answer
        </div>
      </div>

      {/* Scroll indicator for long questions on mobile */}
      {question.question.length > 200 && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none lg:hidden" />
      )}
    </div>
  );
}
