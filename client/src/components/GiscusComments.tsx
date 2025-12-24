import { useEffect, useRef, useState } from 'react';
import { MessageCircle, ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const GISCUS_REPO = import.meta.env.VITE_GISCUS_REPO || 'open-interview/open-interview.github.io';
const GISCUS_REPO_ID = import.meta.env.VITE_GISCUS_REPO_ID || 'R_kgDOQuSz7g';
const GISCUS_CATEGORY = import.meta.env.VITE_GISCUS_CATEGORY || 'General';
const GISCUS_CATEGORY_ID = import.meta.env.VITE_GISCUS_CATEGORY_ID || 'DIC_kwDOQuSz7s4C0NCw';

const LIGHT_THEMES = ['clean', 'light', 'macos-light', 'ios-light', 'playful', 'aqua', 'solarized'];

interface GiscusCommentsProps {
  questionId: string;
}

export function GiscusComments({ questionId }: GiscusCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  const giscusTheme = LIGHT_THEMES.includes(theme) ? 'light' : 'transparent_dark';
  const isConfigured = GISCUS_REPO_ID && GISCUS_CATEGORY_ID;

  useEffect(() => {
    // Only load when opened and not already loaded for this question
    if (!isOpen || !containerRef.current || hasLoaded || !isConfigured) return;

    setIsLoading(true);
    
    // Clear any existing content safely
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', GISCUS_REPO);
    script.setAttribute('data-repo-id', GISCUS_REPO_ID);
    script.setAttribute('data-category', GISCUS_CATEGORY);
    script.setAttribute('data-category-id', GISCUS_CATEGORY_ID);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', questionId);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '0');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', giscusTheme);
    script.setAttribute('data-lang', 'en');
    script.crossOrigin = 'anonymous';
    script.async = true;

    containerRef.current.appendChild(script);

    const timeout = setTimeout(() => {
      setIsLoading(false);
      setHasLoaded(true);
    }, 3000);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin === 'https://giscus.app' && event.data?.giscus) {
        setIsLoading(false);
        setHasLoaded(true);
        clearTimeout(timeout);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, [isOpen, questionId, giscusTheme, hasLoaded]);

  // Reset hasLoaded when questionId changes
  useEffect(() => {
    setHasLoaded(false);
    setIsOpen(false);
  }, [questionId]);

  return (
    <div className="w-full mt-4 pb-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/40 rounded-xl border border-border/50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium text-foreground">Discussion</span>
            <p className="text-xs text-muted-foreground">Ask questions or share insights</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-4">
          {!isConfigured ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">Comments are being set up</span>
              <span className="text-xs text-muted-foreground/70">Check back soon!</span>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">Loading discussion...</span>
                </div>
              )}
              <div 
                ref={containerRef}
                className="giscus min-h-[100px]"
                style={{ colorScheme: LIGHT_THEMES.includes(theme) ? 'light' : 'dark' }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
