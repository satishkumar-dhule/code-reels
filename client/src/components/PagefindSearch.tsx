import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowRight, Zap, Target, Flame, Filter, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useDebounce } from '@/hooks/use-debounce';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useUnifiedToast } from '@/hooks/use-unified-toast';
import { allChannelsConfig } from '../lib/channels-config';

// Pagefind types
interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

interface PagefindResultData {
  url: string;
  content: string;
  word_count: number;
  filters: Record<string, string[]>;
  meta: {
    title: string;
    channel?: string;
    difficulty?: string;
    id?: string;
  };
  excerpt: string;
}

interface PagefindSearchResponse {
  results: PagefindResult[];
  filters: Record<string, Record<string, number>>;
  totalFilters: Record<string, Record<string, number>>;
  timings: {
    preload: number;
    search: number;
    total: number;
  };
}

interface Pagefind {
  init: () => Promise<void>;
  search: (query: string, options?: { filters?: Record<string, string> }) => Promise<PagefindSearchResponse>;
  filters: () => Promise<Record<string, Record<string, number>>>;
}

declare global {
  interface Window {
    pagefind?: Pagefind;
  }
}

interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  channel: string;
  difficulty: string;
}

interface PagefindSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PagefindSearch({ isOpen, onClose }: PagefindSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, Record<string, number>>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const pagefindRef = useRef<Pagefind | null>(null);
  const [, setLocation] = useLocation();
  const { isSubscribed, subscribeChannel } = useUserPreferences();
  const { toast } = useUnifiedToast();
  
  const debouncedQuery = useDebounce(query, 200);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Pagefind
  useEffect(() => {
    async function initPagefind() {
      try {
        if (!document.querySelector('link[href*="pagefind"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = '/pagefind/pagefind-ui.css';
          document.head.appendChild(link);
        }

        if (!window.pagefind) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/pagefind/pagefind.js';
            script.type = 'module';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Pagefind script'));
            document.head.appendChild(script);
          });

          let attempts = 0;
          while (!window.pagefind && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
          }
        }

        if (!window.pagefind) {
          throw new Error('Pagefind not available');
        }

        await window.pagefind.init();
        pagefindRef.current = window.pagefind;

        const availableFilters = await window.pagefind.filters();
        setFilters(availableFilters);

        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('Failed to load Pagefind:', err);
        setError('Search index not available. Using fallback search.');
        setIsLoading(false);
      }
    }

    if (isOpen && !pagefindRef.current) {
      initPagefind();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setActiveFilter(null);
    }
  }, [isOpen]);

  useEffect(() => {
    async function performSearch() {
      if (!pagefindRef.current || debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchOptions: { filters?: Record<string, string> } = {};
        if (activeFilter) {
          searchOptions.filters = { difficulty: activeFilter };
        }
        
        const response = await pagefindRef.current.search(debouncedQuery, searchOptions);
        
        const loadedResults = await Promise.all(
          response.results.slice(0, 15).map(async (result) => {
            const data = await result.data();
            return {
              id: data.meta.id || result.id,
              title: data.meta.title,
              excerpt: data.excerpt,
              channel: data.meta.channel || '',
              difficulty: data.meta.difficulty || 'intermediate',
            };
          })
        );
        
        setResults(loadedResults);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedQuery, activeFilter]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateToQuestion(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, onClose]);

  const navigateToQuestion = (result: SearchResultItem) => {
    const channel = result.channel;
    
    // Don't auto-subscribe here - let the viewer handle it with proper validation
    // This ensures channels with no questions won't be added
    
    // Navigate using question ID directly in URL path
    if (channel) {
      setLocation(`/channel/${channel}/${result.id}`);
    }
    
    onClose();
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return <Zap className="w-3 h-3 text-green-400" />;
      case 'intermediate': return <Target className="w-3 h-3 text-yellow-400" />;
      case 'advanced': return <Flame className="w-3 h-3 text-red-400" />;
      default: return null;
    }
  };

  const renderFilters = () => {
    if (!filters.difficulty || Object.keys(filters.difficulty).length === 0) return null;
    
    return (
      <div className={`flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto no-scrollbar flex-shrink-0 ${!isMobile ? 'flex-wrap' : ''}`}>
        {!isMobile && <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Difficulty:</span>}
        <button
          onClick={() => setActiveFilter(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all flex-shrink-0 ${
            !activeFilter ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Filter className="w-3 h-3" /> All
        </button>
        {Object.entries(filters.difficulty).map(([level, count]) => (
          <button
            key={level}
            onClick={() => setActiveFilter(activeFilter === level ? null : level)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all flex-shrink-0 ${
              activeFilter === level ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {getDifficultyIcon(level)} {level} ({count})
          </button>
        ))}
      </div>
    );
  };

  const renderResults = () => (
    <div className="flex-1 overflow-y-auto">
      {isSearching && (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}
      {!isSearching && query.length >= 2 && results.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-base">No questions found for "{query}"</p>
          <p className="text-sm mt-2 opacity-70">Try different keywords</p>
        </div>
      )}
      {!isSearching && results.length > 0 && (
        <div className="py-2">
          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => navigateToQuestion(result)}
              className={`w-full px-4 py-4 text-left flex items-start gap-3 transition-colors active:bg-primary/10 ${
                index === selectedIndex ? 'bg-primary/20' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getDifficultyIcon(result.difficulty)}
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{result.channel}</span>
                </div>
                <p className="text-sm text-foreground line-clamp-2">{result.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: result.excerpt }} />
              </div>
              <ArrowRight className={`w-4 h-4 shrink-0 mt-1 ${index === selectedIndex ? 'text-primary' : 'text-muted-foreground/30'}`} />
            </button>
          ))}
        </div>
      )}
      {!isSearching && query.length < 2 && !isLoading && (
        <div className="p-8 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-base mb-1">Type at least 2 characters</p>
          <p className="text-sm opacity-70 mb-6">Search questions, topics, or tags</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['react hooks', 'system design', 'sql joins', 'kubernetes'].map(term => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 border border-border rounded-full transition-colors active:scale-95"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  // Mobile: True fullscreen
  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-background flex flex-col"
          data-testid="pagefind-search-mobile"
        >
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card flex-shrink-0 pt-safe">
            <h2 className="font-semibold text-lg">Search</h2>
            <button onClick={onClose} className="p-2 -mr-2 hover:bg-muted rounded-full" data-testid="search-close-btn">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin flex-shrink-0" />
            ) : (
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Loading search..." : "Search questions..."}
              className="flex-1 bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/50"
              autoComplete="off"
              spellCheck={false}
              disabled={isLoading}
              data-testid="search-input"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1.5 hover:bg-muted rounded-full flex-shrink-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs flex-shrink-0">
              {error}
            </div>
          )}

          {renderFilters()}
          {renderResults()}

          {/* Mobile Footer */}
          <div 
            className="px-4 py-3 border-t border-border bg-card flex-shrink-0" 
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
          >
            <p className="text-sm text-muted-foreground text-center">
              {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'Tap to search'}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop: Centered modal with backdrop
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
        onClick={onClose}
        data-testid="pagefind-search-desktop"
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Desktop Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Loading search..." : "Search questions, topics, tags..."}
              className="flex-1 bg-transparent text-foreground text-lg outline-none placeholder:text-muted-foreground/50"
              autoComplete="off"
              spellCheck={false}
              disabled={isLoading}
              data-testid="search-input"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1.5 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <kbd className="px-2 py-1 text-[10px] text-muted-foreground bg-muted border border-border rounded">ESC</kbd>
          </div>

          {error && (
            <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs">
              {error}
            </div>
          )}

          {renderFilters()}
          {renderResults()}

          {/* Desktop Footer */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd> Select</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">ESC</kbd> Close</span>
            </div>
            {results.length > 0 && <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
