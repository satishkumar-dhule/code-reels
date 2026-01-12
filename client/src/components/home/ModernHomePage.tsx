/**
 * Modern Home Page - Complete UX Redesign
 * Focus: Immediate value, clear hierarchy, engaging interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useChannelStats } from '../../hooks/use-stats';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useProgress, useGlobalStats } from '../../hooks/use-progress';
import { useCredits } from '../../context/CreditsContext';
import { useAchievementContext } from '../../context/AchievementContext';
import { ProgressStorage } from '../../services/storage.service';
import { allChannelsConfig } from '../../lib/channels-config';
import {
  Play, Target, Flame, Trophy, Zap, ChevronRight, Plus,
  BookOpen, Mic, Code, Brain, Star, TrendingUp, Clock,
  CheckCircle, ArrowRight, Sparkles, Award, Users, Globe,
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Smartphone, Shield, Workflow, Box, Cloud,
  Network, MessageCircle, Eye, FileText, Monitor, Gauge
} from 'lucide-react';

// Icon mapping for channels
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
  'gauge': <Gauge className="w-6 h-6" />,
  // Additional mappings for all channel icons
  'boxes': <Box className="w-6 h-6" />,
  'chart-line': <TrendingUp className="w-6 h-6" />,
  'git-branch': <GitBranch className="w-6 h-6" />,
  'binary': <Code className="w-6 h-6" />,
  'puzzle': <Box className="w-6 h-6" />,
  'git-merge': <GitBranch className="w-6 h-6" />,
  'calculator': <Target className="w-6 h-6" />
};

export function ModernHomePage() {
  const [, setLocation] = useLocation();
  const { stats: channelStats } = useChannelStats();
  const { getSubscribedChannels } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const { balance, formatCredits } = useCredits();
  const { trackEvent } = useAchievementContext();
  
  // Mock achievements for now - replace with actual achievement data
  const achievements = [
    { name: "First Steps", description: "Completed first question" },
    { name: "Streak Master", description: "7 day learning streak" },
    { name: "Channel Explorer", description: "Subscribed to 5 channels" }
  ];
  
  const subscribedChannels = getSubscribedChannels();
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

  const questionCounts: Record<string, number> = {};
  channelStats.forEach(s => { questionCounts[s.id] = s.total; });

  if (!hasChannels) {
    return <OnboardingExperience onGetStarted={() => setLocation('/channels')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <HeroSection 
        streak={streak}
        totalCompleted={totalCompleted}
        balance={balance}
        formatCredits={formatCredits}
        onStartPractice={() => setLocation('/voice-interview')}
      />

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Primary Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Actions */}
            <QuickActionsGrid onNavigate={setLocation} />
            
            {/* Your Channels - Redesigned */}
            <ChannelsOverview 
              channels={subscribedChannels}
              questionCounts={questionCounts}
              onChannelClick={(id) => setLocation(`/extreme/channel/${id}`)}
              onManageChannels={() => setLocation('/channels')}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Streak Badge - Enhanced */}
            <StreakBadgeCard 
              streak={streak}
              totalCompleted={totalCompleted}
              channelCount={subscribedChannels.length}
              onViewStats={() => setLocation('/stats')}
            />
            
            {/* Learning Paths - Moved to sidebar */}
            <LearningPathSection onNavigate={setLocation} />
            
            {/* Recent Achievements */}
            <RecentAchievements 
              achievements={achievements}
              onViewAll={() => setLocation('/badges')}
            />
            
            {/* Daily Challenge */}
            <DailyChallengeCard onStart={() => setLocation('/training')} />
            
            {/* Community Stats */}
            <CommunityStatsCard />
          </div>
        </div>
      </div>
    </div>
  );
}

// Onboarding Experience for New Users
function OnboardingExperience({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-center space-y-8"
      >
        {/* Logo/Brand */}
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome to CodeReels
          </h1>
          <p className="text-xl text-muted-foreground">
            Master technical interviews with AI-powered practice
          </p>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: "AI-Powered", desc: "Smart question selection" },
            { icon: Mic, title: "Voice Practice", desc: "Real interview simulation" },
            { icon: Trophy, title: "Track Progress", desc: "Detailed analytics" }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-card rounded-xl border border-border"
            >
              <item.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={onGetStarted}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Start Your Journey
          <ArrowRight className="w-5 h-5 ml-2 inline" />
        </motion.button>
      </motion.div>
    </div>
  );
}

