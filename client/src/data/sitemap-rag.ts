/**
 * Sitemap RAG (Retrieval-Augmented Generation) Data
 * Complete site structure for AI agent navigation
 */

export interface SitemapRoute {
  path: string;
  title: string;
  description: string;
  category: 'main' | 'channel' | 'certification' | 'feature';
  keywords: string[];
  priority: number;
}

export const SITEMAP_RAG: SitemapRoute[] = [
  // Main Pages
  {
    path: '/',
    title: 'Home',
    description: 'Main dashboard with daily questions, learning paths, and quick access to all features',
    category: 'main',
    keywords: ['home', 'dashboard', 'start', 'main', 'overview'],
    priority: 1.0,
  },
  {
    path: '/learning-paths',
    title: 'Learning Paths',
    description: 'Browse and activate curated learning paths for different tech careers (Frontend, Backend, DevOps, etc.)',
    category: 'main',
    keywords: ['learning paths', 'paths', 'career', 'roadmap', 'frontend', 'backend', 'devops', 'fullstack'],
    priority: 0.9,
  },
  {
    path: '/my-path',
    title: 'My Learning Path',
    description: 'View and manage your active learning paths and progress',
    category: 'main',
    keywords: ['my path', 'progress', 'active', 'current path'],
    priority: 0.9,
  },
  {
    path: '/channels',
    title: 'All Channels',
    description: 'Browse all technical topics and interview channels',
    category: 'main',
    keywords: ['channels', 'topics', 'browse', 'all', 'categories'],
    priority: 0.9,
  },
  {
    path: '/certifications',
    title: 'Certification Prep',
    description: 'Prepare for AWS, Kubernetes, Terraform, GCP, and Azure certifications',
    category: 'main',
    keywords: ['certifications', 'cert', 'exam', 'prep', 'aws', 'kubernetes', 'terraform'],
    priority: 0.9,
  },
  {
    path: '/coding',
    title: 'Coding Challenges',
    description: 'Practice coding problems with real-time feedback',
    category: 'main',
    keywords: ['coding', 'challenges', 'practice', 'problems', 'leetcode', 'algorithms'],
    priority: 0.9,
  },
  {
    path: '/tests',
    title: 'Practice Tests',
    description: 'Take timed practice tests to simulate real interviews',
    category: 'main',
    keywords: ['tests', 'practice', 'quiz', 'exam', 'timed', 'assessment'],
    priority: 0.8,
  },
  {
    path: '/voice-interview',
    title: 'Voice Interview Practice',
    description: 'Practice interviews with AI voice interaction',
    category: 'main',
    keywords: ['voice', 'interview', 'speaking', 'practice', 'ai', 'conversation'],
    priority: 0.8,
  },
  {
    path: '/review',
    title: 'Spaced Repetition Review',
    description: 'Review bookmarked questions using spaced repetition',
    category: 'main',
    keywords: ['review', 'srs', 'spaced repetition', 'bookmarks', 'revision'],
    priority: 0.8,
  },
  {
    path: '/training',
    title: 'Training Mode',
    description: 'Focused training sessions on specific topics',
    category: 'main',
    keywords: ['training', 'practice', 'focused', 'session', 'drill'],
    priority: 0.8,
  },
  {
    path: '/badges',
    title: 'Badges & Achievements',
    description: 'View your earned badges and achievements',
    category: 'main',
    keywords: ['badges', 'achievements', 'rewards', 'progress', 'gamification'],
    priority: 0.7,
  },
  {
    path: '/whats-new',
    title: "What's New",
    description: 'Latest features, updates, and improvements',
    category: 'main',
    keywords: ['new', 'updates', 'features', 'changelog', 'latest'],
    priority: 0.8,
  },
  {
    path: '/about',
    title: 'About',
    description: 'Learn about Open-Interview and our mission',
    category: 'main',
    keywords: ['about', 'info', 'mission', 'team'],
    priority: 0.6,
  },
  {
    path: '/stats',
    title: 'Statistics',
    description: 'View your learning statistics and progress',
    category: 'main',
    keywords: ['stats', 'statistics', 'progress', 'analytics', 'metrics'],
    priority: 0.7,
  },
  {
    path: '/documentation',
    title: 'Documentation',
    description: 'Platform documentation and guides',
    category: 'main',
    keywords: ['docs', 'documentation', 'help', 'guide', 'manual'],
    priority: 0.6,
  },

  // CS Fundamentals Channels
  {
    path: '/channel/data-structures',
    title: 'Data Structures',
    description: 'Arrays, linked lists, trees, graphs, hash tables, and more',
    category: 'channel',
    keywords: ['data structures', 'arrays', 'trees', 'graphs', 'hash tables', 'linked lists'],
    priority: 0.9,
  },
  {
    path: '/channel/algorithms',
    title: 'Algorithms',
    description: 'Sorting, searching, graph algorithms, and problem-solving techniques',
    category: 'channel',
    keywords: ['algorithms', 'sorting', 'searching', 'graph', 'problem solving'],
    priority: 0.9,
  },
  {
    path: '/channel/complexity-analysis',
    title: 'Complexity Analysis',
    description: 'Big O notation, time and space complexity analysis',
    category: 'channel',
    keywords: ['complexity', 'big o', 'time complexity', 'space complexity', 'analysis'],
    priority: 0.8,
  },
  {
    path: '/channel/dynamic-programming',
    title: 'Dynamic Programming',
    description: 'DP patterns, memoization, and optimization problems',
    category: 'channel',
    keywords: ['dynamic programming', 'dp', 'memoization', 'optimization'],
    priority: 0.9,
  },
  {
    path: '/channel/bit-manipulation',
    title: 'Bit Manipulation',
    description: 'Bitwise operations and bit-level problem solving',
    category: 'channel',
    keywords: ['bit manipulation', 'bitwise', 'binary', 'bits'],
    priority: 0.7,
  },
  {
    path: '/channel/design-patterns',
    title: 'Design Patterns',
    description: 'Software design patterns and best practices',
    category: 'channel',
    keywords: ['design patterns', 'oop', 'architecture', 'patterns'],
    priority: 0.8,
  },
  {
    path: '/channel/concurrency',
    title: 'Concurrency',
    description: 'Multithreading, synchronization, and parallel programming',
    category: 'channel',
    keywords: ['concurrency', 'multithreading', 'parallel', 'synchronization', 'threads'],
    priority: 0.8,
  },
  {
    path: '/channel/math-logic',
    title: 'Math & Logic',
    description: 'Mathematical problems and logical reasoning',
    category: 'channel',
    keywords: ['math', 'logic', 'mathematics', 'reasoning', 'puzzles'],
    priority: 0.7,
  },
  {
    path: '/channel/low-level',
    title: 'Low-Level Programming',
    description: 'Memory management, pointers, and system-level programming',
    category: 'channel',
    keywords: ['low level', 'memory', 'pointers', 'system programming', 'c', 'c++'],
    priority: 0.7,
  },

  // Engineering Channels
  {
    path: '/channel/system-design',
    title: 'System Design',
    description: 'Scalable system architecture and design interviews',
    category: 'channel',
    keywords: ['system design', 'architecture', 'scalability', 'distributed systems'],
    priority: 0.9,
  },
  {
    path: '/channel/frontend',
    title: 'Frontend',
    description: 'React, JavaScript, CSS, and frontend development',
    category: 'channel',
    keywords: ['frontend', 'react', 'javascript', 'css', 'html', 'web'],
    priority: 0.9,
  },
  {
    path: '/channel/backend',
    title: 'Backend',
    description: 'Server-side development, APIs, and backend systems',
    category: 'channel',
    keywords: ['backend', 'server', 'api', 'rest', 'microservices'],
    priority: 0.9,
  },
  {
    path: '/channel/database',
    title: 'Database',
    description: 'SQL, NoSQL, database design, and optimization',
    category: 'channel',
    keywords: ['database', 'sql', 'nosql', 'postgres', 'mongodb', 'mysql'],
    priority: 0.8,
  },
  {
    path: '/channel/devops',
    title: 'DevOps',
    description: 'CI/CD, automation, infrastructure, and DevOps practices',
    category: 'channel',
    keywords: ['devops', 'ci/cd', 'automation', 'infrastructure', 'deployment'],
    priority: 0.8,
  },
  {
    path: '/channel/sre',
    title: 'SRE',
    description: 'Site Reliability Engineering, monitoring, and incident response',
    category: 'channel',
    keywords: ['sre', 'reliability', 'monitoring', 'incident', 'observability'],
    priority: 0.8,
  },
  {
    path: '/channel/kubernetes',
    title: 'Kubernetes',
    description: 'Container orchestration with Kubernetes',
    category: 'channel',
    keywords: ['kubernetes', 'k8s', 'containers', 'orchestration', 'docker'],
    priority: 0.8,
  },
  {
    path: '/channel/aws',
    title: 'AWS',
    description: 'Amazon Web Services cloud platform',
    category: 'channel',
    keywords: ['aws', 'amazon', 'cloud', 'ec2', 's3', 'lambda'],
    priority: 0.8,
  },
  {
    path: '/channel/terraform',
    title: 'Terraform',
    description: 'Infrastructure as Code with Terraform',
    category: 'channel',
    keywords: ['terraform', 'iac', 'infrastructure as code', 'hashicorp'],
    priority: 0.7,
  },
  {
    path: '/channel/data-engineering',
    title: 'Data Engineering',
    description: 'Data pipelines, ETL, and data infrastructure',
    category: 'channel',
    keywords: ['data engineering', 'etl', 'pipelines', 'data', 'spark'],
    priority: 0.7,
  },

  // AI/ML Channels
  {
    path: '/channel/machine-learning',
    title: 'Machine Learning',
    description: 'ML algorithms, models, and machine learning concepts',
    category: 'channel',
    keywords: ['machine learning', 'ml', 'ai', 'models', 'training'],
    priority: 0.8,
  },
  {
    path: '/channel/generative-ai',
    title: 'Generative AI',
    description: 'LLMs, GPT, and generative AI technologies',
    category: 'channel',
    keywords: ['generative ai', 'llm', 'gpt', 'chatgpt', 'ai'],
    priority: 0.9,
  },
  {
    path: '/channel/prompt-engineering',
    title: 'Prompt Engineering',
    description: 'Crafting effective prompts for AI models',
    category: 'channel',
    keywords: ['prompt engineering', 'prompts', 'llm', 'ai'],
    priority: 0.8,
  },
  {
    path: '/channel/llm-ops',
    title: 'LLMOps',
    description: 'Operating and deploying large language models',
    category: 'channel',
    keywords: ['llmops', 'mlops', 'llm', 'deployment', 'operations'],
    priority: 0.7,
  },
  {
    path: '/channel/computer-vision',
    title: 'Computer Vision',
    description: 'Image processing and computer vision techniques',
    category: 'channel',
    keywords: ['computer vision', 'cv', 'image processing', 'opencv'],
    priority: 0.7,
  },
  {
    path: '/channel/nlp',
    title: 'NLP',
    description: 'Natural Language Processing and text analysis',
    category: 'channel',
    keywords: ['nlp', 'natural language', 'text', 'language processing'],
    priority: 0.7,
  },

  // Programming Languages & Tools
  {
    path: '/channel/python',
    title: 'Python',
    description: 'Python programming language and ecosystem',
    category: 'channel',
    keywords: ['python', 'programming', 'language', 'coding'],
    priority: 0.8,
  },
  {
    path: '/channel/security',
    title: 'Security',
    description: 'Application security, cryptography, and security best practices',
    category: 'channel',
    keywords: ['security', 'cryptography', 'encryption', 'vulnerabilities'],
    priority: 0.8,
  },
  {
    path: '/channel/networking',
    title: 'Networking',
    description: 'Network protocols, TCP/IP, and networking concepts',
    category: 'channel',
    keywords: ['networking', 'tcp/ip', 'protocols', 'network'],
    priority: 0.7,
  },
  {
    path: '/channel/operating-systems',
    title: 'Operating Systems',
    description: 'OS concepts, processes, memory management',
    category: 'channel',
    keywords: ['operating systems', 'os', 'processes', 'memory'],
    priority: 0.7,
  },
  {
    path: '/channel/linux',
    title: 'Linux',
    description: 'Linux system administration and commands',
    category: 'channel',
    keywords: ['linux', 'unix', 'shell', 'bash', 'commands'],
    priority: 0.7,
  },
  {
    path: '/channel/testing',
    title: 'Testing',
    description: 'Software testing, unit tests, and QA practices',
    category: 'channel',
    keywords: ['testing', 'unit tests', 'qa', 'quality assurance'],
    priority: 0.8,
  },
  {
    path: '/channel/behavioral',
    title: 'Behavioral',
    description: 'Behavioral interview questions and STAR method',
    category: 'channel',
    keywords: ['behavioral', 'interview', 'star', 'soft skills'],
    priority: 0.8,
  },

  // AWS Certifications
  {
    path: '/certification/aws-saa',
    title: 'AWS Solutions Architect Associate',
    description: 'Prepare for AWS SAA-C03 certification exam',
    category: 'certification',
    keywords: ['aws', 'solutions architect', 'associate', 'saa', 'certification'],
    priority: 0.8,
  },
  {
    path: '/certification/aws-sap',
    title: 'AWS Solutions Architect Professional',
    description: 'Prepare for AWS SAP-C02 certification exam',
    category: 'certification',
    keywords: ['aws', 'solutions architect', 'professional', 'sap', 'certification'],
    priority: 0.8,
  },
  {
    path: '/certification/aws-dva',
    title: 'AWS Developer Associate',
    description: 'Prepare for AWS DVA-C02 certification exam',
    category: 'certification',
    keywords: ['aws', 'developer', 'associate', 'dva', 'certification'],
    priority: 0.8,
  },
  {
    path: '/certification/aws-sysops',
    title: 'AWS SysOps Administrator',
    description: 'Prepare for AWS SOA-C02 certification exam',
    category: 'certification',
    keywords: ['aws', 'sysops', 'administrator', 'soa', 'certification'],
    priority: 0.7,
  },
  {
    path: '/certification/aws-devops-pro',
    title: 'AWS DevOps Engineer Professional',
    description: 'Prepare for AWS DOP-C02 certification exam',
    category: 'certification',
    keywords: ['aws', 'devops', 'professional', 'dop', 'certification'],
    priority: 0.7,
  },

  // Kubernetes Certifications
  {
    path: '/certification/cka',
    title: 'CKA - Kubernetes Administrator',
    description: 'Prepare for Certified Kubernetes Administrator exam',
    category: 'certification',
    keywords: ['kubernetes', 'cka', 'administrator', 'certification', 'k8s'],
    priority: 0.8,
  },
  {
    path: '/certification/ckad',
    title: 'CKAD - Kubernetes Developer',
    description: 'Prepare for Certified Kubernetes Application Developer exam',
    category: 'certification',
    keywords: ['kubernetes', 'ckad', 'developer', 'certification', 'k8s'],
    priority: 0.8,
  },
  {
    path: '/certification/cks',
    title: 'CKS - Kubernetes Security',
    description: 'Prepare for Certified Kubernetes Security Specialist exam',
    category: 'certification',
    keywords: ['kubernetes', 'cks', 'security', 'certification', 'k8s'],
    priority: 0.7,
  },

  // Other Certifications
  {
    path: '/certification/terraform-associate',
    title: 'Terraform Associate',
    description: 'Prepare for HashiCorp Terraform Associate certification',
    category: 'certification',
    keywords: ['terraform', 'hashicorp', 'associate', 'certification', 'iac'],
    priority: 0.8,
  },
  {
    path: '/certification/gcp-cloud-engineer',
    title: 'GCP Cloud Engineer',
    description: 'Prepare for Google Cloud Associate Engineer certification',
    category: 'certification',
    keywords: ['gcp', 'google cloud', 'engineer', 'certification'],
    priority: 0.7,
  },
  {
    path: '/certification/azure-fundamentals',
    title: 'Azure Fundamentals',
    description: 'Prepare for Microsoft Azure AZ-900 certification',
    category: 'certification',
    keywords: ['azure', 'microsoft', 'fundamentals', 'az-900', 'certification'],
    priority: 0.7,
  },
];

