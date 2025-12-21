/**
 * Storage Service
 * Centralized localStorage management with type safety and error handling
 */

import { STORAGE_KEYS, DEFAULTS } from '../lib/constants';
import type { UserPreferences, Notification, ActivityStat } from '../types';

// ============================================
// GENERIC STORAGE UTILITIES
// ============================================
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${key} to localStorage:`, error);
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error);
  }
}

function getString(key: string, defaultValue: string = ''): string {
  if (typeof window === 'undefined') return defaultValue;
  return localStorage.getItem(key) ?? defaultValue;
}

function setString(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

function getBoolean(key: string, defaultValue: boolean = false): boolean {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === 'true';
}

function setBoolean(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, String(value));
}

function getNumber(key: string, defaultValue: number = 0): number {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function setNumber(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, String(value));
}

// ============================================
// USER PREFERENCES
// ============================================
const defaultPreferences: UserPreferences = {
  role: DEFAULTS.ROLE,
  subscribedChannels: [],
  onboardingComplete: false,
  createdAt: new Date().toISOString(),
};

export const PreferencesStorage = {
  get(): UserPreferences {
    return getItem(STORAGE_KEYS.USER_PREFERENCES, defaultPreferences);
  },

  set(preferences: UserPreferences): void {
    setItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
  },

  update(partial: Partial<UserPreferences>): UserPreferences {
    const current = this.get();
    const updated = { ...current, ...partial };
    this.set(updated);
    return updated;
  },

  reset(): void {
    removeItem(STORAGE_KEYS.USER_PREFERENCES);
  },
};

// ============================================
// THEME STORAGE
// ============================================
export const ThemeStorage = {
  getTheme(): string {
    return getString(STORAGE_KEYS.THEME, DEFAULTS.THEME);
  },

  setTheme(theme: string): void {
    setString(STORAGE_KEYS.THEME, theme);
  },

  getAutoRotate(): boolean {
    return getBoolean(STORAGE_KEYS.THEME_AUTO_ROTATE, DEFAULTS.AUTO_ROTATE_ENABLED);
  },

  setAutoRotate(enabled: boolean): void {
    setBoolean(STORAGE_KEYS.THEME_AUTO_ROTATE, enabled);
  },

  getUserChanged(): boolean {
    return getBoolean(STORAGE_KEYS.THEME_USER_CHANGED, false);
  },

  setUserChanged(changed: boolean): void {
    if (changed) {
      setBoolean(STORAGE_KEYS.THEME_USER_CHANGED, true);
    } else {
      removeItem(STORAGE_KEYS.THEME_USER_CHANGED);
    }
  },
};

// ============================================
// NOTIFICATIONS STORAGE
// ============================================
export const NotificationsStorage = {
  get(): Notification[] {
    return getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  },

  set(notifications: Notification[]): void {
    setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },

  add(notification: Notification): Notification[] {
    const current = this.get();
    const updated = [notification, ...current].slice(0, 50); // Max 50
    this.set(updated);
    return updated;
  },

  markAsRead(id: string): void {
    const current = this.get();
    const updated = current.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    this.set(updated);
  },

  markAllAsRead(): void {
    const current = this.get();
    const updated = current.map(n => ({ ...n, read: true }));
    this.set(updated);
  },

  remove(id: string): void {
    const current = this.get();
    const updated = current.filter(n => n.id !== id);
    this.set(updated);
  },

  clear(): void {
    this.set([]);
  },
};

// ============================================
// PROGRESS STORAGE
// ============================================
export const ProgressStorage = {
  getCompleted(channelId: string): string[] {
    return getItem<string[]>(`${STORAGE_KEYS.PROGRESS_PREFIX}${channelId}`, []);
  },

  setCompleted(channelId: string, questionIds: string[]): void {
    setItem(`${STORAGE_KEYS.PROGRESS_PREFIX}${channelId}`, questionIds);
  },

  addCompleted(channelId: string, questionId: string): string[] {
    const current = this.getCompleted(channelId);
    if (current.includes(questionId)) return current;
    const updated = [...current, questionId];
    this.setCompleted(channelId, updated);
    return updated;
  },

  getMarked(channelId: string): string[] {
    return getItem<string[]>(`${STORAGE_KEYS.MARKED_PREFIX}${channelId}`, []);
  },

  setMarked(channelId: string, questionIds: string[]): void {
    setItem(`${STORAGE_KEYS.MARKED_PREFIX}${channelId}`, questionIds);
  },

  toggleMarked(channelId: string, questionId: string): string[] {
    const current = this.getMarked(channelId);
    const updated = current.includes(questionId)
      ? current.filter(id => id !== questionId)
      : [...current, questionId];
    this.setMarked(channelId, updated);
    return updated;
  },

  getLastVisitedIndex(channelId: string): number {
    return getNumber(`${STORAGE_KEYS.LAST_VISITED_PREFIX}${channelId}`, 0);
  },

  setLastVisitedIndex(channelId: string, index: number): void {
    setNumber(`${STORAGE_KEYS.LAST_VISITED_PREFIX}${channelId}`, index);
  },

  getAllCompletedIds(): Set<string> {
    const allIds = new Set<string>();
    if (typeof window === 'undefined') return allIds;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEYS.PROGRESS_PREFIX)) {
        const ids = getItem<string[]>(key, []);
        ids.forEach(id => allIds.add(id));
      }
    }
    return allIds;
  },
};

// ============================================
// TIMER STORAGE
// ============================================
export const TimerStorage = {
  getEnabled(): boolean {
    return getBoolean(STORAGE_KEYS.TIMER_ENABLED, true);
  },

  setEnabled(enabled: boolean): void {
    setBoolean(STORAGE_KEYS.TIMER_ENABLED, enabled);
  },

  getDuration(): number {
    return getNumber(STORAGE_KEYS.TIMER_DURATION, DEFAULTS.TIMER_DURATION);
  },

  setDuration(duration: number): void {
    setNumber(STORAGE_KEYS.TIMER_DURATION, duration);
  },
};

// ============================================
// ACTIVITY STORAGE
// ============================================
export const ActivityStorage = {
  getStats(): ActivityStat[] {
    return getItem<ActivityStat[]>(STORAGE_KEYS.ACTIVITY_STATS, []);
  },

  setStats(stats: ActivityStat[]): void {
    setItem(STORAGE_KEYS.ACTIVITY_STATS, stats);
  },

  trackActivity(): void {
    const today = new Date().toISOString().split('T')[0];
    const stats = this.getStats();
    const todayIndex = stats.findIndex(s => s.date === today);
    
    if (todayIndex >= 0) {
      stats[todayIndex].count++;
    } else {
      stats.push({ date: today, count: 1 });
    }
    
    // Keep only last 365 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = stats.filter(s => s.date >= cutoffStr);
    
    this.setStats(filtered);
  },

  getStreak(): number {
    const stats = this.getStats();
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (stats.find(s => s.date === dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  },
};

// ============================================
// ONBOARDING STORAGE
// ============================================
export const OnboardingStorage = {
  hasSeenIntro(): boolean {
    return getBoolean(STORAGE_KEYS.MARVEL_INTRO_SEEN, false);
  },

  markIntroSeen(): void {
    setBoolean(STORAGE_KEYS.MARVEL_INTRO_SEEN, true);
  },

  hasSeenSwipeHint(): boolean {
    return getBoolean(STORAGE_KEYS.SWIPE_HINT_SEEN, false);
  },

  markSwipeHintSeen(): void {
    setBoolean(STORAGE_KEYS.SWIPE_HINT_SEEN, true);
  },

  hasSeenGettingStarted(): boolean {
    return getBoolean(STORAGE_KEYS.GETTING_STARTED_SEEN, false);
  },

  markGettingStartedSeen(): void {
    setBoolean(STORAGE_KEYS.GETTING_STARTED_SEEN, true);
  },

  hasSeenCoachMarks(): boolean {
    return getBoolean(STORAGE_KEYS.COACH_MARKS_SEEN, false);
  },

  markCoachMarksSeen(): void {
    setBoolean(STORAGE_KEYS.COACH_MARKS_SEEN, true);
  },
};

// ============================================
// EXPORT DEFAULT STORAGE OBJECT
// ============================================
export const storage = {
  preferences: PreferencesStorage,
  theme: ThemeStorage,
  notifications: NotificationsStorage,
  progress: ProgressStorage,
  timer: TimerStorage,
  activity: ActivityStorage,
  onboarding: OnboardingStorage,
  
  // Generic utilities
  get: getItem,
  set: setItem,
  remove: removeItem,
  getString,
  setString,
  getBoolean,
  setBoolean,
  getNumber,
  setNumber,
};

export default storage;
