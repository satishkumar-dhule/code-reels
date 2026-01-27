/**
 * Theme Toggle Button - Gen Z Edition
 * PROBLEM 6 FIXED: Clearly separated from AI Companion with distinct position and label
 * Supports reduced motion for accessibility
 */

import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { cn } from '../lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const isDark = theme === 'genz-dark';

  return (
    <motion.button
      whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 15 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
      transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
      onClick={toggleTheme}
      className={cn(
        // PROBLEM 6 FIXED: Moved to left side to separate from AI Companion (right side)
        "fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all group",
        isDark
          ? "bg-gradient-to-br from-[#00ff88] to-[#00d4ff] shadow-[#00ff88]/50"
          : "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/50"
      )}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.3 }}
        className="absolute"
      >
        <Moon className="w-6 h-6 text-black" strokeWidth={2.5} />
      </motion.div>
      
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 0 : 1 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.3 }}
        className="absolute"
      >
        <Sun className="w-6 h-6 text-white" strokeWidth={2.5} />
      </motion.div>
      
      {/* PROBLEM 6 FIXED: Add label on hover for clarity */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover border border-border rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {isDark ? "Light Mode" : "Dark Mode"}
      </div>
    </motion.button>
  );
}
