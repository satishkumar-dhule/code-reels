/**
 * Mobile Bottom Navigation
 * Professional, clean design with 5 main tabs
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Home, Compass, PlusSquare, Trophy, User
} from 'lucide-react';

interface MobileNavProps {
  onCreateClick?: () => void;
}

export function MobileNav({ onCreateClick }: MobileNavProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'explore', icon: Compass, label: 'Explore', path: '/channels' },
    { id: 'create', icon: PlusSquare, label: 'Practice', action: onCreateClick, isCenter: true },
    { id: 'achievements', icon: Trophy, label: 'Progress', path: '/stats' },
    { id: 'profile', icon: User, label: 'Me', path: '/profile' },
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Clean white background with subtle shadow */}
      <div className="absolute inset-0 bg-card border-t border-border/50 shadow-[0_-1px_3px_rgba(0,0,0,0.08)]" />
      
      {/* Safe area padding for iOS */}
      <div 
        className="relative flex items-stretch justify-around"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          if (item.isCenter) {
            // Center action button
            return (
              <button
                key={item.id}
                onClick={() => item.action?.() || setLocation('/coding')}
                className="flex flex-col items-center justify-center py-2 px-3 relative"
              >
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-[10px] mt-1 font-medium text-primary">
                  {item.label}
                </span>
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => item.path ? setLocation(item.path) : item.action?.()}
              className="flex flex-col items-center justify-center py-2 px-3 min-w-[60px] relative"
            >
              {/* Active indicator - top line */}
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[2px] bg-foreground rounded-b-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon 
                className={`w-6 h-6 transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span 
                className={`text-[10px] mt-0.5 transition-colors ${
                  active ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium'
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
