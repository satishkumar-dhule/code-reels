import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  ArrowLeft, Bot, Sparkles, FileText, Building2, Brain, Zap,
  Clock, CheckCircle, XCircle, ExternalLink, RefreshCw, Filter,
  TrendingUp, Activity, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SEOHead } from "../components/SEOHead";

interface BotActivityItem {
  id: number;
  botType: string;
  questionId: string;
  questionText: string;
  channel: string;
  action: string;
  status: 'completed' | 'failed';
  result: any;
  completedAt: string;
  duration?: number;
}

interface BotStats {
  botType: string;
  completed: number;
  failed: number;
  lastRun: string;
}

const BOT_CONFIG: Record<string, { name: string; icon: typeof Bot; color: string; description: string }> = {
  'improve': { 
    name: 'Polisher ✨', 
    icon: Zap, 
    color: 'text-green-500 bg-green-500/10 border-green-500/30',
    description: 'Makes good answers great'
  },
  'mermaid': { 
    name: 'Visualizer 🎨', 
    icon: Sparkles, 
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    description: 'Draws it out for you'
  },
  'company': { 
    name: 'Recruiter 🏢', 
    icon: Building2, 
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    description: 'Who asks this question?'
  },
  'video': { 
    name: 'Tutor 🎬', 
    icon: Activity, 
    color: 'text-red-500 bg-red-500/10 border-red-500/30',
    description: 'Finds learning videos'
  },
  'classify': { 
    name: 'Sorter 🗂️', 
    icon: Bot, 
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/30',
    description: 'Organizes into channels'
  },
  'generate': { 
    name: 'Creator 🚀', 
    icon: Bot, 
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
    description: 'Crafts new questions'
  },
  'coding-challenge': { 
    name: 'Coder 💻', 
    icon: Brain, 
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/30',
    description: 'Creates coding challenges'
  },
  'blog': { 
    name: 'Blogger 📝', 
    icon: FileText, 
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    description: 'Generates blog posts'
  },
  'test': { 
    name: 'Tester 🧪', 
    icon: TrendingUp, 
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
    description: 'Creates test questions'
  }
};

function getBotConfig(botType: string) {
  return BOT_CONFIG[botType] || { 
    name: botType, 
    icon: Bot, 
    color: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
    description: 'Unknown bot'
  };
}

