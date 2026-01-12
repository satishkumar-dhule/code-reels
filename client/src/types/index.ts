/**
 * Centralized type definitions for the application
 * Shared types used across components, hooks, and services
 */

import { DIFFICULTY, NOTIFICATION_TYPES } from '../lib/constants';

// ============================================
// QUESTION TYPES
// ============================================
export interface Question {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  diagram?: string;
  tags: string[];
  difficulty: Difficulty;
  channel: string;
  subChannel: string;
  sourceUrl?: string;
  videos?: VideoLinks;
  companies?: string[];
  eli5?: string;
  tldr?: string;
  relevanceScore?: number;
  relevanceDetails?: RelevanceDetails;
  voiceKeywords?: string[]; // Mandatory keywords for voice interview evaluation
  voiceSuitable?: boolean; // Whether question is suitable for voice interview
  isNew?: boolean; // Whether question is new (less than 7 days old)
  lastUpdated?: string;
  createdAt?: string;
}

export interface QuestionListItem {
  id: string;
  difficulty: string;
  subChannel: string;
}

export interface VideoLinks {
  shortVideo?: string;
  longVideo?: string;
}

export interface RelevanceDetails {
  score: number;
  factors: string[];
}

// ============================================
// CHANNEL TYPES
// ============================================
export interface Channel {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  subChannels?: SubChannel[];
}

export interface SubChannel {
  id: string;
  name: string;
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
  newThisWeek?: number;
}

export interface ChannelData {
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

// ============================================
// CODING CHALLENGE TYPES
// ============================================
export interface CodingChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  companies: string[];
  starterCode: {
    javascript: string;
    python: string;
  };
  testCases: TestCase[];
  hints: string[];
  sampleSolution: {
    javascript: string;
    python: string;
  };
  complexity: {
    time: string;
    space: string;
    explanation: string;
  };
  timeLimit: number;
}

export interface TestCase {
  input: unknown;
  expected: unknown;
  description?: string;
}

export interface CodingStats {
  total: number;
  byDifficulty: {
    easy: number;
    medium: number;
  };
  byCategory: Record<string, number>;
}

// ============================================
// USER TYPES
// ============================================
export interface UserPreferences {
  role: string | null;
  subscribedChannels: string[];
  subscribedCertifications?: string[];
  onboardingComplete: boolean;
  createdAt: string;
  shuffleQuestions?: boolean;
  prioritizeUnvisited?: boolean;
  hideCertifications?: boolean;
}

export interface UserProgress {
  channelId: string;
  completedQuestions: string[];
  lastVisitedIndex: number;
  markedQuestions: string[];
}

// ============================================
// NOTIFICATION TYPES
// ============================================
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export interface Notification {
  id: string;
  title: string;
  description?: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  link?: string; // Optional link to navigate to when clicked
}

// ============================================
// THEME TYPES
// ============================================
export interface ThemeConfig {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface ThemeCategory {
  id: string;
  name: string;
}

// ============================================
// DIFFICULTY TYPE
// ============================================
export type Difficulty = typeof DIFFICULTY[keyof typeof DIFFICULTY];

// ============================================
// FILTER TYPES
// ============================================
export interface QuestionFilters {
  subChannel?: string;
  difficulty?: string;
  company?: string;
}

export interface CodingFilters {
  difficulty?: string;
  category?: string;
}

// ============================================
// ACTIVITY TYPES
// ============================================
export interface ActivityStat {
  date: string;
  count: number;
}

export interface ActivityData extends ActivityStat {
  week: number;
  dayOfWeek: number;
}

// ============================================
// BADGE TYPES
// ============================================
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface BadgeProgress {
  badge: Badge;
  progress: number;
  remaining: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  loading: boolean;
  error: Error | null;
}

// ============================================
// HOOK RETURN TYPES
// ============================================
export interface UseQuestionsReturn extends LoadingState {
  questions: Question[];
  questionIds: string[];
  totalQuestions: number;
}

export interface UseQuestionReturn extends LoadingState {
  question: Question | null;
}

export interface UseProgressReturn {
  completed: string[];
  markCompleted: (questionId: string) => void;
  lastVisitedIndex: number;
  saveLastVisitedIndex: (index: number) => void;
  markedQuestions: string[];
  toggleMark: (questionId: string) => void;
}

// ============================================
// EVENT TYPES
// ============================================
export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: () => void;
  description: string;
}

// ============================================
// CERTIFICATION TYPES
// ============================================
export interface Certification {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: string;
  color: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  estimatedHours: number;
  examCode?: string;
  officialUrl?: string;
  channelMappings: CertificationChannelMapping[];
  tags?: string[];
  prerequisites?: string[];
}

export interface CertificationChannelMapping {
  channelId: string;
  subChannels?: string[];
  weight: number;
}

export interface CertificationProgress {
  certificationId: string;
  completedQuestions: string[];
  totalQuestions: number;
  startedAt?: string;
  lastPracticedAt?: string;
}

export interface CertificationStats {
  id: string;
  totalQuestions: number;
  byDifficulty: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
}
