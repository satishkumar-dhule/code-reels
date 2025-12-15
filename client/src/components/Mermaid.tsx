import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Palette } from 'lucide-react';
// @ts-ignore - Use the full ESM bundle to avoid dynamic import issues on GitHub Pages
import mermaid from 'mermaid/dist/mermaid.esm.mjs';
import { useTheme } from '../context/ThemeContext';

// Mermaid theme configurations matching mermaid.live themes
type MermaidTheme = 'default' | 'neutral' | 'dark' | 'forest' | 'base';

const mermaidThemeConfigs: Record<MermaidTheme, object> = {
  default: {
    theme: 'default',
    themeVariables: {
      primaryColor: '#326ce5',
      primaryTextColor: '#fff',
      primaryBorderColor: '#326ce5',
      lineColor: '#666',
      secondaryColor: '#f4f4f4',
      tertiaryColor: '#fff',
      background: '#fff',
      mainBkg: '#ECECFF',
      nodeBorder: '#9370DB',
      clusterBkg: '#ffffde',
      clusterBorder: '#aaaa33',
      titleColor: '#333',
      edgeLabelBackground: '#e8e8e8',
    },
  },
  neutral: {
    theme: 'neutral',
    themeVariables: {
      primaryColor: '#f4f4f4',
      primaryTextColor: '#333',
      primaryBorderColor: '#999',
      lineColor: '#666',
      secondaryColor: '#f4f4f4',
      tertiaryColor: '#fff',
      background: '#fff',
      mainBkg: '#f4f4f4',
      nodeBorder: '#999',
      clusterBkg: '#f4f4f4',
      clusterBorder: '#999',
      titleColor: '#333',
      edgeLabelBackground: '#e8e8e8',
    },
  },
  dark: {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1f2937',
      primaryTextColor: '#fff',
      primaryBorderColor: '#22c55e',
      lineColor: '#666',
      secondaryColor: '#1a1a1a',
      tertiaryColor: '#333',
      background: '#0a0a0a',
      mainBkg: '#1f2937',
      nodeBorder: '#22c55e',
      clusterBkg: '#1a1a1a',
      clusterBorder: '#333',
      titleColor: '#fff',
      edgeLabelBackground: '#1a1a1a',
    },
  },
  forest: {
    theme: 'forest',
    themeVariables: {
      primaryColor: '#cde498',
      primaryTextColor: '#13540c',
      primaryBorderColor: '#13540c',
      lineColor: '#6eaa49',
      secondaryColor: '#cdffb2',
      tertiaryColor: '#f4f4f4',
      background: '#fff',
      mainBkg: '#cde498',
      nodeBorder: '#13540c',
      clusterBkg: '#cdffb2',
      clusterBorder: '#6eaa49',
      titleColor: '#13540c',
      edgeLabelBackground: '#e8e8e8',
    },
  },
  base: {
    theme: 'base',
    themeVariables: {
      primaryColor: '#fff4dd',
      primaryTextColor: '#333',
      primaryBorderColor: '#f9a825',
      lineColor: '#666',
      secondaryColor: '#fff4dd',
      tertiaryColor: '#fff',
      background: '#fff',
      mainBkg: '#fff4dd',
      nodeBorder: '#f9a825',
      clusterBkg: '#fff4dd',
      clusterBorder: '#f9a825',
      titleColor: '#333',
      edgeLabelBackground: '#fff4dd',
    },
  },
};

// Map app themes to mermaid themes
const appThemeToMermaid: Record<string, MermaidTheme> = {
  unix: 'dark',
  cyberpunk: 'dark',
  dracula: 'dark',
  light: 'default',
};

// Track current mermaid theme
let currentMermaidTheme: MermaidTheme | null = null;

function initMermaid(mermaidTheme: MermaidTheme, force = false) {
  if (currentMermaidTheme === mermaidTheme && !force) return;

  const isMobile = window.innerWidth < 640;
  const config = mermaidThemeConfigs[mermaidTheme];

  try {
    mermaid.initialize({
      startOnLoad: false,
      ...config,
      securityLevel: 'loose',
      fontFamily: 'monospace, sans-serif',
      fontSize: isMobile ? 14 : 12,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: isMobile ? 30 : 50,
        rankSpacing: isMobile ? 30 : 50,
        padding: isMobile ? 8 : 15,
      },
    });
    currentMermaidTheme = mermaidTheme;
  } catch (e) {
    console.error('Mermaid init error:', e);
  }
}

interface MermaidProps {
  chart: string;
  themeOverride?: MermaidTheme;
}

