/**
 * Unified Navigation Component - Gen Z Edition
 * Pure Black, Neon Accents, Glassmorphism
 * 
 * Navigation Structure:
 * - Home: Dashboard
 * - Learn: Browse content (Channels, Certifications, My Path)
 * - Practice: Active learning (Voice, Tests, Coding, Review)
 * - Progress: Track achievements (Stats, Badges, Bookmarks, Profile)
 */

import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
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
  User,
  Info,
  Brain,
  Sparkles,
  Zap
} from 'lucide-react';
import { useCredits } from '../../context/CreditsContext';
import { useSidebar } from '../../context/SidebarContext';
import { useUserPreferences } from '../../context/UserPreferencesContext';
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

// Main navigation - 5 core sections (MOBILE-FIRST)
const mainNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'paths', label: 'Paths', icon: Brain, path: '/learning-paths', description: 'Learning paths' },
  { id: 'practice', label: 'Practice', icon: Mic, path: '/voice-interview', highlight: true, description: 'Practice modes' },
  { id: 'learn', label: 'Learn', icon: GraduationCap, path: '/channels', description: 'Topics & certs' },
  { id: 'progress', label: 'Progress', icon: BarChart3, path: '/stats', description: 'Your stats' },
];

// Learn section - Browse learning content
const learnSubNav: NavItem[] = [
  { id: 'channels', label: 'Channels', icon: BookOpen, path: '/channels', description: 'Browse by topic' },
  { id: 'certifications', label: 'Certifications', icon: Award, path: '/certifications', description: 'Exam prep' },
  { id: 'my-path', label: 'My Path', icon: Brain, path: '/my-path', badge: 'NEW', description: 'Your learning journey' },
];

// Practice section - Active learning modes
const practiceSubNav: NavItem[] = [
  { id: 'voice', label: 'Voice Interview', icon: Mic, path: '/voice-interview', badge: '+10', description: 'AI mock interviews' },
  { id: 'tests', label: 'Quick Tests', icon: Target, path: '/tests', description: 'Timed challenges' },
  { id: 'coding', label: 'Coding', icon: Code, path: '/coding', description: 'Code challenges' },
  { id: 'review', label: 'SRS Review', icon: Flame, path: '/review', description: 'Spaced repetition' },
];

// Progress section - Track achievements
const progressSubNav: NavItem[] = [
  { id: 'stats', label: 'Statistics', icon: BarChart3, path: '/stats', description: 'Your progress' },
  { id: 'badges', label: 'Badges', icon: Trophy, path: '/badges', description: 'Achievements' },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, path: '/bookmarks', description: 'Saved questions' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile', description: 'Settings & credits' },
  { id: 'about', label: 'About', icon: Info, path: '/about', description: 'About Open-Interview' },
];

function getActiveSection(location: string): string {
  if (location === '/') return 'home';
  if (location === '/learning-paths' || location.startsWith('/learning-path/')) return 'paths';
  if (location === '/channels' || location.startsWith('/channel/') || location === '/certifications' || location.startsWith('/certification/') || location === '/my-path') return 'learn';
  if (location.startsWith('/voice') || location.startsWith('/test') || location.startsWith('/coding') || location === '/review' || location === '/training') return 'practice';
  if (location === '/stats' || location === '/badges' || location === '/bookmarks' || location === '/profile' || location === '/about') return 'progress';
  if (location === '/bot-activity') return 'bots';
  return 'home';
}