function formatTimeAgo(dateStr: string): string {
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

export default function BotActivity() {
  const [_, setLocation] = useLocation();
  const [activities, setActivities] = useState<BotActivityItem[]>([]);
  const [stats, setStats] = useState<BotStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (botFilter: string) => {
    try {
      // Fetch from static JSON file (generated during build)
      const res = await fetch('/data/bot-activity.json');
      
      if (res.ok) {
        const data = await res.json();
        
        // Filter activities by selected bot
        let filteredActivities = data.activities || [];
        if (botFilter !== 'all') {
          filteredActivities = filteredActivities.filter(
            (a: BotActivityItem) => a.botType === botFilter
          );
        }
        
        setActivities(filteredActivities.slice(0, 50));
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Failed to fetch bot activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedBot);
  }, [selectedBot, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(selectedBot);
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0);
  const totalFailed = stats.reduce((sum, s) => sum + s.failed, 0);
  const successRate = totalCompleted + totalFailed > 0 
    ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100) 
    : 0;

  const botTypes = ['all', ...Object.keys(BOT_CONFIG)];

  // Navigate to specific question using question ID in URL
  const navigateToQuestion = useCallback((channel: string, questionId: string) => {
    setLocation(`/channel/${channel}/${questionId}`);
  }, [setLocation]);

  return (
    <>
      <SEOHead 
        title="AI Bot Activity - Automated Interview Question Improvements | Code Reels" 
        description="Track our AI bots that continuously improve interview questions. See real-time updates from Simplify, Quickshot, Recruiter, Visualizer, and other bots enhancing 1000+ questions."
        keywords="AI bots, automated improvements, interview questions, ELI5 explanations, TLDR summaries, company data, mermaid diagrams, question quality"
        canonical="https://open-interview.github.io/bot-activity"
      />
      <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 font-mono overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="flex items-center justify-between mb-4">
            <button onClick={goBack} className="flex items-center gap-1.5 hover:text-primary text-[10px] uppercase tracking-widest font-bold">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <h1 className="text-base sm:text-xl font-bold uppercase flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span><span className="text-primary">&gt;</span> Bot Activity</span>
            </h1>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 hover:bg-muted rounded disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </header>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="border border-border p-3 bg-card rounded-lg"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Active Bots</div>
                  <div className="text-lg font-bold">{stats.length}</div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="border border-border p-3 bg-card rounded-lg"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Completed</div>
                  <div className="text-lg font-bold text-green-500">{totalCompleted}</div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-border p-3 bg-card rounded-lg"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Failed</div>
                  <div className="text-lg font-bold text-red-500">{totalFailed}</div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="border border-border p-3 bg-card rounded-lg"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Success Rate</div>
                  <div className="text-lg font-bold text-blue-500">{successRate}%</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bot Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-border p-3 bg-card rounded-lg mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Bot Performance
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.map((stat, i) => {
                const config = getBotConfig(stat.botType);
                const Icon = config.icon;
                const rate = stat.completed + stat.failed > 0 
                  ? Math.round((stat.completed / (stat.completed + stat.failed)) * 100)
                  : 0;
                return (
                  <motion.div
                    key={stat.botType}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className={`p-2 rounded-lg border ${config.color} cursor-pointer hover:scale-[1.02] transition-transform`}
                    onClick={() => setSelectedBot(stat.botType)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-bold truncate">{config.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-green-500">{stat.completed} ✓</span>
                      <span className="text-red-500">{stat.failed} ✗</span>
                      <span className="text-muted-foreground">{rate}%</span>
                    </div>
                    <div className="text-[8px] text-muted-foreground mt-1">
                      {formatTimeAgo(stat.lastRun)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Filter */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 mb-4 overflow-x-auto pb-2"
          >
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {botTypes.map((bot) => {
              const config = bot === 'all' ? null : getBotConfig(bot);
              return (
                <button
                  key={bot}
                  onClick={() => setSelectedBot(bot)}
                  className={`px-2 py-1 text-[10px] uppercase rounded-full border transition-all flex-shrink-0 ${
                    selectedBot === bot 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {bot === 'all' ? 'All Bots' : config?.name || bot}
                </button>
              );
            })}
          </motion.div>

          {/* Activity Feed - Grouped by Bot's Last Run */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="border border-border bg-card rounded-lg overflow-hidden"
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Recent Activity {selectedBot !== 'all' && `- ${getBotConfig(selectedBot).name}`}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {activities.length} unique items
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                <p className="text-[10px] text-muted-foreground">Loading activity...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-center">
                <Bot className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No bot activity yet</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Bots run automatically to improve questions
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <AnimatePresence>
                  {activities.map((activity, i) => {
                    const config = getBotConfig(activity.botType);
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={`${activity.botType}-${activity.questionId}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: i * 0.02 }}
                        className="p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase">{config.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                activity.status === 'completed' 
                                  ? 'bg-green-500/20 text-green-500' 
                                  : 'bg-red-500/20 text-red-500'
                              }`}>
                                {activity.status}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {formatTimeAgo(activity.completedAt)}
                              </span>
                            </div>
                            <p className="text-xs text-foreground truncate mb-1">
                              {activity.questionText}
                            </p>
                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                              <span className="px-1.5 py-0.5 bg-muted rounded">{activity.channel}</span>
                              <span>{activity.action}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigateToQuestion(activity.channel, activity.questionId)}
                            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                            title="View question"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Info Footer */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-3 border border-border rounded-lg bg-muted/20"
          >
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-muted-foreground">
                <p className="font-bold text-foreground mb-1">About Bot Activity</p>
                <p>Our AI bots run automatically via GitHub Actions to continuously improve the question database. They add ELI5 explanations, TLDR summaries, company data, diagrams, and more. Activity data is updated with each site deployment.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
