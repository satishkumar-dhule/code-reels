// Google Analytics Integration for Code Reels
// This module handles all analytics tracking

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Detect if running in CI/test environment
function isCI(): boolean {
  // Check for common CI environment indicators
  if (typeof window === 'undefined') return true;
  
  // Check URL for CI/test indicators
  const hostname = window.location?.hostname || '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isTestEnv = hostname.includes('test') || hostname.includes('preview');
  
  // Check for Playwright/Puppeteer/Cypress test runners
  const isAutomatedTest = !!(
    (window as any).__PLAYWRIGHT__ ||
    (window as any).__PUPPETEER__ ||
    (window as any).Cypress ||
    navigator.webdriver
  );
  
  // Check for headless browser indicators
  const isHeadless = /HeadlessChrome|PhantomJS/i.test(navigator.userAgent);
  
  // Check for CI query param (useful for debugging)
  const urlParams = new URLSearchParams(window.location?.search || '');
  const hasCIParam = urlParams.get('ci') === 'true' || urlParams.get('test') === 'true';
  
  return isAutomatedTest || isHeadless || hasCIParam;
}

// Cache the CI check result
let _isCI: boolean | null = null;
function shouldSkipAnalytics(): boolean {
  if (_isCI === null) {
    _isCI = isCI();
    if (_isCI) {
      console.log('[Analytics] Skipping analytics in CI/test environment');
    }
  }
  return _isCI;
}

// Initialize Google Analytics
export function initializeAnalytics(measurementId: string) {
  // Skip analytics in CI/test environments
  if (shouldSkipAnalytics()) {
    console.log('[Analytics] Initialization skipped in CI/test environment');
    return;
  }

  if (!measurementId) {
    console.warn('Google Analytics Measurement ID not provided');
    return;
  }

  // Create script element
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  
  // Define gtag function
  function gtag(...args: any[]) {
    window.dataLayer.push(arguments);
  }
  
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, {
    'anonymize_ip': true,
    'allow_google_signals': false,
    'allow_ad_personalization_signals': false,
  });
}

// Track page views
export function trackPageView(path: string, title: string) {
  if (shouldSkipAnalytics() || !window.gtag) return;
  
  window.gtag('event', 'page_view', {
    'page_path': path,
    'page_title': title,
  });
}

// Track custom events
export function trackEvent(eventName: string, eventData?: Record<string, any>) {
  if (shouldSkipAnalytics() || !window.gtag) return;
  
  window.gtag('event', eventName, eventData || {});
}

// Track channel selection
export function trackChannelSelect(channelId: string, channelName: string) {
  trackEvent('channel_select', {
    'channel_id': channelId,
    'channel_name': channelName,
  });
}

// Track question viewed
export function trackQuestionView(questionId: string, channel: string, difficulty: string) {
  trackEvent('question_view', {
    'question_id': questionId,
    'channel': channel,
    'difficulty': difficulty,
  });
}

// Track question completed
export function trackQuestionCompleted(questionId: string, channel: string, timeSpent: number) {
  trackEvent('question_completed', {
    'question_id': questionId,
    'channel': channel,
    'time_spent_seconds': timeSpent,
  });
}

// Track answer revealed
export function trackAnswerRevealed(questionId: string, timeToReveal: number) {
  trackEvent('answer_revealed', {
    'question_id': questionId,
    'time_to_reveal_seconds': timeToReveal,
  });
}

// Track social post shared
export function trackSocialShare(questionId: string, channel: string) {
  trackEvent('social_share', {
    'question_id': questionId,
    'channel': channel,
  });
}

// Track social post downloaded
export function trackSocialDownload(questionId: string, format: string) {
  trackEvent('social_download', {
    'question_id': questionId,
    'format': format, // 'image' or 'text'
  });
}

// Track stats page view
export function trackStatsView() {
  trackEvent('stats_view', {
    'timestamp': new Date().toISOString(),
  });
}

// Track about page view
export function trackAboutView() {
  trackEvent('about_view', {
    'timestamp': new Date().toISOString(),
  });
}

// Track easter egg unlocked
export function trackEasterEggUnlocked(eggName: string) {
  trackEvent('easter_egg_unlocked', {
    'egg_name': eggName,
  });
}

// Track GitHub link clicked
export function trackGitHubClick(linkType: string) {
  trackEvent('github_click', {
    'link_type': linkType, // 'star', 'issue', 'repo', 'discussions'
  });
}

// Track timer usage
export function trackTimerUsage(enabled: boolean, duration: number) {
  trackEvent('timer_usage', {
    'timer_enabled': enabled,
    'timer_duration_seconds': duration,
  });
}

// Track theme change
export function trackThemeChange(theme: string) {
  trackEvent('theme_change', {
    'theme': theme,
  });
}

// Track session duration
export function trackSessionDuration(durationSeconds: number) {
  trackEvent('session_duration', {
    'duration_seconds': durationSeconds,
  });
}

// Track user engagement
export function trackUserEngagement(engagementType: string, metadata?: Record<string, any>) {
  trackEvent('user_engagement', {
    'engagement_type': engagementType,
    ...metadata,
  });
}

// Track error
export function trackError(errorMessage: string, errorContext?: string) {
  trackEvent('error', {
    'error_message': errorMessage,
    'error_context': errorContext,
  });
}

