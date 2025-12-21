import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronDown, Loader2 } from 'lucide-react';

// Giscus configuration - uses environment variables with fallbacks
const GISCUS_REPO = import.meta.env.VITE_GISCUS_REPO || 'satishkumar-dhule/code-reels';
const GISCUS_REPO_ID = import.meta.env.VITE_GISCUS_REPO_ID || 'R_kgDOQmWh6w';
const GISCUS_CATEGORY = import.meta.env.VITE_GISCUS_CATEGORY || 'General';
const GISCUS_CATEGORY_ID = import.meta.env.VITE_GISCUS_CATEGORY_ID || 'DIC_kwDOQmWh684C0ESo';

interface GiscusCommentsProps {
  questionId: string;
}

export function GiscusComments({ questionId }: GiscusCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    setIsLoading(true);

    // Clear any existing giscus
    containerRef.current.innerHTML = '';

    // Create script element for Giscus
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', GISCUS_REPO);
    script.setAttribute('data-repo-id', GISCUS_REPO_ID);
    script.setAttribute('data-category', GISCUS_CATEGORY);
    script.setAttribute('data-category-id', GISCUS_CATEGORY_ID);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', questionId);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '0'); // Disable reactions for cleaner look
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'transparent_dark');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => {
      setTimeout(() => setIsLoading(false), 800);
    };

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isOpen, questionId]);

  return (
    <div className="w-full mt-4">
      {/* Discussion Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/40 rounded-xl border border-border/50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium text-foreground">
              Discussion
            </span>
            <p className="text-xs text-muted-foreground">
              Ask questions or share insights
            </p>
          </div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Giscus Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-2">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading discussion...</span>
                </div>
              )}
              
              <div 
                ref={containerRef} 
                className="giscus-container rounded-xl overflow-hidden"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