// Hero Section with Key Metrics
function HeroSection({ 
  streak, 
  totalCompleted, 
  balance, 
  formatCredits, 
  onStartPractice 
}: {
  streak: number;
  totalCompleted: number;
  balance: number;
  formatCredits: (amount: number) => string;
  onStartPractice: () => void;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Welcome Message */}
          <div className="flex-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
            >
              <h1 className="text-3xl lg:text-4xl font-bold">
                Ready to practice?
              </h1>
              <p className="text-lg text-muted-foreground">
                Continue your interview preparation journey
              </p>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-semibold stat-number">{totalCompleted}</span>
                <span className="text-sm text-muted-foreground">completed</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-semibold stat-number">{streak}</span>
                <span className="text-sm text-muted-foreground">day streak</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="font-semibold stat-number">{formatCredits(balance)}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
            </motion.div>
          </div>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={onStartPractice}
              className="group relative px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3">
                <Mic className="w-6 h-6" />
                Voice Interview
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Quick Actions Grid
function QuickActionsGrid({ onNavigate }: { onNavigate: (path: string) => void }) {
  const actions = [
    {
      id: 'voice',
      title: 'Voice Interview',
      desc: 'Practice speaking your answers',
      icon: Mic,
      color: 'from-blue-500 to-purple-600',
      path: '/voice-interview'
    },
    {
      id: 'coding',
      title: 'Coding Challenge',
      desc: 'Solve algorithmic problems',
      icon: Code,
      color: 'from-green-500 to-teal-600',
      path: '/coding'
    },
    {
      id: 'training',
      title: 'Training Mode',
      desc: 'Structured learning path',
      icon: Target,
      color: 'from-orange-500 to-red-600',
      path: '/training'
    },
    {
      id: 'tests',
      title: 'Quick Tests',
      desc: 'Rapid knowledge checks',
      icon: Zap,
      color: 'from-yellow-500 to-orange-600',
      path: '/tests'
    }
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Quick Start</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onNavigate(action.path)}
            className="group relative p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-all overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
            <div className="relative space-y-3">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">{action.title}</h3>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

// Channels Overview - Redesigned
function ChannelsOverview({
  channels,
  questionCounts,
  onChannelClick,
  onManageChannels
}: {
  channels: any[];
  questionCounts: Record<string, number>;
  onChannelClick: (id: string) => void;
  onManageChannels: () => void;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Channels</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-1.5 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            {viewMode === 'grid' ? 'List' : 'Grid'}
          </button>
          <button
            onClick={onManageChannels}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Manage
          </button>
        </div>
      </div>

      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {channels.map((channel, i) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            questionCount={questionCounts[channel.id] || 0}
            onClick={() => onChannelClick(channel.id)}
            index={i}
            viewMode={viewMode}
          />
        ))}
      </div>
    </section>
  );
}

// Enhanced Channel Card
function ChannelCard({
  channel,
  questionCount,
  onClick,
  index,
  viewMode
}: {
  channel: any;
  questionCount: number;
  onClick: () => void;
  index: number;
  viewMode: 'grid' | 'list';
}) {
  const { completed } = useProgress(channel.id);
  const progress = questionCount > 0 ? Math.round((completed.length / questionCount) * 100) : 0;
  const config = allChannelsConfig.find(c => c.id === channel.id);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`group relative p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all text-left overflow-hidden ${
        viewMode === 'list' ? 'flex items-center gap-4' : ''
      }`}
    >
      {/* Progress Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent transition-all"
        style={{ width: `${progress}%` }}
      />
      
      <div className={`relative ${viewMode === 'list' ? 'flex items-center gap-4 flex-1' : 'space-y-3'}`}>
        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {(config?.icon && iconMap[config.icon]) || <Code className="w-6 h-6" />}
        </div>
        
        {/* Content */}
        <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
          <h3 className="font-semibold text-sm mb-1 text-foreground">{channel.name}</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{completed.length}/{questionCount} completed</span>
            <span>{progress}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </motion.button>
  );
}

