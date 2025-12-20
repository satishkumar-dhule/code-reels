/**
 * LinkedIn-style Mobile Channels Browser
 * Card-based channel discovery with categories
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { allChannelsConfig, categories, ChannelConfig } from '../../lib/channels-config';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useChannelStats } from '../../hooks/use-stats';
import { useProgress } from '../../hooks/use-progress';
import {
  Search, Check, Plus, ChevronRight, X,
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

export function LinkedInChannels() {
  const [, setLocation] = useLocation();
  const { isSubscribed, toggleSubscription, preferences } = useUserPreferences();
  const { stats } = useChannelStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const questionCounts: Record<string, number> = {};
  stats.forEach(s => { questionCounts[s.id] = s.total; });

  const filteredChannels = allChannelsConfig.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         channel.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || channel.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedChannels = categories.map(cat => ({
    ...cat,
    channels: filteredChannels.filter(c => c.category === cat.id)
  })).filter(group => group.channels.length > 0);

  return (
    <div className="pb-20">
      {/* Search Bar */}
      <div className="sticky top-14 z-30 bg-background px-4 py-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/60 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          <CategoryPill
            label="All"
            isActive={!selectedCategory}
            onClick={() => setSelectedCategory(null)}
          />
          {categories.map(cat => (
            <CategoryPill
              key={cat.id}
              label={cat.name.split(' ')[0]}
              icon={iconMap[cat.icon]}
              isActive={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mx-4 my-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Subscribed</p>
              <p className="text-2xl font-bold">{preferences.subscribedChannels.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">{allChannelsConfig.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Channel List */}
      {selectedCategory ? (
        <div className="px-4 space-y-3">
          {filteredChannels.map((channel, index) => (
            <ChannelListCard
              key={channel.id}
              channel={channel}
              isSubscribed={isSubscribed(channel.id)}
              onToggle={() => toggleSubscription(channel.id)}
              questionCount={questionCounts[channel.id] || 0}
              index={index}
              onNavigate={() => setLocation(`/channel/${channel.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6 py-3">
          {groupedChannels.map(group => (
            <CategorySection
              key={group.id}
              category={group}
              channels={group.channels}
              questionCounts={questionCounts}
              isSubscribed={isSubscribed}
              onToggle={toggleSubscription}
              onNavigate={(id) => setLocation(`/channel/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredChannels.length === 0 && (
        <div className="text-center py-12 px-4">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium mb-2">No channels found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search
          </p>
        </div>
      )}
    </div>
  );
}

function CategoryPill({ 
  label, 
  icon, 
  isActive, 
  onClick 
}: { 
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
        ${isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function CategorySection({ 
  category, 
  channels, 
  questionCounts,
  isSubscribed,
  onToggle,
  onNavigate
}: { 
  category: any;
  channels: ChannelConfig[];
  questionCounts: Record<string, number>;
  isSubscribed: (id: string) => boolean;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayedChannels = expanded ? channels : channels.slice(0, 3);

  return (
    <section>
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            {iconMap[category.icon]}
          </div>
          <h2 className="font-semibold">{category.name}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{channels.length} channels</span>
      </div>
      
      <div className="px-4 space-y-2">
        {displayedChannels.map((channel, index) => (
          <ChannelListCard
            key={channel.id}
            channel={channel}
            isSubscribed={isSubscribed(channel.id)}
            onToggle={() => onToggle(channel.id)}
            questionCount={questionCounts[channel.id] || 0}
            index={index}
            onNavigate={() => onNavigate(channel.id)}
            compact
          />
        ))}
        {channels.length > 3 && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors"
          >
            {expanded ? 'Show less' : `Show ${channels.length - 3} more`}
          </button>
        )}
      </div>
    </section>
  );
}

function ChannelListCard({ 
  channel, 
  isSubscribed, 
  onToggle,
  questionCount,
  index,
  onNavigate,
  compact = false
}: { 
  channel: ChannelConfig;
  isSubscribed: boolean;
  onToggle: () => void;
  questionCount: number;
  index: number;
  onNavigate: () => void;
  compact?: boolean;
}) {
  const { completed } = useProgress(channel.id);
  const progress = questionCount > 0 ? Math.min(100, Math.round((completed.length / questionCount) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`
        bg-card border rounded-xl overflow-hidden transition-all
        ${isSubscribed ? 'border-primary/30' : 'border-border'}
      `}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <button
          onClick={onNavigate}
          className={`
            p-2.5 rounded-xl flex-shrink-0 transition-colors
            ${isSubscribed 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
            }
          `}
        >
          {iconMap[channel.icon] || <Code className="w-5 h-5" />}
        </button>

        {/* Content */}
        <button onClick={onNavigate} className="flex-1 min-w-0 text-left">
          <h3 className="font-medium text-sm truncate">{channel.name}</h3>
          {!compact && (
            <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{questionCount} questions</span>
            {isSubscribed && progress > 0 && (
              <span className="text-xs text-primary font-medium">{progress}%</span>
            )}
          </div>
        </button>

        {/* Subscribe Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`
            p-2 rounded-full flex-shrink-0 transition-all
            ${isSubscribed 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
            }
          `}
        >
          {isSubscribed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Progress bar for subscribed */}
      {isSubscribed && progress > 0 && (
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
