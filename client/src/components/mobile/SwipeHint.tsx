/**
 * Swipe Hint Component
 * Shows animated hint for swipe navigation on first visit
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { OnboardingStorage } from '../../services/storage.service';

interface SwipeHintProps {
  onDismiss?: () => void;
}

export function SwipeHint({ onDismiss }: SwipeHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the hint
    const hasSeen = OnboardingStorage.hasSeenSwipeHint();
    if (!hasSeen) {
      // Show after a short delay
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    OnboardingStorage.markSwipeHintSeen();
    onDismiss?.();
  };

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(handleDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-full px-5 py-3 shadow-lg flex items-center gap-3">
            {/* Left swipe indicator */}
            <motion.div
              animate={{ x: [-5, 0, -5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-muted-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.div>

            <span className="text-sm font-medium">
              Swipe to navigate
            </span>

            {/* Right swipe indicator */}
            <motion.div
              animate={{ x: [5, 0, 5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-muted-foreground"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="ml-2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact tap hint for revealing answers
export function TapHint() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show after a delay if not dismissed
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  // Auto-hide after showing
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        setDismissed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
            👆 Tap to reveal answer
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
