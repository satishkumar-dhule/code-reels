/**
 * Application-wide constants
 * Centralized location for magic numbers, strings, and configuration values
 */

// ============================================
// STORAGE KEYS
// ============================================
export const STORAGE_KEYS = {
  // User preferences
  USER_PREFERENCES: 'user-preferences',
  THEME: 'theme',
  THEME_AUTO_ROTATE: 'theme-auto-rotate',
  THEME_USER_CHANGED: 'theme-user-changed',
  
  // Notifications
  NOTIFICATIONS: 'app-notifications',
  
  // Progress tracking
  PROGRESS_PREFIX: 'progress-',
  MARKED_PREFIX: 'marked-',
  LAST_VISITED_PREFIX: 'last-visited-',
  
  // Onboarding
  MARVEL_INTRO_SEEN: 'marvel-intro-seen',
  SWIPE_HINT_SEEN: 'swipe-hint-seen',
  GETTING_STARTED_SEEN: 'getting-started-seen',
  COACH_MARKS_SEEN: 'coach-marks-seen',
  
  // Timer settings
  TIMER_ENABLED: 'timer-enabled',
  TIMER_DURATION: 'timer-duration',
  
  // Activity tracking
  ACTIVITY_STATS: 'activity-stats',
  LAST_ACTIVITY_DATE: 'last-activity-date',
} as const;

// ============================================
// TIMING CONSTANTS
// ============================================
export const TIMING = {
  // Theme auto-rotation interval (15 minutes)
  AUTO_ROTATE_INTERVAL: 15 * 60 * 1000,
  
  // Default timer duration for questions (seconds)
  DEFAULT_TIMER_DURATION: 60,
  
  // Swipe hint display duration (ms)
  SWIPE_HINT_DURATION: 4000,
  
  // Toast display duration (ms)
  TOAST_DURATION: 3000,
  
  // Debounce delays (ms)
  SEARCH_DEBOUNCE: 300,
  RESIZE_DEBOUNCE: 150,
  
  // Animation durations (ms)
  ANIMATION_FAST: 150,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,
} as const;

// ============================================
// LIMITS
// ============================================
export const LIMITS = {
  // Maximum notifications stored
  MAX_NOTIFICATIONS: 50,
  
  // Minimum swipe distance for gesture detection (px)
  MIN_SWIPE_DISTANCE: 50,
  
  // Search results limit
  MAX_SEARCH_RESULTS: 50,
  
  // Question text truncation
  QUESTION_PREVIEW_LENGTH: 100,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
} as const;

// ============================================
// BREAKPOINTS
// ============================================
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// ============================================
// DIFFICULTY LEVELS
// ============================================
export const DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export type Difficulty = typeof DIFFICULTY[keyof typeof DIFFICULTY];

export const DIFFICULTY_COLORS = {
  [DIFFICULTY.BEGINNER]: '#22c55e',    // green-500
  [DIFFICULTY.INTERMEDIATE]: '#eab308', // yellow-500
  [DIFFICULTY.ADVANCED]: '#ef4444',     // red-500
} as const;

export const DIFFICULTY_LABELS = {
  [DIFFICULTY.BEGINNER]: 'Beginner',
  [DIFFICULTY.INTERMEDIATE]: 'Intermediate',
  [DIFFICULTY.ADVANCED]: 'Advanced',
} as const;

// ============================================
// NOTIFICATION TYPES
// ============================================
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// ============================================
// API ENDPOINTS
// ============================================
export const API_ENDPOINTS = {
  CHANNELS: '/api/channels',
  QUESTIONS: '/api/questions',
  QUESTION: '/api/question',
  STATS: '/api/stats',
  SUBCHANNELS: '/api/subchannels',
  COMPANIES: '/api/companies',
  CODING_CHALLENGES: '/api/coding/challenges',
  CODING_CHALLENGE: '/api/coding/challenge',
  CODING_RANDOM: '/api/coding/random',
  CODING_STATS: '/api/coding/stats',
} as const;

// ============================================
// ROUTES
// ============================================
export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  WHATS_NEW: '/whats-new',
  STATS: '/stats',
  BADGES: '/badges',
  TESTS: '/tests',
  TEST: '/test',
  CODING: '/coding',
  BOT_ACTIVITY: '/bot-activity',
  CHANNELS: '/channels',
  CHANNEL: '/channel',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  MERMAID_TEST: '/test/mermaid',
} as const;

// ============================================
// EXTERNAL LINKS
// ============================================
export const EXTERNAL_LINKS = {
  GITHUB_REPO: 'https://github.com/satishkumar-dhule/code-reels',
  GITHUB_ISSUES: 'https://github.com/satishkumar-dhule/code-reels/issues/new',
  GITHUB_DISCUSSIONS: 'https://github.com/satishkumar-dhule/code-reels/discussions',
  GITHUB_SPONSOR: 'https://github.com/sponsors/satishkumar-dhule',
} as const;

// ============================================
// APP METADATA
// ============================================
export const APP_METADATA = {
  NAME: 'Code Reels',
  VERSION: '2.2.0',
  DESCRIPTION: 'Free technical interview prep platform with 1000+ questions',
  CANONICAL_URL: 'https://reel-interview.github.io',
} as const;

// ============================================
// POPULAR COMPANIES (for filtering/display)
// ============================================
export const POPULAR_COMPANIES = [
  'Google', 'Amazon', 'Meta', 'Microsoft', 'Apple',
  'Netflix', 'Uber', 'Airbnb', 'LinkedIn', 'Twitter',
  'Stripe', 'Salesforce', 'Adobe', 'Oracle', 'IBM',
] as const;

// ============================================
// COMPANY NAME ALIASES (for normalization)
// ============================================
export const COMPANY_ALIASES: Record<string, string> = {
  'facebook': 'Meta',
  'fb': 'Meta',
  'aws': 'Amazon',
  'msft': 'Microsoft',
  'goog': 'Google',
  'alphabet': 'Google',
};

// ============================================
// DEFAULT VALUES
// ============================================
export const DEFAULTS = {
  THEME: 'clean-dark',
  ROLE: null,
  SUBSCRIBED_CHANNELS: ['system-design', 'algorithms', 'frontend', 'backend', 'database', 'devops'],
  TIMER_DURATION: 60,
  AUTO_ROTATE_ENABLED: true,
} as const;
