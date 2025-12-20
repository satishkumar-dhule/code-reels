/**
 * Unified API Service
 * Centralized API client with consistent error handling and caching
 */

import type {
  Question,
  ChannelStats,
  ChannelDetailedStats,
  ChannelData,
  CodingChallenge,
  CodingStats,
  QuestionFilters,
  CodingFilters,
} from '../types';

// ============================================
// CONFIGURATION
// ============================================
const DATA_BASE = import.meta.env.BASE_URL + 'data';

// ============================================
// CACHE MANAGEMENT
// ============================================
class CacheManager<T> {
  private cache = new Map<string, T>();
  private ttl: number;
  private timestamps = new Map<string, number>();

  constructor(ttlMs: number = Infinity) {
    this.ttl = ttlMs;
  }

  get(key: string): T | undefined {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return undefined;
    }
    return this.cache.get(key);
  }

  set(key: string, value: T): void {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }
}

// Cache instances
const channelDataCache = new CacheManager<ChannelData>();
const statsCache = new CacheManager<ChannelDetailedStats[]>();
const questionsCache = new CacheManager<Question>();

// ============================================
// HTTP UTILITIES
// ============================================
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        url
      );
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      url
    );
  }
}

// ============================================
// CHANNEL SERVICE
// ============================================
export const ChannelService = {
  /**
   * Get all channels with question counts
   */
  async getAll(): Promise<ChannelStats[]> {
    return fetchJson<ChannelStats[]>(`${DATA_BASE}/channels.json`);
  },

  /**
   * Get channel data (questions, subchannels, companies, stats)
   */
  async getData(channelId: string): Promise<ChannelData> {
    const cached = channelDataCache.get(channelId);
    if (cached) return cached;

    const data = await fetchJson<ChannelData>(`${DATA_BASE}/${channelId}.json`);
    channelDataCache.set(channelId, data);
    return data;
  },

  /**
   * Get subchannels for a channel
   */
  async getSubChannels(channelId: string): Promise<string[]> {
    const data = await this.getData(channelId);
    return data.subChannels;
  },

  /**
   * Get companies for a channel
   */
  async getCompanies(channelId: string): Promise<string[]> {
    const data = await this.getData(channelId);
    return data.companies;
  },
};

