import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  trackPageView,
  trackChannelSelect,
  trackQuestionView,
  trackQuestionCompleted,
  trackAnswerRevealed,
  trackSocialShare,
  trackSocialDownload,
  trackStatsView,
  trackAboutView,
  trackEasterEggUnlocked,
  trackGitHubClick,
  trackTimerUsage,
  trackThemeChange,
  trackSessionDuration,
  trackUserEngagement,
  trackError,
} from '../lib/analytics';

// Hook to track page views
export function usePageViewTracking() {
  const [location] = useLocation();
  const previousLocationRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (location !== previousLocationRef.current) {
      previousLocationRef.current = location;
      
      // Extract page title from location
      let pageTitle = 'Code Reels';
      if (location === '/') pageTitle = 'Home';
      else if (location === '/about') pageTitle = 'About';
      else if (location === '/stats') pageTitle = 'Stats';
      else if (location.startsWith('/channel/')) pageTitle = 'Question';
      
      trackPageView(location, pageTitle);
    }
  }, [location]);
}

// Hook to track session duration
export function useSessionTracking() {
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionDuration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      trackSessionDuration(sessionDuration);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}

// Hook to track user interactions
export function useInteractionTracking() {
  useEffect(() => {
    let interactionCount = 0;
    let lastInteractionTime = Date.now();

    const handleInteraction = () => {
      interactionCount++;
      lastInteractionTime = Date.now();

      // Track engagement every 10 interactions
      if (interactionCount % 10 === 0) {
        trackUserEngagement('interaction_milestone', {
          'interaction_count': interactionCount,
        });
      }
    };

    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, []);
}

// Export all tracking functions for direct use
export {
  trackPageView,
  trackChannelSelect,
  trackQuestionView,
  trackQuestionCompleted,
  trackAnswerRevealed,
  trackSocialShare,
  trackSocialDownload,
  trackStatsView,
  trackAboutView,
  trackEasterEggUnlocked,
  trackGitHubClick,
  trackTimerUsage,
  trackThemeChange,
  trackSessionDuration,
  trackUserEngagement,
  trackError,
};
