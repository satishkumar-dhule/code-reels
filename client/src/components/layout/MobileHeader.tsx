/**
 * Mobile Header Component
 * Modern glass-morphism floating design
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Bell, Code, Settings, X, Coins
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCredits } from '../../context/CreditsContext';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onSearchClick?: () => void;
  transparent?: boolean;
  showSearch?: boolean;
}

export function MobileHeader({ 
  title, 
  showBack, 
  onSearchClick, 
  transparent,
  showSearch = true 
}: MobileHeaderProps) {
  const [location, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const { balance, formatCredits } = useCredits();

  const handleLogoClick = () => {
    setLocation('/');
  };

  // Back button header variant
  if (showBack) {
    return (
      <header className="sticky top-0 z-40 lg:hidden">
        <div className="pt-safe">
          <div className="m-3">
            <div className="flex items-center h-12 px-2 gap-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/80" />
              </button>
              {title && (
                <h1 className="text-sm font-semibold text-white truncate flex-1">
                  {title}
                </h1>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 lg:hidden">
      {/* Safe area padding for iOS notch */}
      <div className="pt-safe">
        <div className="m-3">
          <div className="flex items-center h-12 px-2 gap-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl">
            {/* Left - Profile/Logo */}
            <button 
              onClick={handleLogoClick}
              className="flex-shrink-0 p-1"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Code className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* Center - Search Bar */}
            {showSearch && (
              <button
                onClick={onSearchClick}
                className="flex-1 flex items-center gap-2 h-8 px-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-white/50" />
                <span className="text-xs text-white/50">Search...</span>
              </button>
            )}

            {/* Right - Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Credits */}
              <button
                onClick={() => setLocation('/profile')}
                className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <Coins className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-bold text-amber-500">{formatCredits(balance)}</span>
              </button>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Bell className="w-4 h-4 text-white/70" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
              </button>

              {/* Settings Menu */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <Settings className="w-4 h-4 text-white/70" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[180px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 z-50"
                    sideOffset={8}
                    align="end"
                  >
                    <DropdownMenu.Item
                      onClick={() => setLocation('/about')}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer outline-none hover:bg-white/10 text-white/80 text-sm"
                    >
                      About
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onClick={() => setLocation('/whats-new')}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer outline-none hover:bg-white/10 text-white/80 text-sm"
                    >
                      What's New
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <NotificationsPanel onClose={() => setShowNotifications(false)} />
        )}
      </AnimatePresence>
    </header>
  );
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
    >
      <div className="pt-safe">
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">No new notifications</p>
            <p className="text-sm text-white/40 mt-1">
              Your activity updates will appear here
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
