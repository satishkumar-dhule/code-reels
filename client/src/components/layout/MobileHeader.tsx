/**
 * Mobile-First Header
 * Clean, minimal header optimized for mobile
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useTheme, Theme } from '../../context/ThemeContext';
import {
  ArrowLeft, Search, Palette, MoreVertical, Code, Sun, Moon
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onSearchClick?: () => void;
  transparent?: boolean;
}

export function MobileHeader({ title, showBack, onSearchClick, transparent }: MobileHeaderProps) {
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();

  const themeOptions: { id: Theme; name: string; icon: typeof Sun }[] = [
    { id: 'google', name: 'Light', icon: Sun },
    { id: 'google-dark', name: 'Dark', icon: Moon },
    { id: 'duolingo', name: 'Duolingo', icon: Palette },
    { id: 'duolingo-dark', name: 'Duolingo Dark', icon: Palette },
    { id: 'dracula', name: 'Dracula', icon: Palette },
    { id: 'nord', name: 'Nord', icon: Palette },
  ];

  // Navigate to home when logo is clicked
  const handleLogoClick = () => {
    setLocation('/');
  };

  return (
    <header 
      className={`
        sticky top-0 z-40 lg:hidden
        ${transparent 
          ? 'bg-transparent' 
          : 'bg-card/80 backdrop-blur-xl border-b border-border'
        }
      `}
    >
      {/* Safe area padding for iOS notch */}
      <div className="pt-safe">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-[80px]">
            {showBack ? (
              <button
                onClick={() => window.history.back()}
                className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={handleLogoClick}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Code className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Reels</span>
              </button>
            )}
          </div>

          {/* Center - Title */}
          {title && showBack && (
            <h1 className="text-base font-semibold truncate max-w-[200px]">
              {title}
            </h1>
          )}

          {/* Right */}
          <div className="flex items-center gap-1 min-w-[80px] justify-end">
            {onSearchClick && (
              <button
                onClick={onSearchClick}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                data-testid="mobile-search-btn"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-2 hover:bg-muted rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[160px] bg-card border border-border rounded-xl shadow-xl p-1.5 z-50"
                  sideOffset={8}
                  align="end"
                >
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Theme
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
                        <span className="text-sm">{t.name}</span>
                      </DropdownMenu.Item>
                    );
                  })}
                  
                  <DropdownMenu.Separator className="h-px bg-border my-1.5" />
                  
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
    </header>
  );
}