/**
 * Find routes matching keywords
 */
export function findRoutesByKeywords(keywords: string[]): SitemapRoute[] {
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  return SITEMAP_RAG.filter(route => {
    const routeKeywords = route.keywords.map(k => k.toLowerCase());
    const titleWords = route.title.toLowerCase().split(' ');
    const descWords = route.description.toLowerCase().split(' ');
    
    return lowerKeywords.some(keyword => 
      routeKeywords.some(rk => rk.includes(keyword)) ||
      titleWords.some(tw => tw.includes(keyword)) ||
      descWords.some(dw => dw.includes(keyword))
    );
  }).sort((a, b) => b.priority - a.priority);
}

/**
 * Get route by exact path
 */
export function getRouteByPath(path: string): SitemapRoute | undefined {
  return SITEMAP_RAG.find(route => route.path === path);
}

/**
 * Get all routes by category
 */
export function getRoutesByCategory(category: SitemapRoute['category']): SitemapRoute[] {
  return SITEMAP_RAG.filter(route => route.category === category)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get top priority routes
 */
export function getTopRoutes(limit: number = 10): SitemapRoute[] {
  return [...SITEMAP_RAG]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/**
 * Search routes by query
 */
export function searchRoutes(query: string): SitemapRoute[] {
  const lowerQuery = query.toLowerCase();
  
  return SITEMAP_RAG.filter(route => {
    return (
      route.title.toLowerCase().includes(lowerQuery) ||
      route.description.toLowerCase().includes(lowerQuery) ||
      route.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
      route.path.toLowerCase().includes(lowerQuery)
    );
  }).sort((a, b) => b.priority - a.priority);
}