// Set user properties
export function setUserProperties(userId?: string, userProperties?: Record<string, any>) {
  if (shouldSkipAnalytics() || !window.gtag) return;
  
  const properties: Record<string, any> = {
    'anonymize_ip': true,
  };
  
  if (userId) {
    properties['user_id'] = userId;
  }
  
  if (userProperties) {
    Object.assign(properties, userProperties);
  }
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-47MSM57H95';
  window.gtag('config', measurementId, properties);
}

// Track conversion
export function trackConversion(conversionName: string, value?: number) {
  trackEvent('conversion', {
    'conversion_name': conversionName,
    'value': value,
  });
}

// ============================================
// Mobile Gesture Analytics
// ============================================

/**
 * Track mobile gesture usage
 * @param gestureType - Type of gesture (swipe, pull, tap, etc.)
 * @param page - Page where gesture occurred
 * @param metadata - Additional gesture data
 */
export function trackMobileGesture(
  gestureType: 'pull_to_refresh' | 'swipe_card' | 'swipe_navigation' | 'fab_tap' | 'bottom_sheet',
  page: string,
  metadata?: Record<string, any>
) {
  trackEvent('mobile_gesture', {
    'gesture_type': gestureType,
    'page': page,
    'timestamp': new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Track pull-to-refresh gesture
 * @param page - Page where pull-to-refresh occurred
 * @param duration - Time taken to complete refresh (ms)
 * @param success - Whether refresh was successful
 */
export function trackPullToRefresh(page: string, duration: number, success: boolean) {
  trackMobileGesture('pull_to_refresh', page, {
    'duration_ms': duration,
    'success': success,
  });
}

/**
 * Track swipeable card gesture
 * @param page - Page where swipe occurred
 * @param direction - Swipe direction (left/right)
 * @param action - Action triggered (remove/continue/etc.)
 * @param velocity - Swipe velocity (px/s)
 */
export function trackSwipeCard(
  page: string,
  direction: 'left' | 'right',
  action: string,
  velocity?: number
) {
  trackMobileGesture('swipe_card', page, {
    'direction': direction,
    'action': action,
    'velocity_px_per_sec': velocity,
  });
}

/**
 * Track swipe navigation gesture
 * @param page - Page where swipe occurred
 * @param direction - Swipe direction (left/right)
 * @param fromId - ID of item swiped from
 * @param toId - ID of item swiped to
 * @param velocity - Swipe velocity (px/s)
 */
export function trackSwipeNavigation(
  page: string,
  direction: 'left' | 'right',
  fromId?: string,
  toId?: string,
  velocity?: number
) {
  trackMobileGesture('swipe_navigation', page, {
    'direction': direction,
    'from_id': fromId,
    'to_id': toId,
    'velocity_px_per_sec': velocity,
  });
}

/**
 * Track floating action button tap
 * @param page - Page where FAB was tapped
 * @param action - Action triggered by FAB
 * @param scrollPosition - Scroll position when tapped (px)
 */
export function trackFABTap(page: string, action: string, scrollPosition?: number) {
  trackMobileGesture('fab_tap', page, {
    'action': action,
    'scroll_position_px': scrollPosition,
  });
}

/**
 * Track bottom sheet interaction
 * @param page - Page where bottom sheet was used
 * @param action - Action performed (open/close/drag)
 * @param method - How it was triggered (tap/drag/backdrop)
 */
export function trackBottomSheet(
  page: string,
  action: 'open' | 'close' | 'drag',
  method?: 'tap' | 'drag' | 'backdrop'
) {
  trackMobileGesture('bottom_sheet', page, {
    'action': action,
    'method': method,
  });
}

/**
 * Track haptic feedback usage
 * @param pattern - Haptic pattern used (light/medium/impact/success/error)
 * @param context - Context where haptic was triggered
 */
export function trackHapticFeedback(
  pattern: 'light' | 'medium' | 'impact' | 'success' | 'error',
  context: string
) {
  trackEvent('haptic_feedback', {
    'pattern': pattern,
    'context': context,
    'timestamp': new Date().toISOString(),
  });
}

/**
 * Track skeleton loader display
 * @param page - Page where skeleton was shown
 * @param duration - How long skeleton was visible (ms)
 * @param count - Number of skeleton items shown
 */
export function trackSkeletonLoader(page: string, duration: number, count?: number) {
  trackEvent('skeleton_loader', {
    'page': page,
    'duration_ms': duration,
    'count': count,
  });
}

/**
 * Track gesture success rate
 * @param gestureType - Type of gesture
 * @param success - Whether gesture was successful
 * @param attempts - Number of attempts before success
 */
export function trackGestureSuccess(
  gestureType: string,
  success: boolean,
  attempts?: number
) {
  trackEvent('gesture_success', {
    'gesture_type': gestureType,
    'success': success,
    'attempts': attempts,
  });
}

/**
 * Track mobile performance metrics
 * @param metric - Performance metric name
 * @param value - Metric value
 * @param page - Page where metric was measured
 */
export function trackMobilePerformance(
  metric: 'animation_fps' | 'gesture_latency' | 'load_time',
  value: number,
  page: string
) {
  trackEvent('mobile_performance', {
    'metric': metric,
    'value': value,
    'page': page,
  });
}
