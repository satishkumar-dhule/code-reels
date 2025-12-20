/**
 * Duolingo-style Background Mascots
 * One large vibrant mascot per page, changes based on URL
 */

import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useTheme } from '../context/ThemeContext';

// Giant Owl - Green Duolingo mascot
const GiantOwl = () => (
  <svg viewBox="0 0 400 500" fill="none" className="w-full h-full">
    <ellipse cx="200" cy="320" rx="140" ry="120" fill="#58CC02" />
    <ellipse cx="200" cy="340" rx="100" ry="85" fill="#89E219" />
    <ellipse cx="200" cy="360" rx="70" ry="55" fill="#9EE82F" />
    <circle cx="200" cy="150" r="110" fill="#58CC02" />
    <path d="M100 50 L120 120 L80 100 Z" fill="#58CC02" />
    <path d="M300 50 L280 120 L320 100 Z" fill="#58CC02" />
    <circle cx="200" cy="160" r="80" fill="#FFF8E7" />
    <circle cx="160" cy="145" r="32" fill="white" />
    <circle cx="240" cy="145" r="32" fill="white" />
    <circle cx="165" cy="145" r="18" fill="#1CB0F6" />
    <circle cx="245" cy="145" r="18" fill="#1CB0F6" />
    <circle cx="160" cy="140" r="6" fill="white" />
    <circle cx="240" cy="140" r="6" fill="white" />
    <path d="M175 185 L200 230 L225 185 Z" fill="#FFC800" />
    <ellipse cx="120" cy="175" rx="18" ry="10" fill="#FF9EAA" opacity="0.7" />
    <ellipse cx="280" cy="175" rx="18" ry="10" fill="#FF9EAA" opacity="0.7" />
    <ellipse cx="70" cy="280" rx="35" ry="70" fill="#4CAF50" />
    <ellipse cx="330" cy="280" rx="35" ry="70" fill="#4CAF50" />
    <ellipse cx="150" cy="430" rx="35" ry="18" fill="#FFC800" />
    <ellipse cx="250" cy="430" rx="35" ry="18" fill="#FFC800" />
  </svg>
);

// Giant Robot - Purple tech mascot
const GiantRobot = () => (
  <svg viewBox="0 0 350 450" fill="none" className="w-full h-full">
    <rect x="165" y="10" width="20" height="50" rx="10" fill="#A29BFE" />
    <circle cx="175" cy="10" r="18" fill="#FD79A8" />
    <rect x="75" y="60" width="200" height="140" rx="30" fill="#6C5CE7" />
    <rect x="95" y="80" width="160" height="100" rx="15" fill="#DFE6E9" />
    <rect x="100" y="85" width="150" height="90" rx="12" fill="#2D3436" />
    <rect x="115" y="105" width="45" height="45" rx="10" fill="#00CEC9" />
    <rect x="190" y="105" width="45" height="45" rx="10" fill="#00CEC9" />
    <rect x="130" y="160" width="90" height="12" rx="6" fill="#00CEC9" />
    <rect x="90" y="210" width="170" height="160" rx="25" fill="#6C5CE7" />
    <rect x="110" y="230" width="130" height="80" rx="15" fill="#5B4ED1" />
    <circle cx="145" cy="270" r="20" fill="#FD79A8" />
    <circle cx="205" cy="270" r="20" fill="#00CEC9" />
    <rect x="30" y="220" width="50" height="90" rx="25" fill="#A29BFE" />
    <rect x="270" y="220" width="50" height="90" rx="25" fill="#A29BFE" />
    <rect x="110" y="375" width="50" height="60" rx="20" fill="#A29BFE" />
    <rect x="190" y="375" width="50" height="60" rx="20" fill="#A29BFE" />
  </svg>
);

