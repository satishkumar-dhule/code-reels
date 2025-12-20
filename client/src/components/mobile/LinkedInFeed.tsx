/**
 * LinkedIn-style Mobile Feed
 * Card-based feed with stories, posts, and engagement
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useChannelStats } from '../../hooks/use-stats';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useProgress, useGlobalStats } from '../../hooks/use-progress';
import {
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Smartphone, Shield, Brain, Workflow, Box, Cloud, Code,
  Network, MessageCircle, Users, Sparkles, Eye, FileText, CheckCircle, 
  Monitor, Zap, Gauge, ChevronRight, Bookmark, Share2, ThumbsUp,
  Play, Clock, Target, Flame, Trophy, ArrowRight, Plus
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'cpu': <Cpu className="w-5 h-5" />,
  'terminal': <Terminal className="w-5 h-5" />,
  'layout': <Layout className="w-5 h-5" />,
  'database': <Database className="w-5 h-5" />,
  'activity': <Activity className="w-5 h-5" />,
  'infinity': <GitBranch className="w-5 h-5" />,
  'server': <Server className="w-5 h-5" />,
  'layers': <Layers className="w-5 h-5" />,
  'smartphone': <Smartphone className="w-5 h-5" />,
  'shield': <Shield className="w-5 h-5" />,
  'brain': <Brain className="w-5 h-5" />,
  'workflow': <Workflow className="w-5 h-5" />,
  'box': <Box className="w-5 h-5" />,
  'cloud': <Cloud className="w-5 h-5" />,
  'code': <Code className="w-5 h-5" />,
  'network': <Network className="w-5 h-5" />,
  'message-circle': <MessageCircle className="w-5 h-5" />,
  'users': <Users className="w-5 h-5" />,
  'sparkles': <Sparkles className="w-5 h-5" />,
  'eye': <Eye className="w-5 h-5" />,
  'file-text': <FileText className="w-5 h-5" />,
  'chart': <Activity className="w-5 h-5" />,
  'check-circle': <CheckCircle className="w-5 h-5" />,
  'monitor': <Monitor className="w-5 h-5" />,
  'zap': <Zap className="w-5 h-5" />,
  'gauge': <Gauge className="w-5 h-5" />
};

export function LinkedInFeed() {
  const [, setLocation] = useLocation();
  const { stats: channelStats } = useChannelStats();
  const { getSubscribedChannels } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const subscribedChannels = getSubscribedChannels();

  const questionCounts: Record<string, number> = {};
  channelStats.forEach(s => { questionCounts[s.id] = s.total; });

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

  return (
    <div className="pb-20">
      {/* Stories/Quick Access - LinkedIn style horizontal scroll */}
      <StoriesSection 
        channels={subscribedChannels} 
        onChannelClick={(id) => setLocation(`/channel/${id}`)}
        onAddClick={() => setLocation('/channels')}
      />

      {/* Stats Summary Card */}
      <StatsCard 
        totalQuestions={totalQuestions}
        streak={streak}
        channelCount={subscribedChannels.length}
        topicsCount={channelStats.length}
      />

      {/* Continue Learning Section */}
      {subscribedChannels.length > 0 && (
        <ContinueLearningSection 
          channels={subscribedChannels}
          questionCounts={questionCounts}
          onChannelClick={(id) => setLocation(`/channel/${id}`)}
          onSeeAll={() => setLocation('/channels')}
        />
      )}

      {/* Recommended Topics */}
      <RecommendedSection 
        channels={channelStats.filter(c => !subscribedChannels.find(s => s.id === c.id)).slice(0, 4)}
        onChannelClick={(id) => setLocation(`/channel/${id}`)}
        onSeeAll={() => setLocation('/channels')}
      />

      {/* Quick Actions */}
      <QuickActionsCard 
        onCoding={() => setLocation('/coding')}
        onTests={() => setLocation('/tests')}
        onBadges={() => setLocation('/badges')}
      />
    </div>
  );
}

// Stories-style horizontal scroll (like LinkedIn's "Catch up on stories")
function StoriesSection({ 
  channels, 
  onChannelClick,
  onAddClick 
}: { 
  channels: any[];
  onChannelClick: (id: string) => void;
  onAddClick: () => void;
}) {
  if (channels.length === 0) return null;

  return (
    <section className="py-3 border-b border-border/50">
      <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Add new story */}
        <button
          onClick={onAddClick}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">Add</span>
        </button>

        {channels.map((channel) => (
          <StoryItem 
            key={channel.id}
            channel={channel}
            onClick={() => onChannelClick(channel.id)}
          />
        ))}
      </div>
    </section>
  );
}

