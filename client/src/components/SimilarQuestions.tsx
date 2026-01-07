/**
 * Similar Questions Component
 * Displays pre-computed similar questions from vector DB
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ChevronRight, Loader2 } from 'lucide-react';

interface SimilarQuestion {
  id: string;
  question: string;
  channel: string;
  similarity: number;
}

interface SimilarQuestionsProps {
  questionId: string;
  currentChannel?: string;
}

export function SimilarQuestions({ questionId, currentChannel }: SimilarQuestionsProps) {
  const [, setLocation] = useLocation();
  const [similar, setSimilar] = useState<SimilarQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchSimilar() {
      setLoading(true);
      setError(false);
      
      try {
        const response = await fetch('/data/similar-questions.json');
        if (!response.ok) {
          setError(true);
          return;
        }
        
        const data = await response.json();
        const questions = data.similarities?.[questionId] || [];
        setSimilar(questions.slice(0, 4));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchSimilar();
  }, [questionId]);

  // Don't render if no similar questions or error
  if (error || (!loading && similar.length === 0)) {
    return null;
  }

  const handleClick = (q: SimilarQuestion) => {
    setLocation(`/channel/${q.channel}/${q.id}`);
  };

  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border bg-muted/30">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium text-xs">Similar Questions</span>
      </div>
      
      <div className="divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          similar.map((q) => (
            <button
              key={q.id}
              onClick={() => handleClick(q)}
              className="w-full flex items-start gap-2 px-2.5 py-2 hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground/90 line-clamp-2 group-hover:text-primary transition-colors">
                  {q.question}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {q.channel.replace(/-/g, ' ')}
                  </span>
                  <span className="text-[10px] text-primary/60">
                    {Math.round(q.similarity * 100)}%
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
