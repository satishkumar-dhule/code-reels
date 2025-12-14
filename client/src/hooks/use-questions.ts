import { useState, useEffect, useMemo } from 'react';
import { 
  getQuestions, 
  getQuestionById, 
  getSubChannels,
  Question 
} from '../lib/questions-loader';

// Hook to get questions for a channel with filters
export function useQuestions(
  channelId: string,
  subChannel: string = 'all',
  difficulty: string = 'all'
) {
  const questions = useMemo(() => {
    if (!channelId) return [];
    return getQuestions(channelId, subChannel, difficulty);
  }, [channelId, subChannel, difficulty]);

  const questionIds = useMemo(() => questions.map(q => q.id), [questions]);

  return { 
    questions, 
    questionIds, 
    totalQuestions: questions.length,
    loading: false, 
    error: null 
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
  difficulty: string = 'all'
) {
  const { questions, questionIds, totalQuestions } = useQuestions(
    channelId,
    subChannel,
    difficulty
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
