/**
 * Redesigned Home Page
 * Features: Channel cards, progress tracking, quick actions
 * Mobile: Card-based feed with stories
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { MobileFeed } from '../components/mobile/MobileFeed';
import { useChannelStats } from '../hooks/use-stats';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useProgress } from '../hooks/use-progress';
import { useGlobalStats } from '../hooks/use-progress';
import { useIsMobile } from '../hooks/use-mobile';
import { SEOHead } from '../components/SEOHead';
import {
  Plus, ArrowRight, Flame, Target, Trophy,
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Smartphone, Shield, Brain, Workflow, Box, Cloud, Code,
  Network, MessageCircle, Users, Sparkles, Eye, FileText, CheckCircle, 
  Monitor, Zap, Gauge, BookOpen, Hash
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'cpu': <Cpu className="w-6 h-6" />,
  'terminal': <Terminal className="w-6 h-6" />,
  'layout': <Layout className="w-6 h-6" />,
  'database': <Database className="w-6 h-6" />,
  'activity': <Activity className="w-6 h-6" />,
  'infinity': <GitBranch className="w-6 h-6" />,
  'server': <Server className="w-6 h-6" />,
  'layers': <Layers className="w-6 h-6" />,
  'smartphone': <Smartphone className="w-6 h-6" />,
  'shield': <Shield className="w-6 h-6" />,
  'brain': <Brain className="w-6 h-6" />,
  'workflow': <Workflow className="w-6 h-6" />,
  'box': <Box className="w-6 h-6" />,
  'cloud': <Cloud className="w-6 h-6" />,
  'code': <Code className="w-6 h-6" />,
  'network': <Network className="w-6 h-6" />,
  'message-circle': <MessageCircle className="w-6 h-6" />,
  'users': <Users className="w-6 h-6" />,
  'sparkles': <Sparkles className="w-6 h-6" />,
  'eye': <Eye className="w-6 h-6" />,
  'file-text': <FileText className="w-6 h-6" />,
  'chart': <Activity className="w-6 h-6" />,
  'check-circle': <CheckCircle className="w-6 h-6" />,
  'monitor': <Monitor className="w-6 h-6" />,
  'zap': <Zap className="w-6 h-6" />,
  'gauge': <Gauge className="w-6 h-6" />
};

export default function HomeRedesigned() {
  const [, setLocation] = useLocation();
  const { stats: channelStats } = useChannelStats();
  const { getSubscribedChannels } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const subscribedChannels = getSubscribedChannels();
  const isMobile = useIsMobile();

  const questionCounts: Record<string, number> = {};
  channelStats.forEach(s => { questionCounts[s.id] = s.total; });

  // Calculate global stats
  const totalQuestions = channelStats.reduce((sum, s) => sum + s.total, 0);
  const streak = (() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (activityStats.find(x => x.date === d.toISOString().split('T')[0])) s++;
      else break;
    }
    return s;
  })();

  // Mobile: Card-based feed
  if (isMobile) {
    return (
      <>
        <SEOHead
          title="Code Reels - Free Technical Interview Prep | System Design, Algorithms, Frontend, DevOps"
          description="Master technical interviews with 1000+ free practice questions. System design, algorithms, frontend, backend, DevOps, SRE, AI/ML interview prep."
          canonical="https://reel-interview.github.io/"
        />
        
        <AppLayout fullWidth>
          <MobileFeed />
        </AppLayout>
      </>
    );
  }

  // Desktop: Original design
  return (
    <>
      <SEOHead
        title="Code Reels - Free Technical Interview Prep | System Design, Algorithms, Frontend, DevOps"
        description="Master technical interviews with 1000+ free practice questions. System design, algorithms, frontend, backend, DevOps, SRE, AI/ML interview prep."
        canonical="https://reel-interview.github.io/"
      />
      
      <AppLayout>
        <div className="space-y-6 lg:space-y-8">
          {/* Welcome Section */}
          <section className="text-center py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl lg:text-5xl font-bold mb-4">
                Master Your <span className="text-primary">Interview</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {totalQuestions}+ questions across {channelStats.length} topics
              </p>
            </motion.div>
          </section>

          {/* Desktop: Grid cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              icon={<BookOpen className="w-5 h-5" />}
              label="Questions"
              value={totalQuestions.toLocaleString()}
              color="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              icon={<Flame className="w-5 h-5" />}
              label="Streak"
              value={streak.toString()}
              color="text-orange-500"
              bgColor="bg-orange-500/10"
            />
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Subscribed"
              value={subscribedChannels.length.toString()}
              color="text-green-500"
              bgColor="bg-green-500/10"
            />
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="Topics"
              value={channelStats.length.toString()}
              color="text-purple-500"
              bgColor="bg-purple-500/10"
            />
          </div>

          {/* Your Channels */}
          {subscribedChannels.length > 0 ? (
            <section className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg lg:text-xl font-semibold">Your Channels</h2>
                <button
                  onClick={() => setLocation('/channels')}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  All <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Desktop: Grid layout */}
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                {subscribedChannels.map((channel, index) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    questionCount={questionCounts[channel.id] || 0}
                    index={index}
                    onClick={() => setLocation(`/channel/${channel.id}`)}
                  />
                ))}
                <AddChannelCard onClick={() => setLocation('/channels')} />
              </div>
            </section>
          ) : (
            <EmptyState onBrowse={() => setLocation('/channels')} />
          )}


        </div>
      </AppLayout>
    </>
  );
}

function StatCard({ icon, label, value, color, bgColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
    >
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold truncate">{value}</div>
        <div className="text-sm text-muted-foreground truncate">{label}</div>
      </div>
    </motion.div>
  );
}

function ChannelCard({ channel, questionCount, index, onClick }: {
  channel: any;
  questionCount: number;
  index: number;
  onClick: () => void;
}) {
  const { completed } = useProgress(channel.id);
  // Cap progress at 100% - completed can exceed questionCount if questions were removed
  const validCompleted = Math.min(completed.length, questionCount);
  const progress = questionCount > 0 ? Math.min(100, Math.round((validCompleted / questionCount) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {iconMap[channel.icon] || <Cpu className="w-6 h-6" />}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{progress}%</div>
          <div className="text-xs text-muted-foreground">done</div>
        </div>
      </div>
      
      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors truncate">
        {channel.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
        {channel.description}
      </p>
      
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{validCompleted}/{questionCount}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, delay: index * 0.03 }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}

function AddChannelCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-card border-2 border-dashed border-border rounded-2xl p-5 cursor-pointer hover:border-primary/50 transition-all flex flex-col items-center justify-center min-h-[200px] group"
    >
      <div className="p-4 rounded-full bg-muted group-hover:bg-primary/10 transition-colors mb-3">
        <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <span className="font-medium text-base text-muted-foreground group-hover:text-primary transition-colors">
        Add Channel
      </span>
    </motion.div>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-4"
    >
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
        <BookOpen className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Start Your Journey</h2>
      <p className="text-base text-muted-foreground mb-6 max-w-md mx-auto">
        Subscribe to channels that match your goals
      </p>
      <button
        onClick={onBrowse}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
      >
        Browse Channels
      </button>
    </motion.div>
  );
}


