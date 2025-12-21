/**
 * Focused Home Component
 * Streamlined home page that drives users to learn immediately
 * Responsive: works for both mobile and desktop
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useChannelStats } from '../../hooks/use-stats';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useProgress, useGlobalStats } from '../../hooks/use-progress';
import { ProgressStorage } from '../../services/storage.service';
import { getAllQuestions } from '../../lib/questions-loader';
import type { Question } from '../../types';
import {
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Smartphone, Shield, Brain, Workflow, Box, Cloud, Code,
  Network, MessageCircle, Users, Sparkles, Eye, FileText, CheckCircle, 
  Monitor, Zap, Gauge, ChevronRight, Play, Compass, ArrowRight,
  RefreshCw, Flame, Target
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'cpu': <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />,
  'terminal': <Terminal className="w-5 h-5 sm:w-6 sm:h-6" />,
  'layout': <Layout className="w-5 h-5 sm:w-6 sm:h-6" />,
  'database': <Database className="w-5 h-5 sm:w-6 sm:h-6" />,
  'activity': <Activity className="w-5 h-5 sm:w-6 sm:h-6" />,
  'infinity': <GitBranch className="w-5 h-5 sm:w-6 sm:h-6" />,
  'server': <Server className="w-5 h-5 sm:w-6 sm:h-6" />,
  'layers': <Layers className="w-5 h-5 sm:w-6 sm:h-6" />,
  'smartphone': <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />,
  'shield': <Shield className="w-5 h-5 sm:w-6 sm:h-6" />,
  'brain': <Brain className="w-5 h-5 sm:w-6 sm:h-6" />,
  'workflow': <Workflow className="w-5 h-5 sm:w-6 sm:h-6" />,
  'box': <Box className="w-5 h-5 sm:w-6 sm:h-6" />,
  'cloud': <Cloud className="w-5 h-5 sm:w-6 sm:h-6" />,
  'code': <Code className="w-5 h-5 sm:w-6 sm:h-6" />,
  'network': <Network className="w-5 h-5 sm:w-6 sm:h-6" />,
  'message-circle': <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
  'users': <Users className="w-5 h-5 sm:w-6 sm:h-6" />,
  'sparkles': <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />,
  'eye': <Eye className="w-5 h-5 sm:w-6 sm:h-6" />,
  'file-text': <FileText className="w-5 h-5 sm:w-6 sm:h-6" />,
  'chart': <Activity className="w-5 h-5 sm:w-6 sm:h-6" />,
  'check-circle': <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
  'monitor': <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />,
  'zap': <Zap className="w-5 h-5 sm:w-6 sm:h-6" />,
  'gauge': <Gauge className="w-5 h-5 sm:w-6 sm:h-6" />
};

export function MobileHomeFocused() {
  const [, setLocation] = useLocation();
  const { stats: channelStats } = useChannelStats();
  const { getSubscribedChannels } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const subscribedChannels = getSubscribedChannels();

  const questionCounts: Record<string, number> = {};
  channelStats.forEach(s => { questionCounts[s.id] = s.total; });

  const hasChannels = subscribedChannels.length > 0;
  const totalCompleted = ProgressStorage.getAllCompletedIds().size;

  // Calculate streak
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
    <div className="pb-20 sm:pb-8 max-w-4xl mx-auto">
      {/* Hero: Featured Question or Welcome */}
      {hasChannels ? (
        <FeaturedQuestionCard 
          channels={subscribedChannels}
          onStartLearning={(channelId) => setLocation(`/channel/${channelId}`)}
        />
      ) : (
        <WelcomeCard onGetStarted={() => setLocation('/channels')} />
      )}

      {/* Quick Stats Row - compact */}
      {hasChannels && (
        <QuickStatsRow 
          completed={totalCompleted}
          streak={streak}
          channels={subscribedChannels.length}
          onStatsClick={() => setLocation('/stats')}
        />
      )}

      {/* Continue Learning - show more channels */}
      {hasChannels && (
        <ContinueLearningSection 
          channels={subscribedChannels}
          questionCounts={questionCounts}
          onChannelClick={(id) => setLocation(`/channel/${id}`)}
          onSeeAll={() => setLocation('/channels')}
        />
      )}

      {/* Coding Challenge CTA */}
      {hasChannels && (
        <CodingChallengeCard onStart={() => setLocation('/coding')} />
      )}

      {/* Quick Start Topics for new users */}
      {!hasChannels && (
        <QuickStartTopics onSelect={(id) => setLocation(`/channel/${id}`)} />
      )}
    </div>
  );
}

