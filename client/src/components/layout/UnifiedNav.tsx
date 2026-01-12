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
  Info
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
  { id: 'training', label: 'Training Mode', icon: BookOpen, path: '/training', badge: 'NEW', description: 'Read & record answers' },
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
  { id: 'about', label: 'About', icon: Info, path: '/about', description: 'About Code Reels' },
];

function getActiveSection(location: string): string {
  if (location === '/') return 'home';
  if (location === '/channels' || location.startsWith('/channel/') || location === '/certifications' || location.startsWith('/certification/')) return 'learn';
  if (location.startsWith('/voice') || location.startsWith('/test') || location.startsWith('/coding') || location === '/review' || location === '/training') return 'practice';
  if (location === '/stats' || location === '/badges' || location === '/bookmarks' || location === '/profile' || location === '/about') return 'progress';
  if (location === '/bot-activity') return 'bots';
  return 'home';
}

// ============================================
// MOBILE BOTTOM NAVIGATION - Premium Design
// ============================================

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { balance, formatCredits } = useCredits();
  const { preferences } = useUserPreferences();
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
    
    // Filter out certifications if user has hidden them
    if (preferences.hideCertifications && id === 'learn') {
      return items.filter(item => item.id !== 'certifications');
    }
    
    return items;
  };

  const currentSubNav = showMenu ? getSubNav(showMenu) : [];
  const menuTitle = showMenu === 'learn' ? 'Browse Content' : showMenu === 'practice' ? 'Practice Modes' : 'Your Progress';

  return (
    <>
      {/* Submenu Overlay */}
      {showMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setShowMenu(null)}
        />
      )}

      {/* Submenu - Improved Design */}
      {showMenu && currentSubNav.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
          className="fixed bottom-[72px] left-3 right-3 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden lg:hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/30 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{menuTitle}</span>
              <button 
                onClick={() => setShowMenu(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          
          {/* Menu Items */}
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {currentSubNav.map((item, index) => {
              const Icon = item.icon;
              const isActive = location === item.path || location.startsWith(item.path.replace(/\/$/, '') + '/');
              const isVoice = item.id === 'voice';
              
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => {
                    setLocation(item.path);
                    setShowMenu(null);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
                    isActive 
                      ? "bg-primary/15 border border-primary/30" 
                      : "hover:bg-muted/50 border border-transparent",
                    isVoice && !isActive && "bg-gradient-to-br from-primary/10 to-cyan-500/10 border-primary/20"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
                      : isVoice 
                        ? "bg-gradient-to-br from-primary to-cyan-500 text-white shadow-md shadow-primary/20"
                        : "bg-muted/80"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <div className={cn(
                      "text-xs font-medium",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {item.label}
                    </div>
                    {item.badge && (
                      <span className="text-[9px] text-amber-500 font-semibold">{item.badge}</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Bottom Navigation Bar - Premium Design */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden w-full overflow-hidden">
        <div className="pb-safe bg-gradient-to-t from-card via-card/98 to-card/90 backdrop-blur-xl border-t border-border/30 w-full">
          <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto w-full">
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
                    "relative flex flex-col items-center justify-center flex-1 h-14 transition-all min-w-0",
                    isActive || isMenuOpen ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {/* Active indicator pill */}
                  {(isActive || isMenuOpen) && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute -top-1 w-8 h-1 bg-primary rounded-full"
                      transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                    />
                  )}
                  
                  {/* Practice button - special elevated style */}
                  {item.highlight ? (
                    <motion.div 
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center -mt-4 shadow-lg transition-all flex-shrink-0",
                        isActive || isMenuOpen
                          ? "bg-primary text-primary-foreground shadow-primary/40" 
                          : "bg-gradient-to-br from-primary via-primary to-cyan-500 text-white shadow-primary/30"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div 
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                        isActive || isMenuOpen ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        isActive || isMenuOpen ? "text-primary" : ""
                      )} />
                    </motion.div>
                  )}
                  
                  <span className={cn(
                    "text-[10px] font-medium mt-0.5 transition-colors truncate max-w-full",
                    item.highlight && "-mt-1",
                    isActive || isMenuOpen ? "text-primary" : ""
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Submenu indicator dot */}
                  {hasSubmenu && !item.highlight && (
                    <div className={cn(
                      "absolute bottom-1 w-1 h-1 rounded-full transition-colors",
                      isMenuOpen ? "bg-primary" : "bg-muted-foreground/30"
                    )} />
                  )}
                </button>
              );
            })}
            
            {/* Credits - Compact pill */}
            <button 
              onClick={() => setLocation('/profile')} 
              className="flex flex-col items-center justify-center h-14 px-1"
            >
              <motion.div 
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/25 rounded-xl shadow-sm"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-500">{formatCredits(balance)}</span>
              </motion.div>
            </button>
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
            <span className="text-sm font-medium flex-1 text-left truncate">
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
              <div className="font-semibold text-sm leading-tight">CodeReels</div>
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
    <header className="sticky top-0 z-40 lg:hidden bg-card/80 backdrop-blur-xl border-b border-border/50 w-full overflow-hidden">
      <div className="flex items-center justify-between h-12 px-3 max-w-full">
        {/* Left: Back or Logo */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          {showBack ? (
            <button
              onClick={() => window.history.back()}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setLocation('/')} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary via-primary to-cyan-500 flex items-center justify-center shadow-md shadow-primary/20">
                <Mic className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text whitespace-nowrap">CodeReels</span>
            </button>
          )}
          
          {title && (
            <h1 className="font-semibold text-sm truncate max-w-[160px] ml-1 overflow-hidden">{title}</h1>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Credits */}
          <button
            onClick={() => setLocation('/profile')}
            className="flex items-center gap-0.5 px-1.5 py-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-md flex-shrink-0"
          >
            <Coins className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="text-[10px] font-bold text-amber-500 whitespace-nowrap">{formatCredits(balance)}</span>
          </button>

          {/* Search */}
          <button
            onClick={onSearchClick}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
