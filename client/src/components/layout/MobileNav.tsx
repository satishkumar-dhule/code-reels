/**
 * Mobile-First Bottom Navigation
 * Instagram/TikTok style bottom nav for mobile devices
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Home, Search, Plus, BarChart2, User, Trophy, Target, Sparkles
} from 'lucide-react';

interface MobileNavProps {
  onSearchClick: () => void;
}

export function MobileNav({ onSearchClick }: MobileNavProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'channels', icon: Plus, label: 'Channels', path: '/channels' },
    { id: 'search', icon: Search, label: 'Search', action: onSearchClick },
    { id: 'stats', icon: BarChart2, label: 'Stats', path: '/stats' },
    { id: 'badges', icon: Trophy, label: 'Badges', path: '/badges' },
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Blur background */}
      <div className="absolute inset-0 bg-card/90 backdrop-blur-xl border-t border-border" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around px-2 pb-safe pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => item.path ? setLocation(item.path) : item.action?.()}
              className="flex flex-col items-center justify-center py-2 px-4 min-w-[64px] relative"
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-1 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon 
                className={`w-6 h-6 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`} 
              />
              <span 
                className={`text-[10px] mt-1 font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
