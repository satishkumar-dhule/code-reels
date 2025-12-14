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

// Channel metadata for display - matches channels-config.ts
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
    color: 'text-purple-500',
    icon: 'layout',
    description: 'UI/UX Engineering'
  },
  'backend': {
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
    color: 'text-blue-500',
    icon: 'server',
    description: 'APIs & Server Architecture'
  },
  'database': {
    image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=300&fit=crop',
    color: 'text-yellow-500',
    icon: 'database',
    description: 'Storage Engines'
  },
  'devops': {
    image: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=300&fit=crop',
    color: 'text-orange-500',
    icon: 'infinity',
    description: 'CI/CD & Automation'
  },
  'sre': {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    color: 'text-red-500',
    icon: 'activity',
    description: 'Reliability Engineering'
  },
  'kubernetes': {
    image: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=300&fit=crop',
    color: 'text-blue-400',
    icon: 'box',
    description: 'Container Orchestration'
  },
  'aws': {
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
    color: 'text-orange-400',
    icon: 'cloud',
    description: 'Cloud Architecture'
  },
  'terraform': {
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
    color: 'text-purple-400',
    icon: 'layers',
    description: 'Infrastructure as Code'
  },
  'data-engineering': {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    color: 'text-teal-500',
    icon: 'workflow',
    description: 'Data Pipelines & ETL'
  },
  'machine-learning': {
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop',
    color: 'text-pink-500',
    icon: 'brain',
    description: 'ML & AI'
  },
  'python': {
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop',
    color: 'text-yellow-400',
    icon: 'code',
    description: 'Python Programming'
  },
  'security': {
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
    color: 'text-red-400',
    icon: 'shield',
    description: 'Application Security'
  },
  'networking': {
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
    color: 'text-indigo-500',
    icon: 'network',
    description: 'Network Engineering'
  },
  'ios': {
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    color: 'text-gray-400',
    icon: 'smartphone',
    description: 'iOS Development'
  },
  'android': {
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    color: 'text-green-400',
    icon: 'smartphone',
    description: 'Android Development'
  },
  'react-native': {
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    color: 'text-cyan-400',
    icon: 'smartphone',
    description: 'Cross-platform Mobile'
  },
  'engineering-management': {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    color: 'text-amber-500',
    icon: 'users',
    description: 'Team Leadership'
  },
  'behavioral': {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    color: 'text-emerald-500',
    icon: 'message-circle',
    description: 'Soft Skills & STAR'
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

// Channel IDs - all available channels from metadata
export const channelIds: string[] = Object.keys(channelMeta);

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
