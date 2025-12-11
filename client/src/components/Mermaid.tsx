import { useEffect, useRef, useState } from 'react';
// @ts-ignore - Use the full ESM bundle to avoid dynamic import issues on GitHub Pages
import mermaid from 'mermaid/dist/mermaid.esm.mjs';

// Initialize mermaid once
let initialized = false;

function initMermaid() {
  if (initialized) return;
  
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'monospace, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
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
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderIdRef = useRef(0);

  useEffect(() => {
    if (!chart) {
      setError('Empty diagram');
      setIsLoading(false);
      return;
    }

    const currentRenderId = ++renderIdRef.current;
    
    // Reset state
    setError(null);
    setSvgContent(null);
    setIsLoading(true);

    // Initialize mermaid
    initMermaid();

    // Generate unique ID
    const id = `mermaid-${currentRenderId}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Clean chart - remove leading/trailing whitespace and normalize line endings
    const cleanChart = chart
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');
    
    // Skip empty charts
    if (!cleanChart) {
      setError('Empty diagram');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    // Use async rendering
    const renderChart = async () => {
      try {
        // Small delay to ensure DOM is ready
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

    return () => {
      cancelled = true;
    };
  }, [chart]);

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

  if (!svgContent) {
    return null;
  }

  return (
    <div 
      ref={ref}
      className="w-full flex justify-center my-2 sm:my-4 overflow-x-auto mermaid-container"
      style={{ minHeight: '80px' }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}