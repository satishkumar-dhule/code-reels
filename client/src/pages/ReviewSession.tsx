/**
 * Review Session Page
 * Dedicated SRS review interface for spaced repetition
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Brain, Flame, Trophy, Eye,
  ChevronRight, RotateCcw, Check, Zap
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { 
  getDueCards, recordReview, getSRSStats,
  getMasteryLabel, getMasteryColor, getNextReviewPreview,
  type ReviewCard, type ConfidenceRating 
} from '../lib/spaced-repetition';
import { getQuestionById } from '../lib/questions-loader';
import type { Question } from '../types';
import { EnhancedMermaid } from '../components/EnhancedMermaid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Preprocess markdown text to fix common formatting issues
 */
function preprocessMarkdown(text: string): string {
  if (!text) return '';
  
  let processed = text;
  
  // Fix broken bold markers - standalone ** on their own line
  processed = processed.replace(/^\*\*\s*$/gm, '');
  
  // Fix bold markers that are split across lines
  processed = processed.replace(/\*\*\s*\n\s*([^*]+)\*\*/g, '**$1**');
  
  // Fix unclosed bold markers
  const lines = processed.split('\n');
  const fixedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const boldMarkers = (line.match(/\*\*/g) || []).length;
    
    if (boldMarkers % 2 === 1) {
      if (line.trim().startsWith('**') && boldMarkers === 1) {
        line = line.replace(/^\s*\*\*\s*/, '');
      } else if (line.trim().endsWith('**') && boldMarkers === 1) {
        line = line.replace(/\s*\*\*\s*$/, '');
      }
    }
    
    fixedLines.push(line);
  }
  processed = fixedLines.join('\n');
  
  // Fix inline bullet points
  processed = processed.replace(/^[•·]\s*/gm, '- ');
  
  if (processed.includes('•') || processed.includes('·')) {
    const bulletLines = processed.split('\n');
    const processedLines = bulletLines.map(line => {
      const bulletCount = (line.match(/[•·]/g) || []).length;
      if (bulletCount > 1 || (bulletCount === 1 && !line.trim().startsWith('•') && !line.trim().startsWith('·'))) {
        const parts = line.split(/[•·]/).map(p => p.trim()).filter(p => p);
        if (parts.length > 1) {
          return parts.map(p => `- ${p}`).join('\n');
        }
      }
      return line.replace(/^[•·]\s*/, '- ');
    });
    processed = processedLines.join('\n');
  }
  
  processed = processed.replace(/(\d+[.)]\s+[^0-9]+?)(?=\s+\d+[.)])/g, '$1\n');
  processed = processed.replace(/(?<!\n)(\d+[.)]\s+)/g, '\n$1');
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.replace(/^\n+/, '');
  
  return processed;
}

type SessionState = 'loading' | 'reviewing' | 'reveal' | 'completed';

