/**
 * Top Navigation Bar
 * Clean, minimal design with search and user actions
 */

import { useLocation } from 'wouter';
import { Search, Menu, Star } from 'lucide-react';
import { VisitCounter } from '../VisitCounter';

interface TopBarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  title?: string;
  showBackButton?: boolean;
}

export function TopBar({ onMenuClick, onSearchClick, title, showBackButton }: TopBarProps) {
  const [, setLocation] = useLocation();

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
          {/* Visit Counter */}
          <div className="hidden sm:flex items-center px-3 py-1.5 bg-muted/50 rounded-full">
            <VisitCounter showLabel={true} />
          </div>

          {/* GitHub */}
          <a
            href="https://github.com/open-interview/open-interview"
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
