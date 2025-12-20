/**
 * UI Toggle Component
 * Allows users to switch between classic and new UI
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, RefreshCw } from 'lucide-react';

export function UIToggle() {
  const [isNewUI, setIsNewUI] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const newUI = localStorage.getItem('use-new-ui') === 'true';
    setIsNewUI(newUI);
    
    // Show banner if user hasn't seen it yet
    const hasSeenBanner = localStorage.getItem('ui-toggle-banner-seen');
    if (!hasSeenBanner) {
      setShowBanner(true);
    }
  }, []);

  const toggleUI = () => {
    const newValue = !isNewUI;
    localStorage.setItem('use-new-ui', newValue.toString());
    localStorage.setItem('ui-toggle-banner-seen', 'true');
    window.location.reload();
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('ui-toggle-banner-seen', 'true');
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50"
      >
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Try the New UI!</h3>
              <p className="text-xs text-muted-foreground mb-3">
                We've redesigned Code Reels with a cleaner interface. 
                Want to try it?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={toggleUI}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {isNewUI ? 'Switch to Classic' : 'Try New UI'}
                </button>
                <button
                  onClick={dismissBanner}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="p-1 hover:bg-muted rounded transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Settings UI Toggle - For use in settings/about pages
 */
export function UIToggleSwitch() {
  const [isNewUI, setIsNewUI] = useState(false);

  useEffect(() => {
    setIsNewUI(localStorage.getItem('use-new-ui') === 'true');
  }, []);

  const toggleUI = () => {
    const newValue = !isNewUI;
    localStorage.setItem('use-new-ui', newValue.toString());
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
      <div>
        <h3 className="font-medium text-sm">New UI Design</h3>
        <p className="text-xs text-muted-foreground">
          Use the redesigned interface
        </p>
      </div>
      <button
        onClick={toggleUI}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${isNewUI ? 'bg-primary' : 'bg-muted'}
        `}
      >
        <motion.div
          animate={{ x: isNewUI ? 24 : 2 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        />
      </button>
    </div>
  );
}
