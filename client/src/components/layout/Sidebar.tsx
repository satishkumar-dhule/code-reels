/**
 * Google-style Sidebar Navigation
 * Clean, minimal design with smooth transitions
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useChannelStats } from '../../hooks/use-stats';
import { useProgress } from '../../hooks/use-progress';
import {
  Home, Search, BarChart2, Trophy, Target, Bot, Settings,
  ChevronLeft, ChevronRight, Plus, Sparkles, BookOpen, Menu, X,
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Smartphone, Shield, Brain, Workflow, Box, Cloud, Code,
  Network, MessageCircle, Users, Eye, FileText, CheckCircle, Monitor, Zap, Gauge
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

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSearch: () => void;
}

export function Sidebar({ isOpen, onToggle, onSearch }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { getSubscribedChannels } = useUserPreferences();
  const { stats } = useChannelStats();
  const subscribedChannels = getSubscribedChannels();

  const questionCounts: Record<string, number> = {};
  stats.forEach(s => { questionCounts[s.id] = s.total; });

  const navItems = [
    { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Home', path: '/' },
    { id: 'search', icon: <Search className="w-5 h-5" />, label: 'Search', action: onSearch },
    { id: 'channels', icon: <Plus className="w-5 h-5" />, label: 'Channels', path: '/channels' },
    { id: 'stats', icon: <BarChart2 className="w-5 h-5" />, label: 'Stats', path: '/stats' },
    { id: 'badges', icon: <Trophy className="w-5 h-5" />, label: 'Badges', path: '/badges' },
    { id: 'tests', icon: <Target className="w-5 h-5" />, label: 'Tests', path: '/tests' },
    { id: 'bots', icon: <Bot className="w-5 h-5" />, label: 'Bot Activity', path: '/bot-activity' },
    { id: 'new', icon: <Sparkles className="w-5 h-5" />, label: "What's New", path: '/whats-new' },
    { id: 'about', icon: <BookOpen className="w-5 h-5" />, label: 'About', path: '/about' },
  ];

  const isActive = (path?: string) => path && location === path;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Hidden on mobile by default, visible collapsed on desktop */}
      <aside
        className={`
          fixed left-0 top-0 h-full bg-card border-r border-border z-50
          flex flex-col transition-all duration-300 ease-in-out
          ${isOpen ? 'w-[280px] translate-x-0' : 'w-[72px] -translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Code className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Code Reels</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => item.path ? setLocation(item.path) : item.action?.()}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive(item.path) 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                {item.icon}
                <AnimatePresence mode="wait">
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>

          {/* Subscribed Channels */}
          {subscribedChannels.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <AnimatePresence mode="wait">
                {isOpen && (
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Your Channels
                  </motion.h3>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {subscribedChannels.slice(0, isOpen ? 10 : 5).map(channel => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isOpen={isOpen}
                    isActive={location.includes(`/channel/${channel.id}`)}
                    questionCount={questionCounts[channel.id] || 0}
                    onClick={() => setLocation(`/channel/${channel.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

function ChannelItem({ 
  channel, 
  isOpen, 
  isActive, 
  questionCount,
  onClick 
}: { 
  channel: any; 
  isOpen: boolean; 
  isActive: boolean;
  questionCount: number;
  onClick: () => void;
}) {
  const { completed } = useProgress(channel.id);
  const progress = questionCount > 0 ? Math.round((completed.length / questionCount) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group
        ${isActive 
          ? 'bg-primary/10 text-primary' 
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }
      `}
    >
      <div className="relative">
        {iconMap[channel.icon] || <Cpu className="w-5 h-5" />}
        {/* Progress ring */}
        <svg className="absolute -inset-1 w-7 h-7 -rotate-90">
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-10"
          />
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${progress * 0.75} 100`}
            className="text-primary"
          />
        </svg>
      </div>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex-1 min-w-0 text-left"
          >
            <div className="text-sm font-medium truncate">{channel.name}</div>
            <div className="text-xs text-muted-foreground">
              {completed.length}/{questionCount} • {progress}%
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