// Enhanced Streak Badge Card with extreme UX
function StreakBadgeCard({
  streak,
  totalCompleted,
  channelCount,
  onViewStats
}: {
  streak: number;
  totalCompleted: number;
  channelCount: number;
  onViewStats: () => void;
}) {
  // Streak level calculation
  const getStreakLevel = (days: number) => {
    if (days >= 30) return { level: 'Legend', color: 'from-purple-500 to-pink-500', emoji: '👑' };
    if (days >= 14) return { level: 'Master', color: 'from-orange-500 to-red-500', emoji: '🔥' };
    if (days >= 7) return { level: 'Champion', color: 'from-blue-500 to-cyan-500', emoji: '⚡' };
    if (days >= 3) return { level: 'Rising', color: 'from-green-500 to-emerald-500', emoji: '🌟' };
    return { level: 'Starter', color: 'from-gray-500 to-slate-500', emoji: '🌱' };
  };

  const streakInfo = getStreakLevel(streak);
  const nextMilestone = streak < 3 ? 3 : streak < 7 ? 7 : streak < 14 ? 14 : streak < 30 ? 30 : 50;
  const progressToNext = streak >= 30 ? 100 : (streak / nextMilestone) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden"
    >
      {/* Main Card */}
      <div className="p-6 bg-card rounded-xl border border-border relative overflow-hidden">
        {/* Animated Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${streakInfo.color} opacity-5`} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
        
        <div className="relative space-y-4">
          {/* Streak Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: streak >= 7 ? [1, 1.1, 1] : 1
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatDelay: 3 
                }}
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${streakInfo.color} flex items-center justify-center text-white text-xl font-bold shadow-lg ${streak >= 14 ? 'streak-glow' : ''}`}
              >
                {streakInfo.emoji}
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <motion.span 
                    key={streak}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-2xl font-bold"
                  >
                    {streak}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">days</span>
                  {streak > 1 && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
                    >
                      +{streak - 1}
                    </motion.div>
                  )}
                </div>
                <div className={`text-xs font-medium bg-gradient-to-r ${streakInfo.color} bg-clip-text text-transparent`}>
                  {streakInfo.level} Streak
                </div>
              </div>
            </div>
            
            {/* Streak Fire Animation with count */}
            {streak > 0 && (
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-2xl relative"
                >
                  🔥
                  {streak >= 3 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                    >
                      {Math.min(streak, 99)}
                    </motion.div>
                  )}
                </motion.div>
              </div>
            )}
          </div>

          {/* Progress to Next Milestone */}
          {streak < 30 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Next: {nextMilestone} days</span>
                <span className="font-medium">{nextMilestone - streak} to go</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full bg-gradient-to-r ${streakInfo.color} rounded-full relative`}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer"
              onClick={onViewStats}
            >
              <div className="text-xl font-bold stat-number">{totalCompleted}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer"
              onClick={onViewStats}
            >
              <div className="text-xl font-bold stat-number">{channelCount}</div>
              <div className="text-xs text-muted-foreground">Channels</div>
            </motion.div>
          </div>

          {/* Motivational Message with Celebration */}
          <div className="text-center relative">
            {streak === 0 && (
              <p className="text-xs text-muted-foreground">Start your learning streak today! 🚀</p>
            )}
            {streak === 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="space-y-1"
              >
                <p className="text-xs text-muted-foreground">Great start! Keep the momentum going! 💪</p>
                <div className="text-xs text-primary font-medium">First day complete! 🎉</div>
              </motion.div>
            )}
            {streak >= 2 && streak < 7 && (
              <p className="text-xs text-muted-foreground">You're building a habit! Stay consistent! ⭐</p>
            )}
            {streak === 7 && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="space-y-1"
              >
                <p className="text-xs text-muted-foreground">Amazing dedication! You're on fire! 🔥</p>
                <div className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent font-bold">
                  🏆 CHAMPION UNLOCKED! 🏆
                </div>
              </motion.div>
            )}
            {streak > 7 && streak < 14 && (
              <p className="text-xs text-muted-foreground">Champion level! Keep pushing forward! ⚡</p>
            )}
            {streak === 14 && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="space-y-1"
              >
                <p className="text-xs text-muted-foreground">Incredible consistency! You're unstoppable! 👑</p>
                <div className="text-xs bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent font-bold">
                  🔥 MASTER ACHIEVED! 🔥
                </div>
              </motion.div>
            )}
            {streak > 14 && streak < 30 && (
              <p className="text-xs text-muted-foreground">Master level! You're in the elite! 🔥</p>
            )}
            {streak === 30 && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="space-y-1"
              >
                <p className="text-xs text-muted-foreground">LEGENDARY STATUS ACHIEVED! 👑</p>
                <div className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent font-bold animate-pulse">
                  👑 LEGEND UNLOCKED! 👑
                </div>
              </motion.div>
            )}
            {streak > 30 && (
              <p className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
                Legendary dedication! You're an inspiration! 👑✨
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Floating Particles for high streaks */}
      {streak >= 7 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              animate={{
                y: [-20, -60],
                x: [0, Math.random() * 40 - 20],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.7,
                repeatDelay: 1
              }}
              style={{
                left: `${20 + i * 30}%`,
                top: '80%'
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Learning Path Section - Redesigned for sidebar
function LearningPathSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const paths = [
    {
      title: 'Frontend',
      desc: 'React, JS, CSS',
      progress: 65,
      channels: ['react', 'javascript', 'css'],
      color: 'from-blue-500 to-cyan-500',
      icon: <Layout className="w-4 h-4" />
    },
    {
      title: 'Backend',
      desc: 'APIs, DBs, System Design',
      progress: 40,
      channels: ['system-design', 'database', 'backend'],
      color: 'from-green-500 to-emerald-500',
      icon: <Server className="w-4 h-4" />
    },
    {
      title: 'Algorithms',
      desc: 'Data structures & algos',
      progress: 80,
      channels: ['data-structures', 'algorithms'],
      color: 'from-purple-500 to-pink-500',
      icon: <Brain className="w-4 h-4" />
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-card rounded-xl border border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Learning Paths</h3>
        <button className="text-xs text-primary hover:underline">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {paths.map((path, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="group cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${path.color} flex items-center justify-center text-white`}>
                {path.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate text-foreground">{path.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{path.desc}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold stat-number">{path.progress}%</div>
              </div>
            </div>
            
            <div className="ml-11 mb-1">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${path.progress}%` }}
                  transition={{ duration: 1, delay: i * 0.2 }}
                  className={`h-full bg-gradient-to-r ${path.color} rounded-full`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Action */}
      <button
        onClick={() => onNavigate('/learning-paths')}
        className="w-full mt-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Create Custom Path
      </button>
    </motion.div>
  );
}

// Recent Achievements
function RecentAchievements({ 
  achievements, 
  onViewAll 
}: { 
  achievements: any[];
  onViewAll: () => void;
}) {
  const recentAchievements = achievements.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-card rounded-xl border border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Recent Achievements</h3>
        <button onClick={onViewAll} className="text-xs text-primary hover:underline">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {recentAchievements.map((achievement, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-foreground">{achievement.name}</div>
              <div className="text-xs text-muted-foreground">Just earned</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Daily Challenge Card
function DailyChallengeCard({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl border border-primary/20"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Daily Challenge</h3>
        </div>
        
        <div>
          <h4 className="font-medium text-sm mb-1 text-foreground">System Design Basics</h4>
          <p className="text-xs text-muted-foreground">
            Design a URL shortener service
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            +50 credits reward
          </div>
          <button
            onClick={onStart}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Start Challenge
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Community Stats Card
function CommunityStatsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-card rounded-xl border border-border"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Community</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active learners</span>
            <span className="font-semibold stat-number">12,847</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Questions solved today</span>
            <span className="font-semibold stat-number">3,291</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Success rate</span>
            <span className="font-semibold text-green-500">94%</span>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>You're in the top 15% this week!</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}