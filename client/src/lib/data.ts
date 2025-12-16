// Data layer - provides channel configuration and question access
// Questions are now lazy-loaded via hooks for better performance

// Re-export Question type for backwards compatibility
export type { Question } from './questions-loader';

// Import channel config as the single source of truth
import { allChannelsConfig } from './channels-config';

// Default image for channels
const defaultImage = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop';

// Category to image mapping
const categoryImages: Record<string, string> = {
  'engineering': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop',
  'cloud': 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=300&fit=crop',
  'data': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
  'ai': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop',
  'security': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
  'mobile': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  'management': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
  'testing': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
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

// Channel IDs - all available channels from channels-config
export const channelIds: string[] = allChannelsConfig.map(c => c.id);

// Format channel ID to display name
function formatChannelName(id: string, configName: string): string {
  const nameMap: Record<string, string> = {
    'system-design': 'System.Design',
    'sre': 'SRE',
    'devops': 'DevOps',
    'aws': 'AWS',
    'nlp': 'NLP',
    'llm-ops': 'LLMOps',
    'ios': 'iOS',
    'e2e-testing': 'E2E Testing',
    'api-testing': 'API Testing'
  };
  return nameMap[id] || configName;
}

// Build channels from channels-config (single source of truth)
function buildChannels(): Channel[] {
  return allChannelsConfig.map(config => {
    const image = categoryImages[config.category] || defaultImage;
    return {
      id: config.id,
      name: formatChannelName(config.id, config.name),
      description: config.description,
      image: image,
      color: config.color,
      icon: config.icon,
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

// POPULAR_COMPANIES for UI prioritization
export const POPULAR_COMPANIES = [
  'Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 
  'Netflix', 'Uber', 'Airbnb', 'LinkedIn', 'Twitter',
  'Stripe', 'Salesforce', 'Adobe', 'Oracle', 'IBM'
];
