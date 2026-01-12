/**
 * Mobile-First App Layout
 * Uses unified navigation for consistent experience
 */

import { useState, useEffect } from 'react';
import { DesktopSidebar, MobileBottomNav, UnifiedMobileHeader } from './UnifiedNav';
import { UnifiedSearch } from '../UnifiedSearch';
import { useSidebar } from '../../context/SidebarContext';
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
  const { isCollapsed } = useSidebar();

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
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen min-h-dvh bg-background overflow-x-hidden w-full">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <DesktopSidebar onSearchClick={() => setSearchOpen(true)} />
      </div>

      {/* Mobile Header - visible only on mobile */}
      <UnifiedMobileHeader 
        title={title}
        showBack={showBackOnMobile}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Main content area - adjusts based on sidebar collapsed state */}
      <div className={cn(
        "transition-all duration-200 w-full overflow-x-hidden",
        isCollapsed ? "lg:pl-16" : "lg:pl-64"
      )}>
        {/* Page content with bottom padding for mobile nav */}
        <main className={`
          pb-20 lg:pb-4 w-full overflow-x-hidden
          ${fullWidth ? '' : 'max-w-5xl mx-auto px-3 lg:px-4 py-3 lg:py-4'}
        `}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Search Modal */}
      <UnifiedSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