// ============================================
// MOBILE BOTTOM NAVIGATION - Gen Z Edition
// Pure Black, Neon Accents, Glassmorphism
// ============================================

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();
  const { preferences } = useUserPreferences();
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const activeSection = getActiveSection(location);

  const handleNavClick = (item: NavItem) => {
    // Paths goes directly to learning paths page (no submenu)
    if (item.id === 'paths') {
      setShowMenu(null);
      setLocation(item.path);
    } else if (item.id === 'practice' || item.id === 'learn' || item.id === 'progress') {
      setShowMenu(showMenu === item.id ? null : item.id);
    } else {
      setShowMenu(null);
      setLocation(item.path);
    }
  };

  const getSubNav = (id: string) => {
    let items: NavItem[] = [];
    switch (id) {
      case 'learn': 
        items = learnSubNav;
        break;
      case 'practice': 
        items = practiceSubNav;
        break;
      case 'progress': 
        items = progressSubNav;
        break;
      default: 
        return [];
    }
    
    if (preferences.hideCertifications && id === 'learn') {
      return items.filter(item => item.id !== 'certifications');
    }
    
    return items;
  };

  const currentSubNav = showMenu ? getSubNav(showMenu) : [];

  return (
    <>
      {/* Backdrop Overlay */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md lg:hidden"
            onClick={() => setShowMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* REVAMPED: Full-screen Submenu with better UX */}
      <AnimatePresence>
        {showMenu && currentSubNav.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-[32px] shadow-2xl overflow-hidden lg:hidden max-h-[80vh] flex flex-col"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-foreground">
                    {showMenu === 'learn' ? 'Learn' : showMenu === 'practice' ? 'Practice' : 'Progress'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {showMenu === 'learn' ? 'Browse topics and certifications' : 
                     showMenu === 'practice' ? 'Choose your practice mode' : 
                     'Track your progress'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowMenu(null)}
                  className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Menu Items - Single Column for Better Touch Targets */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
              {currentSubNav.map((item, index) => {
                const Icon = item.icon;
                const isActive = location === item.path || location.startsWith(item.path + '/');
                const isVoice = item.id === 'voice';
                
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setLocation(item.path);
                      setShowMenu(null);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-[20px] transition-all relative overflow-hidden",
                      isActive 
                        ? "bg-gradient-to-br from-primary/20 to-cyan-500/20 border-2 border-primary/50" 
                        : "bg-muted/50 hover:bg-muted border-2 border-transparent",
                      isVoice && !isActive && "bg-gradient-to-br from-primary/10 to-cyan-500/10 border-primary/20"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-14 h-14 rounded-[16px] flex items-center justify-center flex-shrink-0 transition-all",
                      isActive 
                        ? "bg-gradient-to-br from-primary to-cyan-500 shadow-lg shadow-primary/30" 
                        : isVoice 
                          ? "bg-gradient-to-br from-primary/30 to-cyan-500/30"
                          : "bg-background"
                    )}>
                      <Icon className={cn(
                        "w-7 h-7",
                        isActive ? "text-primary-foreground" : "text-foreground"
                      )} strokeWidth={2} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-base font-bold",
                          isActive ? "text-primary" : "text-foreground"
                        )}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            item.badge === 'NEW' 
                              ? "bg-emerald-500/20 text-emerald-400" 
                              : "bg-amber-500/20 text-amber-400"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className={cn(
                      "w-5 h-5 flex-shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REVAMPED: Bottom Navigation Bar - Cleaner, More Accessible */}
      {/* iPhone 13 FIX: Keep at bottom-0, add pb-safe to push content inside nav up */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-safe">
        <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-2xl">
          <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
            {mainNavItems.map((item) => {
              const isActive = activeSection === item.id;
              const hasSubmenu = item.id === 'practice' || item.id === 'learn' || item.id === 'progress';
              const isMenuOpen = showMenu === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "relative flex flex-col items-center justify-center flex-1 h-full transition-all",
                    isActive || isMenuOpen ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-label={item.label}
                >
                  {/* Active Indicator */}
                  {(isActive || isMenuOpen) && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute top-0 w-12 h-1 bg-gradient-to-r from-primary to-cyan-500 rounded-full"
                      transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                    />
                  )}
                  
                  {/* Icon Container */}
                  <motion.div 
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "w-12 h-12 rounded-[16px] flex items-center justify-center transition-all",
                      item.highlight
                        ? isActive || isMenuOpen
                          ? "bg-gradient-to-br from-primary to-cyan-500 shadow-lg shadow-primary/50" 
                          : "bg-gradient-to-br from-primary/20 to-cyan-500/20"
                        : isActive || isMenuOpen 
                          ? "bg-primary/15" 
                          : "bg-transparent"
                    )}
                  >
                    <Icon className={cn(
                      "w-6 h-6",
                      item.highlight && (isActive || isMenuOpen) ? "text-primary-foreground" : ""
                    )} strokeWidth={2.5} />
                  </motion.div>
                  
                  {/* Label - Hidden for cleaner look */}
                  <span className="sr-only">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}


// ============================================
// DESKTOP SIDEBAR - Collapsible Premium Design
// ============================================

interface DesktopSidebarProps {
  onSearchClick: () => void;
}

export function DesktopSidebar({ onSearchClick }: DesktopSidebarProps) {
  const [location, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { preferences } = useUserPreferences();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (path: string) => 
    location === path || location.startsWith(path.replace(/\/$/, '') + '/');
  
  // Filter learn items based on preferences
  const filteredLearnSubNav = preferences.hideCertifications 
    ? learnSubNav.filter(item => item.id !== 'certifications')
    : learnSubNav;

  const NavItem = ({ item, showLabel = true }: { item: NavItem; showLabel?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const isVoice = item.id === 'voice';
    const showTooltip = isCollapsed && hoveredItem === item.id;
    
    return (
      <div className="relative">
        <button
          onClick={() => setLocation(item.path)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group overflow-hidden",
            isCollapsed && "justify-center px-2",
            active 
              ? "bg-primary/15 text-primary" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors",
            active 
              ? "bg-primary text-primary-foreground" 
              : isVoice
                ? "bg-primary/20 text-primary"
                : "bg-transparent group-hover:bg-muted"
          )}>
            <Icon className="w-4 h-4" />
          </div>
          
          {showLabel && !isCollapsed && (
            <span className="text-sm font-medium flex-1 text-left">
              {item.label}
            </span>
          )}
          
          {showLabel && !isCollapsed && item.badge && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
              item.badge === 'NEW' 
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-amber-500/20 text-amber-400"
            )}>
              {item.badge}
            </span>
          )}
        </button>
        
        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50"
            >
              <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-1.5 whitespace-nowrap flex items-center gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    item.badge === 'NEW' 
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SectionHeader = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => {
    if (isCollapsed) return <div className="h-px bg-border/50 my-3 mx-2" />;
    
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
    );
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 bottom-0 bg-card/95 backdrop-blur-xl border-r border-border z-40 flex flex-col transition-all duration-200 overflow-hidden",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header with Logo and Collapse Toggle */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-border">
        <button 
          onClick={() => setLocation('/')} 
          className={cn("flex items-center gap-2.5", isCollapsed && "justify-center w-full")}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shrink-0">
            <Mic className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="text-left">
              <div className="font-semibold text-sm leading-tight">Open-Interview</div>
              <div className="text-[10px] text-muted-foreground">Interview Prep</div>
            </div>
          )}
        </button>
        
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <div className="px-2 py-2">
          <button
            onClick={toggleSidebar}
            className="w-full p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className={cn("px-2 py-2", isCollapsed && "px-1")}>
        <button
          onClick={onSearchClick}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors overflow-hidden",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Search className="w-4 h-4 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="text-sm flex-1 text-left truncate">Search</span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-background rounded border border-border font-mono shrink-0">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden px-2 py-1",
        isCollapsed && "px-1"
      )}>
        {/* Home */}
        <NavItem item={{ id: 'home', label: 'Home', icon: Home, path: '/' }} />
        
        {/* Learn Section */}
        <SectionHeader icon={GraduationCap} label="Learn" />
        {filteredLearnSubNav.map(item => <NavItem key={item.id} item={item} />)}
        
        {/* Practice Section */}
        <SectionHeader icon={Mic} label="Practice" />
        {practiceSubNav.map(item => <NavItem key={item.id} item={item} />)}
        
        {/* Progress Section */}
        <SectionHeader icon={BarChart3} label="Progress" />
        {progressSubNav.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Credits Footer */}
      <div className={cn("p-2 border-t border-border", isCollapsed && "p-1")}>
        <button
          onClick={() => setLocation('/profile')}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 transition-colors overflow-hidden",
            isCollapsed && "justify-center px-1.5"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 text-left min-w-0">
              <div className="text-[10px] text-muted-foreground">Credits</div>
              <div className="text-sm font-bold text-amber-500 truncate">{formatCredits(balance)}</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}

// ============================================
// MOBILE HEADER - Gen Z Edition
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
    <header className="sticky top-0 z-40 lg:hidden bg-card/90 backdrop-blur-xl border-b border-border pt-safe">
      <div className="flex items-center justify-between h-14 px-3">
        {/* Left: Back or Logo */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack ? (
            <button
              onClick={() => window.history.back()}
              className="w-9 h-9 flex items-center justify-center rounded-[12px] bg-muted/50 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={2} />
            </button>
          ) : (
            <button onClick={() => setLocation('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/30">
                <Brain className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div>
                <span className="font-black text-sm text-foreground">Open-Interview</span>
                {!title && <div className="text-[10px] text-muted-foreground">Interview Prep</div>}
              </div>
            </button>
          )}
          
          {title && (
            <h1 className="font-bold text-sm text-foreground truncate ml-2">{title}</h1>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Credits - Neon Pill */}
          <button
            onClick={() => setLocation('/profile')}
            className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-[10px]"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.5} />
            <span className="text-xs font-bold text-amber-400">{formatCredits(balance)}</span>
          </button>

          {/* Search */}
          <button
            onClick={onSearchClick}
            className="w-9 h-9 flex items-center justify-center rounded-[12px] bg-muted/50 hover:bg-muted transition-colors"
          >
            <Search className="w-4 h-4 text-foreground" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
