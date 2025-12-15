import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Move, Palette } from 'lucide-react';
// @ts-ignore
import mermaid from 'mermaid/dist/mermaid.esm.mjs';
import { useTheme } from '../context/ThemeContext';
import { mermaidThemeConfigs, type MermaidTheme } from './Mermaid';

const appThemeToMermaid: Record<string, MermaidTheme> = {
  unix: 'dark',
  cyberpunk: 'dark',
  dracula: 'dark',
  light: 'default',
};

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
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: isMobile ? 12 : 14,
      flowchart: {
        useMaxWidth: false, // Allow natural width for better text rendering
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: isMobile ? 40 : 50,
        rankSpacing: isMobile ? 40 : 50,
        padding: isMobile ? 12 : 15,
        wrappingWidth: isMobile ? 150 : 200,
      },
      sequence: {
        diagramMarginX: isMobile ? 20 : 50,
        diagramMarginY: isMobile ? 10 : 20,
        boxMargin: isMobile ? 5 : 10,
        noteMargin: isMobile ? 5 : 10,
        messageMargin: isMobile ? 25 : 35,
        mirrorActors: false,
        useMaxWidth: false,
      },
    });
    currentMermaidTheme = mermaidTheme;
  } catch (e) {
    console.error('Mermaid init error:', e);
  }
}

interface EnhancedMermaidProps {
  chart: string;
  compact?: boolean;
}

