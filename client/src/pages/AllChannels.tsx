import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { allChannelsConfig, categories, ChannelConfig } from '../lib/channels-config';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useChannelStats } from '../hooks/use-stats';
import { SEOHead } from '../components/SEOHead';
import { 
  ArrowLeft, Check, Plus, Search, Filter, 
  Layout, Server, Layers, Smartphone, Activity, Shield, 
  Cpu, Users, Database, Brain, Workflow, Box, Cloud, Code,
  Network, MessageCircle, Terminal, GitBranch
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'layout': <Layout className="w-5 h-5" />,
  'server': <Server className="w-5 h-5" />,
  'layers': <Layers className="w-5 h-5" />,
  'smartphone': <Smartphone className="w-5 h-5" />,
  'infinity': <GitBranch className="w-5 h-5" />,
  'activity': <Activity className="w-5 h-5" />,
  'workflow': <Workflow className="w-5 h-5" />,
  'brain': <Brain className="w-5 h-5" />,
  'shield': <Shield className="w-5 h-5" />,
  'cpu': <Cpu className="w-5 h-5" />,
  'users': <Users className="w-5 h-5" />,
  'box': <Box className="w-5 h-5" />,
  'database': <Database className="w-5 h-5" />,
  'cloud': <Cloud className="w-5 h-5" />,
  'code': <Code className="w-5 h-5" />,
  'network': <Network className="w-5 h-5" />,
  'message-circle': <MessageCircle className="w-5 h-5" />,
  'terminal': <Terminal className="w-5 h-5" />
};

function ChannelCard({ 
  channel, 
  isSubscribed, 
  onToggle,
  questionCount 
}: { 
  channel: ChannelConfig; 
  isSubscribed: boolean; 
  onToggle: () => void;
  questionCount: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        p-4 border rounded-lg transition-all cursor-pointer
        ${isSubscribed 
          ? 'border-primary bg-primary/5' 
          : 'border-white/20 hover:border-white/40 hover:bg-white/5'
        }
      `}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`${channel.color}`}>
          {iconMap[channel.icon] || <Cpu className="w-5 h-5" />}
        </div>
        <button
          className={`
            p-1.5 rounded-full transition-all
            ${isSubscribed 
              ? 'bg-primary text-black' 
              : 'bg-white/10 text-white/50 hover:bg-white/20'
            }
          `}
        >
          {isSubscribed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      <h3 className="font-bold text-sm mb-1">{channel.name}</h3>
      <p className="text-[10px] text-white/50 line-clamp-2 mb-2">{channel.description}</p>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/40">{questionCount} questions</span>
        {isSubscribed && (
          <span className="text-primary font-bold uppercase tracking-wider">Subscribed</span>
        )}
      </div>
    </motion.div>
  );
}

export default function AllChannels() {
  const [, setLocation] = useLocation();
  const { isSubscribed, toggleSubscription, preferences } = useUserPreferences();
  const { stats } = useChannelStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Create question count map
  const questionCounts: Record<string, number> = {};
  stats.forEach(s => {
    questionCounts[s.id] = s.total;
  });

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

  return (
    <>
      <SEOHead
        title="All Channels - Code Reels"
        description="Browse and subscribe to interview prep channels"
      />
      <div className="min-h-screen bg-black text-white font-mono">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setLocation('/')}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
              <div className="text-xs text-white/50">
                {preferences.subscribedChannels.length} channels subscribed
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-4">
              <span className="text-primary">&gt;</span> All Channels
            </h1>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`
                    px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap transition-all
                    ${!selectedCategory 
                      ? 'bg-primary text-black' 
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }
                  `}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap transition-all
                      ${selectedCategory === cat.id 
                        ? 'bg-primary text-black' 
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }
                    `}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Channel Grid */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          {selectedCategory ? (
            // Flat grid when category is selected
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredChannels.map(channel => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isSubscribed={isSubscribed(channel.id)}
                  onToggle={() => toggleSubscription(channel.id)}
                  questionCount={questionCounts[channel.id] || 0}
                />
              ))}
            </div>
          ) : (
            // Grouped by category
            <div className="space-y-8">
              {groupedChannels.map(group => (
                <div key={group.id}>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    {iconMap[group.icon]}
                    {group.name}
                    <span className="text-xs text-white/40 font-normal">
                      ({group.channels.length} channels)
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.channels.map(channel => (
                      <ChannelCard
                        key={channel.id}
                        channel={channel}
                        isSubscribed={isSubscribed(channel.id)}
                        onToggle={() => toggleSubscription(channel.id)}
                        questionCount={questionCounts[channel.id] || 0}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredChannels.length === 0 && (
            <div className="text-center py-12 text-white/50">
              <p>No channels found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
