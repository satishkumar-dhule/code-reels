import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowRight, Zap, Target, Flame, Tag, Building2, Video, GitBranch, Filter, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { searchAll, type UnifiedSearchResult, type SearchResult, type CodingSearchResult } from '../lib/fuzzy-search';
import { useDebounce } from '@/hooks/use-debounce';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useToast } from '@/hooks/use-toast';
import { allChannelsConfig } from '../lib/channels-config';
import { getQuestions } from '../lib/data';
import { formatTag } from '../lib/utils';

type FilterType = 'all' | 'company' | 'video' | 'diagram' | 'coding';

function isQuestionResult(result: UnifiedSearchResult): result is SearchResult {
  return result.type === 'question';
}

function isCodingResult(result: UnifiedSearchResult): result is CodingSearchResult {
  return result.type === 'coding';
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<UnifiedSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { isSubscribed, subscribeChannel } = useUserPreferences();
  const { toast } = useToast();
  
  const debouncedQuery = useDebounce(query, 150);

  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Filter className="w-3 h-3" /> },
    { id: 'coding', label: 'Coding', icon: <Code2 className="w-3 h-3" /> },
    { id: 'company', label: 'Company', icon: <Building2 className="w-3 h-3" /> },
    { id: 'video', label: 'Video', icon: <Video className="w-3 h-3" /> },
    { id: 'diagram', label: 'Diagram', icon: <GitBranch className="w-3 h-3" /> },
  ];
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        mobileInputRef.current?.focus();
      }, 100);
      setQuery('');
      setResults([]);
      setFilteredResults([]);
      setSelectedIndex(0);
      setActiveFilter('all');
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsSearching(true);
      const searchResults = searchAll(debouncedQuery, 50);
      setResults(searchResults);
      setSelectedIndex(0);
      setIsSearching(false);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    let filtered = results;
    
    switch (activeFilter) {
      case 'coding':
        filtered = results.filter(r => isCodingResult(r));
        break;
      case 'company':
        filtered = results.filter(r => isQuestionResult(r) && r.question.companies && r.question.companies.length > 0);
        break;
      case 'video':
        filtered = results.filter(r => isQuestionResult(r) && (r.question.videos?.shortVideo || r.question.videos?.longVideo));
        break;
      case 'diagram':
        filtered = results.filter(r => isQuestionResult(r) && (r.question.diagram?.length ?? 0) > 20);
        break;
      default:
        filtered = results;
    }
    
    setFilteredResults(filtered.slice(0, 15));
    setSelectedIndex(0);
  }, [results, activeFilter]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      e.preventDefault();
      navigateToResult(filteredResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredResults, selectedIndex, onClose]);
  
  const navigateToResult = (result: UnifiedSearchResult) => {
    if (isCodingResult(result)) {
      // Use the actual challenge ID directly
      setLocation(`/coding/${result.challenge.id}`);
      onClose();
      return;
    }
    
    const { question } = result;
    
    if (!isSubscribed(question.channel)) {
      subscribeChannel(question.channel);
      const channelConfig = allChannelsConfig.find(c => c.id === question.channel);
      toast({
        title: "Channel Subscribed",
        description: `You've been subscribed to ${channelConfig?.name || question.channel}`,
      });
    }
    
    const channelQuestions = getQuestions(question.channel);
    const questionIndex = channelQuestions.findIndex(q => q.id === question.id);
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

  const getFilterCount = (filterId: FilterType) => {
    if (filterId === 'all') return results.length;
    if (filterId === 'coding') return results.filter(r => isCodingResult(r)).length;
    if (filterId === 'company') return results.filter(r => isQuestionResult(r) && r.question.companies?.length).length;
    if (filterId === 'video') return results.filter(r => isQuestionResult(r) && (r.question.videos?.shortVideo || r.question.videos?.longVideo)).length;
    if (filterId === 'diagram') return results.filter(r => isQuestionResult(r) && (r.question.diagram?.length ?? 0) > 20).length;
    return 0;
  };

  const renderResultItem = (result: UnifiedSearchResult, index: number) => {
    if (isCodingResult(result)) {
      return (
        <button
          key={`coding-${result.challenge.id}-${index}`}
          onClick={() => navigateToResult(result)}
          className={`w-full px-4 py-4 text-left flex items-start gap-3 transition-colors active:bg-primary/10 ${
            index === selectedIndex ? 'bg-primary/20' : 'hover:bg-muted/50'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {result.challenge.difficulty === 'easy' ? <Zap className="w-3 h-3 text-green-400" /> : <Target className="w-3 h-3 text-yellow-400" />}
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">coding/{result.challenge.category}</span>
              <span className="flex items-center gap-0.5 text-[9px] text-purple-600 dark:text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded ml-auto">
                <Code2 className="w-2.5 h-2.5" /> Challenge
              </span>
            </div>
            <p className="text-sm text-foreground line-clamp-2">{result.challenge.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{result.challenge.description}</p>
          </div>
          <ArrowRight className={`w-4 h-4 shrink-0 mt-1 ${index === selectedIndex ? 'text-primary' : 'text-muted-foreground/30'}`} />
        </button>
      );
    }
    
    const hasCompanies = (result.question.companies?.length ?? 0) > 0;
    const hasVideo = result.question.videos?.shortVideo || result.question.videos?.longVideo;
    const hasDiagram = (result.question.diagram?.length ?? 0) > 20;
    
    return (
      <button
        key={`question-${result.question.id}-${index}`}
        onClick={() => navigateToResult(result)}
        className={`w-full px-4 py-4 text-left flex items-start gap-3 transition-colors active:bg-primary/10 ${
          index === selectedIndex ? 'bg-primary/20' : 'hover:bg-muted/50'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getDifficultyIcon(result.question.difficulty)}
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{result.question.channel}/{result.question.subChannel}</span>
            <div className="flex items-center gap-1 ml-auto">
              {hasCompanies && <span className="flex items-center gap-0.5 text-[9px] text-blue-600 dark:text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded"><Building2 className="w-2.5 h-2.5" />{result.question.companies!.length}</span>}
              {hasVideo && <span className="flex items-center text-[9px] text-red-600 dark:text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded"><Video className="w-2.5 h-2.5" /></span>}
              {hasDiagram && <span className="flex items-center text-[9px] text-green-600 dark:text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded"><GitBranch className="w-2.5 h-2.5" /></span>}
            </div>
          </div>
          <p className="text-sm text-foreground line-clamp-2">{result.question.question}</p>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{result.question.answer}</p>
          {result.question.tags?.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Tag className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/50">{result.question.tags.slice(0, 3).map(formatTag).join(', ')}</span>
            </div>
          )}
        </div>
        <ArrowRight className={`w-4 h-4 shrink-0 mt-1 ${index === selectedIndex ? 'text-primary' : 'text-muted-foreground/30'}`} />
      </button>
    );
  };

  const renderEmptyState = () => (
    <div className="p-8 text-center text-muted-foreground">
      <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p className="text-base mb-1">Type to search</p>
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
  );

  const renderNoResults = () => (
    <div className="p-8 text-center text-muted-foreground">
      <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="text-base">No results for "{query}"</p>
      <p className="text-sm mt-2 opacity-70">Try different keywords</p>
    </div>
  );
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile: Fullscreen - uses CSS to show/hide */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[200] bg-background flex flex-col"
            style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
            data-testid="search-modal-mobile"
          >
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card flex-shrink-0">
              <h2 className="font-semibold text-lg">Search</h2>
              <button 
                onClick={onClose} 
                className="p-2 -mr-2 hover:bg-muted rounded-full"
                data-testid="search-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search questions..."
                className="flex-1 bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground/50"
                autoComplete="off"
                spellCheck={false}
                data-testid="search-input-mobile"
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1.5 hover:bg-muted rounded-full flex-shrink-0">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Mobile Filters */}
            {results.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto no-scrollbar flex-shrink-0">
                {filters.map(filter => {
                  const count = getFilterCount(filter.id);
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      disabled={count === 0 && filter.id !== 'all'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all flex-shrink-0 ${
                        activeFilter === filter.id ? 'bg-primary text-primary-foreground font-semibold' : count > 0 ? 'bg-muted text-muted-foreground' : 'bg-muted/50 text-muted-foreground/50'
                      }`}
                    >
                      {filter.icon} {filter.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mobile Results */}
            <div className="flex-1 overflow-y-auto">
              {isSearching && (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                </div>
              )}
              {!isSearching && query.length >= 2 && filteredResults.length === 0 && renderNoResults()}
              {!isSearching && filteredResults.length > 0 && (
                <div className="py-2">{filteredResults.map((r, i) => renderResultItem(r, i))}</div>
              )}
              {!isSearching && query.length < 2 && renderEmptyState()}
            </div>

            {/* Mobile Footer */}
            <div 
              className="px-4 py-3 border-t border-border bg-card flex-shrink-0"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
            >
              <p className="text-sm text-muted-foreground text-center">
                {filteredResults.length > 0 ? `${filteredResults.length} results` : 'Tap to search'}
              </p>
            </div>
          </motion.div>

          {/* Desktop: Modal - uses CSS to show/hide */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden lg:flex fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm items-start justify-center pt-[10vh] px-4"
            onClick={onClose}
            data-testid="search-modal-desktop"
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
                  data-testid="search-input-desktop"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="p-1.5 hover:bg-muted rounded-full">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <kbd className="px-2 py-1 text-[10px] text-muted-foreground bg-muted border border-border rounded">ESC</kbd>
              </div>

              {/* Desktop Filters */}
              {results.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 flex-wrap">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Filter:</span>
                  {filters.map(filter => {
                    const count = getFilterCount(filter.id);
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        disabled={count === 0 && filter.id !== 'all'}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full transition-all ${
                          activeFilter === filter.id ? 'bg-primary text-primary-foreground font-bold' : count > 0 ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                        }`}
                      >
                        {filter.icon} {filter.label} <span className="text-[9px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Desktop Results */}
              <div className="flex-1 overflow-y-auto">
                {isSearching && (
                  <div className="p-8 text-center">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  </div>
                )}
                {!isSearching && query.length >= 2 && filteredResults.length === 0 && renderNoResults()}
                {!isSearching && filteredResults.length > 0 && (
                  <div className="py-2">{filteredResults.map((r, i) => renderResultItem(r, i))}</div>
                )}
                {!isSearching && query.length < 2 && renderEmptyState()}
              </div>

              {/* Desktop Footer */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> Navigate</span>
                  <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd> Select</span>
                  <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">ESC</kbd> Close</span>
                </div>
                {filteredResults.length > 0 && <span>{filteredResults.length} results</span>}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
