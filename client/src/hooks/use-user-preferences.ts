import { useState, useEffect, useCallback } from 'react';
import { allChannelsConfig, getRecommendedChannels } from '../lib/channels-config';

const STORAGE_KEY = 'user-preferences';

export interface UserPreferences {
  role: string | null;
  subscribedChannels: string[];
  onboardingComplete: boolean;
  createdAt: string;
}

const defaultPreferences: UserPreferences = {
  role: null,
  subscribedChannels: [],
  onboardingComplete: false,
  createdAt: new Date().toISOString()
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
    return defaultPreferences;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  }, [preferences]);

  // Set user role and auto-subscribe to recommended channels
  const setRole = useCallback((roleId: string) => {
    const recommended = getRecommendedChannels(roleId);
    const recommendedIds = recommended.map(c => c.id);
    
    setPreferences(prev => ({
      ...prev,
      role: roleId,
      subscribedChannels: recommendedIds,
      onboardingComplete: true
    }));
  }, []);

  // Subscribe to a channel
  const subscribeChannel = useCallback((channelId: string) => {
    setPreferences(prev => {
      if (prev.subscribedChannels.includes(channelId)) {
        return prev;
      }
      return {
        ...prev,
        subscribedChannels: [...prev.subscribedChannels, channelId]
      };
    });
  }, []);

  // Unsubscribe from a channel
  const unsubscribeChannel = useCallback((channelId: string) => {
    setPreferences(prev => ({
      ...prev,
      subscribedChannels: prev.subscribedChannels.filter(id => id !== channelId)
    }));
  }, []);

  // Toggle subscription
  const toggleSubscription = useCallback((channelId: string) => {
    setPreferences(prev => {
      if (prev.subscribedChannels.includes(channelId)) {
        return {
          ...prev,
          subscribedChannels: prev.subscribedChannels.filter(id => id !== channelId)
        };
      }
      return {
        ...prev,
        subscribedChannels: [...prev.subscribedChannels, channelId]
      };
    });
  }, []);

  // Check if subscribed to a channel
  const isSubscribed = useCallback((channelId: string) => {
    return preferences.subscribedChannels.includes(channelId);
  }, [preferences.subscribedChannels]);

  // Get subscribed channel configs
  const getSubscribedChannels = useCallback(() => {
    return allChannelsConfig.filter(c => preferences.subscribedChannels.includes(c.id));
  }, [preferences.subscribedChannels]);

  // Reset preferences (for testing)
  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Skip onboarding with default channels
  const skipOnboarding = useCallback(() => {
    // Default channels for users who skip
    const defaultChannels = ['system-design', 'algorithms', 'frontend', 'backend', 'database', 'devops'];
    setPreferences(prev => ({
      ...prev,
      subscribedChannels: defaultChannels,
      onboardingComplete: true
    }));
  }, []);

  return {
    preferences,
    setRole,
    subscribeChannel,
    unsubscribeChannel,
    toggleSubscription,
    isSubscribed,
    getSubscribedChannels,
    resetPreferences,
    skipOnboarding,
    needsOnboarding: !preferences.onboardingComplete
  };
}
