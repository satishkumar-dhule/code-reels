// Re-export from questions-loader for backwards compatibility
export { 
  getQuestions, 
  getAllQuestions, 
  getQuestionById,
  getSubChannels,
  getChannelStats,
  getAvailableChannelIds,
  channelHasQuestions,
  type Question 
} from './questions-loader';

// Channel metadata for display
const channelMeta: Record<string, { image: string; color: string; icon: string; description: string }> = {
  'system-design': {
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
    color: 'text-cyan-500',
    icon: 'cpu',
    description: 'Scalable architecture patterns'
  },
  'algorithms': {
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop',
    color: 'text-green-500',
    icon: 'terminal',
    description: 'Optimization logic'
  },
  'frontend': {
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    color: 'text-magenta-500',
    icon: 'layout',
    description: 'UI/UX Engineering'
  },
  'database': {
    image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=300&fit=crop',
    color: 'text-yellow-500',
    icon: 'database',
    description: 'Storage Engines'
  },
  'sre': {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    color: 'text-blue-400',
    icon: 'activity',
    description: 'Reliability Engineering'
  },
  'devops': {
    image: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=300&fit=crop',
    color: 'text-orange-500',
    icon: 'infinity',
    description: 'CI/CD & Automation'
  }
};

const defaultMeta = {
  image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
  color: 'text-gray-500',
  icon: 'folder',
  description: 'Questions'
};

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface SubChannel {
  id: string;
  name: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  icon: string;
  subChannels: SubChannel[];
}

// Channel IDs
export const channelIds: string[] = ['system-design', 'algorithms', 'frontend', 'database', 'sre', 'devops'];

// Format channel ID to display name
function formatChannelName(id: string): string {
  const nameMap: Record<string, string> = {
    'system-design': 'System.Design',
    'algorithms': 'Algorithms',
    'frontend': 'Frontend',
    'database': 'Database',
    'sre': 'SRE',
    'devops': 'DevOps'
  };
  return nameMap[id] || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Build channels
function buildChannels(): Channel[] {
  return channelIds.map(channelId => {
    const meta = channelMeta[channelId] || defaultMeta;
    return {
      id: channelId,
      name: formatChannelName(channelId),
      description: meta.description,
      image: meta.image,
      color: meta.color,
      icon: meta.icon,
      subChannels: [{ id: 'all', name: 'All Topics' }]
    };
  });
}

export const channels: Channel[] = buildChannels();

// Get channel by ID
export function getChannel(channelId: string): Channel | undefined {
  return channels.find(c => c.id === channelId);
}

// Get question difficulty
export function getQuestionDifficulty(question: { difficulty: Difficulty }): Difficulty {
  return question.difficulty;
}
