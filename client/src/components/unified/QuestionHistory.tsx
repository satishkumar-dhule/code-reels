/**
 * Question History Component (Static Site Version)
 * 
 * Displays a small icon that shows the history of changes for a question.
 * Loads history from pre-built static JSON files generated during build.
 * 
 * Works with: regular questions, test questions, and coding challenges
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, X, Bot, User, Settings, FileDown,
  Plus, Edit, Trash2, CheckCircle, AlertTriangle, 
  Sparkles, RefreshCw, Clock, ChevronDown, Info
} from 'lucide-react';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export type QuestionType = 'question' | 'test' | 'coding';
export type EventType = 'created' | 'updated' | 'improved' | 'flagged' | 'verified' | 'enriched' | 'deleted' | 'restored';
export type EventSource = 'bot' | 'user' | 'system' | 'import';

export interface HistoryRecord {
  eventType: EventType;
  eventSource: EventSource;
  sourceName?: string;
  changesSummary?: string;
  changedFields?: string[];
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface QuestionHistoryData {
  questionId: string;
  questionType: QuestionType;
  totalEvents: number;
  latestEvent: { eventType: EventType; createdAt: string } | null;
  eventTypes: Record<string, number>;
  history: HistoryRecord[];
}

export interface HistorySummary {
  questionType: QuestionType;
  totalEvents: number;
  latestEvent: { eventType: EventType; createdAt: string } | null;
  eventTypes: Record<string, number>;
}

export interface HistoryIndex {
  questions: Record<string, HistorySummary>;
  totalEvents: number;
  totalQuestions: number;
  generatedAt: string;
}

interface QuestionHistoryProps {
  questionId: string;
  questionType?: QuestionType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Cache for loaded data
let historyIndexCache: HistoryIndex | null = null;
const historyDataCache = new Map<string, QuestionHistoryData>();

// Event icons and colors
const eventConfig: Record<EventType, { icon: typeof Plus; text: string; bg: string; border: string; label: string }> = {
  created: { icon: Plus, text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Created' },
  updated: { icon: Edit, text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Updated' },
  improved: { icon: Sparkles, text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Improved' },
  flagged: { icon: AlertTriangle, text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Flagged' },
  verified: { icon: CheckCircle, text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Verified' },
  enriched: { icon: RefreshCw, text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Enriched' },
  deleted: { icon: Trash2, text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Deleted' },
  restored: { icon: RefreshCw, text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30', label: 'Restored' },
};

const sourceIcons: Record<EventSource, typeof Bot> = {
  bot: Bot,
  user: User,
  system: Settings,
  import: FileDown,
};

// Load history index (summaries for all questions)
async function loadHistoryIndex(): Promise<HistoryIndex | null> {
  if (historyIndexCache) return historyIndexCache;
  
  try {
    const res = await fetch('/data/history/index.json');
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      // Make sure we got JSON, not HTML fallback
      if (contentType?.includes('application/json') || contentType?.includes('text/plain')) {
        historyIndexCache = await res.json();
        return historyIndexCache;
      }
      // Try to parse anyway in case content-type is wrong
      const text = await res.text();
      if (text.startsWith('{')) {
        historyIndexCache = JSON.parse(text);
        return historyIndexCache;
      }
    }
  } catch {
    // Static file not available
  }
  return null;
}

// Load full history for a specific question
async function loadQuestionHistory(questionId: string): Promise<QuestionHistoryData | null> {
  if (historyDataCache.has(questionId)) {
    return historyDataCache.get(questionId)!;
  }
  
  try {
    const res = await fetch(`/data/history/${questionId}.json`);
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      // Make sure we got JSON, not HTML fallback
      if (contentType?.includes('application/json') || contentType?.includes('text/plain')) {
        const data = await res.json();
        historyDataCache.set(questionId, data);
        return data;
      }
      // Try to parse anyway in case content-type is wrong
      const text = await res.text();
      if (text.startsWith('{')) {
        const data = JSON.parse(text);
        historyDataCache.set(questionId, data);
        return data;
      }
    }
  } catch {
    // Static file not available
  }
  return null;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export function QuestionHistoryIcon({
  questionId,
  questionType = 'question',
  size = 'sm',
  className = ''
}: QuestionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [historyData, setHistoryData] = useState<QuestionHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Apply focus trapping to modal
  useFocusTrap(modalRef, { enabled: isOpen, returnFocus: true });

  // Load summary from index on mount
  useEffect(() => {
    loadHistoryIndex().then(index => {
      if (index?.questions[questionId]) {
        setSummary(index.questions[questionId]);
      }
    });
  }, [questionId]);

  // Load full history when modal opens
  const loadFullHistory = useCallback(async () => {
    if (historyData) return;
    
    setLoading(true);
    const data = await loadQuestionHistory(questionId);
    setHistoryData(data);
    setLoading(false);
  }, [questionId, historyData]);

  useEffect(() => {
    if (isOpen) {
      loadFullHistory();
    }
  }, [isOpen, loadFullHistory]);

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const buttonSizeClasses = {
    sm: 'h-7 px-2 gap-1',
    md: 'h-8 px-2.5 gap-1.5',
    lg: 'h-9 px-3 gap-2'
  };

  const historyCount = summary?.totalEvents || historyData?.totalEvents || 0;

  return (
    <>
      {/* History Icon Button - Always visible */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`
          p-2 rounded-lg transition-all inline-flex items-center gap-1.5
          ${historyCount > 0 
            ? 'bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20'
            : 'bg-card text-muted-foreground hover:text-foreground border border-border hover:bg-muted'
          }
          ${className}
        `}
        title={historyCount > 0 ? `${historyCount} history event${historyCount !== 1 ? 's' : ''}` : 'View history'}
      >
        <History className="w-4 h-4" />
        {historyCount > 0 && (
          <span className="text-[10px] font-semibold tabular-nums">
            {historyCount}
          </span>
        )}
      </button>

      {/* History Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Modal */}
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-md max-h-[80vh] overflow-hidden
                         bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Question History"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#0d1117]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#238636] to-[#3fb950] flex items-center justify-center">
                    <History className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#e6edf3]">Question History</h2>
                    <p className="text-xs text-[#8b949e]">
                      {historyCount} change{historyCount !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#58a6ff]" />
                    <span className="text-sm text-[#8b949e]">Loading history...</span>
                  </div>
                ) : historyData?.history && historyData.history.length > 0 ? (
                  <div className="space-y-2">
                    {historyData.history.map((record, index) => (
                      <HistoryItem 
                        key={`${record.createdAt}-${index}`} 
                        record={record} 
                        isFirst={index === 0}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#21262d] flex items-center justify-center">
                      <History className="w-8 h-8 text-[#8b949e]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[#e6edf3] font-medium mb-1">No History Available</p>
                      <p className="text-sm text-[#8b949e] max-w-xs">
                        History tracking shows when questions are created, updated, improved, or verified by our content bots.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

interface HistoryItemProps {
  record: HistoryRecord;
  isFirst: boolean;
}

function HistoryItem({ record, isFirst }: HistoryItemProps) {
  const [expanded, setExpanded] = useState(isFirst);
  const config = eventConfig[record.eventType] || eventConfig.updated;
  const EventIcon = config.icon;
  const SourceIcon = sourceIcons[record.eventSource] || Settings;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        rounded-xl border ${config.border} ${config.bg} overflow-hidden
        ${isFirst ? 'ring-2 ring-offset-2 ring-offset-[#161b22] ring-[#30363d]' : ''}
      `}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
      >
        {/* Event Icon */}
        <div className={`w-8 h-8 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}>
          <EventIcon className={`w-4 h-4 ${config.text}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-semibold ${config.text}`}>
              {config.label}
            </span>
            <div className="flex items-center gap-1 text-[#8b949e]">
              <SourceIcon className="w-3 h-3" />
              <span className="text-[10px]">
                {record.sourceName || record.eventSource}
              </span>
            </div>
            {isFirst && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#3fb950] font-medium">
                Latest
              </span>
            )}
          </div>
          {record.changesSummary && (
            <p className="text-xs text-[#8b949e] line-clamp-1">
              {record.changesSummary}
            </p>
          )}
        </div>

        {/* Time & Expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-[#6e7681]">
            <Clock className="w-3 h-3" />
            <span className="text-[10px]">{formatRelativeTime(record.createdAt)}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#6e7681] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (record.reason || record.changedFields) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 space-y-3 border-t border-[#30363d]/50">
              {/* Reason */}
              {record.reason && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-[#0d1117] border border-[#30363d] mt-3">
                  <Info className="w-3.5 h-3.5 text-[#58a6ff] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[#8b949e]">
                    {record.reason}
                  </p>
                </div>
              )}

              {/* Changed fields */}
              {record.changedFields && record.changedFields.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider">
                    Changed Fields
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {record.changedFields.map((field) => (
                      <span 
                        key={field}
                        className="px-2 py-0.5 bg-[#58a6ff]/10 text-[#58a6ff] text-[10px] rounded-md border border-[#58a6ff]/30"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center justify-between pt-2 border-t border-[#30363d]/50">
                <span className="text-[10px] text-[#6e7681]">
                  {new Date(record.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default QuestionHistoryIcon;
