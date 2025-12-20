/**
 * Redesigned All Channels Page
 * Browse and subscribe to channels with category filtering
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { MobileChannels } from '../components/mobile/MobileChannels';
import { allChannelsConfig, categories, ChannelConfig } from '../lib/channels-config';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useChannelStats } from '../hooks/use-stats';
import { useProgress } from '../hooks/use-progress';
import { useIsMobile } from '../hooks/use-mobile';
import { SEOHead } from '../components/SEOHead';
import {
  Search, Check, Plus,
  Cpu, Terminal, Layout, Database, Activity, GitBranch, Server,
  Layers, Smartphone, Shield, Brain, Workflow, Box, Cloud, Code,
  Network, MessageCircle, Users, Sparkles, Eye, FileText, CheckCircle, 
  Monitor, Zap, Gauge
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

export default function AllChannelsRedesigned() {
  const [, navigate] = useLocation();
  const { isSubscribed, toggleSubscription, preferences } = useUserPreferences();
  const { stats } = useChannelStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Create question count map
  const questionCounts: Record<string, number> = {};
  stats.forEach(s => { questionCounts[s.id] = s.total; });

  // Filter channels
  const filteredChannels = allChannelsConfig.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         channel.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || channel.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedChannels = categories.map(cat => ({
    ...cat,
    channels: filteredChannels.filter(c => c.category === cat.id)
  })).filter(group => group.channels.length > 0);

  // Mobile: Card-based channels
  if (isMobile) {
    return (
      <>
        <SEOHead
          title="Browse 30+ Interview Prep Channels | Code Reels"
          description="Explore 30+ technical interview prep channels: System Design, Algorithms, Frontend, Backend, DevOps, and more."
          canonical="https://reel-interview.github.io/channels"
        />
        <AppLayout title="Explore" fullWidth>
          <MobileChannels />
        </AppLayout>
      </>
    );
  }

  // Desktop: Original design
  return (
    <>
      <SEOHead
        title="Browse 30+ Interview Prep Channels | Code Reels"
        description="Explore 30+ technical interview prep channels: System Design, Algorithms, Frontend, Backend, DevOps, and more."
        canonical="https://reel-interview.github.io/channels"
      />

      <AppLayout title="All Channels">
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Browse Channels</h1>
              <p className="text-muted-foreground">
                {preferences.subscribedChannels.length} of {allChannelsConfig.length} channels subscribed
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => setSelectedCategory(null)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all flex-shrink-0
                  ${!selectedCategory 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                All Channels
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0
                    ${selectedCategory === cat.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  {iconMap[cat.icon]}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Grid */}
          {selectedCategory ? (
            // Flat grid when category is selected
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredChannels.map((channel, index) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isSubscribed={isSubscribed(channel.id)}
                  onToggle={() => toggleSubscription(channel.id)}
                  questionCount={questionCounts[channel.id] || 0}
                  index={index}
                />
              ))}
            </div>
          ) : (
            // Grouped by category
            <div className="space-y-8">
              {groupedChannels.map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {iconMap[group.icon]}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{group.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {group.channels.length} channels
                      </p>
                    </div>
                  </div>
                  
                  {/* Desktop: Grid */}
                  <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.channels.map((channel, index) => (
                      <ChannelCard
                        key={channel.id}
                        channel={channel}
                        isSubscribed={isSubscribed(channel.id)}
                        onToggle={() => toggleSubscription(channel.id)}
                        questionCount={questionCounts[channel.id] || 0}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredChannels.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">No channels found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
}

function ChannelCard({ 
  channel, 
  isSubscribed, 
  onToggle,
  questionCount,
  index
}: { 
  channel: ChannelConfig; 
  isSubscribed: boolean; 
  onToggle: () => void;
  questionCount: number;
  index: number;
}) {
  const { completed } = useProgress(channel.id);
  // Cap at 100% - completed can exceed questionCount if questions were recategorized
  const progress = questionCount > 0 ? Math.min(100, Math.round((completed.length / questionCount) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`
        bg-card border rounded-xl p-5 transition-all cursor-pointer group
        ${isSubscribed 
          ? 'border-primary/50 bg-primary/5'
          : 'border-border hover:border-primary/30 hover:shadow-md'
        }
      `}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg transition-colors ${
          isSubscribed 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
        }`}>
          {iconMap[channel.icon] || <Cpu className="w-5 h-5" />}
        </div>
        <button
          className={`
            p-2 rounded-full transition-all
            ${isSubscribed 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
            }
          `}
        >
          {isSubscribed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
        {channel.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {channel.description}
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{questionCount} questions</span>
        {isSubscribed && progress > 0 && (
          <span className="text-primary font-medium">{progress}% done</span>
        )}
      </div>

      {/* Progress bar for subscribed channels */}
      {isSubscribed && (
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      )}
    </motion.div>
  );
}