// Featured Question Card - the main CTA
function FeaturedQuestionCard({ 
  channels,
  onStartLearning 
}: { 
  channels: any[];
  onStartLearning: (channelId: string) => void;
}) {
  const [featuredQuestion, setFeaturedQuestion] = useState<Question | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const allQuestions = getAllQuestions();
        const subscribedIds = new Set(channels.map(c => c.id));
        const relevantQuestions = allQuestions.filter(q => subscribedIds.has(q.channel));
        
        if (relevantQuestions.length > 0) {
          const completedIds = ProgressStorage.getAllCompletedIds();
          const uncompleted = relevantQuestions.filter(q => !completedIds.has(q.id));
          const pool = uncompleted.length > 0 ? uncompleted : relevantQuestions;
          const randomIndex = Math.floor(Math.random() * pool.length);
          setFeaturedQuestion(pool[randomIndex]);
        }
      } catch (e) {
        console.error('Failed to load featured question', e);
      }
    };
    loadFeatured();
  }, [channels, refreshKey]);

  const handleRefresh = () => setRefreshKey(k => k + 1);

  if (!featuredQuestion) {
    return (
      <section className="mx-3 sm:mx-0 mt-3 sm:mt-4 mb-2 sm:mb-4">
        <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-primary/20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold sm:text-lg">Loading question...</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Pick a channel to start</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const channelConfig = channels.find(c => c.id === featuredQuestion.channel);

  return (
    <section className="mx-3 sm:mx-0 mt-3 sm:mt-4 mb-2 sm:mb-4">
      <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl sm:rounded-2xl overflow-hidden border border-primary/20">
        {/* Header */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-border/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <span className="text-[11px] sm:text-xs font-semibold text-primary uppercase tracking-wide">
              Today's Question
            </span>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-1 sm:p-1.5 hover:bg-muted rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Question */}
        <button 
          onClick={() => onStartLearning(featuredQuestion.channel)}
          className="w-full p-3 sm:p-5 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/10 rounded sm:rounded-lg flex items-center gap-1 sm:gap-2">
              <span className="text-primary">{channelConfig && iconMap[channelConfig.icon]}</span>
              <span className="text-[11px] sm:text-sm font-medium">{channelConfig?.name || featuredQuestion.channel}</span>
            </div>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
              featuredQuestion.difficulty === 'beginner' ? 'bg-green-500/10 text-green-600' :
              featuredQuestion.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-600' :
              'bg-red-500/10 text-red-600'
            }`}>
              {featuredQuestion.difficulty}
            </span>
          </div>

          <h3 className="font-medium text-sm sm:text-lg lg:text-xl leading-snug line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4">
            {featuredQuestion.question}
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">Tap to answer</span>
            <div className="flex items-center gap-1 sm:gap-2 text-primary font-medium text-xs sm:text-sm">
              Start <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}

// Quick Stats Row - compact horizontal stats
function QuickStatsRow({ 
  completed, 
  streak, 
  channels,
  onStatsClick 
}: { 
  completed: number;
  streak: number;
  channels: number;
  onStatsClick: () => void;
}) {
  return (
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <button 
        onClick={onStatsClick}
        className="w-full bg-card rounded-xl sm:rounded-2xl border border-border p-2 sm:p-4 flex items-center justify-around hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <div className="text-left">
            <div className="font-bold text-sm sm:text-lg">{completed}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Done</div>
          </div>
        </div>
        <div className="w-px h-8 sm:h-10 bg-border" />
        <div className="flex items-center gap-2 sm:gap-3">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          <div className="text-left">
            <div className="font-bold text-sm sm:text-lg">{streak}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Streak</div>
          </div>
        </div>
        <div className="w-px h-8 sm:h-10 bg-border" />
        <div className="flex items-center gap-2 sm:gap-3">
          <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
          <div className="text-left">
            <div className="font-bold text-sm sm:text-lg">{channels}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Topics</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
      </button>
    </section>
  );
}

// Continue Learning Section - shows all subscribed channels
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
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden">
        <button 
          onClick={onSeeAll}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border-b border-border/50 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <h3 className="font-semibold text-sm sm:text-base">Your Channels</h3>
          <div className="flex items-center gap-1 text-xs sm:text-sm text-primary">
            Manage <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
        </button>
        
        {/* Desktop: Grid layout, Mobile: List */}
        <div className="sm:hidden divide-y divide-border/50">
          {channels.slice(0, 4).map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              questionCount={questionCounts[channel.id] || 0}
              onClick={() => onChannelClick(channel.id)}
            />
          ))}
        </div>
        
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4">
          {channels.slice(0, 6).map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              questionCount={questionCounts[channel.id] || 0}
              onClick={() => onChannelClick(channel.id)}
            />
          ))}
        </div>

        {channels.length > 4 && (
          <button 
            onClick={onSeeAll}
            className="w-full py-2 sm:py-3 text-xs sm:text-sm text-primary font-medium hover:bg-muted/50 border-t border-border/50"
          >
            +{channels.length - (typeof window !== 'undefined' && window.innerWidth >= 640 ? 6 : 4)} more channels
          </button>
        )}
      </div>
    </section>
  );
}

// Desktop channel card
function ChannelCard({ 
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
      className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left border border-border/50 hover:border-primary/30"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {iconMap[channel.icon] || <Code className="w-5 h-5" />}
        </div>
        <span className="text-lg font-bold text-primary">{progress}%</span>
      </div>
      
      <h4 className="font-semibold text-sm mb-1 truncate">{channel.name}</h4>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{channel.description}</p>
      
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {validCompleted}/{questionCount} completed
      </div>
    </button>
  );
}

function ChannelRow({ 
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
      className="w-full flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {iconMap[channel.icon] || <Code className="w-4 h-4 sm:w-5 sm:h-5" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm sm:text-base truncate">{channel.name}</h4>
          <span className="text-xs sm:text-sm text-muted-foreground ml-2">{progress}%</span>
        </div>
        <div className="h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" fill="currentColor" />
    </button>
  );
}

// Coding Challenge CTA
function CodingChallengeCard({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <button
        onClick={onStart}
        className="w-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl sm:rounded-2xl border border-purple-500/20 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:from-purple-500/15 hover:to-blue-500/15 transition-colors"
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Code className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-sm sm:text-base">Practice Coding</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Solve real interview challenges</p>
        </div>
        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
      </button>
    </section>
  );
}

// Welcome Card for new users
function WelcomeCard({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="mx-3 sm:mx-0 mt-3 sm:mt-4 mb-2 sm:mb-4">
      <div className="bg-gradient-to-br from-primary/15 to-card rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-primary/20">
        <div className="text-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Code className="w-7 h-7 sm:w-10 sm:h-10 text-primary" />
          </div>
          
          <h1 className="font-bold text-lg sm:text-2xl lg:text-3xl mb-1 sm:mb-2">Welcome to Learn Reels</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
            Master technical interviews with bite-sized questions
          </p>

          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-lg sm:rounded-xl font-semibold flex items-center justify-center gap-2 text-sm sm:text-base mx-auto"
          >
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            Choose Your Topics
          </button>
        </div>
      </div>
    </section>
  );
}

// Quick Start Topics for new users - responsive grid
function QuickStartTopics({ onSelect }: { onSelect: (id: string) => void }) {
  const popularTopics = [
    { id: 'system-design', name: 'System Design', icon: 'cpu', desc: 'Architecture' },
    { id: 'algorithms', name: 'Algorithms', icon: 'terminal', desc: 'Data structures' },
    { id: 'frontend', name: 'Frontend', icon: 'layout', desc: 'React & CSS' },
    { id: 'backend', name: 'Backend', icon: 'server', desc: 'APIs' },
    { id: 'database', name: 'Database', icon: 'database', desc: 'SQL & NoSQL' },
    { id: 'devops', name: 'DevOps', icon: 'infinity', desc: 'CI/CD' },
  ];

  return (
    <section className="mx-3 sm:mx-0 mb-2 sm:mb-4">
      <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 px-1">Popular Topics</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {popularTopics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic.id)}
            className="p-3 sm:p-4 bg-card rounded-xl sm:rounded-2xl border border-border hover:border-primary/30 transition-colors text-left flex items-center gap-3"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {iconMap[topic.icon]}
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-sm sm:text-base truncate">{topic.name}</h4>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{topic.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
