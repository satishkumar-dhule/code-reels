/**
 * Credits System
 * - New users get 500 credits
 * - Voice interviews earn credits
 * - Viewing questions costs credits
 * - Coupon codes add credits
 */

const CREDITS_KEY = 'user-credits';
const CREDITS_HISTORY_KEY = 'credits-history';
const SWIPE_COUNT_KEY = 'swipe-count-since-voice';
const LAST_VOICE_PROMPT_KEY = 'last-voice-prompt';

// Credit amounts
export const CREDIT_CONFIG = {
  NEW_USER_BONUS: 500,
  VOICE_ATTEMPT: 10,
  VOICE_SUCCESS_BONUS: 25, // Additional for hire/strong-hire
  QUESTION_VIEW_COST: 2,
  SWIPES_BEFORE_REMINDER: 5,
};

// Valid coupon codes (in production, this would be server-side)
const COUPON_CODES: Record<string, { credits: number; maxUses: number; description: string }> = {
  'WELCOME100': { credits: 100, maxUses: 1, description: 'Welcome bonus' },
  'VOICE50': { credits: 50, maxUses: 3, description: 'Voice practice reward' },
  'INTERVIEW500': { credits: 500, maxUses: 1, description: 'Interview prep pack' },
  'PRACTICE200': { credits: 200, maxUses: 2, description: 'Practice bonus' },
  'LAUNCH1000': { credits: 1000, maxUses: 1, description: 'Launch special' },
};

export interface CreditTransaction {
  id: string;
  type: 'earn' | 'spend' | 'coupon' | 'bonus';
  amount: number;
  description: string;
  timestamp: string;
}

export interface CreditsState {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  usedCoupons: string[];
  initialized: boolean;
}