// Giant Fox - Orange friendly mascot
const GiantFox = () => (
  <svg viewBox="0 0 400 480" fill="none" className="w-full h-full">
    <path d="M320 350 Q420 280 380 180 Q350 220 340 280 Q330 320 320 350" fill="#FF9500" />
    <path d="M330 340 Q400 290 370 200 Q350 230 345 280 Q340 310 330 340" fill="#FFAD33" />
    <ellipse cx="200" cy="340" rx="120" ry="100" fill="#FF9500" />
    <ellipse cx="200" cy="360" rx="90" ry="70" fill="#FFF8E7" />
    <circle cx="200" cy="160" r="100" fill="#FF9500" />
    <path d="M100 80 L130 180 L80 150 Z" fill="#FF9500" />
    <path d="M300 80 L270 180 L320 150 Z" fill="#FF9500" />
    <path d="M110 100 L120 145 L100 135 Z" fill="#FF6B9D" />
    <path d="M290 100 L280 145 L300 135 Z" fill="#FF6B9D" />
    <ellipse cx="200" cy="180" rx="70" ry="60" fill="#FFF8E7" />
    <ellipse cx="165" cy="150" rx="22" ry="25" fill="white" />
    <ellipse cx="235" cy="150" rx="22" ry="25" fill="white" />
    <circle cx="168" cy="152" r="14" fill="#4A3728" />
    <circle cx="238" cy="152" r="14" fill="#4A3728" />
    <ellipse cx="200" cy="195" rx="18" ry="14" fill="#4A3728" />
    <path d="M180 230 Q200 245 220 230" stroke="#4A3728" strokeWidth="4" fill="none" />
    <ellipse cx="130" cy="175" rx="15" ry="8" fill="#FF6B9D" opacity="0.6" />
    <ellipse cx="270" cy="175" rx="15" ry="8" fill="#FF6B9D" opacity="0.6" />
    <ellipse cx="130" cy="420" rx="35" ry="25" fill="#FF9500" />
    <ellipse cx="270" cy="420" rx="35" ry="25" fill="#FF9500" />
  </svg>
);

// Giant Bear - Purple cute mascot
const GiantBear = () => (
  <svg viewBox="0 0 400 480" fill="none" className="w-full h-full">
    <ellipse cx="200" cy="340" rx="130" ry="110" fill="#CE82FF" />
    <ellipse cx="200" cy="360" rx="100" ry="80" fill="#E0B0FF" />
    <circle cx="200" cy="150" r="110" fill="#CE82FF" />
    <circle cx="100" cy="70" r="40" fill="#CE82FF" />
    <circle cx="300" cy="70" r="40" fill="#CE82FF" />
    <circle cx="100" cy="70" r="25" fill="#FF9EAA" />
    <circle cx="300" cy="70" r="25" fill="#FF9EAA" />
    <ellipse cx="200" cy="175" rx="60" ry="50" fill="#FFF8E7" />
    <circle cx="155" cy="140" r="25" fill="white" />
    <circle cx="245" cy="140" r="25" fill="white" />
    <circle cx="160" cy="142" r="15" fill="#4A3728" />
    <circle cx="250" cy="142" r="15" fill="#4A3728" />
    <ellipse cx="200" cy="185" rx="22" ry="18" fill="#4A3728" />
    <path d="M175 225 Q200 245 225 225" stroke="#4A3728" strokeWidth="4" fill="none" />
    <ellipse cx="125" cy="170" rx="18" ry="10" fill="#FF9EAA" opacity="0.7" />
    <ellipse cx="275" cy="170" rx="18" ry="10" fill="#FF9EAA" opacity="0.7" />
    <ellipse cx="80" cy="300" rx="40" ry="70" fill="#CE82FF" />
    <ellipse cx="320" cy="300" rx="40" ry="70" fill="#CE82FF" />
    <ellipse cx="130" cy="430" rx="40" ry="30" fill="#CE82FF" />
    <ellipse cx="270" cy="430" rx="40" ry="30" fill="#CE82FF" />
  </svg>
);

// Giant Penguin - Black/white with bow tie
const GiantPenguin = () => (
  <svg viewBox="0 0 350 480" fill="none" className="w-full h-full">
    <ellipse cx="175" cy="300" rx="110" ry="140" fill="#2D3436" />
    <ellipse cx="175" cy="320" rx="80" ry="110" fill="#FFF8E7" />
    <circle cx="175" cy="130" r="90" fill="#2D3436" />
    <ellipse cx="175" cy="150" rx="65" ry="55" fill="#FFF8E7" />
    <circle cx="140" cy="130" r="25" fill="white" />
    <circle cx="210" cy="130" r="25" fill="white" />
    <circle cx="145" cy="132" r="15" fill="#1CB0F6" />
    <circle cx="215" cy="132" r="15" fill="#1CB0F6" />
    <circle cx="142" cy="128" r="5" fill="white" />
    <circle cx="212" cy="128" r="5" fill="white" />
    <path d="M150 170 L175 210 L200 170 Z" fill="#FFC800" />
    <ellipse cx="110" cy="160" rx="15" ry="8" fill="#FF9EAA" opacity="0.6" />
    <ellipse cx="240" cy="160" rx="15" ry="8" fill="#FF9EAA" opacity="0.6" />
    <ellipse cx="70" cy="280" rx="30" ry="80" fill="#2D3436" />
    <ellipse cx="280" cy="280" rx="30" ry="80" fill="#2D3436" />
    <ellipse cx="130" cy="440" rx="40" ry="20" fill="#FFC800" />
    <ellipse cx="220" cy="440" rx="40" ry="20" fill="#FFC800" />
    <path d="M145 230 L175 250 L205 230 L175 245 Z" fill="#FF6B6B" />
    <circle cx="175" cy="240" r="10" fill="#FF6B6B" />
  </svg>
);

