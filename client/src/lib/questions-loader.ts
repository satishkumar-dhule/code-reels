// Static question loader - loads questions directly from JSON files
// This works for GitHub Pages static hosting (no backend required)

import algorithmsData from './questions/algorithms.json';
import databaseData from './questions/database.json';
import devopsData from './questions/devops.json';
import frontendData from './questions/frontend.json';
import sreData from './questions/sre.json';
import systemDesignData from './questions/system-design.json';

export interface Question {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  diagram?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  channel: string;
  subChannel: string;
}

// All questions by channel
const questionsByChannel: Record<string, Question[]> = {
  'algorithms': algorithmsData as Question[],
  'database': databaseData as Question[],
  'devops': devopsData as Question[],
  'frontend': frontendData as Question[],
  'sre': sreData as Question[],
  'system-design': systemDesignData as Question[]
};

// Get all questions
export function getAllQuestions(): Question[] {
  return Object.values(questionsByChannel).flat();
}

// Get questions for a channel with optional filters
export function getQuestions(
  channelId: string,
  subChannel?: string,
  difficulty?: string
): Question[] {
  let questions = questionsByChannel[channelId] || [];

  if (subChannel && subChannel !== 'all') {
    questions = questions.filter(q => q.subChannel === subChannel);
  }

  if (difficulty && difficulty !== 'all') {
    questions = questions.filter(q => q.difficulty === difficulty);
  }

  return questions;
}

// Get a single question by ID
export function getQuestionById(questionId: string): Question | undefined {
  for (const questions of Object.values(questionsByChannel)) {
    const question = questions.find(q => q.id === questionId);
    if (question) return question;
  }
  return undefined;
}

// Get question IDs for a channel with optional filters
export function getQuestionIds(
  channelId: string,
  subChannel?: string,
  difficulty?: string
): string[] {
  return getQuestions(channelId, subChannel, difficulty).map(q => q.id);
}

// Get subchannels for a channel
export function getSubChannels(channelId: string): string[] {
  const questions = questionsByChannel[channelId] || [];
  const subChannels = new Set<string>();
  questions.forEach(q => {
    if (q.subChannel) {
      subChannels.add(q.subChannel);
    }
  });
  return Array.from(subChannels).sort();
}

// Get channel statistics
export function getChannelStats(): { id: string; total: number; beginner: number; intermediate: number; advanced: number }[] {
  return Object.entries(questionsByChannel).map(([channelId, questions]) => ({
    id: channelId,
    total: questions.length,
    beginner: questions.filter(q => q.difficulty === 'beginner').length,
    intermediate: questions.filter(q => q.difficulty === 'intermediate').length,
    advanced: questions.filter(q => q.difficulty === 'advanced').length
  }));
}

// Get available channel IDs
export function getAvailableChannelIds(): string[] {
  return Object.keys(questionsByChannel);
}

// Check if a channel has questions
export function channelHasQuestions(channelId: string): boolean {
  return (questionsByChannel[channelId]?.length || 0) > 0;
}
