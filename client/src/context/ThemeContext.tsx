import { createContext, useContext, useEffect, useState } from "react";

// All available themes
export const themes = [
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme;
    return themes.some(t => t.id === saved) ? saved : "unix";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    const themeIds = themes.map(t => t.id);
    const currentIndex = themeIds.indexOf(theme);
    const nextTheme = themeIds[(currentIndex + 1) % themeIds.length];
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themes, themeCategories }}>
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