export function EnhancedMermaid({ chart, compact = false }: EnhancedMermaidProps) {
  const { theme: appTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedMermaidTheme, setSelectedMermaidTheme] = useState<MermaidTheme | null>(() => {
    const saved = localStorage.getItem('mermaid-theme');
    return saved ? (saved as MermaidTheme) : null;
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const renderIdRef = useRef(0);
  
  // Mobile pinch-to-zoom state for inline view - must be declared at top level
  const [inlineZoom, setInlineZoom] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const inlineTouchRef = useRef({ dist: 0, initialZoom: 1 });
  
  // Detect mobile device
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 640;
  
  // Disable mermaid on mobile - show placeholder instead
  if (isMobileDevice) {
    return (
      <div 
        className="w-full p-4 border border-white/10 bg-black/20 rounded-lg text-center"
        data-testid="mermaid-mobile-placeholder"
      >
        <div className="text-white/50 text-sm mb-2">📊 Diagram</div>
        <div className="text-white/30 text-xs">
          Diagrams are best viewed on desktop for optimal experience
        </div>
      </div>
    );
  }

  // Persist theme selection to localStorage
  const handleThemeChange = (theme: MermaidTheme | null) => {
    setSelectedMermaidTheme(theme);
    if (theme) {
      localStorage.setItem('mermaid-theme', theme);
    } else {
      localStorage.removeItem('mermaid-theme');
    }
  };

  const effectiveMermaidTheme = selectedMermaidTheme || appThemeToMermaid[appTheme] || 'dark';

  const resetView = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isExpanded) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const touchStartRef = useRef({ x: 0, y: 0, dist: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isExpanded) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touchStartRef.current = { x: position.x, y: position.y, dist };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isExpanded) return;
    if (e.touches.length === 1 && isDragging) {
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const scale = dist / touchStartRef.current.dist;
      setZoom(z => Math.max(0.25, Math.min(z * scale, 4)));
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  useEffect(() => {
    if (isExpanded) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        setIsExpanded(false);
        resetView();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isExpanded, resetView]);

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

  const mermaidThemes: { id: MermaidTheme; name: string; color: string }[] = [
    { id: 'default', name: 'Default', color: '#326ce5' },
    { id: 'neutral', name: 'Neutral', color: '#999' },
    { id: 'dark', name: 'Dark', color: '#22c55e' },
    { id: 'forest', name: 'Forest', color: '#6eaa49' },
    { id: 'base', name: 'Base', color: '#f9a825' },
  ];

  if (error) {
    return (
      <div className="w-full p-3 sm:p-4 border border-red-500/30 bg-red-500/5 rounded text-red-400 text-xs">
        <div className="mb-2 font-bold">Diagram Error</div>
        <pre className="text-[10px] opacity-50 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">{chart}</pre>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="text-xs text-white/30">Rendering diagram...</div>
        </div>
      </div>
    );
  }

  if (!svgContent) return null;

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/90 shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-white/50 uppercase tracking-widest">
            <Move className="w-3.5 h-3.5" />
            <span>Zoom: {Math.round(zoom * 100)}%</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="relative">
              <button onClick={() => setShowThemePicker(!showThemePicker)} className="p-2 hover:bg-white/10 rounded transition-colors flex items-center gap-1" title="Change theme">
                <Palette className="w-4 h-4 text-white/70" />
                <span className="text-[9px] text-white/50 hidden sm:inline">{effectiveMermaidTheme}</span>
              </button>
              {showThemePicker && (
                <div className="absolute top-full right-0 mt-1 bg-black border border-white/20 rounded shadow-lg z-10 min-w-[120px]">
                  {mermaidThemes.map((t) => (
                    <button key={t.id} onClick={() => { handleThemeChange(t.id); setShowThemePicker(false); }}
                      className={`w-full px-3 py-1.5 text-left text-[10px] hover:bg-white/10 flex items-center gap-2 ${effectiveMermaidTheme === t.id ? 'text-primary' : 'text-white/70'}`}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </button>
                  ))}
                  <div className="border-t border-white/10 mt-1 pt-1">
                    <button onClick={() => { handleThemeChange(null); setShowThemePicker(false); }} className="w-full px-3 py-1.5 text-left text-[10px] text-white/50 hover:bg-white/10">
                      Auto (match app)
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded transition-colors" title="Zoom out"><ZoomOut className="w-4 h-4 text-white/70" /></button>
            <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded transition-colors" title="Zoom in"><ZoomIn className="w-4 h-4 text-white/70" /></button>
            <button onClick={resetView} className="px-3 py-1 text-[10px] text-white/50 hover:text-white hover:bg-white/10 rounded uppercase" title="Reset">Reset</button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button onClick={() => { setIsExpanded(false); resetView(); }} className="p-2 hover:bg-white/10 rounded transition-colors" title="Close"><X className="w-4 h-4 text-white/70" /></button>
          </div>
        </div>

        <div 
          ref={svgContainerRef}
          className="flex-1 overflow-hidden flex items-center justify-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', backgroundColor: '#0a0a0a' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => setShowThemePicker(false)}
        >
          <div style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}>
            <div className="mermaid-container" dangerouslySetInnerHTML={{ __html: svgContent }} />
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 border border-white/20 rounded text-[10px] text-white/50 uppercase tracking-widest">
          Drag to pan • Scroll/pinch to zoom • ESC to close
        </div>
      </div>
    );
  }

  const handleInlineTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      inlineTouchRef.current = { dist, initialZoom: inlineZoom };
    }
  };
  
  const handleInlineTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      e.stopPropagation();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / inlineTouchRef.current.dist;
      const newZoom = Math.max(0.5, Math.min(inlineTouchRef.current.initialZoom * scale, 3));
      setInlineZoom(newZoom);
    }
  };
  
  const handleInlineTouchEnd = () => {
    setIsPinching(false);
  };
  
  const handleInlineDoubleTap = () => {
    // Toggle between 1x and 1.5x zoom on double tap
    setInlineZoom(prev => prev === 1 ? 1.5 : 1);
  };
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div ref={containerRef} className="relative group">
      <div 
        className={`w-full overflow-x-auto overflow-y-hidden rounded-lg border border-white/10 bg-black/20 ${compact ? 'p-2' : 'p-3 sm:p-4'} ${!compact ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}`}
        onClick={() => !compact && !isMobile && setIsExpanded(true)}
        onTouchStart={handleInlineTouchStart}
        onTouchMove={handleInlineTouchMove}
        onTouchEnd={handleInlineTouchEnd}
        onDoubleClick={handleInlineDoubleTap}
        style={{ touchAction: isPinching ? 'none' : 'pan-x pan-y' }}
      >
        <div 
          className="mermaid-container transition-transform duration-150 inline-block min-w-full" 
          style={{ 
            transform: `scale(${inlineZoom})`, 
            transformOrigin: 'top left',
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }} 
        />
      </div>
      
      {/* Zoom controls on mobile */}
      {isMobile && !compact && (
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setInlineZoom(z => Math.max(0.5, z - 0.25)); }}
            className="p-1.5 bg-black/80 rounded border border-white/20 text-white/70 hover:text-white"
            title="Zoom out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="px-2 py-1 bg-black/80 rounded text-[10px] text-white/70 min-w-[40px] text-center">
            {Math.round(inlineZoom * 100)}%
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); setInlineZoom(z => Math.min(3, z + 0.25)); }}
            className="p-1.5 bg-black/80 rounded border border-white/20 text-white/70 hover:text-white"
            title="Zoom in"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      )}
      
      {/* Expand button - always visible on mobile, hover on desktop */}
      {!compact && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
          className={`absolute top-2 right-2 p-2 bg-black/80 hover:bg-primary/90 rounded border border-white/20 transition-all ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
          title="Expand diagram"
        >
          <Maximize2 className="w-3.5 h-3.5 text-white" />
        </button>
      )}
      
      {/* Reset zoom button when zoomed */}
      {isMobile && !compact && inlineZoom !== 1 && (
        <button 
          onClick={(e) => { e.stopPropagation(); setInlineZoom(1); }}
          className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded border border-white/20 text-[9px] text-white/70 hover:text-white"
        >
          Reset
        </button>
      )}
    </div>
  );
}
