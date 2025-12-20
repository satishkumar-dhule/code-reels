/**
 * Mobile-First App Layout
 * Bottom nav on mobile, sidebar on desktop
 */

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { MobileHeader } from './MobileHeader';
import { UnifiedSearch } from '../UnifiedSearch';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [title]);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen min-h-dvh bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSearch={() => setSearchOpen(true)}
        />
      </div>

      {/* Mobile Header - visible only on mobile */}
      <MobileHeader 
        title={title}
        showBack={showBackOnMobile}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Desktop Top bar - hidden on mobile */}
      <div className="hidden lg:block lg:pl-[72px]">
        <TopBar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onSearchClick={() => setSearchOpen(true)}
          title={title}
        />
      </div>

      {/* Main content area */}
      <div className="lg:pl-[72px] transition-all duration-300">
        {/* Page content with bottom padding for mobile nav */}
        <main className={`
          pb-24 lg:pb-6
          ${fullWidth ? '' : 'max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6'}
        `}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav onCreateClick={() => setSearchOpen(true)} />

      {/* Search Modal */}
      <UnifiedSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
