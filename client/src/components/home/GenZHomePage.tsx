/**
 * Gen Z Home Page - Addictive, Beautiful, Zero Learning Curve
 * Built different 🔥
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useGlobalStats } from '../../hooks/use-progress';
import { useCredits } from '../../context/CreditsContext';
import { ProgressStorage } from '../../services/storage.service';
import {
  Flame, Zap, Trophy, Target, Mic, Code, Brain, 
  ChevronRight, Sparkles, TrendingUp, Star, Award, Rocket, Server, Plus, RotateCcw, Check, X
} from 'lucide-react';
import { PullToRefresh, SwipeableCard, SkeletonList } from '../mobile';

// Learning Paths - Role-based journeys
const learningPaths = [
  {
    id: 'frontend',
    name: 'Frontend Developer',
    icon: Code,
    color: 'from-blue-500 to-cyan-500',
    description: 'Master React, JavaScript, and modern web development',
    channels: ['frontend', 'react-native', 'javascript', 'algorithms'],
    difficulty: 'Beginner Friendly',
    duration: '3-6 months',
    jobs: ['Frontend Developer', 'React Developer', 'UI Engineer']
  },
  {
    id: 'backend',
    name: 'Backend Engineer',
    icon: Server,
    color: 'from-green-500 to-emerald-500',
    description: 'Build scalable APIs and microservices',
    channels: ['backend', 'database', 'system-design', 'algorithms'],
    difficulty: 'Intermediate',
    duration: '4-8 months',
    jobs: ['Backend Engineer', 'API Developer', 'Systems Engineer']
  },
  {
    id: 'fullstack',
    name: 'Full Stack Developer',
    icon: Rocket,
    color: 'from-purple-500 to-pink-500',
    description: 'End-to-end application development',
    channels: ['frontend', 'backend', 'database', 'devops', 'system-design'],
    difficulty: 'Advanced',
    duration: '6-12 months',
    jobs: ['Full Stack Developer', 'Software Engineer', 'Tech Lead']
  },
  {
    id: 'devops',
    name: 'DevOps Engineer',
    icon: Target,
    color: 'from-orange-500 to-red-500',
    description: 'Infrastructure, CI/CD, and cloud platforms',
    channels: ['devops', 'kubernetes', 'aws', 'terraform', 'docker'],
    difficulty: 'Advanced',
    duration: '4-8 months',
    jobs: ['DevOps Engineer', 'SRE', 'Cloud Engineer']
  },
  {
    id: 'mobile',
    name: 'Mobile Developer',
    icon: Sparkles,
    color: 'from-pink-500 to-rose-500',
    description: 'iOS and Android app development',
    channels: ['react-native', 'ios', 'android', 'frontend'],
    difficulty: 'Intermediate',
    duration: '4-6 months',
    jobs: ['Mobile Developer', 'iOS Developer', 'Android Developer']
  },
  {
    id: 'data',
    name: 'Data Engineer',
    icon: Brain,
    color: 'from-indigo-500 to-purple-500',
    description: 'Data pipelines, warehousing, and analytics',
    channels: ['data-engineering', 'database', 'python', 'aws'],
    difficulty: 'Advanced',
    duration: '6-10 months',
    jobs: ['Data Engineer', 'Analytics Engineer', 'ML Engineer']
  }
];

export function GenZHomePage() {
  const [, setLocation] = useLocation();
  const { stats: activityStats } = useGlobalStats();
  const { balance } = useCredits();
  
  const totalCompleted = ProgressStorage.getAllCompletedIds().size;
  
  // Load curated paths from database
  const [curatedPaths, setCuratedPaths] = React.useState<any[]>([]);
  const [activePaths, setActivePaths] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function loadCuratedPaths() {
      try {
        setIsLoading(true);
        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${basePath}data/learning-paths.json`);
        if (response.ok) {
          const data = await response.json();
          setCuratedPaths(data);
        }
      } catch (e) {
        console.error('Failed to load curated paths:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadCuratedPaths();
  }, []);
  
  // Update active paths when curated paths load
  React.useEffect(() => {
    try {
      // Check for new format (plural - array)
      let saved = localStorage.getItem('activeLearningPaths');
      
      // Migration: Check for old format (singular - single path)
      if (!saved) {
        const oldSaved = localStorage.getItem('activeLearningPath');
        if (oldSaved) {
          // Migrate from old format to new format
          const pathId = JSON.parse(oldSaved);
          const pathIds = [pathId];
          localStorage.setItem('activeLearningPaths', JSON.stringify(pathIds));
          saved = JSON.stringify(pathIds);
        }
      }
      
      if (!saved) {
        setActivePaths([]);
        return;
      }
      
      const pathIds = JSON.parse(saved);
      if (!Array.isArray(pathIds)) {
        setActivePaths([]);
        return;
      }
      
      // Load custom paths from localStorage
      const customPathsData = localStorage.getItem('customLearningPaths');
      const customPaths = customPathsData ? JSON.parse(customPathsData) : [];
      
      const paths = pathIds.map((pathId: string) => {
        // Check if it's a custom path (starts with 'custom-')
        if (pathId.startsWith && pathId.startsWith('custom-')) {
          // Find in customPaths array
          const customPath = customPaths.find((p: any) => p.id === pathId);
          if (customPath) {
            return {
              id: customPath.id,
              name: customPath.name,
              icon: Brain,
              color: 'from-purple-500 to-pink-500',
              description: 'Your custom learning journey',
              channels: customPath.channels || [],
              certifications: customPath.certifications || [],
              difficulty: 'Custom',
              duration: 'Self-paced',
              totalQuestions: 0,
              jobs: ['Custom Path'],
              skills: [],
              salary: 'Varies'
            };
          }
        }
        
        // Check if it's a curated path from database
        const curatedPath = curatedPaths.find((p: any) => p.id === pathId);
        if (curatedPath) {
          const channelIds = Array.isArray(curatedPath.channels) ? curatedPath.channels : JSON.parse(curatedPath.channels || '[]');
          return {
            id: curatedPath.id,
            name: curatedPath.title,
            icon: Brain,
            color: 'from-green-500 to-emerald-500',
            description: curatedPath.description,
            channels: channelIds,
            difficulty: curatedPath.difficulty.charAt(0).toUpperCase() + curatedPath.difficulty.slice(1),
            duration: `${curatedPath.estimatedHours}h`,
            totalQuestions: Array.isArray(curatedPath.questionIds) ? curatedPath.questionIds.length : JSON.parse(curatedPath.questionIds || '[]').length,
            jobs: Array.isArray(curatedPath.learningObjectives) ? curatedPath.learningObjectives.slice(0, 3) : (curatedPath.learningObjectives ? JSON.parse(curatedPath.learningObjectives).slice(0, 3) : []),
            skills: Array.isArray(curatedPath.tags) ? curatedPath.tags.slice(0, 5) : JSON.parse(curatedPath.tags || '[]').slice(0, 5),
            salary: 'Varies'
          };
        }
        
        // Otherwise find hardcoded path
        return learningPaths.find(p => p.id === pathId);
      }).filter((path): path is NonNullable<typeof path> => path !== null && path !== undefined); // Type guard to remove undefined
      
      setActivePaths(paths);
    } catch {
      setActivePaths([]);
    }
  }, [curatedPaths]); // Re-run when curatedPaths loads
  
  // Calculate streak
  const streak = (() => {
    try {
      let s = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (activityStats?.find(x => x.date === d.toISOString().split('T')[0])) s++;
        else break;
      }
      return s;
    } catch {
      return 0;
    }
  })();

  // Calculate level (100 XP per level)
  const level = Math.floor(balance / 100);
  const xpInLevel = balance % 100;
  const xpForNextLevel = 100;

  // RESUME PATH: Detect incomplete session
  const resumePath = React.useMemo(() => {
    try {
      const lastSession = localStorage.getItem('lastSession');
      if (!lastSession) return null;
      
      const session = JSON.parse(lastSession);
      const now = Date.now();
      const hoursSinceLastSession = (now - session.timestamp) / (1000 * 60 * 60);
      
      // Only show if session is less than 24 hours old and user has active paths
      if (hoursSinceLastSession > 24 || activePaths.length === 0) return null;
      
      return {
        channelId: session.channelId,
        channelName: session.channelName,
        questionId: session.questionId,
        questionTitle: session.questionTitle,
        progress: session.progress || 0,
        timestamp: session.timestamp,
      };
    } catch {
      return null;
    }
  }, [activePaths]);

  // Onboarding for new users - show path selection
  if (activePaths.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6 relative overflow-hidden pt-safe pb-safe">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10" />
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        {/* iPhone 13 FIX: Constrain hero section width to 390px on mobile */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-[390px] md:max-w-4xl text-center space-y-12"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-32 h-32 mx-auto bg-gradient-to-br from-primary to-cyan-500 rounded-[32px] flex items-center justify-center relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-cyan-500 rounded-[32px] blur-2xl opacity-50" />
            <Brain className="w-16 h-16 text-black relative z-10" strokeWidth={2.5} />
          </motion.div>

          {/* Headline - PROBLEM 1 & 3 FIXED: Clear value proposition */}
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-5xl md:text-7xl font-black text-foreground leading-tight"
            >
              Ace Your Tech Interview
              <br />
              <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                Get Hired Faster
              </span>
            </motion.h1>
            
            {/* PROBLEM 3 FIXED: Detailed value proposition */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              Master coding problems, system design, and voice interviews with AI-powered practice. 
              <span className="text-foreground font-semibold"> Real interview questions</span> from top companies.
            </motion.p>

            {/* PROBLEM 5 FIXED: Feature set explained */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-4 text-sm"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full border border-border">
                <Code className="w-4 h-4 text-primary" />
                <span>500+ Coding Problems</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full border border-border">
                <Brain className="w-4 h-4 text-purple-500" />
                <span>System Design Practice</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full border border-border">
                <Mic className="w-4 h-4 text-cyan-500" />
                <span>AI Voice Interviews</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full border border-border">
                <Award className="w-4 h-4 text-[#ffd700]" />
                <span>Certification Prep</span>
              </div>
            </motion.div>
          </div>

          {/* PROBLEM 1 FIXED: Clear primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation('/learning-paths')}
              className="group relative px-16 py-6 bg-gradient-to-r from-primary to-cyan-500 rounded-[20px] font-bold text-2xl text-black overflow-hidden shadow-2xl shadow-primary/50"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="relative flex items-center gap-3">
                Start Practicing Now
                <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
            
            {/* PROBLEM 7 FIXED: Onboarding guidance */}
            <p className="text-sm text-muted-foreground">
              Choose your career path → Practice daily → Land your dream job
            </p>
          </motion.div>

          {/* PROBLEM 4 FIXED: Social proof with outcomes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-bold text-lg">12K+</div>
                  <div className="text-muted-foreground">Active Learners</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#ffd700]" />
                <div className="text-left">
                  <div className="font-bold text-lg">500K+</div>
                  <div className="text-muted-foreground">Questions Solved</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div className="text-left">
                  <div className="font-bold text-lg">85%</div>
                  <div className="text-muted-foreground">Interview Success</div>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="max-w-2xl mx-auto p-6 bg-muted/30 backdrop-blur-xl rounded-[20px] border border-border"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-black" />
                </div>
                <div className="text-left">
                  <p className="text-base text-foreground mb-2">
                    "Landed my dream job at Google after 6 weeks of practice. The voice interview feature was a game-changer!"
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Sarah Chen</span>
                    <span>•</span>
                    <span>Software Engineer @ Google</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Company logos placeholder */}
            <div className="text-xs text-muted-foreground">
              Join engineers at Google, Meta, Amazon, Microsoft, and 500+ companies
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Helper function to remove a path from active paths
  const removeActivePath = (pathId: string) => {
    try {
      const currentPaths = JSON.parse(localStorage.getItem('activeLearningPaths') || '[]');
      const updatedPaths = currentPaths.filter((id: string) => id !== pathId);
      localStorage.setItem('activeLearningPaths', JSON.stringify(updatedPaths));
      
      // Force re-render by reloading
      window.location.reload();
    } catch (e) {
      console.error('Failed to remove path:', e);
    }
  };

  // Refresh handler for pull-to-refresh
  const handleRefresh = async () => {
    // Reload the page to refresh all data
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* PROBLEM 2 & 8 FIXED: Top Stats Bar with clear labels and benefits */}
      {/* iPhone 13 FIX: Removed pt-safe since AppLayout header already has it */}
      {/* Position below the mobile header (h-14 + pt-safe from UnifiedMobileHeader) */}
      <div className="sticky top-[calc(56px+env(safe-area-inset-top,0px))] lg:top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Streak - PROBLEM 2 FIXED: Explain value */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full border border-orange-500/30 cursor-pointer group relative"
                title="Daily practice streak - Keep it going to build consistency!"
              >
                <Flame className="w-5 h-5 text-orange-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-lg leading-none">{streak}</span>
                  <span className="text-[10px] text-muted-foreground leading-none">day streak</span>
                </div>
                {/* PROBLEM 8 FIXED: Show benefit */}
                <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  🔥 Consistency = Success
                </div>
              </motion.div>

              {/* XP - PROBLEM 2 & 8 FIXED: Explain what XP unlocks */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-cyan-500/20 rounded-full border border-primary/30 cursor-pointer group relative"
                title="Experience Points - Earn XP to unlock advanced features"
              >
                <Sparkles className="w-5 h-5 text-primary" />
                <div className="flex flex-col">
                  <span className="font-bold text-lg leading-none">{balance}</span>
                  <span className="text-[10px] text-muted-foreground leading-none">XP earned</span>
                </div>
                {/* PROBLEM 8 FIXED: Show what XP unlocks */}
                <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  ✨ Unlock AI feedback & mock interviews
                </div>
              </motion.div>

              {/* Level - PROBLEM 2 & 8 FIXED: Show progression benefit */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30 cursor-pointer group relative"
                title="Your skill level - Higher levels unlock harder problems"
              >
                <Trophy className="w-5 h-5 text-purple-400" />
                <div className="flex flex-col">
                  <span className="font-bold text-lg leading-none">Level {level}</span>
                  <span className="text-[10px] text-muted-foreground leading-none">skill tier</span>
                </div>
                {/* PROBLEM 8 FIXED: Show benefit */}
                <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  🏆 Higher levels = Harder challenges
                </div>
              </motion.div>
            </div>

            {/* Level Progress - PROBLEM 9 FIXED: Better hierarchy */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right mr-2">
                <div className="text-xs text-muted-foreground">Next Level</div>
                <div className="text-sm font-bold">{xpInLevel}/{xpForNextLevel} XP</div>
              </div>
              <div className="w-48 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(xpInLevel / xpForNextLevel) * 100}%` }}
                  className="h-full bg-gradient-to-r from-primary to-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Wrapped with PullToRefresh */}
      {/* iPhone 13 FIX: Removed pb-safe since AppLayout already handles it, max-w-[390px] for mobile width constraint */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="w-full max-w-[390px] md:max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="space-y-12">
            {/* MOBILE-OPTIMIZED: Active Paths Progress - Compact Cards */}
            {activePaths.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black">Your Active Paths</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{activePaths.length} {activePaths.length === 1 ? 'path' : 'paths'} active</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLocation('/learning-paths')}
                    className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-primary to-cyan-500 rounded-[16px] font-bold text-black flex items-center gap-2 text-sm md:text-base"
                  >
                    <Plus className="w-4 md:w-5 h-4 md:h-5" />
                    <span className="hidden sm:inline">Add Path</span>
                    <span className="sm:hidden">Add</span>
                  </motion.button>
                </div>

                {/* Loading state */}
                {isLoading ? (
                  <SkeletonList count={2} />
                ) : (
                  /* MOBILE: Grid layout - smaller cards adjacent to each other */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activePaths.map((path, index) => {
                      const Icon = path.icon;
                      
                      // Calculate completed questions for THIS specific path
                      const allCompletedIds = ProgressStorage.getAllCompletedIds();
                      let pathCompletedCount = 0;
                      
                      // If path has questionIds (curated paths), count only those
                      if (path.questionIds && Array.isArray(path.questionIds)) {
                        pathCompletedCount = path.questionIds.filter((qId: string) => 
                          allCompletedIds.has(qId)
                        ).length;
                      } else {
                        // For custom paths without specific questionIds, estimate based on channels
                        pathCompletedCount = totalCompleted; // Fallback to global for now
                      }
                      
                      const pathTotalQuestions = path.totalQuestions || path.questionIds?.length || 500;
                      const pathProgress = Math.min(Math.round((pathCompletedCount / pathTotalQuestions) * 100), 100);
                      
                      return (
                        <SwipeableCard
                          key={path.id}
                          leftAction={{
                            icon: <Check className="w-5 h-5" />,
                            label: 'Continue',
                            color: 'bg-green-500',
                            onAction: () => setLocation(`/channel/${path.channels[0]}`)
                          }}
                          rightAction={{
                            icon: <X className="w-5 h-5" />,
                            label: 'Remove',
                            color: 'bg-red-500',
                            onAction: () => removeActivePath(path.id)
                          }}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative p-4 md:p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[20px] md:rounded-[24px] border border-border overflow-hidden"
                          >
                            {/* Background gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${path.color} opacity-10`} />
                            
                            <div className="relative space-y-3 md:space-y-4">
                              {/* MOBILE-OPTIMIZED: Compact Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br ${path.color} rounded-[12px] md:rounded-[16px] flex items-center justify-center flex-shrink-0`}>
                                    <Icon className="w-5 h-5 md:w-7 md:h-7 text-foreground" strokeWidth={2.5} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Path {index + 1}</div>
                                    <h3 className="text-base md:text-xl font-black truncate">{path.name}</h3>
                                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 line-clamp-1">{path.description}</p>
                                  </div>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => removeActivePath(path.id)}
                                  className="px-2 md:px-3 py-1 md:py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-[8px] text-[10px] md:text-xs font-semibold transition-all flex-shrink-0"
                                >
                                  Remove
                                </motion.button>
                              </div>

                              {/* MOBILE-OPTIMIZED: Compact Progress Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                <div className="p-2 md:p-3 bg-background/30 rounded-[10px] md:rounded-[12px]">
                                  <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Done</div>
                                  <div className="text-sm md:text-lg font-black">{pathCompletedCount}/{pathTotalQuestions}</div>
                                </div>
                                <div className="p-2 md:p-3 bg-background/30 rounded-[10px] md:rounded-[12px]">
                                  <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Progress</div>
                                  <div className="text-sm md:text-lg font-black">{pathProgress}%</div>
                                </div>
                                <div className="p-2 md:p-3 bg-background/30 rounded-[10px] md:rounded-[12px]">
                                  <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Streak</div>
                                  <div className="text-sm md:text-lg font-black flex items-center gap-1">
                                    <Flame className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                                    {streak}
                                  </div>
                                </div>
                                <div className="p-2 md:p-3 bg-background/30 rounded-[10px] md:rounded-[12px]">
                                  <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Level</div>
                                  <div className="text-sm md:text-lg font-black flex items-center gap-1">
                                    <Trophy className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
                                    {level}
                                  </div>
                                </div>
                              </div>

                              {/* MOBILE-OPTIMIZED: Compact Channels */}
                              <div>
                                <div className="text-[10px] md:text-xs text-muted-foreground mb-1.5 md:mb-2">Channels</div>
                                <div className="flex flex-wrap gap-1.5 md:gap-2">
                                  {path.channels.slice(0, 3).map((channel: string) => (
                                    <motion.button
                                      key={channel}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setLocation(`/channel/${channel}`)}
                                      className="px-2 md:px-3 py-0.5 md:py-1 bg-muted hover:bg-white/20 rounded-full text-[10px] md:text-xs font-semibold transition-all"
                                    >
                                      {channel}
                                    </motion.button>
                                  ))}
                                  {path.channels.length > 3 && (
                                    <span className="px-2 md:px-3 py-0.5 md:py-1 bg-muted/50 rounded-full text-[10px] md:text-xs text-muted-foreground">
                                      +{path.channels.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* MOBILE-OPTIMIZED: Compact CTA */}
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setLocation(`/channel/${path.channels[0]}`)}
                                className={`w-full py-3 md:py-4 bg-gradient-to-r ${path.color} rounded-[12px] md:rounded-[16px] font-bold text-sm md:text-base text-foreground flex items-center justify-center gap-2`}
                              >
                                Continue Learning
                                <ChevronRight className="w-4 md:w-5 h-4 md:h-5" />
                              </motion.button>
                            </div>
                          </motion.div>
                        </SwipeableCard>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          {/* PROBLEM 1 & 9 FIXED: Clear primary CTA with better hierarchy + RESUME PATH */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Main CTA Section */}
            <div className="text-center space-y-8 p-8 md:p-12 bg-gradient-to-br from-primary/10 to-cyan-500/10 rounded-[32px] border border-primary/20">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black">
                  Ready to
                  <br />
                  <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                    level up?
                  </span>
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Practice with AI-powered voice interviews, solve coding challenges, and master system design
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {/* Primary CTA */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocation('/voice-interview')}
                  className="group relative px-8 md:px-12 py-4 md:py-6 bg-gradient-to-r from-primary to-cyan-500 rounded-[20px] font-bold text-lg md:text-2xl text-black overflow-hidden inline-flex items-center gap-2 md:gap-3 shadow-2xl shadow-primary/50"
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                  <Mic className="w-6 h-6 md:w-8 md:h-8" />
                  <span className="relative">Start Voice Interview</span>
                  <ChevronRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                
                {/* Secondary CTA */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocation('/coding')}
                  className="px-6 md:px-10 py-4 md:py-6 bg-muted hover:bg-muted/80 rounded-[20px] font-bold text-base md:text-xl border border-border transition-all inline-flex items-center gap-2 md:gap-3"
                >
                  <Code className="w-5 h-5 md:w-7 md:h-7" />
                  <span>Solve Problems</span>
                </motion.button>
              </div>
              
              <p className="text-xs md:text-sm text-muted-foreground">
                💡 Tip: Voice interviews are the fastest way to improve communication skills
              </p>
            </div>

            {/* RESUME PATH CARD - Shows if user has incomplete session */}
            {resumePath && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-[24px] relative overflow-hidden"
              >
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 blur-xl" />
                
                <div className="relative space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-[16px] flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-foreground mb-1">
                        🔄 Pick up where you left off
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Continue your learning journey from your last session
                      </p>
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Last topic:</span>
                      <span className="font-semibold text-foreground">{resumePath.channelName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Question:</span>
                      <span className="font-semibold text-foreground line-clamp-1">{resumePath.questionTitle}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{Math.round(resumePath.progress * 100)}% complete</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${resumePath.progress * 100}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLocation(`/channel/${resumePath.channelId}?question=${resumePath.questionId}`)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-[16px] font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
                  >
                    Resume Learning
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* PROBLEM 5 FIXED: Quick Actions with clear descriptions */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-black mb-2">Practice Your Way</h2>
              <p className="text-muted-foreground">Choose the format that works best for you</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  icon: Mic, 
                  label: 'Voice Interview', 
                  description: 'AI-powered mock interviews with real-time feedback',
                  color: 'from-blue-500 to-cyan-500', 
                  path: '/voice-interview',
                  benefit: 'Improve communication'
                },
                { 
                  icon: Code, 
                  label: 'Coding Challenges', 
                  description: 'LeetCode-style problems with detailed solutions',
                  color: 'from-green-500 to-emerald-500', 
                  path: '/coding',
                  benefit: 'Master algorithms'
                },
                { 
                  icon: Target, 
                  label: 'Training Mode', 
                  description: 'Focused practice on specific topics and patterns',
                  color: 'from-orange-500 to-red-500', 
                  path: '/training',
                  benefit: 'Build expertise'
                },
                { 
                  icon: Zap, 
                  label: 'Timed Tests', 
                  description: 'Simulate real interview pressure with time limits',
                  color: 'from-yellow-500 to-orange-500', 
                  path: '/tests',
                  benefit: 'Test readiness'
                },
              ].map((action, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocation(action.path)}
                  className="group relative p-6 bg-muted/50 backdrop-blur-xl rounded-[24px] border border-border hover:border-primary/50 transition-all overflow-hidden text-left"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative space-y-3">
                    <div className={`w-14 h-14 bg-gradient-to-br ${action.color} rounded-[16px] flex items-center justify-center`}>
                      <action.icon className="w-7 h-7 text-foreground" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="text-xl font-bold mb-1">{action.label}</div>
                      <div className="text-xs text-muted-foreground mb-2">{action.description}</div>
                      <div className="text-xs font-semibold text-primary">{action.benefit} →</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-muted/50 backdrop-blur-xl rounded-[24px] border border-border"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-cyan-500 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="text-3xl font-black">{totalCompleted}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">questions crushed 💪</div>
              </div>
            </motion.div>

            {/* Paths */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-8 bg-muted/50 backdrop-blur-xl rounded-[24px] border border-border"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Learning Paths</div>
                    <div className="text-3xl font-black">{learningPaths.length}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">career paths available 🎯</div>
              </div>
            </motion.div>

            {/* Rank */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-8 bg-gradient-to-br from-[#ffd700]/20 to-[#ff8c00]/20 backdrop-blur-xl rounded-[24px] border border-[#ffd700]/30"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#ffd700] to-[#ff8c00] rounded-full flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Rank</div>
                    <div className="text-3xl font-black">Top 15%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-primary">+3 this week</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Learning Paths - Show All */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black">Choose Your Path</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLocation('/learning-paths')}
                className="px-6 py-3 bg-muted/50 hover:bg-muted rounded-[16px] border border-border font-semibold transition-all"
              >
                View All
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {learningPaths.map((path, i) => {
                const Icon = path.icon;

                return (
                  <motion.button
                    key={path.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLocation('/learning-paths')}
                    className="group relative p-6 bg-muted/50 backdrop-blur-xl rounded-[24px] border border-border hover:border-border transition-all text-left overflow-hidden"
                  >
                    {/* Background gradient on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${path.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

                    <div className="relative space-y-4">
                      {/* Icon */}
                      <div className={`w-16 h-16 bg-gradient-to-br ${path.color} rounded-[16px] flex items-center justify-center`}>
                        <Icon className="w-8 h-8 text-foreground" strokeWidth={2.5} />
                      </div>

                      {/* Content */}
                      <div>
                        <h3 className="text-xl font-bold mb-2">{path.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{path.description}</p>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>{path.difficulty}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{path.duration}</span>
                        </div>
                      </div>

                      {/* Jobs */}
                      <div className="flex flex-wrap gap-2">
                        {path.jobs.slice(0, 2).map((job) => (
                          <span
                            key={job}
                            className="px-2 py-1 bg-muted/50 rounded-full text-xs font-medium"
                          >
                            {job}
                          </span>
                        ))}
                      </div>
                    </div>

                    <ChevronRight className="absolute top-6 right-6 w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Daily Challenge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative p-8 bg-gradient-to-br from-[#ff0080]/20 to-[#ff8c00]/20 backdrop-blur-xl rounded-[24px] border border-[#ff0080]/30 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#ff0080] to-[#ff8c00] rounded-full blur-3xl opacity-20" />
            <div className="relative space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#ff0080] to-[#ff8c00] rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Daily Challenge</div>
                  <div className="text-2xl font-black">System Design Basics</div>
                </div>
              </div>
              
              <p className="text-lg text-muted-foreground">Design a URL shortener service</p>
              
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocation('/training')}
                  className="px-8 py-4 bg-gradient-to-r from-[#ff0080] to-[#ff8c00] rounded-[16px] font-bold text-lg"
                >
                  Accept Challenge
                </motion.button>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-5 h-5 text-[#ffd700]" />
                  <span className="text-muted-foreground">+50 XP reward</span>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
