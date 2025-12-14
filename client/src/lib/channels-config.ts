// All available channels with metadata
export interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'engineering' | 'data' | 'cloud' | 'security' | 'management' | 'mobile' | 'ai';
  roles: string[]; // Which roles this channel is recommended for
}

export const allChannelsConfig: ChannelConfig[] = [
  // Engineering Channels
  {
    id: 'system-design',
    name: 'System Design',
    description: 'Scalable architecture patterns & distributed systems',
    icon: 'cpu',
    color: 'text-cyan-500',
    category: 'engineering',
    roles: ['backend', 'fullstack', 'architect', 'sre', 'devops']
  },
  {
    id: 'algorithms',
    name: 'Algorithms',
    description: 'Data structures, sorting, searching & optimization',
    icon: 'terminal',
    color: 'text-green-500',
    category: 'engineering',
    roles: ['backend', 'fullstack', 'frontend', 'mobile', 'data-engineer']
  },
  {
    id: 'frontend',
    name: 'Frontend',
    description: 'React, Vue, CSS, Performance & Web APIs',
    icon: 'layout',
    color: 'text-purple-500',
    category: 'engineering',
    roles: ['frontend', 'fullstack', 'mobile']
  },
  {
    id: 'backend',
    name: 'Backend',
    description: 'APIs, microservices, caching & server architecture',
    icon: 'server',
    color: 'text-blue-500',
    category: 'engineering',
    roles: ['backend', 'fullstack', 'architect']
  },
  {
    id: 'database',
    name: 'Database',
    description: 'SQL, NoSQL, indexing & query optimization',
    icon: 'database',
    color: 'text-yellow-500',
    category: 'engineering',
    roles: ['backend', 'fullstack', 'data-engineer', 'dba']
  },
  
  // DevOps & Cloud
  {
    id: 'devops',
    name: 'DevOps',
    description: 'CI/CD, automation, containers & orchestration',
    icon: 'infinity',
    color: 'text-orange-500',
    category: 'cloud',
    roles: ['devops', 'sre', 'backend', 'platform']
  },
  {
    id: 'sre',
    name: 'SRE',
    description: 'Reliability, monitoring, incident response & SLOs',
    icon: 'activity',
    color: 'text-red-500',
    category: 'cloud',
    roles: ['sre', 'devops', 'platform']
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'Container orchestration, pods, services & deployments',
    icon: 'box',
    color: 'text-blue-400',
    category: 'cloud',
    roles: ['devops', 'sre', 'platform', 'backend']
  },
  {
    id: 'aws',
    name: 'AWS',
    description: 'EC2, S3, Lambda, RDS & cloud architecture',
    icon: 'cloud',
    color: 'text-orange-400',
    category: 'cloud',
    roles: ['devops', 'sre', 'backend', 'architect', 'platform']
  },
  {
    id: 'terraform',
    name: 'Terraform',
    description: 'Infrastructure as Code, modules & state management',
    icon: 'layers',
    color: 'text-purple-400',
    category: 'cloud',
    roles: ['devops', 'sre', 'platform']
  },
  
  // Data & AI
  {
    id: 'data-engineering',
    name: 'Data Engineering',
    description: 'ETL, data pipelines, warehousing & streaming',
    icon: 'workflow',
    color: 'text-teal-500',
    category: 'data',
    roles: ['data-engineer', 'backend', 'ml-engineer']
  },
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    description: 'ML algorithms, model training & deployment',
    icon: 'brain',
    color: 'text-pink-500',
    category: 'ai',
    roles: ['ml-engineer', 'data-scientist', 'ai-engineer']
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Python fundamentals, libraries & best practices',
    icon: 'code',
    color: 'text-yellow-400',
    category: 'engineering',
    roles: ['backend', 'data-engineer', 'ml-engineer', 'data-scientist']
  },
  
  // Security
  {
    id: 'security',
    name: 'Security',
    description: 'Application security, OWASP, encryption & auth',
    icon: 'shield',
    color: 'text-red-400',
    category: 'security',
    roles: ['security', 'backend', 'fullstack', 'devops']
  },
  {
    id: 'networking',
    name: 'Networking',
    description: 'TCP/IP, DNS, load balancing & CDN',
    icon: 'network',
    color: 'text-indigo-500',
    category: 'engineering',
    roles: ['sre', 'devops', 'security', 'backend']
  },
  
  // Mobile
  {
    id: 'ios',
    name: 'iOS',
    description: 'Swift, UIKit, SwiftUI & iOS architecture',
    icon: 'smartphone',
    color: 'text-gray-400',
    category: 'mobile',
    roles: ['mobile', 'ios']
  },
  {
    id: 'android',
    name: 'Android',
    description: 'Kotlin, Jetpack Compose & Android architecture',
    icon: 'smartphone',
    color: 'text-green-400',
    category: 'mobile',
    roles: ['mobile', 'android']
  },
  {
    id: 'react-native',
    name: 'React Native',
    description: 'Cross-platform mobile development with React',
    icon: 'smartphone',
    color: 'text-cyan-400',
    category: 'mobile',
    roles: ['mobile', 'frontend', 'fullstack']
  },
  
  // Management & Soft Skills
  {
    id: 'engineering-management',
    name: 'Engineering Management',
    description: 'Team leadership, 1:1s, hiring & project management',
    icon: 'users',
    color: 'text-amber-500',
    category: 'management',
    roles: ['manager', 'tech-lead', 'architect']
  },
  {
    id: 'behavioral',
    name: 'Behavioral',
    description: 'STAR method, leadership principles & soft skills',
    icon: 'message-circle',
    color: 'text-emerald-500',
    category: 'management',
    roles: ['all'] // Recommended for everyone
  }
];

