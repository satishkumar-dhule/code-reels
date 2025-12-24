import { createContext, useContext, useEffect } from "react";

// Single premium dark theme - matching the blog design
export const themes = [
  { id: "premium-dark", name: "Premium Dark", category: "modern", description: "Premium dark theme" },
] as const;

export type Theme = typeof themes[number]["id"];

export const themeCategories = [
  { id: "modern", name: "Modern" },
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

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme: Theme = "premium-dark";

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
  }, []);

  // No-op functions since we only have one theme
  const setTheme = () => {};
  const cycleTheme = () => {};
  const setAutoRotate = () => {};

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      cycleTheme, 
      themes, 
      themeCategories,
      autoRotate: false,
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
