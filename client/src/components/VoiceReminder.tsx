/**
 * Voice Interview Reminder
 * Shows after every N question swipes to encourage voice practice
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Mic, X, Coins, ArrowRight } from 'lucide-react';
import { useCredits } from '../context/CreditsContext';

export function VoiceReminder() {
  const [, setLocation] = useLocation();
  const { shouldShowVoiceReminder, dismissVoiceReminder, config } = useCredits();

  if (!shouldShowVoiceReminder) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm"
      >
        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-lg border border-emerald-500/30 rounded-xl p-4 shadow-xl">
          <button
            onClick={dismissVoiceReminder}
            className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <Mic className="w-5 h-5 text-emerald-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm mb-1">Practice Out Loud!</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Try answering questions verbally to build interview confidence.
              </p>
              
              <div className="flex items-center gap-2 text-xs text-emerald-400 mb-3">
                <Coins className="w-3.5 h-3.5" />
                <span>Earn +{config.VOICE_ATTEMPT} credits per attempt</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    dismissVoiceReminder();
                    setLocation('/voice-interview');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Try Voice Interview
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={dismissVoiceReminder}
                  className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
