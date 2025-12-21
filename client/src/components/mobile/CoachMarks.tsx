/**
 * Coach Marks / Tooltips System
 * Guides new users through key features with spotlight tooltips
 * DISABLED: Causing render loop issues - needs refactoring
 */

import { useCallback } from 'react';

export interface CoachMark {
  id: string;
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface CoachMarksProviderProps {
  children: React.ReactNode;
  marks?: CoachMark[];
  storageKey?: string;
}

// Simplified provider that just renders children - coach marks disabled for now
export function CoachMarksProvider({ children }: CoachMarksProviderProps) {
  return <>{children}</>;
}

// Hook to trigger coach marks manually
export function useCoachMarks(storageKey = 'coach-marks-seen') {
  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey);
    window.location.reload();
  }, [storageKey]);

  const hasSeenTour = localStorage.getItem(storageKey) === 'true';

  return { resetTour, hasSeenTour };
}
