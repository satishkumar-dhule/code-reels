import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { allChannelsConfig, getRecommendedChannels } from '../lib/channels-config';
import { PreferencesStorage } from '../services/storage.service';
import { DEFAULTS } from '../lib/constants';
import type { UserPreferences } from '../types';

// Re-export UserPreferences type for backward compatibility
export type { UserPreferences };

const defaultPreferences: UserPreferences = {
  role: DEFAULTS.ROLE,
  subscribedChannels: [],
  onboardingComplete: false,
  createdAt: new Date().toISOString()
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  setRole: (roleId: string) => void;
  subscribeChannel: (channelId: string) => void;
  unsubscribeChannel: (channelId: string) => void;
  toggleSubscription: (channelId: string) => void;
  isSubscribed: (channelId: string) => boolean;
  getSubscribedChannels: () => typeof allChannelsConfig;
  resetPreferences: () => void;
  skipOnboarding: () => void;
  needsOnboarding: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    return PreferencesStorage.get();
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    PreferencesStorage.set(preferences);
  }, [preferences]);


  const setRole = useCallback((roleId: string) => {
    const recommended = getRecommendedChannels(roleId);
    const recommendedIds = recommended.map(c => c.id);
    
    const newPrefs: UserPreferences = {
      role: roleId,
      subscribedChannels: recommendedIds,
      onboardingComplete: true,
      createdAt: new Date().toISOString()
    };
    
    // Save to localStorage immediately
    PreferencesStorage.set(newPrefs);
    
    // Update state
    setPreferences(newPrefs);
  }, []);

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

  const unsubscribeChannel = useCallback((channelId: string) => {
    setPreferences(prev => ({
      ...prev,
      subscribedChannels: prev.subscribedChannels.filter(id => id !== channelId)
    }));
  }, []);

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

  const isSubscribed = useCallback((channelId: string) => {
    return preferences.subscribedChannels.includes(channelId);
  }, [preferences.subscribedChannels]);

  const getSubscribedChannels = useCallback(() => {
    return allChannelsConfig.filter(c => preferences.subscribedChannels.includes(c.id));
  }, [preferences.subscribedChannels]);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    PreferencesStorage.reset();
  }, []);

  const skipOnboarding = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      subscribedChannels: DEFAULTS.SUBSCRIBED_CHANNELS as unknown as string[],
      onboardingComplete: true
    }));
  }, []);

  return (
    <UserPreferencesContext.Provider value={{
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
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}
