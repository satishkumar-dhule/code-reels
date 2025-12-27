/**
 * Bot Monitor Page - Redesigned for 3-Bot Architecture
 * 
 * Shows:
 * - Real-time bot status (Creator, Verifier, Processor)
 * - Work queue visualization
 * - Ledger browser with filters
 * - Stats: items created/verified/deleted
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  ArrowLeft, Bot, Sparkles, CheckCircle, RefreshCw,
  Activity, Clock, Trash2, FileText, ListTodo, History, Zap, Eye, Wrench
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SEOHead } from "../components/SEOHead";
import { cn } from "../lib/utils";

// Types
interface BotRun {
  id: number;
  botName: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  summary: any;
}

interface WorkItem {
  id: number;
  itemType: string;
  itemId: string;
  action: string;
  priority: number;
  status: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

interface LedgerEntry {
  id: number;
  botName: string;
  action: string;
  itemType: string;
  itemId: string;
  reason: string;
  createdAt: string;
}

interface BotStats {
  botName: string;
  totalRuns: number;
  successfulRuns: number;
  totalCreated: number;
  totalUpdated: number;
  totalDeleted: number;
  lastRun: string;
}


// Bot configurations for the 3-bot architecture
const BOT_CONFIG: Record<string, { 
  name: string; 
  icon: typeof Bot; 
  color: string; 
  description: string;
  gradient: string;
}> = {
  'creator': { 
    name: 'Creator Bot', 
    icon: Sparkles, 
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
    gradient: 'from-cyan-500 to-blue-500',
    description: 'Creates questions, challenges, voice keywords'
  },
  'verifier': { 
    name: 'Verifier Bot', 
    icon: Eye, 
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    gradient: 'from-amber-500 to-orange-500',
    description: 'Quality checks, detects issues, flags content'
  },
  'processor': { 
    name: 'Processor Bot', 
    icon: Wrench, 
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    gradient: 'from-purple-500 to-pink-500',
    description: 'Improves or deletes flagged content'
  }
};

function getBotConfig(botName: string) {
  return BOT_CONFIG[botName] || { 
    name: botName, 
    icon: Bot, 
    color: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
    gradient: 'from-gray-500 to-gray-600',
    description: 'Unknown bot'
  };
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return 'never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Tab component
function Tab({ active, onClick, children, icon: Icon }: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  icon: typeof Bot;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
        active 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}


export default function BotActivity() {
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'ledger'>('overview');
  const [botStats, setBotStats] = useState<BotStats[]>([]);
  const [recentRuns, setRecentRuns] = useState<BotRun[]>([]);
  const [workQueue, setWorkQueue] = useState<WorkItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBot, setSelectedBot] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/data/bot-monitor.json');
      if (res.ok) {
        const data = await res.json();
        setBotStats(data.stats || []);
        setRecentRuns(data.runs || []);
        setWorkQueue(data.queue || []);
        setLedger(data.ledger || []);
      }
    } catch (error) {
      console.error('Failed to fetch bot data:', error);
      // Use mock data for development
      setBotStats([
        { botName: 'creator', totalRuns: 45, successfulRuns: 42, totalCreated: 156, totalUpdated: 0, totalDeleted: 0, lastRun: new Date().toISOString() },
        { botName: 'verifier', totalRuns: 38, successfulRuns: 38, totalCreated: 0, totalUpdated: 0, totalDeleted: 0, lastRun: new Date().toISOString() },
        { botName: 'processor', totalRuns: 22, successfulRuns: 20, totalCreated: 0, totalUpdated: 45, totalDeleted: 12, lastRun: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  // Calculate totals
  const totalCreated = botStats.reduce((sum, s) => sum + (s.totalCreated || 0), 0);
  const totalUpdated = botStats.reduce((sum, s) => sum + (s.totalUpdated || 0), 0);
  const totalDeleted = botStats.reduce((sum, s) => sum + (s.totalDeleted || 0), 0);
  const pendingQueue = workQueue.filter(w => w.status === 'pending').length;

  return (
    <>
      <SEOHead 
        title="Bot Monitor - AI Content Pipeline | Interview Prep" 
        description="Monitor the 3-bot AI pipeline: Creator, Verifier, and Processor bots working together to maintain high-quality interview content."
        canonical="https://open-interview.github.io/bot-activity"
      />
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <button onClick={goBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Bot Monitor
            </h1>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </button>
          </header>

          {/* Bot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(BOT_CONFIG).map(([key, config], i) => {
              const stats = botStats.find(s => s.botName === key);
              const Icon = config.icon;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "relative overflow-hidden rounded-xl border p-4",
                    config.color
                  )}
                >
                  <div className={cn(
                    "absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full bg-gradient-to-br",
                    config.gradient
                  )} />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                        config.gradient
                      )}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{config.name}</h3>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold">{stats?.totalRuns || 0}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Runs</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-500">
                          {stats?.successfulRuns || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">Success</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">
                          {key === 'creator' ? stats?.totalCreated || 0 : 
                           key === 'verifier' ? workQueue.filter(w => w.createdBy === 'verifier').length :
                           stats?.totalUpdated || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          {key === 'creator' ? 'Created' : key === 'verifier' ? 'Flagged' : 'Fixed'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-current/10 text-xs text-muted-foreground">
                      Last run: {formatTimeAgo(stats?.lastRun || '')}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Created</span>
              </div>
              <div className="text-2xl font-bold text-cyan-500">{totalCreated}</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Updated</span>
              </div>
              <div className="text-2xl font-bold text-purple-500">{totalUpdated}</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Deleted</span>
              </div>
              <div className="text-2xl font-bold text-red-500">{totalDeleted}</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <ListTodo className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <div className="text-2xl font-bold text-amber-500">{pendingQueue}</div>
            </motion.div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={Activity}>
              Recent Runs
            </Tab>
            <Tab active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} icon={ListTodo}>
              Work Queue ({pendingQueue})
            </Tab>
            <Tab active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} icon={History}>
              Audit Ledger
            </Tab>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Recent Bot Runs
                  </h3>
                </div>
                {loading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : recentRuns.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bot className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No recent runs</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentRuns.slice(0, 10).map((run, i) => {
                      const config = getBotConfig(run.botName);
                      const Icon = config.icon;
                      return (
                        <div key={run.id || i} className="p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{config.name}</span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  run.status === 'completed' ? "bg-green-500/20 text-green-500" :
                                  run.status === 'running' ? "bg-blue-500/20 text-blue-500" :
                                  "bg-red-500/20 text-red-500"
                                )}>
                                  {run.status}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Processed: {run.itemsProcessed} | Created: {run.itemsCreated} | Updated: {run.itemsUpdated} | Deleted: {run.itemsDeleted}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimeAgo(run.startedAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'queue' && (
              <motion.div
                key="queue"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-primary" />
                    Work Queue
                  </h3>
                  <div className="flex gap-2">
                    {['all', 'pending', 'processing', 'completed'].map(status => (
                      <button
                        key={status}
                        onClick={() => setSelectedBot(status)}
                        className={cn(
                          "text-xs px-2 py-1 rounded-full transition-colors",
                          selectedBot === status 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                {workQueue.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-muted-foreground">Queue is empty</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {workQueue
                      .filter(w => selectedBot === 'all' || w.status === selectedBot)
                      .slice(0, 20)
                      .map((item, i) => (
                        <div key={item.id || i} className="p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              item.action === 'delete' ? "bg-red-500/10 text-red-500" :
                              item.action === 'improve' ? "bg-purple-500/10 text-purple-500" :
                              "bg-amber-500/10 text-amber-500"
                            )}>
                              {item.action === 'delete' ? <Trash2 className="w-4 h-4" /> :
                               item.action === 'improve' ? <Zap className="w-4 h-4" /> :
                               <Eye className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.action}</span>
                                <span className="text-xs text-muted-foreground">{item.itemType}</span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  item.status === 'pending' ? "bg-amber-500/20 text-amber-500" :
                                  item.status === 'processing' ? "bg-blue-500/20 text-blue-500" :
                                  item.status === 'completed' ? "bg-green-500/20 text-green-500" :
                                  "bg-red-500/20 text-red-500"
                                )}>
                                  {item.status}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {item.reason || 'No reason specified'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-medium">P{item.priority}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTimeAgo(item.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'ledger' && (
              <motion.div
                key="ledger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Audit Ledger
                  </h3>
                </div>
                {ledger.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No ledger entries yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {ledger.slice(0, 30).map((entry, i) => {
                      const config = getBotConfig(entry.botName);
                      const Icon = config.icon;
                      return (
                        <div key={entry.id || i} className="p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{config.name}</span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  entry.action === 'create' ? "bg-cyan-500/20 text-cyan-500" :
                                  entry.action === 'update' ? "bg-purple-500/20 text-purple-500" :
                                  entry.action === 'delete' ? "bg-red-500/20 text-red-500" :
                                  entry.action === 'verify' ? "bg-green-500/20 text-green-500" :
                                  "bg-amber-500/20 text-amber-500"
                                )}>
                                  {entry.action}
                                </span>
                                <span className="text-xs text-muted-foreground">{entry.itemType}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {entry.reason || `${entry.action} ${entry.itemId}`}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimeAgo(entry.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pipeline Info */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 border border-border rounded-xl bg-muted/20"
          >
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              3-Bot Pipeline
            </h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-500" /> Creator
              </span>
              <span>→</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-amber-500" /> Verifier
              </span>
              <span>→</span>
              <span className="flex items-center gap-1">
                <Wrench className="w-3 h-3 text-purple-500" /> Processor
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Creator generates content → Verifier checks quality and flags issues → Processor improves or removes flagged content
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
