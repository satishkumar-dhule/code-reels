import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowRight, Zap, Target, Flame, Tag, Building2, Video, GitBranch, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { searchQuestions, type SearchResult } from '../lib/fuzzy-search';
import { useDebounce } from '@/hooks/use-debounce';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useToast } from '@/hooks/use-toast';
import { allChannelsConfig } from '../lib/channels-config';
import { getQuestions } from '../lib/data';
import { formatTag } from '../lib/utils';

type FilterType = 'all' | 'company' | 'video' | 'diagram';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { isSubscribed, subscribeChannel } = useUserPreferences();
  const { toast } = useToast();
  
  const debouncedQuery = useDebounce(query, 150);

  // Filter definitions
  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Filter className="w-3 h-3" /> },
    { id: 'company', label: 'Company', icon: <Building2 className="w-3 h-3" /> },
    { id: 'video', label: 'Video', icon: <Video className="w-3 h-3" /> },
    { id: 'diagram', label: 'Diagram', icon: <GitBranch className="w-3 h-3" /> },
  ];
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setFilteredResults([]);
      setSelectedIndex(0);
      setActiveFilter('all');
    }
  }, [isOpen]);
  
  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsSearching(true);
      const searchResults = searchQuestions(debouncedQuery, 50); // Get more results for filtering
      setResults(searchResults);
      setSelectedIndex(0);
      setIsSearching(false);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  // Apply filter to results
  useEffect(() => {
    let filtered = results;
    
    switch (activeFilter) {
      case 'company':
        filtered = results.filter(r => r.question.companies && r.question.companies.length > 0);
        break;
      case 'video':
        filtered = results.filter(r => 
          r.question.videos?.shortVideo || r.question.videos?.longVideo
        );
        break;
      case 'diagram':
        filtered = results.filter(r => 
          r.question.diagram && r.question.diagram.length > 20
        );
        break;
      default:
        filtered = results;
    }
    
    setFilteredResults(filtered.slice(0, 15));
    setSelectedIndex(0);
  }, [results, activeFilter]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      e.preventDefault();
      navigateToQuestion(filteredResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredResults, selectedIndex, onClose]);
  

  
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
    
    // Find the index of this question in the channel
    const channelQuestions = getQuestions(question.channel);
    const questionIndex = channelQuestions.findIndex(q => q.id === question.id);
    
    // Navigate to the channel with the specific question index
    const index = questionIndex >= 0 ? questionIndex : 0;
    setLocation(`/channel/${question.channel}/${index}`);
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
        className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search questions, topics, tags..."
              className="flex-1 bg-transparent text-foreground text-lg outline-none placeholder:text-muted-foreground/50"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] text-muted-foreground bg-muted border border-border rounded">
              ESC
            </kbd>
          </div>

          {/* Filter Buttons */}
          {results.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Filter:</span>
              {filters.map(filter => {
                // Count items for each filter
                let count = results.length;
                if (filter.id === 'company') {
                  count = results.filter(r => r.question.companies && r.question.companies.length > 0).length;
                } else if (filter.id === 'video') {
                  count = results.filter(r => r.question.videos?.shortVideo || r.question.videos?.longVideo).length;
                } else if (filter.id === 'diagram') {
                  count = results.filter(r => r.question.diagram && r.question.diagram.length > 20).length;
                }
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    disabled={count === 0 && filter.id !== 'all'}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full transition-all
                      ${activeFilter === filter.id 
                        ? 'bg-primary text-primary-foreground font-bold' 
                        : count > 0 
                          ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                          : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                      }
                    `}
                  >
                    {filter.icon}
                    {filter.label}
                    <span className={`text-[9px] ${activeFilter === filter.id ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          
          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isSearching && (
              <div className="p-8 text-center text-muted-foreground">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            )}
            
            {!isSearching && query.length >= 2 && results.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No questions found for "{query}"</p>
                <p className="text-xs mt-1">Try different keywords or check spelling</p>
              </div>
            )}

            {!isSearching && results.length > 0 && filteredResults.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No questions match the "{activeFilter}" filter</p>
                <button 
                  onClick={() => setActiveFilter('all')}
                  className="text-xs mt-2 text-primary hover:underline"
                >
                  Show all results
                </button>
              </div>
            )}
            
            {!isSearching && filteredResults.length > 0 && (
              <div className="py-2">
                {filteredResults.map((result, index) => {
                  const hasCompanies = result.question.companies && result.question.companies.length > 0;
                  const hasVideo = result.question.videos?.shortVideo || result.question.videos?.longVideo;
                  const hasDiagram = result.question.diagram && result.question.diagram.length > 20;
                  
                  return (
                    <button
                      key={`${result.question.id}-${index}`}
                      ref={el => {
                        if (index === selectedIndex && el) {
                          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                      }}
                      onClick={() => navigateToQuestion(result)}
                      className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                        index === selectedIndex ? 'bg-primary/20' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getDifficultyIcon(result.question.difficulty)}
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {result.question.channel}/{result.question.subChannel}
                          </span>
                          {/* Feature indicators */}
                          <div className="flex items-center gap-1 ml-auto">
                            {hasCompanies && (
                              <span className="flex items-center gap-0.5 text-[9px] text-blue-600 dark:text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                                <Building2 className="w-2.5 h-2.5" />
                                {result.question.companies!.length}
                              </span>
                            )}
                            {hasVideo && (
                              <span className="flex items-center text-[9px] text-red-600 dark:text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                                <Video className="w-2.5 h-2.5" />
                              </span>
                            )}
                            {hasDiagram && (
                              <span className="flex items-center text-[9px] text-green-600 dark:text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                                <GitBranch className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-foreground truncate">
                          {result.question.question}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {result.question.answer}
                        </p>
                        {result.question.tags && result.question.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <Tag className="w-3 h-3 text-muted-foreground/50" />
                            <span className="text-[10px] text-muted-foreground/50">
                              {result.question.tags.slice(0, 3).map(formatTag).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      <ArrowRight className={`w-4 h-4 shrink-0 mt-1 transition-opacity ${
                        index === selectedIndex ? 'text-primary opacity-100' : 'text-muted-foreground/30 opacity-0'
                      }`} />
                    </button>
                  );
                })}
              </div>
            )}
            
            {!isSearching && query.length < 2 && (
              <div className="p-6 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Type at least 2 characters to search</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['react hooks', 'system design', 'sql joins', 'kubernetes'].map(term => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 border border-border rounded-full transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground/70">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1 bg-muted rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1 bg-muted rounded">↵</kbd> Select</span>
              <span><kbd className="px-1 bg-muted rounded">ESC</kbd> Close</span>
            </div>
            {results.length > 0 && (
              <span>
                {activeFilter !== 'all' 
                  ? `${filteredResults.length} of ${results.length} results`
                  : `${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''}`
                }
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
