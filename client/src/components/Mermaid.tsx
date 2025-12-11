import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
// @ts-ignore - Use the full ESM bundle to avoid dynamic import issues on GitHub Pages
import mermaid from 'mermaid/dist/mermaid.esm.mjs';

// Initialize mermaid once
let initialized = false;

function initMermaid() {
  if (initialized) return;

  const isMobile = window.innerWidth < 640;

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
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
      themeVariables: {
        primaryColor: '#22c55e',
        primaryTextColor: '#fff',
        primaryBorderColor: '#22c55e',
        lineColor: '#666',
        secondaryColor: '#1a1a1a',
        tertiaryColor: '#333',
        background: '#0a0a0a',
        mainBkg: '#1a1a1a',
        nodeBorder: '#22c55e',
        clusterBkg: '#1a1a1a',
        clusterBorder: '#333',
        titleColor: '#fff',
        edgeLabelBackground: '#1a1a1a',
        fontSize: isMobile ? '14px' : '12px',
      },
    });
    initialized = true;
  } catch (e) {
    console.error('Mermaid init error:', e);
  }
}

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const expandedContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const renderIdRef = useRef(0);

  // Calculate optimal zoom to fit diagram in container
  const calculateOptimalZoom = useCallback(() => {
    if (!expandedContainerRef.current || !svgContent) return 1;
    
    const container = expandedContainerRef.current;
    const svg = container.querySelector('svg');
    if (!svg) return 1;

    // Get container dimensions (with padding)
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    
    // Get SVG natural dimensions
    const svgWidth = svg.getBoundingClientRect().width / zoomLevel;
    const svgHeight = svg.getBoundingClientRect().height / zoomLevel;
    
    if (svgWidth === 0 || svgHeight === 0) return 1;

    // Calculate zoom to fit both dimensions
    const zoomX = containerWidth / svgWidth;
    const zoomY = containerHeight / svgHeight;
    
    // Use the smaller zoom to ensure it fits, cap between 1 and 4
    const optimalZoom = Math.min(zoomX, zoomY);
    return Math.max(1, Math.min(4, optimalZoom));
  }, [svgContent, zoomLevel]);

  // Auto-fit when expanded
  useEffect(() => {
    if (isExpanded && svgContent) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const optimal = calculateOptimalZoom();
        setZoomLevel(optimal);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, svgContent]);

  // Reset zoom when collapsed
  useEffect(() => {
    if (!isExpanded) setZoomLevel(1);
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
    
    // Use capture phase to intercept before parent handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isExpanded]);

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

    initMermaid();

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
  }, [chart]);

  const handleFitToScreen = () => {
    const optimal = calculateOptimalZoom();
    setZoomLevel(optimal);
  };

  if (error) {
    return (
      <div className="w-full p-3 sm:p-4 border border-red-500/50 bg-red-500/10 rounded text-red-400 text-xs font-mono">
        <div className="mb-2">{error}</div>
        <pre className="text-[9px] sm:text-[10px] opacity-50 overflow-x-auto whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
          {chart}
        </pre>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center py-8">
        <div className="text-xs text-white/30 animate-pulse">Loading diagram...</div>
      </div>
    );
  }

  if (!svgContent) return null;

  // Expanded view - covers the answer panel
  if (isExpanded) {
    return (
      <div className="fixed inset-0 md:absolute md:inset-0 z-50 bg-black flex flex-col">
        {/* Header with controls */}
        <div className="flex items-center justify-between p-2 border-b border-white/10 bg-black shrink-0">
          <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary"></span> Diagram
          </div>
          <div className="flex items-center gap-1">
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

  // Normal view with expand button
  return (
    <div className="relative group">
      <div 
        ref={ref}
        className="w-full flex justify-center my-1 sm:my-4 overflow-x-auto mermaid-container mermaid-mobile-fit cursor-pointer"
        onClick={() => setIsExpanded(true)}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
        className="absolute top-1 right-1 p-1.5 bg-black/70 hover:bg-primary rounded opacity-0 group-hover:opacity-100 transition-all border border-white/20"
        title="Expand diagram"
      >
        <Maximize2 className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}