// Giant Cat - Yellow playful mascot
const GiantCat = () => (
  <svg viewBox="0 0 400 480" fill="none" className="w-full h-full">
    <path d="M320 380 Q400 350 380 250 Q360 300 350 340 Q340 360 320 380" fill="#FFD93D" />
    <ellipse cx="200" cy="340" rx="120" ry="100" fill="#FFD93D" />
    <ellipse cx="200" cy="360" rx="90" ry="70" fill="#FFE566" />
    <circle cx="200" cy="160" r="100" fill="#FFD93D" />
    <path d="M100 80 L130 180 L70 130 Z" fill="#FFD93D" />
    <path d="M300 80 L270 180 L330 130 Z" fill="#FFD93D" />
    <path d="M105 95 L125 160 L85 125 Z" fill="#FF9EAA" />
    <path d="M295 95 L275 160 L315 125 Z" fill="#FF9EAA" />
    <ellipse cx="200" cy="180" rx="60" ry="45" fill="#FFF8E7" />
    <ellipse cx="160" cy="145" rx="25" ry="28" fill="white" />
    <ellipse cx="240" cy="145" rx="25" ry="28" fill="white" />
    <ellipse cx="163" cy="148" rx="12" ry="18" fill="#58CC02" />
    <ellipse cx="243" cy="148" rx="12" ry="18" fill="#58CC02" />
    <ellipse cx="163" cy="148" rx="6" ry="14" fill="#1a1a1a" />
    <ellipse cx="243" cy="148" rx="6" ry="14" fill="#1a1a1a" />
    <path d="M190 185 L200 200 L210 185 Z" fill="#FF9EAA" />
    <path d="M180 215 Q200 230 220 215" stroke="#4A3728" strokeWidth="3" fill="none" />
    <line x1="100" y1="180" x2="150" y2="190" stroke="#4A3728" strokeWidth="2" />
    <line x1="100" y1="195" x2="150" y2="195" stroke="#4A3728" strokeWidth="2" />
    <line x1="300" y1="180" x2="250" y2="190" stroke="#4A3728" strokeWidth="2" />
    <line x1="300" y1="195" x2="250" y2="195" stroke="#4A3728" strokeWidth="2" />
    <ellipse cx="125" cy="175" rx="15" ry="8" fill="#FF9EAA" opacity="0.6" />
    <ellipse cx="275" cy="175" rx="15" ry="8" fill="#FF9EAA" opacity="0.6" />
  </svg>
);

// Mascot mapping based on URL patterns
const mascotMap: Record<string, React.FC> = {
  '/': GiantOwl,
  '/stats': GiantRobot,
  '/badges': GiantBear,
  '/channels': GiantFox,
  '/about': GiantPenguin,
  '/whats-new': GiantCat,
  '/tests': GiantRobot,
  '/coding': GiantCat,
  '/profile': GiantBear,
  '/bot-activity': GiantRobot,
};

// Get mascot based on URL
function getMascotForPath(path: string): React.FC {
  // Exact match first
  if (mascotMap[path]) return mascotMap[path];
  
  // Pattern matching for dynamic routes
  if (path.startsWith('/channel/')) return GiantOwl;
  if (path.startsWith('/test/')) return GiantPenguin;
  if (path.startsWith('/coding/')) return GiantCat;
  
  // Default
  return GiantOwl;
}

export function DuolingoMascots() {
  const { theme } = useTheme();
  const [location] = useLocation();
  
  // Get mascot based on current URL - must be before any conditional returns
  const MascotComponent = useMemo(() => getMascotForPath(location), [location]);
  
  // Only show on Duolingo themes
  const isDuolingoTheme = theme === 'duolingo' || theme === 'duolingo-dark';
  
  if (!isDuolingoTheme) return null;

  const isDark = theme === 'duolingo-dark';

  return (
    <>
      {/* Desktop only - large mascot */}
      <div 
        className="fixed inset-0 pointer-events-none hidden lg:block"
        style={{ 
          zIndex: 0,
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {/* Single large mascot - positioned bottom right */}
        <div 
          className="absolute"
          style={{ 
            right: '-120px',
            bottom: '-100px',
            width: '700px', 
            height: '850px',
            opacity: isDark ? 0.06 : 0.10,
          }}
        >
          <MascotComponent />
        </div>

        {/* Subtle gradient accent */}
        <div 
          className="absolute -left-40 top-1/4 rounded-full"
          style={{
            width: '500px',
            height: '500px',
            background: isDark 
              ? 'radial-gradient(circle, rgba(88, 204, 2, 0.04) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(88, 204, 2, 0.06) 0%, transparent 60%)',
          }}
        />
      </div>
    </>
  );
}

export default DuolingoMascots;