// Get current credits state
export function getCreditsState(): CreditsState {
  try {
    const stored = localStorage.getItem(CREDITS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load credits:', e);
  }
  
  // Initialize new user
  const initial: CreditsState = {
    balance: CREDIT_CONFIG.NEW_USER_BONUS,
    totalEarned: CREDIT_CONFIG.NEW_USER_BONUS,
    totalSpent: 0,
    usedCoupons: [],
    initialized: true,
  };
  
  saveCreditsState(initial);
  addTransaction({
    type: 'bonus',
    amount: CREDIT_CONFIG.NEW_USER_BONUS,
    description: 'Welcome bonus for new user',
  });
  
  return initial;
}

// Save credits state
function saveCreditsState(state: CreditsState): void {
  localStorage.setItem(CREDITS_KEY, JSON.stringify(state));
}

// Add a transaction to history
function addTransaction(tx: Omit<CreditTransaction, 'id' | 'timestamp'>): void {
  try {
    const history = getTransactionHistory();
    history.unshift({
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 transactions
    localStorage.setItem(CREDITS_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save transaction:', e);
  }
}

// Get transaction history
export function getTransactionHistory(): CreditTransaction[] {
  try {
    const stored = localStorage.getItem(CREDITS_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Earn credits (voice interview, etc.)
export function earnCredits(amount: number, description: string): number {
  const state = getCreditsState();
  state.balance += amount;
  state.totalEarned += amount;
  saveCreditsState(state);
  
  addTransaction({ type: 'earn', amount, description });
  
  return state.balance;
}

// Spend credits (viewing questions)
export function spendCredits(amount: number, description: string): { success: boolean; balance: number } {
  const state = getCreditsState();
  
  if (state.balance < amount) {
    return { success: false, balance: state.balance };
  }
  
  state.balance -= amount;
  state.totalSpent += amount;
  saveCreditsState(state);
  
  addTransaction({ type: 'spend', amount: -amount, description });
  
  return { success: true, balance: state.balance };
}

// Check if user can afford an action
export function canAfford(amount: number): boolean {
  return getCreditsState().balance >= amount;
}

// Get current balance
export function getBalance(): number {
  return getCreditsState().balance;
}

// Redeem coupon code
export function redeemCoupon(code: string): { 
  success: boolean; 
  message: string; 
  credits?: number;
  newBalance?: number;
} {
  const upperCode = code.toUpperCase().trim();
  const coupon = COUPON_CODES[upperCode];
  
  if (!coupon) {
    return { success: false, message: 'Invalid coupon code' };
  }
  
  const state = getCreditsState();
  const useCount = state.usedCoupons.filter(c => c === upperCode).length;
  
  if (useCount >= coupon.maxUses) {
    return { success: false, message: 'Coupon already used maximum times' };
  }
  
  // Apply coupon
  state.balance += coupon.credits;
  state.totalEarned += coupon.credits;
  state.usedCoupons.push(upperCode);
  saveCreditsState(state);
  
  addTransaction({
    type: 'coupon',
    amount: coupon.credits,
    description: `Coupon: ${coupon.description}`,
  });
  
  return {
    success: true,
    message: `+${coupon.credits} credits added!`,
    credits: coupon.credits,
    newBalance: state.balance,
  };
}


// Track swipes for voice interview reminder
export function trackQuestionSwipe(): { shouldRemind: boolean; swipeCount: number } {
  try {
    const count = parseInt(localStorage.getItem(SWIPE_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(SWIPE_COUNT_KEY, String(count));
    
    const shouldRemind = count >= CREDIT_CONFIG.SWIPES_BEFORE_REMINDER && count % CREDIT_CONFIG.SWIPES_BEFORE_REMINDER === 0;
    
    return { shouldRemind, swipeCount: count };
  } catch {
    return { shouldRemind: false, swipeCount: 0 };
  }
}

// Reset swipe count (after voice interview)
export function resetSwipeCount(): void {
  localStorage.setItem(SWIPE_COUNT_KEY, '0');
}

// Check if should show voice reminder
export function shouldShowVoiceReminder(): boolean {
  try {
    const count = parseInt(localStorage.getItem(SWIPE_COUNT_KEY) || '0', 10);
    const lastPrompt = localStorage.getItem(LAST_VOICE_PROMPT_KEY);
    const now = Date.now();
    
    // Don't show if prompted in last 5 minutes
    if (lastPrompt && now - parseInt(lastPrompt, 10) < 5 * 60 * 1000) {
      return false;
    }
    
    return count >= CREDIT_CONFIG.SWIPES_BEFORE_REMINDER;
  } catch {
    return false;
  }
}

// Mark voice reminder as shown
export function markVoiceReminderShown(): void {
  localStorage.setItem(LAST_VOICE_PROMPT_KEY, String(Date.now()));
  localStorage.setItem(SWIPE_COUNT_KEY, '0');
}

// Award credits for voice interview
export function awardVoiceInterviewCredits(verdict: string): { 
  baseCredits: number; 
  bonusCredits: number; 
  totalCredits: number;
  newBalance: number;
} {
  const baseCredits = CREDIT_CONFIG.VOICE_ATTEMPT;
  const isSuccess = verdict === 'strong-hire' || verdict === 'hire';
  const bonusCredits = isSuccess ? CREDIT_CONFIG.VOICE_SUCCESS_BONUS : 0;
  const totalCredits = baseCredits + bonusCredits;
  
  const description = isSuccess 
    ? `Voice interview success (${verdict})`
    : `Voice interview attempt`;
  
  const newBalance = earnCredits(totalCredits, description);
  resetSwipeCount();
  
  return { baseCredits, bonusCredits, totalCredits, newBalance };
}

// Deduct credits for viewing a question
export function deductQuestionViewCredits(): { 
  success: boolean; 
  cost: number; 
  balance: number;
} {
  const cost = CREDIT_CONFIG.QUESTION_VIEW_COST;
  const result = spendCredits(cost, 'Viewed question');
  
  return {
    success: result.success,
    cost,
    balance: result.balance,
  };
}

// Format credits for display - always show full number
export function formatCredits(amount: number): string {
  return String(amount);
}
