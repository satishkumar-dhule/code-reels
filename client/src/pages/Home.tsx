import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useChannelStats } from '../hooks/use-stats';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { ChannelConfig } from '../lib/channels-config';
import { motion } from 'framer-motion';
import { 
  Terminal, Cpu, Database, Layout, BarChart2, Palette, Activity, GitBranch, 
  Star, AlertCircle, Sparkles, Plus, Server, Layers, Smartphone, Shield,
  Brain, Workflow, Box, Cloud, Code, Network, MessageCircle, Users, Eye, FileText,
  CheckCircle, Monitor, Zap, Gauge, Search, X, Rss, Bot
} from 'lucide-react';
import { SearchModal } from '../components/SearchModal';
import { useProgress } from '../hooks/use-progress';
import { useTheme } from '../context/ThemeContext';
import { SEOHead } from '../components/SEOHead';
import { trackChannelSelect, trackGitHubClick, trackThemeChange } from '../hooks/use-analytics';
import { WhatsNewBanner } from '../components/WhatsNewBanner';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  'cpu': <Cpu className="w-4 h-4 sm:w-6 sm:h-6" />,
  'terminal': <Terminal className="w-4 h-4 sm:w-6 sm:h-6" />,
  'layout': <Layout className="w-4 h-4 sm:w-6 sm:h-6" />,
  'database': <Database className="w-4 h-4 sm:w-6 sm:h-6" />,
  'activity': <Activity className="w-4 h-4 sm:w-6 sm:h-6" />,
  'infinity': <GitBranch className="w-4 h-4 sm:w-6 sm:h-6" />,
  'server': <Server className="w-4 h-4 sm:w-6 sm:h-6" />,
  'layers': <Layers className="w-4 h-4 sm:w-6 sm:h-6" />,
  'smartphone': <Smartphone className="w-4 h-4 sm:w-6 sm:h-6" />,
  'shield': <Shield className="w-4 h-4 sm:w-6 sm:h-6" />,
  'brain': <Brain className="w-4 h-4 sm:w-6 sm:h-6" />,
  'workflow': <Workflow className="w-4 h-4 sm:w-6 sm:h-6" />,
  'box': <Box className="w-4 h-4 sm:w-6 sm:h-6" />,
  'cloud': <Cloud className="w-4 h-4 sm:w-6 sm:h-6" />,
  'code': <Code className="w-4 h-4 sm:w-6 sm:h-6" />,
  'network': <Network className="w-4 h-4 sm:w-6 sm:h-6" />,
  'message-circle': <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />,
  'users': <Users className="w-4 h-4 sm:w-6 sm:h-6" />,
  'sparkles': <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />,
  'eye': <Eye className="w-4 h-4 sm:w-6 sm:h-6" />,
  'file-text': <FileText className="w-4 h-4 sm:w-6 sm:h-6" />,
  'chart': <Activity className="w-4 h-4 sm:w-6 sm:h-6" />,
  'check-circle': <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6" />,
  'monitor': <Monitor className="w-4 h-4 sm:w-6 sm:h-6" />,
  'zap': <Zap className="w-4 h-4 sm:w-6 sm:h-6" />,
  'gauge': <Gauge className="w-4 h-4 sm:w-6 sm:h-6" />
};

