/**
 * Mobile-First App Layout
 * Uses unified navigation for consistent experience
 */

import { useState, useEffect } from 'react';
import { GenZSidebar } from './GenZSidebar';
import { MobileBottomNav, UnifiedMobileHeader } from './UnifiedNav';
import { UnifiedSearch } from '../UnifiedSearch';
import { ThemeToggle } from '../ThemeToggle';
import { cn } from '../../lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
  hideNav?: boolean;
  showBackOnMobile?: boolean;
}

export function AppLayout({ 
  children, 
  title, 
  fullWidth = false, 
  hideNav = false,
  showBackOnMobile = false 
}: AppLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (hideNav) {
    return (
      <>
        {children}
        {/* Theme Toggle - Always visible */}
        <ThemeToggle />
      </>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh bg-background overflow-x-hidden w-full">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <GenZSidebar />
      </div>

      {/* Mobile Header - visible only on mobile */}
      <UnifiedMobileHeader 
        title={title}
        showBack={showBackOnMobile}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Main content area - fixed padding for Gen Z sidebar */}
      <div className="lg:pl-64 w-full overflow-x-hidden">
        {/* Page content with bottom padding for mobile nav */}
        <main className={`
          pb-20 lg:pb-4 w-full overflow-x-hidden
          ${fullWidth ? '' : 'max-w-7xl mx-auto px-3 lg:px-6 py-3 lg:py-6'}
        `}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Footer - Hidden but provides landmark for accessibility */}
      <footer className="sr-only" role="contentinfo">
        Code Reels - Technical Interview Preparation Platform
      </footer>

      {/* Theme Toggle - Floating button */}
      <ThemeToggle />

      {/* Search Modal */}
      <UnifiedSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