function StoryItem({ channel, onClick }: { channel: any; onClick: () => void }) {
  const { completed } = useProgress(channel.id);
  const hasProgress = completed.length > 0;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div className={`
        w-16 h-16 rounded-full flex items-center justify-center
        ${hasProgress 
          ? 'bg-gradient-to-br from-primary to-primary/60 ring-2 ring-primary/30' 
          : 'bg-muted'
        }
      `}>
        <div className={`
          w-14 h-14 rounded-full bg-card flex items-center justify-center
          ${hasProgress ? 'ring-2 ring-card' : ''}
        `}>
          <span className={hasProgress ? 'text-primary' : 'text-muted-foreground'}>
            {iconMap[channel.icon] || <Code className="w-5 h-5" />}
          </span>
        </div>
      </div>
      <span className="text-[11px] text-foreground font-medium truncate max-w-[64px]">
        {channel.name.split(' ')[0]}
      </span>
    </button>
  );
}

// Stats summary card (LinkedIn style)
function StatsCard({ 
  totalQuestions, 
  streak, 
  channelCount,
  topicsCount 
}: { 
  totalQuestions: number;
  streak: number;
  channelCount: number;
  topicsCount: number;
}) {
  return (
    <section className="mx-4 my-3">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="font-semibold text-sm">Your Progress</h3>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 divide-x divide-border/50">
          <StatItem icon={<Target className="w-4 h-4" />} value={totalQuestions.toLocaleString()} label="Questions" />
          <StatItem icon={<Flame className="w-4 h-4" />} value={streak.toString()} label="Day Streak" color="text-orange-500" />
          <StatItem icon={<Bookmark className="w-4 h-4" />} value={channelCount.toString()} label="Subscribed" />
          <StatItem icon={<Layers className="w-4 h-4" />} value={topicsCount.toString()} label="Topics" />
        </div>
      </div>
    </section>
  );
}

function StatItem({ 
  icon, 
  value, 
  label, 
  color = 'text-primary' 
}: { 
  icon: React.ReactNode;
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div className="py-3 px-2 text-center">
      <div className={`${color} mb-1 flex justify-center`}>{icon}</div>
      <div className="font-bold text-lg">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

// Continue Learning Section
function ContinueLearningSection({ 
  channels, 
  questionCounts,
  onChannelClick,
  onSeeAll
}: { 
  channels: any[];
  questionCounts: Record<string, number>;
  onChannelClick: (id: string) => void;
  onSeeAll: () => void;
}) {
  return (
    <section className="mx-4 my-3">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button 
          onClick={onSeeAll}
          className="w-full px-4 py-3 border-b border-border/50 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <h3 className="font-semibold text-sm">Continue Learning</h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        
        <div className="divide-y divide-border/50">
          {channels.slice(0, 3).map((channel) => (
            <ChannelListItem
              key={channel.id}
              channel={channel}
              questionCount={questionCounts[channel.id] || 0}
              onClick={() => onChannelClick(channel.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChannelListItem({ 
  channel, 
  questionCount,
  onClick 
}: { 
  channel: any;
  questionCount: number;
  onClick: () => void;
}) {
  const { completed } = useProgress(channel.id);
  const validCompleted = Math.min(completed.length, questionCount);
  const progress = questionCount > 0 ? Math.round((validCompleted / questionCount) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {iconMap[channel.icon] || <Code className="w-5 h-5" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{channel.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">{progress}%</span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-primary">
        <Play className="w-4 h-4" fill="currentColor" />
      </div>
    </button>
  );
}

// Recommended Section
function RecommendedSection({ 
  channels, 
  onChannelClick,
  onSeeAll 
}: { 
  channels: any[];
  onChannelClick: (id: string) => void;
  onSeeAll: () => void;
}) {
  if (channels.length === 0) return null;

  return (
    <section className="mx-4 my-3">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Recommended for You</h3>
          <button 
            onClick={onSeeAll}
            className="text-xs text-primary font-medium"
          >
            See all
          </button>
        </div>
        
        <div className="p-3 flex gap-3 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          {channels.map((channel) => (
            <RecommendedCard
              key={channel.id}
              channel={channel}
              onClick={() => onChannelClick(channel.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecommendedCard({ channel, onClick }: { channel: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-32 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
        {iconMap[channel.icon] || <Code className="w-5 h-5" />}
      </div>
      <h4 className="font-medium text-xs truncate">{channel.name}</h4>
      <p className="text-[10px] text-muted-foreground mt-0.5">{channel.total} questions</p>
    </button>
  );
}

// Quick Actions Card
function QuickActionsCard({ 
  onCoding, 
  onTests, 
  onBadges 
}: { 
  onCoding: () => void;
  onTests: () => void;
  onBadges: () => void;
}) {
  return (
    <section className="mx-4 my-3">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="font-semibold text-sm">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-3 divide-x divide-border/50">
          <QuickActionItem 
            icon={<Code className="w-5 h-5" />}
            label="Coding"
            onClick={onCoding}
          />
          <QuickActionItem 
            icon={<Target className="w-5 h-5" />}
            label="Tests"
            onClick={onTests}
          />
          <QuickActionItem 
            icon={<Trophy className="w-5 h-5" />}
            label="Badges"
            onClick={onBadges}
          />
        </div>
      </div>
    </section>
  );
}

function QuickActionItem({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="py-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
    >
      <div className="text-primary">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
