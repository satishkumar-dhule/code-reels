import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Question } from '../lib/questions-loader';

// Lazy loading: questions are loaded on-demand from individual files
// This reduces initial bundle size and improves first load time

// Import the lazy loader functions
import {
  getQuestionsForChannel,
  getQuestionById as getQuestionByIdAsync,
  getSubChannels as getSubChannelsSync,
  getChannelStats,
  getAllQuestionMetadata,
  getChannelQuestionMetadata,
  loadQuestion,
  preloadChannel,
  type Question as LazyQuestion,
} from '../lib/questions-lazy-loader';

// Re-export for backwards compatibility
export type { Question };

// Hook to get questions for a channel with filters (LAZY LOADING)
export function useQuestions(
  channelId: string,
  subChannel: string = 'all',
  difficulty: string = 'all',
  company: string = 'all'
) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!channelId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Lazy load questions for this channel
    getQuestionsForChannel(channelId, subChannel, difficulty, company)
      .then((result) => {
        if (!cancelled) {
          setQuestions(result as Question[]);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load questions:', err);
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [channelId, subChannel, difficulty, company]);

  const questionIds = useMemo(() => questions.map((q) => q.id), [questions]);

  return {
    questions,
    questionIds,
    totalQuestions: questions.length,
    loading,
    error,
  };
}

// Hook to get companies for a channel (derived from loaded questions)
export function useCompanies(channelId: string) {
  const { questions, loading, error } = useQuestions(channelId);

  const companies = useMemo(() => {
    const companySet = new Set<string>();
    questions.forEach((q) => {
      if (q.companies) {
        q.companies.forEach((c) => companySet.add(c));
      }
    });
    return Array.from(companySet).sort();
  }, [questions]);

  return {
    companies,
    loading,
    error,
  };
}

// Hook to get companies with counts (respects current filters)
export function useCompaniesWithCounts(
  channelId: string,
  subChannel: string = 'all',
  difficulty: string = 'all'
) {
  const { questions, loading, error } = useQuestions(channelId, subChannel, difficulty);

  const companiesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    questions.forEach((q) => {
      if (q.companies) {
        q.companies.forEach((c) => {
          counts.set(c, (counts.get(c) || 0) + 1);
        });
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [questions]);

  return {
    companiesWithCounts,
    loading,
    error,
  };
}

// Hook to get a single question by ID (LAZY LOADING)
export function useQuestion(questionId: string | undefined) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!questionId) {
      setQuestion(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getQuestionByIdAsync(questionId)
      .then((result) => {
        if (!cancelled) {
          setQuestion(result as Question | null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [questionId]);

  return { question, loading, error };
}

// Combined hook for question navigation with current question (LAZY LOADING)
export function useQuestionsWithPrefetch(
  channelId: string,
  currentIndex: number,
  subChannel: string = 'all',
  difficulty: string = 'all',
  company: string = 'all'
) {
  const { questions, questionIds, totalQuestions, loading, error } = useQuestions(
    channelId,
    subChannel,
    difficulty,
    company
  );

  const currentQuestion = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < questions.length) {
      return questions[currentIndex];
    }
    return null;
  }, [questions, currentIndex]);

  // Prefetch adjacent questions for smooth navigation
  useEffect(() => {
    if (questionIds.length === 0) return;

    const prefetchCount = 2;
    const toPreload: string[] = [];

    // Prefetch next questions
    for (let i = 1; i <= prefetchCount; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < questionIds.length) {
        toPreload.push(questionIds[nextIndex]);
      }
    }
    // Prefetch previous questions
    for (let i = 1; i <= prefetchCount; i++) {
      const prevIndex = currentIndex - i;
      if (prevIndex >= 0) {
        toPreload.push(questionIds[prevIndex]);
      }
    }

    // Load them in background (they'll be cached)
    toPreload.forEach((id) => {
      loadQuestion(id).catch(() => {});
    });
  }, [questionIds, currentIndex]);

  return {
    question: currentQuestion,
    questions,
    questionIds,
    totalQuestions,
    loading,
    error,
  };
}

// Hook to get subchannels for a channel (sync - from mappings, no loading needed)
export function useSubChannels(channelId: string) {
  const subChannels = useMemo(() => {
    if (!channelId) return [];
    return getSubChannelsSync(channelId);
  }, [channelId]);

  return {
    subChannels,
    loading: false,
    error: null,
  };
}

// Hook to preload a channel's questions (call when entering a channel)
export function usePreloadChannel(channelId: string) {
  useEffect(() => {
    if (channelId) {
      preloadChannel(channelId).catch(() => {});
    }
  }, [channelId]);
}

// Hook to get channel statistics (sync - from metadata)
export function useChannelStats() {
  const stats = useMemo(() => getChannelStats(), []);
  return { stats, loading: false, error: null };
}

// Hook to get all question metadata (lightweight, for search/stats)
export function useAllQuestionMetadata() {
  const metadata = useMemo(() => getAllQuestionMetadata(), []);
  return { metadata, loading: false, error: null };
}
