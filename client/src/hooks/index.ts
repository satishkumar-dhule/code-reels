/**
 * Hooks Index
 * Central export point for all custom hooks
 */

// Question hooks
export {
  useQuestions,
  useQuestion,
  useQuestionsWithPrefetch,
  useCompanies,
  useCompaniesWithCounts,
  useSubChannels,
} from './use-questions';

// Stats hooks
export { useChannelStats } from './use-stats';

// Progress hooks
export { useProgress, useGlobalStats, trackActivity } from './use-progress';

// Analytics hooks
export {
  usePageViewTracking,
  useSessionTracking,
  useInteractionTracking,
  trackQuestionView,
  trackAnswerRevealed,
  trackChannelSelect,
  trackGitHubClick,
  trackThemeChange,
  trackStatsView,
  trackSocialShare,
  trackSocialDownload,
  trackTimerUsage,
} from './use-analytics';

// UI hooks
export { useToast, toast } from './use-toast';
export { useIsMobile } from './use-mobile';
export { useDebounce } from './use-debounce';
export { useSwipe, useHorizontalSwipe, useVerticalSwipe } from './use-swipe';

// Search hooks
export { useSearchProvider } from './use-search-provider';

// User preferences hook
export { useUserPreferences } from './use-user-preferences';

// Adaptive learning hook
export { useAdaptiveLearning } from './use-adaptive-learning';
export type {
  TopicMastery,
  KnowledgeGap,
  LearningPhase,
  LearningPath,
  AnswerRecord,
  AdaptiveLearningState
} from './use-adaptive-learning';

// Accessibility hooks
export { useFocusTrap } from './use-focus-trap';
export type { UseFocusTrapOptions } from './use-focus-trap';

export { useKeyboardNavigation } from './use-keyboard-navigation';
export type { KeyboardShortcut } from './use-keyboard-navigation';

export { useReducedMotion } from './use-reduced-motion';

export { useAnnouncer } from './use-announcer';
export type { AnnouncementPriority } from './use-announcer';
