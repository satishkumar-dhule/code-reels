import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Sparkles, Plus, RefreshCw, Rocket, Calendar,
  ChevronDown, ChevronUp, Layers, Rss, Loader2
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { defaultChangelog, fetchChangelog, type ChangelogData, type ChangelogEntry } from '../lib/changelog';

const typeConfig = {
  added: { icon: Plus, color: 'text-green-400', bg: 'bg-green-500/20', label: 'New Questions' },
  improved: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Improved' },
  initial: { icon: Rocket, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Launch' },
  feature: { icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Feature' },
};

function ChangelogEntryCard({ entry, index }: { entry: ChangelogEntry; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const config = typeConfig[entry.type] || typeConfig.added;
  const Icon = config.icon;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-lg overflow-hidden bg-card"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase tracking-widest font-bold ${config.color}`}>
              {config.label}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(entry.date)}
            </span>
          </div>
          <h3 className="font-bold text-sm">{entry.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.description}</p>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && entry.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-muted/10">
              {entry.details.questionsAdded !== undefined && entry.details.questionsAdded > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Plus className="w-3 h-3 text-green-400" />
                  <span className="text-muted-foreground">Questions Added:</span>
                  <span className="font-bold text-green-400">{entry.details.questionsAdded}</span>
                </div>
              )}
              {entry.details.questionsImproved !== undefined && entry.details.questionsImproved > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <RefreshCw className="w-3 h-3 text-blue-400" />
                  <span className="text-muted-foreground">Questions Improved:</span>
                  <span className="font-bold text-blue-400">{entry.details.questionsImproved}</span>
                </div>
              )}
              {entry.details.channels && entry.details.channels.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Layers className="w-3 h-3" />
                    <span>Channels:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {entry.details.channels.map((channel) => (
                      <span
                        key={channel}
                        className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] rounded font-mono"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {entry.details.features && entry.details.features.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Sparkles className="w-3 h-3" />
                    <span>Features:</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.details.features.map((feature, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function WhatsNew() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<ChangelogData>(defaultChangelog);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch changelog data on mount
  useEffect(() => {
    fetchChangelog()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <SEOHead
        title="What's New - Daily Updates & Changelog | Code Reels Interview Prep"
        description="Stay updated with daily AI-generated interview questions, improvements, and new features. See the latest additions to System Design, Algorithms, Frontend, Backend, DevOps, and AI/ML channels."
        keywords="code reels updates, changelog, new interview questions, daily updates, interview prep news, new features, AI generated questions"
        canonical="https://open-interview.github.io/whats-new"
      />
      <div className="min-h-screen bg-background text-foreground font-mono overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-lg font-bold">
                <span className="text-primary">&gt;</span> What's New
              </h1>
              <a
                href="/rss.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded transition-colors"
                title="Subscribe to RSS Feed"
              >
                <Rss className="w-3.5 h-3.5" /> RSS
              </a>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="max-w-3xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <div className="border border-border rounded-lg p-4 bg-card text-center">
              <div className="text-2xl font-bold text-green-400">{data.stats.totalQuestionsAdded}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Questions Added</div>
            </div>
            <div className="border border-border rounded-lg p-4 bg-card text-center">
              <div className="text-2xl font-bold text-blue-400">{data.stats.totalQuestionsImproved}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Improved</div>
            </div>
            <div className="border border-border rounded-lg p-4 bg-card text-center">
              <div className="text-2xl font-bold text-primary">{data.entries.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Updates</div>
            </div>
          </motion.div>

          <div className="text-[10px] text-muted-foreground text-center mb-6">
            Last updated: {formatDate(data.stats.lastUpdated)}
          </div>

          {/* Changelog Entries */}
          <div className="space-y-3">
            {data.entries.map((entry, index) => (
              <ChangelogEntryCard key={`${entry.date}-${index}`} entry={entry} index={index} />
            ))}
          </div>

          {isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p>Loading updates...</p>
            </div>
          )}

          {!isLoading && data.entries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-4 opacity-50" />
              <p>No updates yet. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
