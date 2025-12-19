/**
 * Google-style Top Navigation Bar
 * Clean, minimal design with search and user actions
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useTheme, Theme } from '../../context/ThemeContext';
import {
  Search, Menu, Sun, Moon, Palette, Github, Star, Bell,
  ChevronDown, User, Settings, LogOut
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface TopBarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  title?: string;
  showBackButton?: boolean;
}

export function TopBar({ onMenuClick, onSearchClick, title, showBackButton }: TopBarProps) {
  const [, setLocation] = useLocation();
  const { theme, cycleTheme, setTheme } = useTheme();

  const themeOptions: { id: Theme; name: string; color: string }[] = [
    { id: 'google', name: 'Google Light', color: '#4285f4' },
    { id: 'google-dark', name: 'Google Dark', color: '#8ab4f8' },
    { id: 'light', name: 'Light', color: '#000000' },
    { id: 'unix', name: 'Unix', color: '#22c55e' },
    { id: 'dracula', name: 'Dracula', color: '#bd93f9' },
    { id: 'nord', name: 'Nord', color: '#88c0d0' },
    { id: 'minimal', name: 'Minimal', color: '#666666' },
  ];

  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {title && (
            <h1 className="text-lg font-semibold hidden sm:block">{title}</h1>
          )}
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-xl mx-4">
          <button
            onClick={onSearchClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-full transition-colors group"
          >
            <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors hidden sm:block">
              Search questions...
            </span>
            <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground bg-background rounded border border-border ml-auto">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <Palette className="w-5 h-5" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[180px] bg-card border border-border rounded-lg shadow-lg p-2 z-50"
                sideOffset={8}
                align="end"
              >
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Theme
                </div>
                {themeOptions.map(t => (
                  <DropdownMenu.Item
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`
                      flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer outline-none
                      ${theme === t.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}
                    `}
                  >
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-current"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-sm">{t.name}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* GitHub */}
          <a
            href="https://github.com/satishkumar-dhule/code-reels"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-muted rounded-lg transition-colors hidden sm:flex items-center gap-2"
          >
            <Star className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