export function Mermaid({ chart, themeOverride }: MermaidProps) {
  const { theme: appTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const expandedContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedMermaidTheme, setSelectedMermaidTheme] = useState<MermaidTheme | null>(() => {
    const saved = localStorage.getItem('mermaid-theme');
    return saved ? (saved as MermaidTheme) : null;
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const renderIdRef = useRef(0);

  // Persist theme selection to localStorage
  const handleThemeChange = (theme: MermaidTheme | null) => {
    setSelectedMermaidTheme(theme);
    if (theme) {
      localStorage.setItem('mermaid-theme', theme);
    } else {
      localStorage.removeItem('mermaid-theme');
    }
  };

  // Determine which mermaid theme to use
  const effectiveMermaidTheme = themeOverride || selectedMermaidTheme || appThemeToMermaid[appTheme] || 'dark';

  // Calculate optimal zoom to fit diagram in container
  const calculateOptimalZoom = useCallback(() => {
    if (!expandedContainerRef.current || !svgContent) return 1;
    
    const container = expandedContainerRef.current;
    const svg = container.querySelector('svg');
    if (!svg) return 1;

    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    
    const svgWidth = svg.getBoundingClientRect().width / zoomLevel;
    const svgHeight = svg.getBoundingClientRect().height / zoomLevel;
    
    if (svgWidth === 0 || svgHeight === 0) return 1;

    const zoomX = containerWidth / svgWidth;
    const zoomY = containerHeight / svgHeight;
    
    const optimalZoom = Math.min(zoomX, zoomY);
    return Math.max(1, Math.min(4, optimalZoom));
  }, [svgContent, zoomLevel]);

  // Auto-fit when expanded
  useEffect(() => {
    if (isExpanded && svgContent) {
      const timer = setTimeout(() => {
        const optimal = calculateOptimalZoom();
        setZoomLevel(optimal);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, svgContent]);

  // Reset zoom when collapsed
  useEffect(() => {
    if (!isExpanded) {
      setZoomLevel(1);
      setShowThemePicker(false);
    }
  }, [isExpanded]);

  // Handle ESC key to close expanded view
  useEffect(() => {
    if (!isExpanded) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        setIsExpanded(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isExpanded]);

  // Render mermaid diagram
  useEffect(() => {
    if (!chart) {
      setError('Empty diagram');
      setIsLoading(false);
      return;
    }

    const currentRenderId = ++renderIdRef.current;
    setError(null);
    setSvgContent(null);
    setIsLoading(true);

    initMermaid(effectiveMermaidTheme, true);

    const id = `mermaid-${currentRenderId}-${Math.random().toString(36).slice(2, 11)}`;
    const cleanChart = chart.trim().replace(/\r\n/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '');
    
    if (!cleanChart) {
      setError('Empty diagram');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const renderChart = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 50));
        if (cancelled) return;
        
        const { svg } = await mermaid.render(id, cleanChart);
        
        if (!cancelled && currentRenderId === renderIdRef.current) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (!cancelled && currentRenderId === renderIdRef.current) {
          const errorMsg = err?.message || err?.str || 'Failed to render diagram';
          setError(typeof errorMsg === 'string' ? errorMsg : 'Render failed');
        }
      } finally {
        if (!cancelled && currentRenderId === renderIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    renderChart();
    return () => { cancelled = true; };
  }, [chart, effectiveMermaidTheme]);

  const handleFitToScreen = () => {
    const optimal = calculateOptimalZoom();
    setZoomLevel(optimal);
  };

  const mermaidThemes: { id: MermaidTheme; name: string; color: string }[] = [
    { id: 'default', name: 'Default', color: '#326ce5' },
    { id: 'neutral', name: 'Neutral', color: '#999' },
    { id: 'dark', name: 'Dark', color: '#22c55e' },
    { id: 'forest', name: 'Forest', color: '#6eaa49' },
    { id: 'base', name: 'Base', color: '#f9a825' },
  ];

  // Silently hide failed diagrams - don't show error to user
  if (error) {
    // Log error for debugging but don't render anything
    console.warn('Mermaid diagram skipped due to error:', error);
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center py-8">
        <div className="text-xs text-white/30 animate-pulse">Loading diagram...</div>
      </div>
    );
  }

  if (!svgContent) return null;

  // Expanded view
  if (isExpanded) {
    return (
      <div className="fixed inset-0 md:absolute md:inset-0 z-50 bg-black flex flex-col">
        {/* Header with controls */}
        <div className="flex items-center justify-between p-2 border-b border-white/10 bg-black shrink-0">
          <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary"></span> Diagram
          </div>
          <div className="flex items-center gap-1">
            {/* Theme picker */}
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors flex items-center gap-1"
                title="Change theme"
              >
                <Palette className="w-3.5 h-3.5 text-white/70" />
                <span className="text-[9px] text-white/50 hidden sm:inline">{effectiveMermaidTheme}</span>
              </button>
              {showThemePicker && (
                <div className="absolute top-full right-0 mt-1 bg-black border border-white/20 rounded shadow-lg z-10 min-w-[120px]">
                  {mermaidThemes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        handleThemeChange(t.id);
                        setShowThemePicker(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-[10px] hover:bg-white/10 flex items-center gap-2 ${
                        effectiveMermaidTheme === t.id ? 'text-primary' : 'text-white/70'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </button>
                  ))}
                  <div className="border-t border-white/10 mt-1 pt-1">
                    <button
                      onClick={() => {
                        handleThemeChange(null);
                        setShowThemePicker(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-[10px] text-white/50 hover:bg-white/10"
                    >
                      Auto (match app)
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5 text-white/70" />
            </button>
            <span className="text-[10px] text-white/50 w-12 text-center font-mono">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(z => Math.min(4, z + 0.25))}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5 text-white/70" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="px-2 py-1 text-[9px] text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors uppercase tracking-wider"
              title="Fit to screen"
            >
              Fit
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        </div>

        {/* Zoomable diagram area */}
        <div 
          ref={expandedContainerRef}
          className="flex-1 overflow-auto flex items-center justify-center p-4"
          onClick={() => setShowThemePicker(false)}
        >
          <div 
            className="mermaid-container transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </div>
    );
  }

  // Normal view with expand button (desktop only)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  return (
    <div className="relative group">
      <div 
        ref={ref}
        className={`w-full flex justify-center my-1 sm:my-4 overflow-x-auto mermaid-container mermaid-mobile-fit ${!isMobile ? 'cursor-pointer' : ''}`}
        onClick={() => !isMobile && setIsExpanded(true)}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {/* Expand button - hidden on mobile */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
        className="absolute top-1 right-1 p-1.5 bg-black/70 hover:bg-primary rounded opacity-0 group-hover:opacity-100 transition-all border border-white/20 hidden sm:block"
        title="Expand diagram"
      >
        <Maximize2 className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}

// Export theme types for external use
export type { MermaidTheme };
export { mermaidThemeConfigs };
