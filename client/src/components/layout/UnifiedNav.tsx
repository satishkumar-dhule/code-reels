/**
 * Unified Navigation Component
 * 
 * Navigation Structure:
 * - Home: Dashboard with quick quiz, activity feed
 * - Learn: Browse content (Channels, Certifications)
 * - Practice: Active learning (Voice, Tests, Coding, Review)
 * - Progress: Track achievements (Stats, Badges, Bookmarks, Profile)
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Home,
  GraduationCap,
  Mic,
  BarChart3,
  Code,
  Coins,
  ChevronRight,
  ChevronLeft,
  Target,
  Flame,
  Award,
  BookOpen,
  Bookmark,
  Trophy,
  Search,
  User
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
  description?: string;
}

// Main navigation - 4 core sections
const mainNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'learn', label: 'Learn', icon: GraduationCap, path: '/channels' },
  { id: 'practice', label: 'Practice', icon: Mic, path: '/voice-interview', highlight: true },
  { id: 'progress', label: 'Progress', icon: BarChart3, path: '/stats' },
];

// Learn section - Browse learning content
const learnSubNav: NavItem[] = [
  { id: 'channels', label: 'Channels', icon: BookOpen, path: '/channels', description: 'Browse by topic' },
  { id: 'certifications', label: 'Certifications', icon: Award, path: '/certifications', description: 'Exam prep tracks' },
];

// Practice section - Active learning modes
const practiceSubNav: NavItem[] = [
  { id: 'voice', label: 'Voice Interview', icon: Mic, path: '/voice-interview', badge: '+10 credits', description: 'Practice speaking' },
  { id: 'tests', label: 'Quick Tests', icon: Target, path: '/tests', description: 'Test your knowledge' },
  { id: 'coding', label: 'Coding Challenges', icon: Code, path: '/coding', description: 'Solve problems' },
  { id: 'review', label: 'Daily Review', icon: Flame, path: '/review', description: 'Spaced repetition' },
];

// Progress section - Track achievements
const progressSubNav: NavItem[] = [
  { id: 'stats', label: 'Statistics', icon: BarChart3, path: '/stats', description: 'Your progress' },
  { id: 'badges', label: 'Badges', icon: Trophy, path: '/badges', description: 'Achievements' },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, path: '/bookmarks', description: 'Saved questions' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile', description: 'Settings & credits' },
];

function getActiveSection(location: string): string {
  if (location === '/') return 'home';
  if (location === '/channels' || location.startsWith('/channel/') || location === '/certifications' || location.startsWith('/certification/')) return 'learn';
  if (location.startsWith('/voice') || location.startsWith('/test') || location.startsWith('/coding') || location === '/review') return 'practice';
  if (location === '/stats' || location === '/badges' || location === '/bookmarks' || location === '/profile') return 'progress';
  if (location === '/bot-activity') return 'bots';
  return 'home';
}

// ============================================
// MOBILE BOTTOM NAVIGATION
// ============================================

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const activeSection = getActiveSection(location);

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'practice' || item.id === 'learn' || item.id === 'progress') {
      setShowMenu(showMenu === item.id ? null : item.id);
    } else {
      setShowMenu(null);
      setLocation(item.path);
    }
  };

  const getSubNav = (id: string) => {
    switch (id) {
      case 'learn': return learnSubNav;
      case 'practice': return practiceSubNav;
      case 'progress': return progressSubNav;
      default: return [];
    }
  };

  const currentSubNav = showMenu ? getSubNav(showMenu) : [];

  return (
    <>
      {/* Submenu Overlay */}
      {showMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setShowMenu(null)}
        />
      )}

      {/* Submenu */}
      {showMenu && currentSubNav.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-2 shadow-2xl lg:hidden"
        >
          <div className="text-xs text-muted-foreground px-3 py-2 font-semibold uppercase tracking-wide">
            {showMenu === 'learn' ? 'Browse Content' : showMenu === 'practice' ? 'Practice Modes' : 'Your Progress'}
          </div>
          {currentSubNav.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || location.startsWith(item.path.replace(/\/$/, '') + '/');
            return (
              <button
                key={item.id}
                onClick={() => {
                  setLocation(item.path);
                  setShowMenu(null);
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
                  {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                  {item.badge && <div className="text-xs text-amber-500 font-medium">{item.badge}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="pb-safe bg-card/80 backdrop-blur-xl border-t border-border/50">
          <div className="flex items-center justify-around h-14 px-1">
            {mainNavItems.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all",
                    isActive ? "text-primary" : "text-muted-foreground",
                    item.highlight && !isActive && "text-primary/70"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute inset-1 bg-primary/10 rounded-lg border border-primary/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  
                  {item.highlight ? (
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center -mt-3 shadow-lg",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-primary/30" 
                        : "bg-gradient-to-br from-primary to-cyan-500 text-white shadow-primary/20"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                  ) : (
                    <Icon className={cn("w-4 h-4 relative z-10", isActive && "text-primary")} />
                  )}
                  
                  <span className={cn("text-[9px] font-medium relative z-10 mt-0.5", item.highlight && "-mt-0.5")}>
                    {item.label}
                  </span>
                </button>
              );
            })}
            
            {/* Credits */}
            <button onClick={() => setLocation('/profile')} className="flex flex-col items-center justify-center w-14 h-12">
              <div className="flex items-center gap-0.5 px-1.5 py-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg">
                <Coins className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-bold text-amber-500">{formatCredits(balance)}</span>
              </div>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}


// ============================================
// DESKTOP SIDEBAR
// ============================================

interface DesktopSidebarProps {
  onSearchClick: () => void;
}

export function DesktopSidebar({ onSearchClick }: DesktopSidebarProps) {
  const [location, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const activeSection = getActiveSection(location);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const renderNavSection = (title: string, items: NavItem[], sectionId: string) => {
    const isExpanded = expandedSection === sectionId;
    const hasActiveItem = items.some(item => 
      location === item.path || location.startsWith(item.path.replace(/\/$/, '') + '/')
    );

    return (
      <div className="mb-1">
        <button
          onClick={() => toggleSection(sectionId)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors",
            hasActiveItem ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {title}
          <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
        </button>
        
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-0.5 space-y-0.5 ml-2"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path || location.startsWith(item.path.replace(/\/$/, '') + '/');
              
              return (
                <button
                  key={item.id}
                  onClick={() => setLocation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-left",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-full font-medium">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-card/50 backdrop-blur-xl border-r border-border/50 z-40 flex flex-col">
      {/* Logo - Compact */}
      <div className="p-3 border-b border-border/50">
        <button onClick={() => setLocation('/')} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">CodeReels</span>
            <div className="text-[9px] text-muted-foreground -mt-0.5">Interview Prep</div>
          </div>
        </button>
      </div>

      {/* Search - Compact */}
      <div className="px-2 py-2">
        <button
          onClick={onSearchClick}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 rounded-lg text-muted-foreground text-xs transition-colors border border-border/50"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[9px] px-1 py-0.5 bg-background/50 rounded border border-border/50">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {/* Home - Direct link */}
        <button
          onClick={() => setLocation('/')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
            activeSection === 'home' 
              ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20" 
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium">Home</span>
        </button>

        {/* Collapsible Sections */}
        {renderNavSection('Learn', learnSubNav, 'learn')}
        {renderNavSection('Practice', practiceSubNav, 'practice')}
        {renderNavSection('Progress', progressSubNav, 'progress')}
      </nav>

      {/* Credits Footer - Compact */}
      <div className="p-2 border-t border-border/50">
        <button
          onClick={() => setLocation('/profile')}
          className="w-full flex items-center gap-2 px-2.5 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/15 hover:to-orange-500/15 rounded-lg transition-all border border-amber-500/20"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Coins className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[10px] text-muted-foreground">Credits</div>
            <div className="text-sm font-bold text-amber-500">{formatCredits(balance)}</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-amber-500/50" />
        </button>
      </div>
    </aside>
  );
}

// ============================================
// MOBILE HEADER
// ============================================

interface UnifiedMobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onSearchClick: () => void;
}

export function UnifiedMobileHeader({ title, showBack, onSearchClick }: UnifiedMobileHeaderProps) {
  const [, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();

  return (
    <header className="sticky top-0 z-40 lg:hidden bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between h-12 px-3">
        {/* Left: Back or Logo */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              onClick={() => window.history.back()}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setLocation('/')} className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary via-primary to-cyan-500 flex items-center justify-center shadow-md shadow-primary/20">
                <Mic className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">CodeReels</span>
            </button>
          )}
          
          {title && (
            <h1 className="font-semibold text-sm truncate max-w-[160px] ml-1">{title}</h1>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Credits */}
          <button
            onClick={() => setLocation('/profile')}
            className="flex items-center gap-0.5 px-1.5 py-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-md"
          >
            <Coins className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500">{formatCredits(balance)}</span>
          </button>

          {/* Search */}
          <button
            onClick={onSearchClick}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
