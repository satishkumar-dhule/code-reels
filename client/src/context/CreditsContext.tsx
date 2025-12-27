/**
 * Credits Context
 * Provides global access to credits state and actions
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getCreditsState,
  getBalance,
  earnCredits,
  spendCredits,
  redeemCoupon,
  trackQuestionSwipe,
  shouldShowVoiceReminder,
  markVoiceReminderShown,
  awardVoiceInterviewCredits,
  deductQuestionViewCredits,
  processQuizAnswer,
  processSRSReview,
  formatCredits,
  CREDIT_CONFIG,
  type CreditsState,
  type CreditTransaction,
  getTransactionHistory,
} from '../lib/credits';

interface CreditsContextType {
  balance: number;
  state: CreditsState;
  history: CreditTransaction[];
  // Credit change splash
  creditChange: { amount: number; show: boolean };
  clearCreditChange: () => void;
  // Actions
  refreshBalance: () => void;
  onQuestionView: () => { success: boolean; cost: number };
  onVoiceInterview: (verdict: string) => { totalCredits: number; bonusCredits: number };
  onRedeemCoupon: (code: string) => { success: boolean; message: string; credits?: number };
  onQuestionSwipe: () => { shouldRemind: boolean };
  dismissVoiceReminder: () => void;
  shouldShowVoiceReminder: boolean;
  // Quiz & SRS actions
  onQuizAnswer: (isCorrect: boolean) => { amount: number };
  onSRSReview: (rating: 'again' | 'hard' | 'good' | 'easy') => { amount: number };
  // Helpers
  formatCredits: (amount: number) => string;
  canAfford: (amount: number) => boolean;
  config: typeof CREDIT_CONFIG;
}

const CreditsContext = createContext<CreditsContextType | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [state, setState] = useState<CreditsState>({
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    usedCoupons: [],
    initialized: false,
  });
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [showVoiceReminder, setShowVoiceReminder] = useState(false);
  const [creditChange, setCreditChange] = useState<{ amount: number; show: boolean }>({ amount: 0, show: false });

  // Show credit splash animation
  const showCreditSplash = useCallback((amount: number) => {
    setCreditChange({ amount, show: true });
    // Auto-hide after 2 seconds
    setTimeout(() => {
      setCreditChange(prev => ({ ...prev, show: false }));
    }, 2000);
  }, []);

  const clearCreditChange = useCallback(() => {
    setCreditChange({ amount: 0, show: false });
  }, []);

  // Initialize on mount
  useEffect(() => {
    refreshBalance();
  }, []);

  const refreshBalance = useCallback(() => {
    const newState = getCreditsState();
    setState(newState);
    setBalance(newState.balance);
    setHistory(getTransactionHistory());
    setShowVoiceReminder(shouldShowVoiceReminder());
  }, []);

  const onQuestionView = useCallback(() => {
    const result = deductQuestionViewCredits();
    if (result.success) {
      setBalance(result.balance);
      showCreditSplash(-result.cost);
      refreshBalance();
    }
    return { success: result.success, cost: result.cost };
  }, [refreshBalance, showCreditSplash]);

  const onVoiceInterview = useCallback((verdict: string) => {
    const result = awardVoiceInterviewCredits(verdict);
    setBalance(result.newBalance);
    setShowVoiceReminder(false);
    showCreditSplash(result.totalCredits);
    refreshBalance();
    return { totalCredits: result.totalCredits, bonusCredits: result.bonusCredits };
  }, [refreshBalance, showCreditSplash]);

  const onRedeemCoupon = useCallback((code: string) => {
    const result = redeemCoupon(code);
    if (result.success && result.newBalance !== undefined) {
      setBalance(result.newBalance);
      if (result.credits) {
        showCreditSplash(result.credits);
      }
      refreshBalance();
    }
    return { success: result.success, message: result.message, credits: result.credits };
  }, [refreshBalance, showCreditSplash]);

  const onQuestionSwipe = useCallback(() => {
    const result = trackQuestionSwipe();
    if (result.shouldRemind) {
      setShowVoiceReminder(true);
    }
    return { shouldRemind: result.shouldRemind };
  }, []);

  const dismissVoiceReminder = useCallback(() => {
    markVoiceReminderShown();
    setShowVoiceReminder(false);
  }, []);

  const onQuizAnswer = useCallback((isCorrect: boolean) => {
    const result = processQuizAnswer(isCorrect);
    if (result.amount !== 0) {
      setBalance(result.newBalance);
      showCreditSplash(result.amount);
      refreshBalance();
    }
    return { amount: result.amount };
  }, [refreshBalance, showCreditSplash]);

  const onSRSReview = useCallback((rating: 'again' | 'hard' | 'good' | 'easy') => {
    const result = processSRSReview(rating);
    if (result.amount !== 0) {
      setBalance(result.newBalance);
      showCreditSplash(result.amount);
      refreshBalance();
    }
    return { amount: result.amount };
  }, [refreshBalance, showCreditSplash]);

  const canAffordCheck = useCallback((amount: number) => {
    return balance >= amount;
  }, [balance]);

  return (
    <CreditsContext.Provider
      value={{
        balance,
        state,
        history,
        creditChange,
        clearCreditChange,
        refreshBalance,
        onQuestionView,
        onVoiceInterview,
        onRedeemCoupon,
        onQuestionSwipe,
        dismissVoiceReminder,
        shouldShowVoiceReminder: showVoiceReminder,
        onQuizAnswer,
        onSRSReview,
        formatCredits,
        canAfford: canAffordCheck,
        config: CREDIT_CONFIG,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
}
