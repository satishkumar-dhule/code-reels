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
  Network, MessageCircle, Eye, FileText, Monitor, Gauge, X
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

// Helper function to calculate placeholder count dynamically based on screen size
function getPlaceholderCount(channelCount: number): number {
  if (channelCount === 0) return 6; // Show 6 placeholders when empty
  if (channelCount >= 12) return 0; // Don't add placeholders if we have many channels
  
  // Always fill to create a visually complete grid
  // We want at least 6 cards total for a nice layout
  const minCards = 6;
  if (channelCount < minCards) {
    return minCards - channelCount;
  }
  
  // For more than 6, fill to the next multiple of 3
  const remainder = channelCount % 3;
  return remainder === 0 ? 0 : 3 - remainder;
}

// Get optimal card size based on total number of cards
function getCardSizeClass(totalCards: number): string {
  if (totalCards <= 3) return 'channels-grid-large'; // Large cards for 1-3 items
  if (totalCards <= 6) return 'channels-grid-medium'; // Medium cards for 4-6 items
  if (totalCards <= 9) return 'channels-grid-normal'; // Normal cards for 7-9 items
  return 'channels-grid-compact'; // Compact cards for 10+ items
}

// Channels Overview - Redesigned with Premium UX
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
  const [placeholderCount, setPlaceholderCount] = useState(0);
  const { unsubscribeChannel } = useUserPreferences();
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; channelId: string; channelName: string }>({
    isOpen: false,
    channelId: '',
    channelName: ''
  });

  // Update placeholder count on resize and channel changes
  useEffect(() => {
    const updatePlaceholderCount = () => {
      setPlaceholderCount(getPlaceholderCount(channels.length));
    };
    
    updatePlaceholderCount();
    window.addEventListener('resize', updatePlaceholderCount);
    return () => window.removeEventListener('resize', updatePlaceholderCount);
  }, [channels.length]);

  // Calculate total cards for optimal sizing
  const totalCards = channels.length + placeholderCount;
  const cardSizeClass = getCardSizeClass(totalCards);

  const handleUnsubscribeClick = (channelId: string, channelName: string) => {
    setConfirmDialog({ isOpen: true, channelId, channelName });
  };

  const handleConfirmUnsubscribe = () => {
    if (confirmDialog.channelId) {
      unsubscribeChannel(confirmDialog.channelId);
    }
  };

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Your Channels</h2>
            {channels.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold"
              >
                {channels.length}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-3 py-1.5 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-2"
            >
              {viewMode === 'grid' ? (
                <>
                  <Layout className="w-4 h-4" />
                  Grid
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  List
                </>
              )}
            </button>
            <button
              onClick={onManageChannels}
              className="px-4 py-1.5 text-sm bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Premium Grid Layout with Dynamic Sizing */}
        <div 
          className={viewMode === 'grid' 
            ? `channels-grid ${cardSizeClass}` 
            : 'flex flex-col gap-3'
          }
        >
          {channels.map((channel, i) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              questionCount={questionCounts[channel.id] || 0}
              onClick={() => onChannelClick(channel.id)}
              onUnsubscribe={() => handleUnsubscribeClick(channel.id, channel.name)}
              index={i}
              viewMode={viewMode}
            />
          ))}
          
          {/* Premium Placeholder Cards with Advanced Animations */}
          {viewMode === 'grid' && placeholderCount > 0 && (
            <>
              {Array.from({ length: placeholderCount }).map((_, i) => (
                <PlaceholderCard
                  key={`placeholder-${i}`}
                  index={channels.length + i}
                  onClick={onManageChannels}
                  variant={i % 3}
                />
              ))}
            </>
          )}
        </div>

        {/* Empty State */}
        {channels.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start Your Learning Journey</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Subscribe to channels to begin practicing interview questions
            </p>
            <button
              onClick={onManageChannels}
              className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-xl transition-all"
            >
              Browse Channels
            </button>
          </motion.div>
        )}
      </section>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, channelId: '', channelName: '' })}
        onConfirm={handleConfirmUnsubscribe}
        title="Unsubscribe from Channel?"
        message={`Are you sure you want to unsubscribe from "${confirmDialog.channelName}"? Your progress will be saved.`}
        confirmText="Unsubscribe"
        cancelText="Cancel"
        type="warning"
      />
    </>
  );
}

