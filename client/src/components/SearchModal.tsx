import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowRight, Zap, Target, Flame, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { searchQuestions, type SearchResult } from '../lib/fuzzy-search';
import { useDebounce } from '@/hooks/use-debounce';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useToast } from '@/hooks/use-toast';
import { allChannelsConfig } from '../lib/channels-config';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { isSubscribed, subscribeChannel } = useUserPreferences();
  const { toast } = useToast();
  
  const debouncedQuery = useDebounce(query, 150);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);
  
  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsSearching(true);
      const searchResults = searchQuestions(debouncedQuery, 15);
      setResults(searchResults);
      setSelectedIndex(0);
      setIsSearching(false);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);
  
  // Keyboard navigation
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
  

  
  const navigateToQuestion = (result: SearchResult) => {
    const { question } = result;
    
    // Auto-subscribe if not already subscribed
    if (!isSubscribed(question.channel)) {
      subscribeChannel(question.channel);
      const channelConfig = allChannelsConfig.find(c => c.id === question.channel);
      toast({
        title: "Channel Subscribed",
        description: `You've been subscribed to ${channelConfig?.name || question.channel}`,
      });
    }
    
    // Navigate to channel - the question will be loaded lazily
    // Use question ID in URL for direct navigation
    setLocation(`/channel/${question.channel}?q=${question.id}`);
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
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-2xl bg-black border border-white/20 rounded-lg shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <Search className="w-5 h-5 text-white/50" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search questions, topics, tags..."
              className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-white/30"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4 text-white/50" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] text-white/40 bg-white/5 border border-white/10 rounded">
              ESC
            </kbd>
          </div>
          
          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isSearching && (
              <div className="p-8 text-center text-white/50">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            )}
            
            {!isSearching && query.length >= 2 && results.length === 0 && (
              <div className="p-8 text-center text-white/50">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No questions found for "{query}"</p>
                <p className="text-xs mt-1">Try different keywords or check spelling</p>
              </div>
            )}
            
            {!isSearching && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.question.id}-${index}`}
                    ref={el => {
                      if (index === selectedIndex && el) {
                        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                      }
                    }}
                    onClick={() => navigateToQuestion(result)}
                    className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                      index === selectedIndex ? 'bg-primary/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getDifficultyIcon(result.question.difficulty)}
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">
                          {result.question.channel}/{result.question.subChannel}
                        </span>
                      </div>
                      <p className="text-sm text-white truncate">
                        {result.question.question}
                      </p>
                      <p className="text-xs text-white/50 truncate mt-1">
                        {result.question.answer}
                      </p>
                      {result.question.tags && result.question.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Tag className="w-3 h-3 text-white/30" />
                          <span className="text-[10px] text-white/30">
                            {result.question.tags.slice(0, 3).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <ArrowRight className={`w-4 h-4 shrink-0 mt-1 transition-opacity ${
                      index === selectedIndex ? 'text-primary opacity-100' : 'text-white/30 opacity-0'
                    }`} />
                  </button>
                ))}
              </div>
            )}
            
            {!isSearching && query.length < 2 && (
              <div className="p-6 text-center text-white/40">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Type at least 2 characters to search</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['react hooks', 'system design', 'sql joins', 'kubernetes'].map(term => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/30">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1 bg-white/10 rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1 bg-white/10 rounded">↵</kbd> Select</span>
              <span><kbd className="px-1 bg-white/10 rounded">ESC</kbd> Close</span>
            </div>
            {results.length > 0 && (
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
