// Static question loader - loads questions from unified storage
// This works for GitHub Pages static hosting (no backend required)

import allQuestionsData from './questions/all-questions.json';
import channelMappingsData from './questions/channel-mappings.json';

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

// Questions by ID from unified storage
const questionsById: Record<string, Question> = (allQuestionsData as any).questions || {};

// Channel mappings from unified storage
const channelMappings: Record<string, { subChannels: Record<string, string[]> }> = 
  (channelMappingsData as any).channels || {};

// Build questions by channel from mappings
function buildQuestionsByChannel(): Record<string, Question[]> {
  const result: Record<string, Question[]> = {};
  
  Object.entries(channelMappings).forEach(([channelId, mapping]) => {
    const questionIds = new Set<string>();
    
    // Collect all question IDs for this channel
    Object.values(mapping.subChannels || {}).forEach(ids => {
      ids.forEach(id => questionIds.add(id));
    });
    
    // Map IDs to questions, adding channel/subChannel info
    const channelQuestions: Question[] = [];
    
    Array.from(questionIds).forEach(id => {
      const q = questionsById[id];
      if (!q) return;
      
      // Find which subChannel this question belongs to in this channel
      let subChannel = 'general';
      for (const [sc, ids] of Object.entries(mapping.subChannels || {})) {
        if (ids.includes(id)) {
          subChannel = sc;
          break;
        }
      }
      
      channelQuestions.push({ ...q, channel: channelId, subChannel });
    });
    
    result[channelId] = channelQuestions;
  });
  
  return result;
}

const questionsByChannel = buildQuestionsByChannel();

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