// Premium Placeholder Card with Multiple Variants
function PlaceholderCard({ 
  index, 
  onClick, 
  variant = 0 
}: { 
  index: number; 
  onClick: () => void; 
  variant: number;
}) {
  const variants = [
    {
      gradient: 'from-blue-500/10 via-cyan-500/10 to-teal-500/10',
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Discover New Topics',
      desc: 'Expand your knowledge',
      accentColor: 'text-cyan-500'
    },
    {
      gradient: 'from-purple-500/10 via-pink-500/10 to-rose-500/10',
      icon: <Target className="w-6 h-6" />,
      title: 'Set Learning Goals',
      desc: 'Track your progress',
      accentColor: 'text-pink-500'
    },
    {
      gradient: 'from-orange-500/10 via-amber-500/10 to-yellow-500/10',
      icon: <Zap className="w-6 h-6" />,
      title: 'Level Up Skills',
      desc: 'Master new concepts',
      accentColor: 'text-amber-500'
    }
  ];

  const variantData = variants[variant % variants.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay: index * 0.05,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.03,
        y: -5,
        transition: { duration: 0.2 }
      }}
      onClick={onClick}
      className="group relative p-4 bg-gradient-to-br from-card/50 to-card rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 transition-all overflow-hidden cursor-pointer backdrop-blur-sm"
    >
      {/* Animated mesh gradient background */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${variantData.gradient} opacity-50`}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />

      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(var(--primary), 0.1), transparent)',
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
        }}
      />

      {/* Floating orbs - reduced count for performance */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1.5 h-1.5 ${variantData.accentColor} rounded-full opacity-20`}
            animate={{
              y: [0, -100],
              x: [0, (Math.random() - 0.5) * 40],
              opacity: [0, 0.6, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.6 + variant * 0.2,
              ease: "easeOut"
            }}
            style={{
              left: `${20 + i * 30}%`,
              top: '85%',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center text-center space-y-3 min-h-[100px]">
        {/* Icon with pulse animation */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center ${variantData.accentColor} group-hover:from-primary/30 group-hover:to-secondary/30 transition-all shadow-lg`}
        >
          <div className="w-5 h-5">
            {variantData.icon}
          </div>
        </motion.div>

        {/* Text content */}
        <div className="space-y-0.5">
          <motion.h3 
            className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            {variantData.title}
          </motion.h3>
          <p className="text-xs text-muted-foreground">
            {variantData.desc}
          </p>
        </div>

        {/* Plus indicator */}
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"
          whileHover={{ scale: 1.2, rotate: 90 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Plus className="w-3 h-3 text-primary" />
        </motion.div>
      </div>

      {/* Shimmer effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '200%' }}
        transition={{ duration: 0.8 }}
      />
    </motion.div>
  );
}

// Enhanced Channel Card
function ChannelCard({
  channel,
  questionCount,
  onClick,
  onUnsubscribe,
  index,
  viewMode
}: {
  channel: any;
  questionCount: number;
  onClick: () => void;
  onUnsubscribe?: () => void;
  index: number;
  viewMode: 'grid' | 'list';
}) {
  const { completed } = useProgress(channel.id);
  const progress = questionCount > 0 ? Math.min(100, Math.round((completed.length / questionCount) * 100)) : 0;
  const config = allChannelsConfig.find(c => c.id === channel.id);

  // Determine progress color
  const getProgressColor = (prog: number) => {
    if (prog >= 80) return 'from-green-500 to-emerald-500';
    if (prog >= 50) return 'from-blue-500 to-cyan-500';
    if (prog >= 25) return 'from-orange-500 to-amber-500';
    return 'from-gray-500 to-slate-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.05,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: viewMode === 'grid' ? 1.02 : 1.01,
        y: viewMode === 'grid' ? -4 : 0,
        transition: { duration: 0.2 }
      }}
      className={`group relative bg-card rounded-xl border border-border hover:border-primary/50 transition-all overflow-hidden cursor-pointer ${
        viewMode === 'list' ? 'flex items-center gap-4 p-4' : 'flex flex-col p-4'
      }`}
    >
      {/* Animated progress background */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-r ${getProgressColor(progress)} opacity-0 group-hover:opacity-5 transition-opacity`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 blur-xl" />
      </div>
      
      <div className={`relative ${viewMode === 'list' ? 'flex items-center gap-4 flex-1' : 'flex flex-col flex-1 space-y-3'}`}>
        {/* Icon with animated background */}
        <motion.div 
          className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary flex-shrink-0 overflow-hidden"
          whileHover={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            {(config?.icon && iconMap[config.icon]) || <Code className="w-6 h-6" />}
          </div>
        </motion.div>
        
        {/* Content */}
        <button 
          onClick={onClick} 
          className={`${viewMode === 'list' ? 'flex-1' : 'w-full flex-1 flex flex-col'} text-left group/content`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm text-foreground group-hover/content:text-primary transition-colors line-clamp-1">
              {channel.name}
            </h3>
            {progress === 100 && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="flex-shrink-0"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {completed.length}/{questionCount}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {progress}%
            </span>
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="mt-auto">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
              <motion.div 
                className={`h-full bg-gradient-to-r ${getProgressColor(progress)} rounded-full relative`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
              >
                {/* Shimmer effect on progress bar */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
              </motion.div>
            </div>
          </div>
        </button>

        {/* Actions */}
        <div className={`flex items-center gap-1 ${viewMode === 'list' ? 'flex-shrink-0' : 'absolute top-2 right-2'}`}>
          {onUnsubscribe && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onUnsubscribe();
              }}
              className="p-1.5 rounded-lg bg-muted/50 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
              title="Unsubscribe"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
          <motion.button 
            onClick={onClick} 
            className="p-1.5 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
            whileHover={{ x: 3 }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
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
      channels: ['react', 'javascript', 'html-css'],
      color: 'from-blue-500 to-cyan-500',
      icon: <Layout className="w-4 h-4" />
    },
    {
      title: 'Backend',
      desc: 'APIs, DBs, System Design',
      progress: 40,
      channels: ['system-design', 'databases', 'nodejs'],
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
        <button 
          onClick={() => onNavigate('/learning-paths')}
          className="text-xs text-primary hover:underline"
        >
          View All
        </button>
      </div>

      <div className="space-y-4">
        {paths.map((path, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              // Navigate to the first channel in the learning path
              if (path.channels.length > 0) {
                onNavigate(`/extreme/channel/${path.channels[0]}`);
              }
            }}
            className="group cursor-pointer w-full text-left"
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
          </motion.button>
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


// Confirmation Dialog Component
function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger";
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className={`p-3 rounded-xl ${
              type === "danger" 
                ? "bg-red-500/10 text-red-500" 
                : "bg-amber-500/10 text-amber-500"
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 pt-2 border-t border-border bg-muted/30">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                type === "danger"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