// User roles with display names
export interface RoleConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const rolesConfig: RoleConfig[] = [
  { id: 'frontend', name: 'Frontend Engineer', description: 'React, Vue, CSS, Web Performance', icon: 'layout' },
  { id: 'backend', name: 'Backend Engineer', description: 'APIs, Databases, Server Architecture', icon: 'server' },
  { id: 'fullstack', name: 'Full Stack Engineer', description: 'End-to-end web development', icon: 'layers' },
  { id: 'mobile', name: 'Mobile Engineer', description: 'iOS, Android, React Native', icon: 'smartphone' },
  { id: 'devops', name: 'DevOps Engineer', description: 'CI/CD, Infrastructure, Automation', icon: 'infinity' },
  { id: 'sre', name: 'Site Reliability Engineer', description: 'Reliability, Monitoring, Incident Response', icon: 'activity' },
  { id: 'data-engineer', name: 'Data Engineer', description: 'ETL, Data Pipelines, Warehousing', icon: 'workflow' },
  { id: 'ml-engineer', name: 'ML Engineer', description: 'Machine Learning, Model Deployment', icon: 'brain' },
  { id: 'security', name: 'Security Engineer', description: 'AppSec, Penetration Testing, Compliance', icon: 'shield' },
  { id: 'architect', name: 'Solutions Architect', description: 'System Design, Cloud Architecture', icon: 'cpu' },
  { id: 'manager', name: 'Engineering Manager', description: 'Team Leadership, Hiring, Strategy', icon: 'users' },
  { id: 'platform', name: 'Platform Engineer', description: 'Developer Experience, Internal Tools', icon: 'box' }
];

// Get recommended channels for a role
export function getRecommendedChannels(roleId: string): ChannelConfig[] {
  return allChannelsConfig.filter(
    channel => channel.roles.includes(roleId) || channel.roles.includes('all')
  );
}

// Get channels by category
export function getChannelsByCategory(category: string): ChannelConfig[] {
  return allChannelsConfig.filter(channel => channel.category === category);
}

// Categories for grouping
export const categories = [
  { id: 'engineering', name: 'Engineering', icon: 'code' },
  { id: 'cloud', name: 'Cloud & DevOps', icon: 'cloud' },
  { id: 'data', name: 'Data', icon: 'database' },
  { id: 'ai', name: 'AI & ML', icon: 'brain' },
  { id: 'security', name: 'Security', icon: 'shield' },
  { id: 'mobile', name: 'Mobile', icon: 'smartphone' },
  { id: 'management', name: 'Management', icon: 'users' }
];
