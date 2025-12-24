/**
 * Profile Page
 * User stats, achievements, and settings
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { useChannelStats } from '../hooks/use-stats';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useProgress, useGlobalStats } from '../hooks/use-progress';
import { SEOHead } from '../components/SEOHead';
import {
  Code, Trophy, Target, Flame, BookOpen, ChevronRight,
  Bell, HelpCircle, Zap, Calendar, TrendingUp, Bookmark
} from 'lucide-react';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { stats: channelStats } = useChannelStats();
  const { getSubscribedChannels } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const subscribedChannels = getSubscribedChannels();

  // Calculate stats
  const totalQuestions = channelStats.reduce((sum, s) => sum + s.total, 0);
  const totalCompleted = subscribedChannels.reduce((sum, channel) => {
    const channelProgress = JSON.parse(localStorage.getItem(`progress-${channel.id}`) || '[]');
    return sum + channelProgress.length;
  }, 0);

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

  const daysActive = activityStats.length;

  return (
    <>
      <SEOHead
        title="Profile - Code Reels"
        description="View your learning progress and achievements"
      />
      
      <AppLayout title="Profile" showBackOnMobile>
        <div className="max-w-lg mx-auto space-y-4 pb-8">
          {/* Profile Header */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            {/* Cover gradient */}
            <div className="h-20 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
            
            {/* Profile info */}
            <div className="px-4 pb-4 -mt-10">
              <div className="w-20 h-20 rounded-full bg-card border-4 border-card flex items-center justify-center shadow-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Code className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              
              <h1 className="text-xl font-bold mt-3">Interview Prep</h1>
              <p className="text-sm text-muted-foreground">
                Mastering technical interviews
              </p>
              
              {/* Quick stats */}
              <div className="flex gap-4 mt-4">
                <div>
                  <span className="font-bold">{totalCompleted}</span>
                  <span className="text-muted-foreground text-sm ml-1">completed</span>
                </div>
                <div>
                  <span className="font-bold">{subscribedChannels.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">topics</span>
                </div>
                <div>
                  <span className="font-bold">{daysActive}</span>
                  <span className="text-muted-foreground text-sm ml-1">days</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Stats Cards */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            <StatCard
              icon={<Flame className="w-5 h-5" />}
              value={streak.toString()}
              label="Day Streak"
              color="text-orange-500"
              bgColor="bg-orange-500/10"
            />
            <StatCard
              icon={<Target className="w-5 h-5" />}
              value={`${Math.round((totalCompleted / totalQuestions) * 100) || 0}%`}
              label="Progress"
              color="text-green-500"
              bgColor="bg-green-500/10"
            />
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              value={daysActive.toString()}
              label="Days Active"
              color="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              value={totalCompleted.toString()}
              label="Questions Done"
              color="text-purple-500"
              bgColor="bg-purple-500/10"
            />
          </motion.section>

          {/* Achievements */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <button
              onClick={() => setLocation('/badges')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Achievements</h3>
                  <p className="text-sm text-muted-foreground">View your badges</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </motion.section>

          {/* Menu Items */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <MenuItem
              icon={<Bookmark className="w-5 h-5" />}
              label="Bookmarks"
              sublabel="Saved questions"
              onClick={() => setLocation('/bookmarks')}
            />
            <MenuItem
              icon={<BookOpen className="w-5 h-5" />}
              label="My Channels"
              sublabel={`${subscribedChannels.length} subscribed`}
              onClick={() => setLocation('/channels')}
            />
            <MenuItem
              icon={<Zap className="w-5 h-5" />}
              label="Coding Challenges"
              sublabel="Practice coding"
              onClick={() => setLocation('/coding')}
            />
            <MenuItem
              icon={<Target className="w-5 h-5" />}
              label="Mock Tests"
              sublabel="Test your knowledge"
              onClick={() => setLocation('/tests')}
            />
            <MenuItem
              icon={<TrendingUp className="w-5 h-5" />}
              label="Statistics"
              sublabel="View detailed stats"
              onClick={() => setLocation('/stats')}
            />
          </motion.section>

          {/* Settings */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl border border-border overflow-hidden relative"
          >
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-muted-foreground">Settings</h3>
            </div>
            <div className="divide-y divide-border/50">
              <MenuItem
                icon={<Bell className="w-5 h-5" />}
                label="Notifications"
                sublabel="View all alerts"
                onClick={() => setLocation('/notifications')}
              />
              <MenuItem
                icon={<HelpCircle className="w-5 h-5" />}
                label="About"
                sublabel="App information"
                onClick={() => setLocation('/about')}
              />
            </div>
          </motion.section>
        </div>
      </AppLayout>
    </>
  );
}

function StatCard({ 
  icon, 
  value, 
  label, 
  color, 
  bgColor 
}: { 
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function MenuItem({ 
  icon, 
  label, 
  sublabel, 
  onClick 
}: { 
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0 active:bg-muted/70 cursor-pointer touch-manipulation"
    >
      <div className="flex items-center gap-3 pointer-events-none">
        <span className="text-muted-foreground">{icon}</span>
        <div className="text-left">
          <h4 className="font-medium text-sm">{label}</h4>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground pointer-events-none" />
    </button>
  );
}
