import { useState, useEffect, useMemo } from 'react';
import {
  getQuestions,
  getQuestionById,
  getSubChannels,
  getCompaniesForChannel,
  getCompaniesWithCounts,
  loadChannelQuestions,
  api,
  type Question,
} from '../lib/questions-loader';

// Hook to get questions for a channel with filters
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

    setLoading(true);
    setError(null);

    // Try to get from cache first
    let cached = getQuestions(channelId, subChannel, difficulty, company);
    if (cached.length > 0) {
      setQuestions(cached);
      setLoading(false);
      return;
    }

    // Load from API
    loadChannelQuestions(channelId)
      .then(() => {
        const filtered = getQuestions(channelId, subChannel, difficulty, company);
        setQuestions(filtered);
      })
      .catch(err => {
        setError(err);
        setQuestions([]);
      })
      .finally(() => setLoading(false));
  }, [channelId, subChannel, difficulty, company]);

  const questionIds = useMemo(() => questions.map(q => q.id), [questions]);

  return {
    questions,
    questionIds,
    totalQuestions: questions.length,
    loading,
    error,
  };
}

// Hook to get companies for a channel (simple list)
export function useCompanies(channelId: string) {
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!channelId) {
      setCompanies([]);
      setLoading(false);
      return;
    }

    // Try cache first
    const cached = getCompaniesForChannel(channelId);
    if (cached.length > 0) {
      setCompanies(cached);
      setLoading(false);
      return;
    }

    // Load from API
    api.fetchCompanies(channelId)
      .then(setCompanies)
      .catch(err => {
        setError(err);
        setCompanies([]);
      })
      .finally(() => setLoading(false));
  }, [channelId]);

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
  const companiesWithCounts = useMemo(() => {
    if (!channelId) return [];
    return getCompaniesWithCounts(channelId, subChannel, difficulty);
  }, [channelId, subChannel, difficulty]);

  return {
    companiesWithCounts,
    loading: false,
    error: null,
  };
}

// Hook to get a single question by ID
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

    // Try cache first
    const cached = getQuestionById(questionId);
    if (cached) {
      setQuestion(cached);
      setLoading(false);
      return;
    }

    // Load from API
    setLoading(true);
    api.fetchQuestion(questionId)
      .then(setQuestion)
      .catch(err => {
        setError(err);
        setQuestion(null);
      })
      .finally(() => setLoading(false));
  }, [questionId]);

  return { 
    question, 
    loading, 
    error 
  };
}

// Combined hook for question navigation with current question
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

  return {
    question: currentQuestion,
    questionIds,
    totalQuestions,
    loading,
    error
  };
}

// Hook to get subchannels for a channel
export function useSubChannels(channelId: string) {
  const [subChannels, setSubChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!channelId) {
      setSubChannels([]);
      setLoading(false);
      return;
    }

    // Try cache first
    const cached = getSubChannels(channelId);
    if (cached.length > 0) {
      setSubChannels(cached);
      setLoading(false);
      return;
    }

    // Load from API
    api.fetchSubChannels(channelId)
      .then(setSubChannels)
      .catch(err => {
        setError(err);
        setSubChannels([]);
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  return { 
    subChannels, 
    loading, 
    error 
  };
}
