/**
 * Credits Display Component
 * Shows current credit balance in header/nav
 */

import { Coins } from 'lucide-react';
import { useCredits } from '../context/CreditsContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CreditsDisplayProps {
  compact?: boolean;
  onClick?: () => void;
}

export function CreditsDisplay({ compact = false, onClick }: CreditsDisplayProps) {
  const { balance, formatCredits } = useCredits();

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full hover:bg-amber-500/20 transition-colors"
      >
        <Coins className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-bold text-amber-500">{formatCredits(balance)}</span>
      </button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg hover:from-amber-500/20 hover:to-yellow-500/20 transition-colors"
    >
      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Coins className="w-3.5 h-3.5 text-amber-500" />
      </div>
      <div className="text-left">
        <div className="text-xs text-muted-foreground">Credits</div>
        <div className="text-sm font-bold text-amber-500">{formatCredits(balance)}</div>
      </div>
    </motion.button>
  );
}

// Animated credit change splash/bubble
export function CreditSplash({ amount, show, onComplete }: { amount: number; show: boolean; onComplete?: () => void }) {
  const isPositive = amount > 0;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -30 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 15
          }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 0.4, times: [0, 0.5, 1] }}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl shadow-2xl ${
              isPositive 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
            }`}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Coins className="w-6 h-6" />
            </motion.div>
            <span className="text-xl font-bold">
              {isPositive ? '+' : ''}{amount}
            </span>
          </motion.div>
          
          {/* Particle effects for positive credits */}
          {isPositive && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 0, 
                    scale: 1,
                    x: Math.cos(i * Math.PI / 4) * 60,
                    y: Math.sin(i * Math.PI / 4) * 60 - 20
                  }}
                  transition={{ duration: 0.7, delay: i * 0.03 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-yellow-300"
                />
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