// Channel Card Component
function ChannelCard({ 
  channel, 
  index, 
  isSelected, 
  questionCount,
  setLocation,
  onUnsubscribe
}: { 
  channel: ChannelConfig; 
  index: number; 
  isSelected: boolean;
  questionCount: number;
  setLocation: (path: string) => void;
  onUnsubscribe: (channelId: string) => void;
}) {
  const { completed } = useProgress(channel.id);
  const progress = questionCount > 0 ? Math.round((completed.length / questionCount) * 100) : 0;

  return (
    <motion.div
      key={channel.id}
      onClick={() => {
        trackChannelSelect(channel.id, channel.name);
        setLocation(`/channel/${channel.id}`);
      }}
      className={`
        relative cursor-pointer border border-border p-3 sm:p-6 flex flex-col justify-between
        transition-all duration-200 group bg-card hover:border-primary min-h-[140px] sm:min-h-[200px]
        ${isSelected ? 'border-primary ring-1 ring-primary' : ''}
      `}
    >
      {/* Unsubscribe button - appears on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUnsubscribe(channel.id);
        }}
        className="absolute top-1 left-1 sm:top-2 sm:left-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all z-10"
        title="Unsubscribe from channel"
      >
        <X className="w-3 h-3 sm:w-4 sm:h-4" />
      </button>
      
      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 text-[9px] sm:text-xs font-bold opacity-30 group-hover:opacity-100">
        [{String(index + 1).padStart(2, '0')}]
      </div>

      <div className="space-y-2 sm:space-y-4">
        <div className={`
          w-8 h-8 sm:w-12 sm:h-12 border border-border flex items-center justify-center transition-colors
          ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'text-foreground'}
        `}>
          {iconMap[channel.icon] || <Cpu className="w-4 h-4 sm:w-6 sm:h-6" />}
        </div>
        
        <div>
          <h2 className="text-sm sm:text-2xl font-bold uppercase tracking-tight mb-0.5 sm:mb-1 truncate">{channel.name}</h2>
          <p className="text-[9px] sm:text-xs text-muted-foreground font-light line-clamp-2">{channel.description}</p>
        </div>
      </div>

      <div className="mt-3 sm:mt-8 space-y-1.5 sm:space-y-3">
        <div className="flex justify-between items-center text-[8px] sm:text-xs uppercase tracking-widest">
          <div className="flex gap-1 sm:gap-2">
            <span className="hidden sm:inline">Progress</span>
            <span className="text-muted-foreground">[{completed.length}/{questionCount}]</span>
          </div>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1 sm:h-2 bg-muted relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className={`
          hidden sm:flex items-center text-primary text-xs font-bold uppercase tracking-widest
          opacity-0 transition-all duration-200
          ${isSelected ? 'opacity-100' : 'group-hover:opacity-100'}
        `}>
          <span className="mr-2">&gt;</span> Execute_Module
        </div>
      </div>
    </motion.div>
  );
}

// Add More Channels Card
function AddChannelsCard({ setLocation }: { setLocation: (path: string) => void }) {
  return (
    <motion.div
      onClick={() => setLocation('/channels')}
      className="relative cursor-pointer border border-dashed border-border p-3 sm:p-6 flex flex-col items-center justify-center
        transition-all duration-200 group hover:border-primary hover:bg-primary/5 min-h-[140px] sm:min-h-[200px]"
    >
      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-muted-foreground/30 
        flex items-center justify-center mb-3 group-hover:border-primary transition-colors">
        <Plus className="w-5 h-5 sm:w-7 sm:h-7 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>
      <h2 className="text-sm sm:text-lg font-bold uppercase tracking-tight text-muted-foreground group-hover:text-primary transition-colors">
        Browse Channels
      </h2>
      <p className="text-[9px] sm:text-xs text-muted-foreground/50 mt-1">
        Add more topics
      </p>
    </motion.div>
  );
}

// Confirmation Dialog Component
function ConfirmDialog({ 
  isOpen, 
  channelName, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  channelName: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div 
        className="bg-card border border-border p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-2">Unsubscribe from {channelName}?</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You can always subscribe again from the Channels page.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold uppercase tracking-widest hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Unsubscribe
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [_, setLocation] = useLocation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [confirmUnsubscribe, setConfirmUnsubscribe] = useState<{ id: string; name: string } | null>(null);
  const { theme, cycleTheme } = useTheme();
  const { stats } = useChannelStats();
  const { getSubscribedChannels, unsubscribeChannel } = useUserPreferences();

  // Get subscribed channels
  const subscribedChannels = getSubscribedChannels();
  
  // Handle unsubscribe with confirmation
  const handleUnsubscribeClick = (channelId: string) => {
    const channel = subscribedChannels.find(c => c.id === channelId);
    if (channel) {
      setConfirmUnsubscribe({ id: channelId, name: channel.name });
    }
  };
  
  const confirmUnsubscribeAction = () => {
    if (confirmUnsubscribe) {
      unsubscribeChannel(confirmUnsubscribe.id);
      setConfirmUnsubscribe(null);
    }
  };

  // Create a map of channel ID to question count
  const questionCounts: Record<string, number> = {};
  stats.forEach(s => {
    questionCounts[s.id] = s.total;
  });

  // Keyboard navigation for channels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
        return;
      }
      
      // Don't handle navigation if search modal is open
      if (showSearchModal) return;
      
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev + 1) % (subscribedChannels.length + 1));
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev - 1 + subscribedChannels.length + 1) % (subscribedChannels.length + 1));
      } else if (e.key === 'Enter') {
        if (selectedIndex < subscribedChannels.length) {
          setLocation(`/channel/${subscribedChannels[selectedIndex].id}`);
        } else {
          setLocation('/channels');
        }
      } else if (e.key.toLowerCase() === 't') {
        cycleTheme();
      } else if (e.key.toLowerCase() === 's') {
        setLocation('/stats');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, setLocation, cycleTheme, subscribedChannels, showSearchModal]);

  return (
    <>
      <SEOHead
        title="Code Reels - Free Technical Interview Prep | System Design, Algorithms, Frontend, DevOps"
        description="Master technical interviews with 1000+ free practice questions. System design, algorithms, frontend, backend, DevOps, SRE, AI/ML interview prep. Track progress, learn with bite-sized modules. Used by engineers at FAANG companies."
        keywords="technical interview prep, system design interview, algorithm interview questions, frontend interview, backend interview, DevOps interview, SRE interview, FAANG interview prep, coding interview, software engineer interview, free interview prep, leetcode alternative, Google interview, Amazon interview, Meta interview"
        canonical="https://reel-interview.github.io/"
      />
      <WhatsNewBanner />
      <div className="min-h-screen bg-background text-foreground flex flex-col p-3 sm:p-4 md:p-12 font-mono transition-colors duration-300 overflow-x-hidden">
      <header className="mb-6 sm:mb-12 border-b border-border pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-1 sm:mb-2">
            <span className="text-primary mr-1 sm:mr-2">&gt;</span>Learn_Reels
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-sm md:text-base">
            // SYSTEM.READY<br className="hidden sm:block"/>
            <span className="hidden sm:inline">// </span>SELECT_MODULE_TO_BEGIN
          </p>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-2">
          <div className="flex gap-2 sm:gap-4 flex-wrap">
             <button 
               onClick={() => setShowSearchModal(true)}
               className="text-[10px] sm:text-xs uppercase tracking-widest hover:text-primary flex items-center gap-1 sm:gap-2 transition-colors p-1"
               title="Search Questions (⌘K)"
             >
                <Search className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Search</span>
             </button>
             <button 
               onClick={() => setLocation('/channels')}
               className="text-[10px] sm:text-xs uppercase tracking-widest hover:text-primary flex items-center gap-1 sm:gap-2 transition-colors p-1"
               title="Browse All Channels"
             >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Channels</span>
             </button>
             <button 
               onClick={() => setLocation('/whats-new')}
               className="text-[10px] sm:text-xs uppercase tracking-widest hover:text-primary flex items-center gap-1 sm:gap-2 transition-colors p-1"
               title="What's New"
             >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">New</span>
             </button>
             <button 
               onClick={() => setLocation('/about')}
               className="text-[10px] sm:text-xs uppercase tracking-widest hover:text-primary flex items-center gap-1 sm:gap-2 transition-colors p-1"
               title="About"
             >
                <Activity className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">About</span>
             </button>
             <button 
               onClick={() => setLocation('/stats')}
               className="text-[10px] sm:text-xs uppercase tracking-widest hover:text-primary flex items-center gap-1 sm:gap-2 transition-colors p-1"
               title="View Stats [S]"
             >
                <BarChart2 className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Stats</span>
             </button>
             <button 
               onClick={() => setLocation('/bot-activity')}
               className="text-[10px] sm:text-xs uppercase tracking-widest hover:text-primary flex items-center gap-1 sm:gap-2 transition-colors p-1"
               title="Bot Activity"
             >
                <Bot className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Bots</span>
             </button>
             <a 
               href="https://github.com/satishkumar-dhule/code-reels"
               target="_blank"
               rel="noopener noreferrer"
               onClick={() => trackGitHubClick('star')}
               className="text-[10px] sm:text-xs uppercase tracking-widest hover:text-primary flex items-center gap-1 sm:gap-2 transition-colors p-1"
               title="Star on GitHub"
             >
                <Star className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Star</span>
             </a>
             <button 
               onClick={() => {
                 cycleTheme();
                 trackThemeChange(theme);
               }}
               className="text-[10px] sm:text-xs uppercase tracking-widest hover:text-primary flex items-center gap-1 sm:gap-2 transition-colors p-1"
               title="Switch Theme [T]"
             >
                <Palette className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="truncate max-w-[60px] sm:max-w-none">{theme}</span>
             </button>
          </div>
          <div className="hidden md:block text-right text-xs text-muted-foreground">
            STATUS: ONLINE<br/>
            VERSION: 2.2.0
          </div>
        </div>
      </header>

      {subscribedChannels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Channels Subscribed</h2>
          <p className="text-muted-foreground text-sm mb-4">Browse and subscribe to channels to start learning</p>
          <button
            onClick={() => setLocation('/channels')}
            className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90 transition-colors"
          >
            Browse Channels
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 w-full flex-grow">
          {subscribedChannels.map((channel, index) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              index={index}
              isSelected={index === selectedIndex}
              questionCount={questionCounts[channel.id] || 0}
              setLocation={setLocation}
              onUnsubscribe={handleUnsubscribeClick}
            />
          ))}
          <AddChannelsCard setLocation={setLocation} />
        </div>
      )}

      <footer className="mt-6 sm:mt-12 space-y-2 sm:space-y-3">
        <div className="text-center text-muted-foreground text-[9px] sm:text-xs uppercase tracking-widest">
          <span className="hidden sm:inline">Use Arrow Keys to Navigate // 'T' for Theme // 'S' for Stats</span>
          <span className="sm:hidden">Tap to Select Module</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-[9px] sm:text-xs uppercase tracking-widest border-t border-border pt-2 sm:pt-3">
          <a 
            href="https://github.com/satishkumar-dhule/code-reels"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGitHubClick('star')}
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <Star className="w-3 h-3" /> Star on GitHub
          </a>
          <span className="text-border hidden sm:inline">•</span>
          <a 
            href="https://github.com/satishkumar-dhule/code-reels/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGitHubClick('issue')}
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" /> Report Issue
          </a>
          <span className="text-border hidden sm:inline">•</span>
          <a 
            href="https://github.com/satishkumar-dhule/code-reels/discussions"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGitHubClick('discussions')}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Discuss
          </a>
          <span className="text-border hidden sm:inline">•</span>
          <a 
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
            title="Subscribe to RSS Feed"
          >
            <Rss className="w-3 h-3" /> RSS
          </a>
        </div>
      </footer>
      </div>
      
      {/* Search Modal */}
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
      
      {/* Unsubscribe Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmUnsubscribe}
        channelName={confirmUnsubscribe?.name || ''}
        onConfirm={confirmUnsubscribeAction}
        onCancel={() => setConfirmUnsubscribe(null)}
      />
    </>
  );
}
