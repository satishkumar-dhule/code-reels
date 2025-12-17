import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Loader2 } from 'lucide-react';

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
    script.setAttribute('data-repo', 'reel-interview/reel-interview.github.io');
    script.setAttribute('data-repo-id', 'R_kgDOQmWfUw');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDOQmWfU84Cz7Th');
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', questionId); // Use questionId for unique discussions per question
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'dark_dimmed');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => {
      // Give Giscus a moment to render
      setTimeout(() => setIsLoading(false), 1000);
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
      {/* Discuss Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-all group"
      >
        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
        <span className="text-[10px] sm:text-sm text-purple-400 group-hover:text-purple-300 font-medium transition-colors">
          {isOpen ? 'Hide Discussion' : 'Discuss'}
        </span>
      </button>

      {/* Giscus Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden mt-3 sm:mt-4"
          >
            <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-purple-400" />
                  <span className="text-xs sm:text-sm font-medium text-white/80">
                    Discussion
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-white/50 hover:text-white/80" />
                </button>
              </div>
              
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  <span className="ml-2 text-sm text-white/60">Loading comments...</span>
                </div>
              )}
              
              <div 
                ref={containerRef} 
                className="giscus-container min-h-[200px]"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
