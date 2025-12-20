import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";

// All available themes
export const themes = [
  // Clean (Default)
  { id: "clean", name: "Clean Light", category: "modern", description: "Clean minimal light" },
  { id: "clean-dark", name: "Clean Dark", category: "modern", description: "Clean minimal dark" },
  
  // Playful
  { id: "playful", name: "Playful", category: "modern", description: "Playful learning green" },
  { id: "playful-dark", name: "Playful Dark", category: "modern", description: "Dark playful mode" },
  
  // Classic
  { id: "unix", name: "Unix", category: "classic", description: "Classic terminal green" },
  { id: "light", name: "Light", category: "classic", description: "Clean light mode" },
  
  // Apple Transparent
  { id: "macos-light", name: "macOS Light", category: "apple", description: "Sonoma glassmorphism" },
  { id: "macos-dark", name: "macOS Dark", category: "apple", description: "Dark glassmorphism" },
  { id: "ios-light", name: "iOS Light", category: "apple", description: "Vibrant light blur" },
  { id: "ios-dark", name: "iOS Dark", category: "apple", description: "Vibrant dark blur" },
  { id: "visionos", name: "visionOS", category: "apple", description: "Spatial computing" },
  { id: "aqua", name: "Aqua", category: "apple", description: "Classic Mac OS X" },
  { id: "graphite", name: "Graphite", category: "apple", description: "Pro dark mode" },
  
  // Movies & TV
  { id: "matrix", name: "Matrix", category: "movies", description: "The Matrix digital rain" },
  { id: "blade-runner", name: "Blade Runner", category: "movies", description: "Neon noir aesthetic" },
  { id: "tron", name: "Tron", category: "movies", description: "Tron Legacy grid" },
  { id: "dune", name: "Dune", category: "movies", description: "Arrakis desert spice" },
  
  // Games
  { id: "cyberpunk", name: "Cyberpunk", category: "games", description: "Night City neon" },
  { id: "fallout", name: "Fallout", category: "games", description: "Pip-Boy green" },
  { id: "witcher", name: "Witcher", category: "games", description: "Medieval fantasy" },
  
  // Developer
  { id: "dracula", name: "Dracula", category: "dev", description: "Popular dark theme" },
  { id: "solarized", name: "Solarized", category: "dev", description: "Precision colors" },
  { id: "nord", name: "Nord", category: "dev", description: "Arctic inspired" },
  { id: "monokai", name: "Monokai", category: "dev", description: "Sublime classic" },
  { id: "gruvbox", name: "Gruvbox", category: "dev", description: "Retro groove" },
  { id: "catppuccin", name: "Catppuccin", category: "dev", description: "Soothing pastels" },
  
  // Aesthetic
  { id: "synthwave", name: "Synthwave", category: "aesthetic", description: "80s retro wave" },
  { id: "hacker", name: "Hacker", category: "aesthetic", description: "Classic green terminal" },
  { id: "midnight", name: "Midnight", category: "aesthetic", description: "Deep blue night" },
  
  // Modern
  { id: "glassmorphism", name: "Glass", category: "modern", description: "Frosted glass UI" },
  { id: "neumorphism", name: "Soft UI", category: "modern", description: "Soft shadows & depth" },
  { id: "aurora", name: "Aurora", category: "modern", description: "Northern lights gradient" },
  { id: "minimal", name: "Minimal", category: "modern", description: "Ultra-clean design" },
  { id: "neon", name: "Neon", category: "modern", description: "Bright neon glow" },
  { id: "sunset", name: "Sunset", category: "modern", description: "Warm gradient vibes" },
] as const;

export type Theme = typeof themes[number]["id"];

export const themeCategories = [
  { id: "modern", name: "Modern" },
  { id: "classic", name: "Classic" },
  { id: "apple", name: "Apple Glass" },
  { id: "movies", name: "Movies & TV" },
  { id: "games", name: "Games" },
  { id: "dev", name: "Developer" },
  { id: "aesthetic", name: "Aesthetic" },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  themes: typeof themes;
  themeCategories: typeof themeCategories;
  autoRotate: boolean;
  setAutoRotate: (enabled: boolean) => void;
}

const AUTO_ROTATE_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
const AUTO_ROTATE_KEY = "theme-auto-rotate";
const USER_CHANGED_KEY = "theme-user-changed";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme;
    // Default to Clean Dark for new users
    return themes.some(t => t.id === saved) ? saved : "clean-dark";
  });
  
  // Track if user has manually changed theme (disables auto-rotate)
  const [userChanged, setUserChanged] = useState(() => {
    return localStorage.getItem(USER_CHANGED_KEY) === "true";
  });
  
  // Auto-rotate preference
  const [autoRotate, setAutoRotateState] = useState(() => {
    const saved = localStorage.getItem(AUTO_ROTATE_KEY);
    return saved !== "false"; // Default to true
  });
  
  const autoRotateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Set theme (marks as user-changed)
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setUserChanged(true);
    localStorage.setItem(USER_CHANGED_KEY, "true");
  }, []);

  // Cycle theme (marks as user-changed)
  const cycleTheme = useCallback(() => {
    const themeIds = themes.map(t => t.id);
    const currentIndex = themeIds.indexOf(theme);
    const nextTheme = themeIds[(currentIndex + 1) % themeIds.length];
    setTheme(nextTheme);
  }, [theme, setTheme]);

  // Auto-rotate toggle
  const setAutoRotate = useCallback((enabled: boolean) => {
    setAutoRotateState(enabled);
    localStorage.setItem(AUTO_ROTATE_KEY, String(enabled));
    if (enabled) {
      // Reset user-changed flag when enabling auto-rotate
      setUserChanged(false);
      localStorage.removeItem(USER_CHANGED_KEY);
    }
  }, []);

  // Auto-rotate effect - cycles theme every 15 minutes if user hasn't changed it
  useEffect(() => {
    // Clear existing timer
    if (autoRotateTimerRef.current) {
      clearInterval(autoRotateTimerRef.current);
      autoRotateTimerRef.current = null;
    }

    // Only auto-rotate if enabled and user hasn't manually changed theme
    if (!autoRotate || userChanged) return;

    // Set up auto-rotate timer
    autoRotateTimerRef.current = setInterval(() => {
      const themeIds = themes.map(t => t.id);
      setThemeState(currentTheme => {
        const currentIndex = themeIds.indexOf(currentTheme);
        return themeIds[(currentIndex + 1) % themeIds.length];
      });
    }, AUTO_ROTATE_INTERVAL);

    return () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
      }
    };
  }, [autoRotate, userChanged]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      cycleTheme, 
      themes, 
      themeCategories,
      autoRotate,
      setAutoRotate
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
