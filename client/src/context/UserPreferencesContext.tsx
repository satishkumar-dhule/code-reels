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
  subscribedCertifications: [],
  onboardingComplete: false,
  createdAt: new Date().toISOString(),
  shuffleQuestions: true,
  prioritizeUnvisited: true
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  setRole: (roleId: string) => void;
  subscribeChannel: (channelId: string) => void;
  unsubscribeChannel: (channelId: string) => void;
  toggleSubscription: (channelId: string) => void;
  isSubscribed: (channelId: string) => boolean;
  getSubscribedChannels: () => typeof allChannelsConfig;
  subscribeCertification: (certId: string) => void;
  unsubscribeCertification: (certId: string) => void;
  toggleCertificationSubscription: (certId: string) => void;
  isCertificationSubscribed: (certId: string) => boolean;
  resetPreferences: () => void;
  skipOnboarding: () => void;
  needsOnboarding: boolean;
  toggleShuffleQuestions: () => void;
  togglePrioritizeUnvisited: () => void;
  toggleHideCertifications: () => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

// Detect search engine crawlers/bots
function isCrawler(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|msnbot|ahrefsbot|semrushbot|dotbot|rogerbot|screaming frog|lighthouse|chrome-lighthouse|pagespeed|gtmetrix|pingdom/i.test(userAgent);
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    
    // Bypass onboarding for crawlers - let them see main content immediately
    if (isCrawler()) {
      return {
        ...defaultPreferences,
        subscribedChannels: DEFAULTS.SUBSCRIBED_CHANNELS as unknown as string[],
        onboardingComplete: true
      };
    }
    
    return PreferencesStorage.get();
  });

  // Save to localStorage whenever preferences change (skip for crawlers)
  useEffect(() => {
    if (!isCrawler()) {
      PreferencesStorage.set(preferences);
    }
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

  const toggleShuffleQuestions = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      shuffleQuestions: !prev.shuffleQuestions
    }));
  }, []);

  const togglePrioritizeUnvisited = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      prioritizeUnvisited: !prev.prioritizeUnvisited
    }));
  }, []);

  const toggleHideCertifications = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      hideCertifications: !prev.hideCertifications
    }));
  }, []);

  const subscribeCertification = useCallback((certId: string) => {
    setPreferences(prev => {
      const current = prev.subscribedCertifications || [];
      if (current.includes(certId)) {
        return prev;
      }
      return {
        ...prev,
        subscribedCertifications: [...current, certId]
      };
    });
  }, []);

  const unsubscribeCertification = useCallback((certId: string) => {
    setPreferences(prev => ({
      ...prev,
      subscribedCertifications: (prev.subscribedCertifications || []).filter(id => id !== certId)
    }));
  }, []);

  const toggleCertificationSubscription = useCallback((certId: string) => {
    setPreferences(prev => {
      const current = prev.subscribedCertifications || [];
      if (current.includes(certId)) {
        return {
          ...prev,
          subscribedCertifications: current.filter(id => id !== certId)
        };
      }
      return {
        ...prev,
        subscribedCertifications: [...current, certId]
      };
    });
  }, []);

  const isCertificationSubscribed = useCallback((certId: string) => {
    return (preferences.subscribedCertifications || []).includes(certId);
  }, [preferences.subscribedCertifications]);

  return (
    <UserPreferencesContext.Provider value={{
      preferences,
      setRole,
      subscribeChannel,
      unsubscribeChannel,
      toggleSubscription,
      isSubscribed,
      getSubscribedChannels,
      subscribeCertification,
      unsubscribeCertification,
      toggleCertificationSubscription,
      isCertificationSubscribed,
      resetPreferences,
      skipOnboarding,
      needsOnboarding: !preferences.onboardingComplete,
      toggleShuffleQuestions,
      togglePrioritizeUnvisited,
      toggleHideCertifications
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
