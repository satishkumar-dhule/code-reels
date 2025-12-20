/**
 * LinkedIn-style Mobile Header
 * Profile avatar on left, search bar center, icons on right
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, Theme } from '../../context/ThemeContext';
import {
  ArrowLeft, Search, Bell, MessageSquare, Code, Settings,
  Sun, Moon, Palette, ChevronDown, X
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface LinkedInMobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onSearchClick?: () => void;
  transparent?: boolean;
  showSearch?: boolean;
}

export function LinkedInMobileHeader({ 
  title, 
  showBack, 
  onSearchClick, 
  transparent,
  showSearch = true 
}: LinkedInMobileHeaderProps) {
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  const themeOptions: { id: Theme; name: string; icon: typeof Sun }[] = [
    { id: 'google', name: 'Light', icon: Sun },
    { id: 'google-dark', name: 'Dark', icon: Moon },
    { id: 'duolingo', name: 'Duolingo', icon: Palette },
    { id: 'duolingo-dark', name: 'Duolingo Dark', icon: Palette },
    { id: 'dracula', name: 'Dracula', icon: Palette },
    { id: 'nord', name: 'Nord', icon: Palette },
  ];

  const handleLogoClick = () => {
    setLocation('/');
  };

  // Back button header variant
  if (showBack) {
    return (
      <header className="sticky top-0 z-40 lg:hidden bg-card border-b border-border/50">
        <div className="pt-safe">
          <div className="flex items-center h-14 px-4 gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {title && (
              <h1 className="text-base font-semibold truncate flex-1">
                {title}
              </h1>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header 
      className={`
        sticky top-0 z-40 lg:hidden
        ${transparent 
          ? 'bg-transparent' 
          : 'bg-card border-b border-border/50'
        }
      `}
    >
      {/* Safe area padding for iOS notch */}
      <div className="pt-safe">
        <div className="flex items-center h-14 px-4 gap-3">
          {/* Left - Profile/Logo */}
          <button 
            onClick={handleLogoClick}
            className="flex-shrink-0"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center ring-2 ring-primary/20">
              <Code className="w-5 h-5 text-primary-foreground" />
            </div>
          </button>

          {/* Center - Search Bar (LinkedIn style) */}
          {showSearch && (
            <button
              onClick={onSearchClick}
              className="flex-1 flex items-center gap-2 h-9 px-3 bg-muted/60 hover:bg-muted rounded-lg transition-colors"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Search topics...</span>
            </button>
          )}

          {/* Right - Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {/* Notification dot */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Settings Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-2 hover:bg-muted rounded-full transition-colors">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[200px] bg-card border border-border rounded-xl shadow-xl p-2 z-50"
                  sideOffset={8}
                  align="end"
                >
                  {/* Theme Section */}
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Appearance
                  </div>
                  {themeOptions.map(t => {
                    const Icon = t.icon;
                    return (
                      <DropdownMenu.Item
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none
                          ${theme === t.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{t.name}</span>
                        {theme === t.id && (
                          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </DropdownMenu.Item>
                    );
                  })}
                  
                  <DropdownMenu.Separator className="h-px bg-border my-2" />
                  
                  {/* Links */}
                  <DropdownMenu.Item
                    onClick={() => setLocation('/about')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none hover:bg-muted"
                  >
                    <span className="text-sm">About</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => setLocation('/whats-new')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none hover:bg-muted"
                  >
                    <span className="text-sm">What's New</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="pt-safe">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No new notifications</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Your activity updates will appear here
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