// ============================================
// QUESTION SERVICE
// ============================================
export const QuestionService = {
  /**
   * Get questions for a channel with optional filters
   */
  async getByChannel(
    channelId: string,
    filters: QuestionFilters = {}
  ): Promise<Question[]> {
    const data = await ChannelService.getData(channelId);
    let questions = data.questions;

    if (filters.subChannel && filters.subChannel !== 'all') {
      questions = questions.filter(q => q.subChannel === filters.subChannel);
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      questions = questions.filter(q => q.difficulty === filters.difficulty);
    }

    if (filters.company && filters.company !== 'all') {
      questions = questions.filter(q => q.companies?.includes(filters.company!));
    }

    return questions;
  },

  /**
   * Get a single question by ID
   */
  async getById(questionId: string): Promise<Question> {
    // Check cache first
    const cached = questionsCache.get(questionId);
    if (cached) return cached;

    // Search through all channels
    const channels = await ChannelService.getAll();
    
    for (const channel of channels) {
      try {
        const data = await ChannelService.getData(channel.id);
        const question = data.questions.find(q => q.id === questionId);
        if (question) {
          questionsCache.set(questionId, question);
          return question;
        }
      } catch {
        // Channel file might not exist, continue
      }
    }

    throw new ApiError(`Question not found: ${questionId}`, 404, questionId);
  },

  /**
   * Get a random question
   */
  async getRandom(channel?: string, difficulty?: string): Promise<Question> {
    let questions: Question[] = [];

    if (channel && channel !== 'all') {
      const data = await ChannelService.getData(channel);
      questions = data.questions;
    } else {
      const channels = await ChannelService.getAll();
      for (const ch of channels) {
        try {
          const data = await ChannelService.getData(ch.id);
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
      throw new ApiError('No questions found', 404, 'random');
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  },

  /**
   * Search questions by text
   */
  async search(query: string, limit: number = 50): Promise<Question[]> {
    const channels = await ChannelService.getAll();
    const results: Question[] = [];
    const lowerQuery = query.toLowerCase();

    for (const channel of channels) {
      if (results.length >= limit) break;
      
      try {
        const data = await ChannelService.getData(channel.id);
        const matches = data.questions.filter(q =>
          q.question.toLowerCase().includes(lowerQuery) ||
          q.answer.toLowerCase().includes(lowerQuery) ||
          q.tags.some(t => t.toLowerCase().includes(lowerQuery))
        );
        results.push(...matches);
      } catch {
        // Continue if channel fails
      }
    }

    return results.slice(0, limit);
  },
};

// ============================================
// STATS SERVICE
// ============================================
export const StatsService = {
  /**
   * Get detailed stats for all channels
   */
  async getAll(): Promise<ChannelDetailedStats[]> {
    const cached = statsCache.get('all');
    if (cached) return cached;

    const channels = await ChannelService.getAll();
    const stats: ChannelDetailedStats[] = [];

    for (const channel of channels) {
      try {
        const data = await ChannelService.getData(channel.id);
        stats.push({
          id: channel.id,
          total: data.stats.total,
          beginner: data.stats.beginner,
          intermediate: data.stats.intermediate,
          advanced: data.stats.advanced,
        });
      } catch {
        // Skip if channel fails
      }
    }

    statsCache.set('all', stats);
    return stats;
  },
};

// ============================================
// CODING CHALLENGE SERVICE
// ============================================
export const CodingService = {
  /**
   * Get all coding challenges with optional filters
   */
  async getAll(filters: CodingFilters = {}): Promise<CodingChallenge[]> {
    const data = await fetchJson<CodingChallenge[]>(`${DATA_BASE}/coding-challenges.json`);
    let challenges = data;

    if (filters.difficulty && filters.difficulty !== 'all') {
      challenges = challenges.filter(c => c.difficulty === filters.difficulty);
    }

    if (filters.category && filters.category !== 'all') {
      challenges = challenges.filter(c => c.category === filters.category);
    }

    return challenges;
  },

  /**
   * Get a single coding challenge by ID
   */
  async getById(id: string): Promise<CodingChallenge> {
    const challenges = await this.getAll();
    const challenge = challenges.find(c => c.id === id);
    
    if (!challenge) {
      throw new ApiError(`Challenge not found: ${id}`, 404, id);
    }
    
    return challenge;
  },

  /**
   * Get a random coding challenge
   */
  async getRandom(difficulty?: string): Promise<CodingChallenge> {
    const challenges = await this.getAll({ difficulty });
    
    if (challenges.length === 0) {
      throw new ApiError('No challenges found', 404, 'random');
    }

    const randomIndex = Math.floor(Math.random() * challenges.length);
    return challenges[randomIndex];
  },

  /**
   * Get coding challenge statistics
   */
  async getStats(): Promise<CodingStats> {
    const challenges = await this.getAll();
    
    const stats: CodingStats = {
      total: challenges.length,
      byDifficulty: { easy: 0, medium: 0 },
      byCategory: {},
    };

    for (const challenge of challenges) {
      if (challenge.difficulty === 'beginner') {
        stats.byDifficulty.easy++;
      } else if (challenge.difficulty === 'intermediate') {
        stats.byDifficulty.medium++;
      }

      stats.byCategory[challenge.category] = 
        (stats.byCategory[challenge.category] || 0) + 1;
    }

    return stats;
  },
};

// ============================================
// CACHE UTILITIES
// ============================================
export const CacheUtils = {
  /**
   * Clear all caches
   */
  clearAll(): void {
    channelDataCache.clear();
    statsCache.clear();
    questionsCache.clear();
  },

  /**
   * Preload all channel data for search functionality
   */
  async preloadAll(): Promise<void> {
    const channels = await ChannelService.getAll();
    await Promise.all(
      channels.map(ch => ChannelService.getData(ch.id).catch(() => null))
    );
  },
};

// ============================================
// EXPORT DEFAULT API OBJECT
// ============================================
export const api = {
  channels: ChannelService,
  questions: QuestionService,
  stats: StatsService,
  coding: CodingService,
  cache: CacheUtils,
};

export default api;
