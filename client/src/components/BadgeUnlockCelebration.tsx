/**
 * Badge Unlock Toast Notification
 * Shows a non-blocking toast in the corner when a user unlocks a new badge
 * Auto-hides after 3 seconds
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Trophy, Flame, CheckCircle, Award, Star, Zap, BookOpen, 
  TrendingUp, Compass, Globe, Medal, Sunrise, Moon, Calendar, 
  Rocket, Crown, X
} from 'lucide-react';
import type { Badge } from '../lib/badges';
import { getTierColor } from '../lib/badges';

// Icon mapping
const iconMap: Record<string, React.ComponentType<any>> = {
  'flame': Flame,
  'crown': Crown,
  'check-circle': CheckCircle,
  'award': Award,
  'trophy': Trophy,
  'book-open': BookOpen,
  'trending-up': TrendingUp,
  'zap': Zap,
  'star': Star,
  'compass': Compass,
  'globe': Globe,
  'medal': Medal,
  'sunrise': Sunrise,
  'moon': Moon,
  'calendar': Calendar,
  'rocket': Rocket,
};

interface BadgeUnlockCelebrationProps {
  badge: Badge | null;
  onClose: () => void;
}

export function BadgeUnlockCelebration({ badge, onClose }: BadgeUnlockCelebrationProps) {
  const [, setLocation] = useLocation();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Auto-hide after 3 seconds
  useEffect(() => {
    if (badge) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [badge, onClose]);
  
  if (!badge || !mounted) return null;

  const Icon = iconMap[badge.icon] || Trophy;
  const tierColor = getTierColor(badge.tier);

  const handleClick = () => {
    onClose();
    setLocation('/badges');
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, y: 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-4 right-4 z-[200] max-w-xs cursor-pointer"
        onClick={handleClick}
      >
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {/* Colored top bar */}
          <div 
            className={`h-1 bg-gradient-to-r ${badge.gradient}`}
          />
          
          <div className="p-3 flex items-center gap-3">
            {/* Badge icon */}
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${badge.gradient}`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                🎉 Badge Unlocked!
              </p>
              <p className="font-semibold text-sm truncate">{badge.name}</p>
              <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
            </div>
            
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress bar for auto-hide */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3, ease: 'linear' }}
            className={`h-0.5 bg-gradient-to-r ${badge.gradient} origin-left`}
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
