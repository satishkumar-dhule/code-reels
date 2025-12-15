import { useState, useEffect, useMemo } from 'react';
import {
  getQuestions,
  getQuestionById,
  getSubChannels,
  getCompaniesForChannel,
  getCompaniesWithCounts,
  Question,
} from '../lib/questions-loader';

// Hook to get questions for a channel with filters
export function useQuestions(
  channelId: string,
  subChannel: string = 'all',
  difficulty: string = 'all',
  company: string = 'all'
) {
  const questions = useMemo(() => {
    if (!channelId) return [];
    return getQuestions(channelId, subChannel, difficulty, company);
  }, [channelId, subChannel, difficulty, company]);

  const questionIds = useMemo(() => questions.map(q => q.id), [questions]);

  return {
    questions,
    questionIds,
    totalQuestions: questions.length,
    loading: false,
    error: null,
  };
}

// Hook to get companies for a channel (simple list)
export function useCompanies(channelId: string) {
  const companies = useMemo(() => {
    if (!channelId) return [];
    return getCompaniesForChannel(channelId);
  }, [channelId]);

  return {
    companies,
    loading: false,
    error: null,
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
  const question = useMemo(() => {
    if (!questionId) return null;
    return getQuestionById(questionId) || null;
  }, [questionId]);

  return { 
    question, 
    loading: false, 
    error: null 
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
  const { questions, questionIds, totalQuestions } = useQuestions(
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
    loading: false,
    error: null
  };
}

// Hook to get subchannels for a channel
export function useSubChannels(channelId: string) {
  const subChannels = useMemo(() => {
    if (!channelId) return [];
    return getSubChannels(channelId);
  }, [channelId]);

  return { 
    subChannels, 
    loading: false, 
    error: null 
  };
}
