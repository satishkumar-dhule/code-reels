/**
 * Unified Navigation Component
 * Identical logical structure for mobile and desktop
 * 
 * Navigation Structure:
 * - Home (feed, quick quiz)
 * - Learn (channels, questions, review)
 * - Practice (voice interview, tests, coding)
 * - Progress (stats, badges, profile)
 * 
 * Voice Interview is prominently featured in Practice
 * since it's the main way to earn credits
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Home,
  BookOpen,
  Mic,
  TrendingUp,
  User,
  Search,
  Bell,
  Settings,
  Code,
  Coins,
  Dumbbell,
  Bot,
  X,
  ChevronRight,
  Zap,
  Target,
  Flame
} from 'lucide-react';
import { useCredits } from '../../context/CreditsContext';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  highlight?: boolean;
  badge?: string;
}

// Main navigation items - same for mobile and desktop
const mainNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'learn', label: 'Learn', icon: BookOpen, path: '/channels' },
  { id: 'practice', label: 'Practice', icon: Mic, path: '/voice-interview', highlight: true },
  { id: 'progress', label: 'Progress', icon: TrendingUp, path: '/stats' },
];

// Sub-navigation for Practice section
const practiceSubNav: NavItem[] = [
  { id: 'voice', label: 'Voice Interview', icon: Mic, path: '/voice-interview', badge: '+5 credits' },
  { id: 'tests', label: 'Quick Tests', icon: Target, path: '/tests' },
  { id: 'coding', label: 'Coding', icon: Code, path: '/coding' },
];

// Sub-navigation for Learn section
const learnSubNav: NavItem[] = [
  { id: 'channels', label: 'All Channels', icon: BookOpen, path: '/channels' },
  { id: 'review', label: 'Daily Review', icon: Flame, path: '/review' },
  { id: 'bookmarks', label: 'Bookmarks', icon: BookOpen, path: '/bookmarks' },
];

// Sub-navigation for Progress section
const progressSubNav: NavItem[] = [
  { id: 'stats', label: 'Statistics', icon: TrendingUp, path: '/stats' },
  { id: 'badges', label: 'Badges', icon: Zap, path: '/badges' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

function getActiveSection(location: string): string {
  if (location === '/') return 'home';
  if (location.startsWith('/channel') || location === '/channels' || location === '/review' || location === '/bookmarks') return 'learn';
  if (location.startsWith('/voice') || location.startsWith('/test') || location.startsWith('/coding')) return 'practice';
  if (location === '/stats' || location === '/badges' || location === '/profile') return 'progress';
  if (location === '/bot-activity') return 'bots';
  return 'home';
}


// ============================================
// MOBILE BOTTOM NAVIGATION
// ============================================

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);

  const activeSection = getActiveSection(location);

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'practice') {
      // Show practice submenu or go directly to voice
      setShowPracticeMenu(!showPracticeMenu);
    } else {
      setShowPracticeMenu(false);
      setLocation(item.path);
    }
  };

  return (
    <>
      {/* Practice Submenu Overlay */}
      {showPracticeMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setShowPracticeMenu(false)}
        />
      )}

      {/* Practice Submenu */}
      {showPracticeMenu && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-2 shadow-2xl lg:hidden"
        >
          <div className="text-xs text-muted-foreground px-3 py-2 font-semibold uppercase tracking-wide">
            Practice Mode
          </div>
          {practiceSubNav.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setLocation(item.path);
                  setShowPracticeMenu(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  item.id === 'voice' ? "bg-gradient-to-br from-primary to-primary/70" : "bg-muted"
                )}>
                  <Icon className={cn("w-5 h-5", item.id === 'voice' && "text-white")} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  {item.badge && (
                    <div className="text-xs text-amber-500">{item.badge}</div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="pb-safe bg-card/95 backdrop-blur-xl border-t border-border">
          <div className="flex items-center justify-around h-16 px-2">
            {mainNavItems.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all",
                    isActive ? "text-primary" : "text-muted-foreground",
                    item.highlight && !isActive && "text-primary/70"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  
                  {/* Special styling for Practice (Voice) */}
                  {item.highlight ? (
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center -mt-4 shadow-lg",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-gradient-to-br from-primary to-primary/70 text-white"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                  ) : (
                    <Icon className={cn("w-5 h-5 relative z-10", isActive && "text-primary")} />
                  )}
                  
                  <span className={cn(
                    "text-[10px] font-medium relative z-10",
                    item.highlight && "-mt-1"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
            
            {/* Credits indicator */}
            <button
              onClick={() => setLocation('/profile')}
              className="flex flex-col items-center justify-center w-16 h-14"
            >
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-500">{formatCredits(balance)}</span>
              </div>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}


// ============================================
// DESKTOP SIDEBAR NAVIGATION
// ============================================

export function DesktopSidebar({ onSearchClick }: { onSearchClick?: () => void }) {
  const [location, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const activeSection = getActiveSection(location);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const getSubNav = (sectionId: string) => {
    switch (sectionId) {
      case 'learn': return learnSubNav;
      case 'practice': return practiceSubNav;
      case 'progress': return progressSubNav;
      default: return [];
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-card border-r border-border fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <button onClick={() => setLocation('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Code className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold">Code Reels</span>
            <div className="text-[10px] text-muted-foreground">Interview Prep</div>
          </div>
        </button>
      </div>

      {/* Search Button */}
      {onSearchClick && (
        <div className="px-3 py-3">
          <button
            onClick={onSearchClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-muted/50 hover:bg-muted rounded-xl transition-colors group"
          >
            <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground">Search...</span>
            <kbd className="ml-auto text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          const subNav = getSubNav(item.id);
          const hasSubNav = subNav.length > 0;
          const isExpanded = expandedSection === item.id || isActive;

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasSubNav) {
                    toggleSection(item.id);
                  } else {
                    setLocation(item.path);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  item.highlight && !isActive && "text-primary/80"
                )}
              >
                {item.highlight ? (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="font-medium flex-1">{item.label}</span>
                {item.highlight && (
                  <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">+5</span>
                )}
                {hasSubNav && (
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                )}
              </button>

              {/* Sub Navigation */}
              {hasSubNav && isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-4 mt-1 space-y-1 border-l border-border pl-3"
                >
                  {subNav.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = location === subItem.path;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => setLocation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                          isSubActive 
                            ? "bg-primary/10 text-primary" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <SubIcon className="w-4 h-4" />
                        <span>{subItem.label}</span>
                        {subItem.badge && (
                          <span className="ml-auto text-[10px] text-amber-500">{subItem.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </div>
          );
        })}

        {/* Bot Monitor - separate section */}
        <div className="pt-4 mt-4 border-t border-border">
          <button
            onClick={() => setLocation('/bot-activity')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
              location === '/bot-activity'
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Bot className="w-5 h-5" />
            <span className="font-medium">Bot Monitor</span>
          </button>
        </div>
      </nav>

      {/* Credits Card */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setLocation('/profile')}
          className="w-full p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Credits</span>
            </div>
            <span className="text-lg font-bold text-amber-500">{formatCredits(balance)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground text-left">
            <span className="text-green-400">+5</span> per voice practice
          </div>
        </button>
      </div>

      {/* Settings */}
      <div className="p-3 border-t border-border flex gap-2">
        <button
          onClick={() => setLocation('/notifications')}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={() => setLocation('/about')}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}


// ============================================
// MOBILE HEADER
// ============================================

export function UnifiedMobileHeader({ 
  title, 
  showBack,
  onSearchClick 
}: { 
  title?: string;
  showBack?: boolean;
  onSearchClick?: () => void;
}) {
  const [location, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();

  // Back button header variant
  if (showBack) {
    return (
      <header className="sticky top-0 z-40 lg:hidden">
        <div className="pt-safe">
          <div className="m-3">
            <div className="flex items-center h-12 px-3 gap-3 bg-card/90 backdrop-blur-xl border border-border rounded-2xl">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-muted rounded-xl transition-colors -ml-1"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              {title && (
                <h1 className="text-sm font-semibold truncate flex-1">
                  {title}
                </h1>
              )}
              <button
                onClick={() => setLocation('/profile')}
                className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg"
              >
                <Coins className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-bold text-amber-500">{formatCredits(balance)}</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 lg:hidden">
      <div className="pt-safe">
        <div className="m-3">
          <div className="flex items-center h-12 px-3 gap-2 bg-card/90 backdrop-blur-xl border border-border rounded-2xl">
            {/* Logo */}
            <button 
              onClick={() => setLocation('/')}
              className="flex-shrink-0"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Code className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* Search Bar */}
            {onSearchClick && (
              <button
                onClick={onSearchClick}
                className="flex-1 flex items-center gap-2 h-8 px-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Search...</span>
              </button>
            )}

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
              onClick={() => setLocation('/notifications')}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================
// UNIFIED APP LAYOUT
// ============================================

interface UnifiedLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackOnMobile?: boolean;
  hideNav?: boolean;
  fullWidth?: boolean;
}

export function UnifiedLayout({ 
  children, 
  title,
  showBackOnMobile = false,
  hideNav = false,
  fullWidth = false
}: UnifiedLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen min-h-dvh bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar onSearchClick={() => setSearchOpen(true)} />

      {/* Mobile Header */}
      <UnifiedMobileHeader 
        title={title}
        showBack={showBackOnMobile}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Main Content */}
      <div className="lg:pl-64 transition-all duration-300">
        <main className={cn(
          "pb-24 lg:pb-6",
          !fullWidth && "max-w-5xl mx-auto px-4 lg:px-6 py-4 lg:py-6"
        )}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Search Modal - import from existing */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="flex items-start justify-center pt-20 px-4" onClick={e => e.stopPropagation()}>
            <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search questions, channels..."
                  className="flex-1 bg-transparent outline-none text-lg"
                  autoFocus
                />
                <button onClick={() => setSearchOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground text-center py-8">
                Start typing to search...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default { MobileBottomNav, DesktopSidebar, UnifiedMobileHeader, UnifiedLayout };
