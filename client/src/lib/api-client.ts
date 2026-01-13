/**
 * API client for fetching questions from static JSON files (GitHub Pages)
 * Data is pre-generated at build time from Turso database
 */

// Base path for static data files
const DATA_BASE = import.meta.env.BASE_URL + 'data';

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
  sourceUrl?: string;
  videos?: {
    shortVideo?: string;
    longVideo?: string;
  };
  companies?: string[];
  eli5?: string;
  relevanceScore?: number;
  lastUpdated?: string;
}

export interface QuestionListItem {
  id: string;
  difficulty: string;
  subChannel: string;
}

export interface ChannelStats {
  id: string;
  questionCount: number;
}

export interface ChannelDetailedStats {
  id: string;
  total: number;
  beginner: number;
  intermediate: number;
  advanced: number;
}

interface ChannelData {
  questions: Question[];
  subChannels: string[];
  companies: string[];
  stats: {
    total: number;
    beginner: number;
    intermediate: number;
    advanced: number;
  };
}

// Cache for loaded data
const channelCache = new Map<string, ChannelData>();
const statsCache: { data: ChannelDetailedStats[] | null } = { data: null };

async function fetchJson<T>(url: string): Promise<T> {
  // Add cache busting parameter to force fresh data
  // This helps users get latest data without manual cache clear
  const cacheBuster = `v=${Date.now()}`;
  const urlWithCache = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
  
  const response = await fetch(urlWithCache, {
    cache: 'no-cache', // Don't use browser cache
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

// Load channel data (questions, subchannels, companies)
/**
 * Sanitize answer field - remove MCQ JSON format if present
 * This handles any cached or old data that might have MCQ format
 */
function sanitizeAnswer(answer: string | undefined): string | undefined {
  if (!answer || typeof answer !== 'string') return answer;
  
  // Check if answer contains MCQ JSON format
  const trimmed = answer.trim();
  if (trimmed.startsWith('[{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Extract correct answer text
        const correctOption = parsed.find((opt: any) => opt.isCorrect === true);
        if (correctOption && correctOption.text) {
          console.warn('⚠️ Sanitized MCQ format in answer field (old cached data)');
          return correctOption.text;
        }
      }
    } catch (e) {
      // If parsing fails, return original
    }
  }
  
  return answer;
}

async function loadChannelData(channelId: string): Promise<ChannelData> {
  if (channelCache.has(channelId)) {
    return channelCache.get(channelId)!;
  }

  const data = await fetchJson<ChannelData>(`${DATA_BASE}/${channelId}.json`);
  
  // Sanitize all questions in the channel data
  if (data.questions && Array.isArray(data.questions)) {
    data.questions = data.questions.map(q => ({
      ...q,
      answer: sanitizeAnswer(q.answer)
    }));
  }
  
  channelCache.set(channelId, data);
  return data;
}

// Get all channels with question counts
export async function fetchChannels(): Promise<ChannelStats[]> {
  const data = await fetchJson<ChannelStats[]>(`${DATA_BASE}/channels.json`);
  return data;
}

// Get question IDs for a channel with optional filters
export async function fetchQuestionIds(
  channelId: string,
  subChannel?: string,
  difficulty?: string
): Promise<QuestionListItem[]> {
  const data = await loadChannelData(channelId);
  
  let questions = data.questions;
  
  if (subChannel && subChannel !== 'all') {
    questions = questions.filter(q => q.subChannel === subChannel);
  }
  
  if (difficulty && difficulty !== 'all') {
    questions = questions.filter(q => q.difficulty === difficulty);
  }
  
  return questions.map(q => ({
    id: q.id,
    difficulty: q.difficulty,
    subChannel: q.subChannel
  }));
}

// Get a single question by ID
export async function fetchQuestion(questionId: string): Promise<Question> {
  // Find which channel has this question
  const channels = await fetchChannels();
  
  for (const channel of channels) {
    try {
      const data = await loadChannelData(channel.id);
      const question = data.questions.find(q => q.id === questionId);
      if (question) {
        return question;
      }
    } catch {
      // Channel file might not exist, continue
    }
  }
  
  throw new Error(`Question not found: ${questionId}`);
}

// Get a random question
export async function fetchRandomQuestion(
  channel?: string,
  difficulty?: string
): Promise<Question> {
  let questions: Question[] = [];
  
  if (channel && channel !== 'all') {
    const data = await loadChannelData(channel);
    questions = data.questions;
  } else {
    // Load all channels
    const channels = await fetchChannels();
    for (const ch of channels) {
      try {
        const data = await loadChannelData(ch.id);
        questions.push(...data.questions);
      } catch {
        // Continue if channel fails
      }
    }
  }
  
  if (difficulty && difficulty !== 'all') {
    questions = questions.filter(q => q.difficulty === difficulty);
  }
  
  if (questions.length === 0) {
    throw new Error('No questions found');
  }
  
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}

// Get channel statistics
export async function fetchStats(): Promise<ChannelDetailedStats[]> {
  if (statsCache.data) {
    return statsCache.data;
  }
  
  const channels = await fetchChannels();
  const stats: ChannelDetailedStats[] = [];
  
  for (const channel of channels) {
    try {
      const data = await loadChannelData(channel.id);
      stats.push({
        id: channel.id,
        total: data.stats.total,
        beginner: data.stats.beginner,
        intermediate: data.stats.intermediate,
        advanced: data.stats.advanced
      });
    } catch {
      // Skip if channel fails
    }
  }
  
  statsCache.data = stats;
  return stats;
}

// Get subchannels for a channel
export async function fetchSubChannels(channelId: string): Promise<string[]> {
  const data = await loadChannelData(channelId);
  return data.subChannels;
}

// Get companies for a channel
export async function fetchCompanies(channelId: string): Promise<string[]> {
  const data = await loadChannelData(channelId);
  return data.companies;
}

// Clear cache (useful for forcing refresh)
export function clearCache(): void {
  channelCache.clear();
  statsCache.data = null;
}

// Get all questions for a channel (full data)
export async function fetchChannelQuestions(channelId: string): Promise<Question[]> {
  const data = await loadChannelData(channelId);
  return data.questions;
}
