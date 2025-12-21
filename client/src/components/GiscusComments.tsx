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
    <div className="w-full">
      {/* Compact Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 rounded-lg transition-all group"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-xs sm:text-sm text-muted-foreground group-hover:text-foreground font-medium transition-colors">
            Discussion
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Giscus Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
                </div>
              )}
              
              <div 
                ref={containerRef} 
                className="giscus-container"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