export default function ReviewSession() {
  const [, setLocation] = useLocation();
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [dueCards, setDueCards] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentCard, setCurrentCard] = useState<ReviewCard | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  // Load due cards
  useEffect(() => {
    const cards = getDueCards();
    setDueCards(cards);
    
    if (cards.length === 0) {
      setSessionState('completed');
    } else {
      loadQuestion(cards[0]);
    }
  }, []);

  const loadQuestion = useCallback((card: ReviewCard) => {
    const question = getQuestionById(card.questionId);
    if (question) {
      setCurrentQuestion(question);
      setCurrentCard(card);
      setSessionState('reviewing');
    } else {
      // Question not found, skip to next
      handleSkip();
    }
  }, []);

  const handleReveal = () => {
    setSessionState('reveal');
  };

  const handleRate = (rating: ConfidenceRating) => {
    if (!currentCard || !currentQuestion) return;

    // Record the review
    recordReview(
      currentCard.questionId,
      currentCard.channel,
      currentCard.difficulty,
      rating
    );

    // Update session stats
    setSessionStats(prev => ({ ...prev, [rating]: prev[rating] + 1 }));
    setReviewedCount(prev => prev + 1);

    // Move to next card
    const nextIndex = currentIndex + 1;
    if (nextIndex < dueCards.length) {
      setCurrentIndex(nextIndex);
      loadQuestion(dueCards[nextIndex]);
    } else {
      setSessionState('completed');
    }
  };

  const handleSkip = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < dueCards.length) {
      setCurrentIndex(nextIndex);
      loadQuestion(dueCards[nextIndex]);
    } else {
      setSessionState('completed');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionState === 'reviewing') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleReveal();
        }
      } else if (sessionState === 'reveal') {
        if (e.key === '1') handleRate('again');
        else if (e.key === '2') handleRate('hard');
        else if (e.key === '3') handleRate('good');
        else if (e.key === '4') handleRate('easy');
      }
      if (e.key === 'Escape') {
        setLocation('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionState]);

  const progress = dueCards.length > 0 ? Math.round((reviewedCount / dueCards.length) * 100) : 0;

  return (
    <>
      <SEOHead
        title="Review Session | Code Reels"
        description="Spaced repetition review session for optimal learning retention"
      />

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 shrink-0">
          <button 
            onClick={() => setLocation('/')} 
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <h1 className="font-semibold">Review Session</h1>
            </div>
            {dueCards.length > 0 && sessionState !== 'completed' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{reviewedCount + 1} of {dueCards.length}</span>
                <div className="flex-1 max-w-[100px] h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            )}
          </div>

          {sessionState !== 'completed' && (
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
              title="Skip this card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {sessionState === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading review cards...</p>
                </div>
              </motion.div>
            )}

            {(sessionState === 'reviewing' || sessionState === 'reveal') && currentQuestion && currentCard && (
              <motion.div
                key={currentCard.questionId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Question Card */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  <div className="max-w-3xl mx-auto">
                    {/* Card header */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                        {currentCard.channel}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        currentCard.difficulty === 'beginner' ? 'bg-green-500/10 text-green-500' :
                        currentCard.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {currentCard.difficulty}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded bg-muted ${getMasteryColor(currentCard.masteryLevel)}`}>
                        {getMasteryLabel(currentCard.masteryLevel)}
                      </span>
                    </div>

                    {/* Question */}
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6">
                      {currentQuestion.question}
                    </h2>

                    {/* Answer (revealed) */}
                    <AnimatePresence>
                      {sessionState === 'reveal' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <div className="h-px bg-border" />
                          
                          {/* TLDR */}
                          {currentQuestion.tldr && (
                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-4 h-4 text-primary" />
                                <span className="text-xs font-semibold text-primary uppercase">TL;DR</span>
                              </div>
                              <p className="text-sm">{currentQuestion.tldr}</p>
                            </div>
                          )}

                          {/* Answer */}
                          <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Answer</h3>
                            <p className="text-base sm:text-lg leading-relaxed text-foreground/90">{currentQuestion.answer}</p>
                          </div>

                          {/* Diagram */}
                          {currentQuestion.diagram && (
                            <div>
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Diagram</h3>
                              <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
                                <EnhancedMermaid chart={currentQuestion.diagram} />
                              </div>
                            </div>
                          )}

                          {/* Full Explanation */}
                          {currentQuestion.explanation && (
                            <div>
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Explanation</h3>
                              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code({ className, children }) {
                                      const match = /language-(\w+)/.exec(className || '');
                                      const language = match ? match[1] : '';
                                      const codeContent = String(children).replace(/\n$/, '');
                                      const isInline = !match && !String(children).includes('\n');
                                      
                                      if (isInline) {
                                        return (
                                          <code className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[0.85em] font-mono">
                                            {children}
                                          </code>
                                        );
                                      }
                                      
                                      return (
                                        <div className="my-3 rounded-lg overflow-hidden border border-border">
                                          <SyntaxHighlighter
                                            language={language || 'text'}
                                            style={vscDarkPlus}
                                            customStyle={{ 
                                              margin: 0, 
                                              padding: '1rem', 
                                              background: '#1e1e1e',
                                              fontSize: '0.8rem',
                                              lineHeight: '1.5',
                                            }}
                                            wrapLines={true}
                                            wrapLongLines={true}
                                          >
                                            {codeContent}
                                          </SyntaxHighlighter>
                                        </div>
                                      );
                                    },
                                    p({ children }) {
                                      return <p className="mb-3 leading-relaxed text-foreground/90 text-sm sm:text-base">{children}</p>;
                                    },
                                    h1({ children }) {
                                      return <h1 className="text-lg font-bold mb-3 mt-4 text-foreground border-b border-border pb-2">{children}</h1>;
                                    },
                                    h2({ children }) {
                                      return <h2 className="text-base font-bold mb-2 mt-4 text-foreground">{children}</h2>;
                                    },
                                    h3({ children }) {
                                      return <h3 className="text-sm font-semibold mb-2 mt-3 text-foreground/90">{children}</h3>;
                                    },
                                    strong({ children }) {
                                      return <strong className="font-semibold text-foreground">{children}</strong>;
                                    },
                                    ul({ children }) {
                                      return <ul className="space-y-1.5 mb-3 ml-1">{children}</ul>;
                                    },
                                    ol({ children }) {
                                      return <ol className="space-y-1.5 mb-3 ml-1 list-decimal list-inside">{children}</ol>;
                                    },
                                    li({ children }) {
                                      return (
                                        <li className="flex gap-2 text-foreground/90 text-sm sm:text-base">
                                          <span className="shrink-0 text-primary mt-0.5">•</span>
                                          <span className="flex-1">{children}</span>
                                        </li>
                                      );
                                    },
                                    a({ href, children }) {
                                      return (
                                        <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                                          {children}
                                        </a>
                                      );
                                    },
                                    blockquote({ children }) {
                                      return (
                                        <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-3 bg-primary/5 text-muted-foreground italic">
                                          {children}
                                        </blockquote>
                                      );
                                    },
                                  }}
                                >
                                  {preprocessMarkdown(currentQuestion.explanation)}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="shrink-0 border-t border-border bg-card p-4">
                  <div className="max-w-3xl mx-auto">
                    {sessionState === 'reviewing' ? (
                      <button
                        onClick={handleReveal}
                        className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-purple-600 transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                        Show Answer
                        <span className="text-xs opacity-70 ml-2">(Space)</span>
                      </button>
                    ) : (
                      <RatingButtons card={currentCard} onRate={handleRate} />
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {sessionState === 'completed' && (
              <CompletedScreen 
                stats={sessionStats} 
                totalReviewed={reviewedCount}
                onGoHome={() => setLocation('/')}
                onContinue={() => {
                  // Reload to check for more due cards
                  const cards = getDueCards();
                  if (cards.length > 0) {
                    setDueCards(cards);
                    setCurrentIndex(0);
                    setReviewedCount(0);
                    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
                    // Load first card directly
                    const question = getQuestionById(cards[0].questionId);
                    if (question) {
                      setCurrentQuestion(question);
                      setCurrentCard(cards[0]);
                      setSessionState('reviewing');
                    }
                  }
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// Rating buttons component
function RatingButtons({ card, onRate }: { card: ReviewCard; onRate: (rating: ConfidenceRating) => void }) {
  const previews = getNextReviewPreview(card);

  const buttons: { rating: ConfidenceRating; label: string; preview: string; icon: React.ReactNode; color: string; key: string }[] = [
    { rating: 'again', label: 'Again', preview: previews.again, icon: <RotateCcw className="w-4 h-4" />, color: 'bg-red-500 hover:bg-red-600', key: '1' },
    { rating: 'hard', label: 'Hard', preview: previews.hard, icon: <Brain className="w-4 h-4" />, color: 'bg-orange-500 hover:bg-orange-600', key: '2' },
    { rating: 'good', label: 'Good', preview: previews.good, icon: <Check className="w-4 h-4" />, color: 'bg-green-500 hover:bg-green-600', key: '3' },
    { rating: 'easy', label: 'Easy', preview: previews.easy, icon: <Zap className="w-4 h-4" />, color: 'bg-blue-500 hover:bg-blue-600', key: '4' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-center text-xs text-muted-foreground mb-3">
        How well did you remember this?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.rating}
            onClick={() => onRate(btn.rating)}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl text-white transition-colors ${btn.color}`}
          >
            {btn.icon}
            <span className="text-xs font-medium">{btn.label}</span>
            <span className="text-[10px] opacity-70">{btn.preview}</span>
            <span className="text-[10px] opacity-50">({btn.key})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Completed screen component
function CompletedScreen({ 
  stats, 
  totalReviewed,
  onGoHome,
  onContinue
}: { 
  stats: { again: number; hard: number; good: number; easy: number };
  totalReviewed: number;
  onGoHome: () => void;
  onContinue: () => void;
}) {
  const srsStats = getSRSStats();
  const hasMoreDue = srsStats.dueToday > 0;

  return (
    <motion.div
      key="completed"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex items-center justify-center p-4"
    >
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
        >
          <Trophy className="w-10 h-10 text-green-500" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">
          {totalReviewed === 0 ? 'All Caught Up!' : 'Session Complete!'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {totalReviewed === 0 
            ? 'No cards due for review right now.'
            : `You reviewed ${totalReviewed} cards. Great work!`
          }
        </p>

        {totalReviewed > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-6 p-4 bg-muted/30 rounded-xl">
            <div className="text-center">
              <div className="text-lg font-bold text-red-500">{stats.again}</div>
              <div className="text-xs text-muted-foreground">Again</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-500">{stats.hard}</div>
              <div className="text-xs text-muted-foreground">Hard</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">{stats.good}</div>
              <div className="text-xs text-muted-foreground">Good</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-500">{stats.easy}</div>
              <div className="text-xs text-muted-foreground">Easy</div>
            </div>
          </div>
        )}

        {/* Streak info */}
        {srsStats.reviewStreak > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6 text-orange-500">
            <Flame className="w-5 h-5" />
            <span className="font-medium">{srsStats.reviewStreak} day review streak!</span>
          </div>
        )}

        <div className="space-y-3">
          {hasMoreDue && (
            <button
              onClick={onContinue}
              className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
            >
              Continue Reviewing ({srsStats.dueToday} more)
            </button>
          )}
          <button
            onClick={onGoHome}
            className={`w-full py-3 rounded-xl font-medium transition-colors ${
              hasMoreDue 
                ? 'bg-muted text-foreground hover:bg-muted/80' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            Back to Home
          </button>
        </div>
      </div>
    </motion.div>
  );
}
