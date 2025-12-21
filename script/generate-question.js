import {
  addUnifiedQuestion,
  generateUnifiedId,
  isDuplicateUnified,
  runWithRetries,
  parseJson,
  validateQuestion,
  writeGitHubOutput,
  logQuestionsAdded,
  validateYouTubeVideos,
  normalizeCompanies,
  logBotActivity,
  getChannelQuestionCounts,
  getQuestionCount
} from './utils.js';

// Channel configurations
const channelConfigs = {
  'system-design': [
    { subChannel: 'infrastructure', tags: ['infra', 'scale', 'distributed'] },
    { subChannel: 'distributed-systems', tags: ['dist-sys', 'cap-theorem', 'consensus'] },
    { subChannel: 'api-design', tags: ['api', 'rest', 'grpc', 'graphql'] },
    { subChannel: 'caching', tags: ['cache', 'redis', 'memcached', 'cdn'] },
    { subChannel: 'load-balancing', tags: ['lb', 'traffic', 'nginx', 'haproxy'] },
    { subChannel: 'message-queues', tags: ['kafka', 'rabbitmq', 'sqs', 'pubsub'] },
  ],
  'algorithms': [
    { subChannel: 'data-structures', tags: ['arrays', 'linkedlist', 'hashtable', 'heap'] },
    { subChannel: 'sorting', tags: ['quicksort', 'mergesort', 'complexity'] },
    { subChannel: 'dynamic-programming', tags: ['dp', 'memoization', 'tabulation'] },
    { subChannel: 'graphs', tags: ['bfs', 'dfs', 'dijkstra', 'topological'] },
    { subChannel: 'trees', tags: ['bst', 'avl', 'trie', 'segment-tree'] },
  ],
  'frontend': [
    { subChannel: 'react', tags: ['react', 'hooks', 'context', 'redux'] },
    { subChannel: 'javascript', tags: ['js', 'es6', 'closures', 'promises'] },
    { subChannel: 'css', tags: ['css', 'flexbox', 'grid', 'animations'] },
    { subChannel: 'performance', tags: ['lighthouse', 'bundle', 'lazy-loading'] },
    { subChannel: 'web-apis', tags: ['dom', 'fetch', 'websocket', 'service-worker'] },
  ],
  'backend': [
    { subChannel: 'apis', tags: ['rest', 'graphql', 'grpc', 'openapi'] },
    { subChannel: 'microservices', tags: ['saga', 'cqrs', 'event-sourcing'] },
    { subChannel: 'caching', tags: ['redis', 'memcached', 'cache-invalidation'] },
    { subChannel: 'authentication', tags: ['jwt', 'oauth2', 'oidc', 'saml'] },
    { subChannel: 'server-architecture', tags: ['scaling', 'sharding', 'replication'] },
  ],
  'database': [
    { subChannel: 'sql', tags: ['joins', 'indexes', 'normalization', 'postgres'] },
    { subChannel: 'nosql', tags: ['mongodb', 'dynamodb', 'cassandra', 'redis'] },
    { subChannel: 'indexing', tags: ['btree', 'hash-index', 'composite'] },
    { subChannel: 'transactions', tags: ['acid', 'isolation-levels', 'mvcc'] },
    { subChannel: 'query-optimization', tags: ['explain', 'query-plan', 'partitioning'] },
  ],
  'devops': [
    { subChannel: 'cicd', tags: ['github-actions', 'jenkins', 'gitlab-ci'] },
    { subChannel: 'docker', tags: ['dockerfile', 'compose', 'multi-stage'] },
    { subChannel: 'automation', tags: ['ansible', 'puppet', 'chef'] },
    { subChannel: 'gitops', tags: ['argocd', 'flux', 'declarative'] },
  ],
  'sre': [
    { subChannel: 'observability', tags: ['prometheus', 'grafana', 'opentelemetry'] },
    { subChannel: 'reliability', tags: ['slo', 'sli', 'error-budget'] },
    { subChannel: 'incident-management', tags: ['pagerduty', 'runbooks', 'postmortem'] },
    { subChannel: 'chaos-engineering', tags: ['chaos-monkey', 'litmus', 'gremlin'] },
    { subChannel: 'capacity-planning', tags: ['forecasting', 'autoscaling', 'load-testing'] },
  ],
  'kubernetes': [
    { subChannel: 'pods', tags: ['containers', 'init-containers', 'sidecars'] },
    { subChannel: 'services', tags: ['clusterip', 'nodeport', 'loadbalancer', 'ingress'] },
    { subChannel: 'deployments', tags: ['rolling-update', 'canary', 'blue-green'] },
    { subChannel: 'helm', tags: ['charts', 'values', 'templating'] },
    { subChannel: 'operators', tags: ['crds', 'controllers', 'reconciliation'] },
  ],
  'aws': [
    { subChannel: 'compute', tags: ['ec2', 'ecs', 'eks', 'fargate'] },
    { subChannel: 'storage', tags: ['s3', 'ebs', 'efs', 'glacier'] },
    { subChannel: 'serverless', tags: ['lambda', 'api-gateway', 'step-functions'] },
    { subChannel: 'database', tags: ['rds', 'aurora', 'dynamodb', 'elasticache'] },
    { subChannel: 'networking', tags: ['vpc', 'route53', 'cloudfront', 'alb'] },
  ],
  'generative-ai': [
    { subChannel: 'llm-fundamentals', tags: ['transformer', 'attention', 'tokenization'] },
    { subChannel: 'fine-tuning', tags: ['lora', 'qlora', 'peft', 'adapter'] },
    { subChannel: 'rag', tags: ['retrieval', 'embeddings', 'vector-db', 'chunking'] },
    { subChannel: 'agents', tags: ['langchain', 'autogen', 'tool-use', 'planning'] },
    { subChannel: 'evaluation', tags: ['hallucination', 'faithfulness', 'relevance'] },
  ],
  'machine-learning': [
    { subChannel: 'algorithms', tags: ['regression', 'classification', 'clustering'] },
    { subChannel: 'model-training', tags: ['hyperparameter', 'cross-validation', 'regularization'] },
    { subChannel: 'deployment', tags: ['mlflow', 'kubeflow', 'sagemaker'] },
    { subChannel: 'deep-learning', tags: ['cnn', 'rnn', 'transformer', 'attention'] },
    { subChannel: 'evaluation', tags: ['precision', 'recall', 'auc-roc', 'f1'] },
  ],
  'security': [
    { subChannel: 'application-security', tags: ['xss', 'csrf', 'sqli', 'ssrf'] },
    { subChannel: 'owasp', tags: ['top10', 'asvs', 'samm'] },
    { subChannel: 'encryption', tags: ['aes', 'rsa', 'tls', 'hashing'] },
    { subChannel: 'authentication', tags: ['mfa', 'passkeys', 'zero-trust'] },
  ],
  'testing': [
    { subChannel: 'unit-testing', tags: ['jest', 'mocha', 'pytest', 'junit'] },
    { subChannel: 'integration-testing', tags: ['api-testing', 'database-testing', 'mocking'] },
    { subChannel: 'tdd', tags: ['test-driven', 'red-green-refactor', 'test-first'] },
    { subChannel: 'test-strategies', tags: ['test-pyramid', 'coverage', 'mutation-testing'] },
  ],
  'behavioral': [
    { subChannel: 'star-method', tags: ['situation', 'task', 'action', 'result'] },
    { subChannel: 'leadership-principles', tags: ['ownership', 'bias-for-action', 'customer-obsession'] },
    { subChannel: 'soft-skills', tags: ['communication', 'collaboration', 'influence'] },
    { subChannel: 'conflict-resolution', tags: ['negotiation', 'mediation', 'feedback'] },
  ],
};

const difficulties = ['beginner', 'intermediate', 'advanced'];

// Top 100 tech companies known for rigorous technical interviews
const TOP_TECH_COMPANIES = [
  // FAANG / MAANG
  'Google', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Microsoft',
  // Big Tech
  'Nvidia', 'Tesla', 'Salesforce', 'Adobe', 'Oracle', 'IBM', 'Intel', 'Cisco', 'SAP',
  // Cloud & Infrastructure
  'Snowflake', 'Databricks', 'Cloudflare', 'MongoDB', 'Elastic', 'HashiCorp', 'Confluent',
  // Fintech
  'Stripe', 'Square', 'PayPal', 'Plaid', 'Robinhood', 'Coinbase', 'Affirm', 'Chime',
  // E-commerce & Retail
  'Shopify', 'Instacart', 'DoorDash', 'Uber', 'Lyft', 'Airbnb', 'Booking.com', 'Expedia',
  // Social & Communication
  'LinkedIn', 'Twitter', 'Snap', 'Discord', 'Slack', 'Zoom', 'Twilio',
  // Streaming & Entertainment
  'Spotify', 'Disney+', 'Hulu', 'Warner Bros', 'Roblox', 'Epic Games', 'Unity',
  // Enterprise & SaaS
  'ServiceNow', 'Workday', 'Atlassian', 'Splunk', 'Datadog', 'New Relic', 'PagerDuty',
  'Okta', 'CrowdStrike', 'Zscaler', 'Palo Alto Networks', 'Fortinet',
  // AI & ML
  'OpenAI', 'Anthropic', 'DeepMind', 'Hugging Face', 'Scale AI', 'Cohere', 'Stability AI',
  // Hardware & Semiconductors
  'AMD', 'Qualcomm', 'Broadcom', 'Micron', 'Western Digital', 'Seagate',
  // Consulting & Services
  'Accenture', 'Deloitte', 'McKinsey', 'BCG', 'Bain', 'Thoughtworks', 'Infosys', 'TCS', 'Wipro',
  // Startups & Unicorns
  'Figma', 'Notion', 'Canva', 'Miro', 'Airtable', 'Vercel', 'Supabase', 'PlanetScale',
  'Linear', 'Retool', 'Webflow', 'Postman', 'GitLab', 'GitHub',
  // Healthcare Tech
  'Epic Systems', 'Cerner', 'Veeva', 'Tempus', 'Oscar Health',
  // Other Notable
  'Bloomberg', 'Two Sigma', 'Citadel', 'Jane Street', 'DE Shaw', 'HRT',
  'Palantir', 'Anduril', 'SpaceX', 'Waymo', 'Cruise', 'Aurora'
];

// Get random companies from the top list (2-4 companies)
function getRandomTopCompanies(count = 3) {
  const shuffled = [...TOP_TECH_COMPANIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, Math.floor(Math.random() * 3) + 2));
}

function getAllChannels() {
  return Object.keys(channelConfigs);
}

// NFR: Check if diagram is trivial/placeholder (should be rejected)
function isTrivialDiagram(diagram) {
  if (!diagram) return true;
  
  const trimmed = diagram.trim().toLowerCase();
  const lines = trimmed.split('\n').filter(line => {
    const l = line.trim();
    // Skip empty lines, comments, and diagram type declarations
    return l && !l.startsWith('%%') && 
           !l.startsWith('graph') && !l.startsWith('flowchart') &&
           !l.startsWith('sequencediagram') && !l.startsWith('classdiagram');
  });
  
  // Must have at least 4 meaningful lines
  if (lines.length < 4) return true;
  
  // Check for trivial "Start -> End" patterns
  const content = lines.join(' ');
  if (content.includes('start') && content.includes('end') && lines.length <= 3) {
    return true;
  }
  
  // Check for generic placeholder patterns
  const placeholderPatterns = [
    /\bstart\b.*\bend\b/i,
    /\bbegin\b.*\bfinish\b/i,
    /\bstep\s*1\b.*\bstep\s*2\b.*\bstep\s*3\b/i,
    /\bconcept\b.*\bimplementation\b/i,
    /\binput\b.*\boutput\b/i,
  ];
  
  // If matches placeholder pattern AND has few nodes, it's trivial
  const nodeCount = (diagram.match(/\[.*?\]|\(.*?\)|{.*?}|>.*?]/g) || []).length;
  if (nodeCount <= 3 && placeholderPatterns.some(p => p.test(content))) {
    return true;
  }
  
  return false;
}

// Validate question quality to ensure it's a real interview question
function validateQuestionQuality(question, channel, difficulty) {
  // Check minimum length
  if (question.length < 30) {
    return { valid: false, reason: 'Question too short (< 30 chars)' };
  }
  
  // Check it ends with a question mark
  if (!question.trim().endsWith('?')) {
    return { valid: false, reason: 'Question must end with ?' };
  }
  
  // Check for generic/vague questions
  const vaguePatterns = [
    /^what is /i,
    /^define /i,
    /^explain what /i,
    /^tell me about /i,
  ];
  
  // Allow "what is" for beginner level only
  if (difficulty !== 'beginner') {
    for (const pattern of vaguePatterns) {
      if (pattern.test(question) && question.length < 60) {
        return { valid: false, reason: 'Question too generic for ' + difficulty + ' level' };
      }
    }
  }
  
  // Check for specific technical content based on channel
  const channelKeywords = {
    'system-design': ['design', 'scale', 'architecture', 'handle', 'build', 'implement', 'distributed'],
    'algorithms': ['array', 'string', 'tree', 'graph', 'find', 'implement', 'optimize', 'complexity', 'given'],
    'frontend': ['react', 'javascript', 'css', 'component', 'render', 'state', 'dom', 'browser', 'performance'],
    'backend': ['api', 'database', 'server', 'request', 'authentication', 'microservice', 'cache'],
    'devops': ['deploy', 'pipeline', 'container', 'kubernetes', 'docker', 'ci/cd', 'infrastructure'],
    'sre': ['incident', 'monitoring', 'slo', 'availability', 'latency', 'alert', 'on-call'],
    'database': ['query', 'index', 'transaction', 'sql', 'nosql', 'schema', 'optimization'],
    'behavioral': ['time', 'situation', 'challenge', 'team', 'project', 'decision', 'conflict'],
  };
  
  const keywords = channelKeywords[channel] || [];
  const questionLower = question.toLowerCase();
  const hasRelevantKeyword = keywords.length === 0 || keywords.some(kw => questionLower.includes(kw));
  
  if (!hasRelevantKeyword && question.length < 100) {
    return { valid: false, reason: 'Question lacks channel-specific technical content' };
  }
  
  // Advanced questions should be more complex
  if (difficulty === 'advanced' && question.length < 80) {
    return { valid: false, reason: 'Advanced question should be more detailed' };
  }
  
  return { valid: true };
}

function getRandomSubChannel(channel) {
  const configs = channelConfigs[channel];
  if (!configs || configs.length === 0) {
    return { subChannel: 'general', tags: [channel] };
  }
  return configs[Math.floor(Math.random() * configs.length)];
}

// Prioritize channels with fewer questions using weighted selection
// Excludes channels in the top percentile to focus on lagging channels
function selectChannelsWeighted(channelCounts, allChannels, limit) {
  // Sort channels by question count
  const sortedByCount = [...allChannels].map(ch => ({
    channel: ch,
    count: channelCounts[ch] || 0
  })).sort((a, b) => a.count - b.count);
  
  // Calculate statistics
  const counts = sortedByCount.map(c => c.count);
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const medianCount = counts[Math.floor(counts.length / 2)];
  const maxCount = Math.max(...counts, 1);
  
  // Exclude channels in top 25% (those with most questions)
  const excludeThreshold = counts[Math.floor(counts.length * 0.75)];
  const eligibleChannels = sortedByCount
    .filter(c => c.count <= excludeThreshold)
    .map(c => c.channel);
  
  console.log(`\n📈 Channel Statistics:`);
  console.log(`   Average: ${avgCount.toFixed(1)} questions`);
  console.log(`   Median: ${medianCount} questions`);
  console.log(`   Max: ${maxCount} questions`);
  console.log(`   Exclude threshold (top 25%): >${excludeThreshold} questions`);
  console.log(`   Eligible channels: ${eligibleChannels.length}/${allChannels.length}`);
  
  // If all channels are excluded (unlikely), fall back to bottom half
  const channelsToUse = eligibleChannels.length > 0 
    ? eligibleChannels 
    : sortedByCount.slice(0, Math.ceil(sortedByCount.length / 2)).map(c => c.channel);
  
  // Calculate weights - exponential preference for channels with fewer questions
  // Weight formula: (maxCount - count + 1)^3 / maxCount^2
  // This gives MUCH higher weight to channels with very few questions
  const weights = channelsToUse.map(ch => {
    const count = channelCounts[ch] || 0;
    const deficit = maxCount - count + 1;
    // Cubic weight for strong preference toward low-count channels
    return Math.pow(deficit, 3) / Math.pow(maxCount, 2);
  });
  
  const selected = [];
  const available = [...channelsToUse];
  const availableWeights = [...weights];
  
  while (selected.length < limit && available.length > 0) {
    // Weighted random selection
    const totalWeight = availableWeights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let idx = 0;
    
    for (let i = 0; i < availableWeights.length; i++) {
      random -= availableWeights[i];
      if (random <= 0) {
        idx = i;
        break;
      }
    }
    
    selected.push(available[idx]);
    available.splice(idx, 1);
    availableWeights.splice(idx, 1);
  }
  
  return selected;
}

// Get channels that are significantly below average (need the most help)
function getLaggingChannels(channelCounts, allChannels, targetPerChannel = 20) {
  const sortedByCount = [...allChannels].map(ch => ({
    channel: ch,
    count: channelCounts[ch] || 0,
    deficit: Math.max(0, targetPerChannel - (channelCounts[ch] || 0))
  })).sort((a, b) => b.deficit - a.deficit);
  
  // Return channels that are below target, sorted by how far below they are
  return sortedByCount.filter(c => c.deficit > 0);
}

async function main() {
  console.log('=== 🚀 Creator Bot - Crafting New Questions ===\n');

  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'random';
  const inputLimit = parseInt(process.env.INPUT_LIMIT || '0', 10);
  const inputChannel = process.env.INPUT_CHANNEL || null; // Specific channel to generate for
  const balanceChannels = process.env.BALANCE_CHANNELS !== 'false'; // Default to true
  
  const allChannels = getAllChannels();
  
  // Validate input channel if provided
  if (inputChannel && !allChannels.includes(inputChannel)) {
    console.error(`❌ Invalid channel: ${inputChannel}`);
    console.log(`Available channels: ${allChannels.join(', ')}`);
    process.exit(1);
  }
  
  // Get channel question counts efficiently (single query instead of fetching all questions)
  const channelCounts = await getChannelQuestionCounts();
  const totalQuestionCount = Object.values(channelCounts).reduce((a, b) => a + b, 0);
  console.log(`Database has ${totalQuestionCount} existing questions`);
  
  // Show channel distribution
  console.log('\n📊 Channel Distribution:');
  const sortedChannels = [...allChannels].sort((a, b) => (channelCounts[a] || 0) - (channelCounts[b] || 0));
  sortedChannels.slice(0, 5).forEach(ch => {
    console.log(`   ${ch}: ${channelCounts[ch] || 0} questions (LOW)`);
  });
  console.log('   ...');
  sortedChannels.slice(-3).forEach(ch => {
    console.log(`   ${ch}: ${channelCounts[ch] || 0} questions`);
  });
  
  let channels;
  const limit = inputLimit > 0 ? inputLimit : allChannels.length;
  
  // Show lagging channels that need the most attention
  const laggingChannels = getLaggingChannels(channelCounts, allChannels, 20);
  if (laggingChannels.length > 0) {
    console.log(`\n⚠️  Channels below target (20 questions):`);
    laggingChannels.slice(0, 8).forEach(c => {
      console.log(`   ${c.channel}: ${c.count} questions (need ${c.deficit} more)`);
    });
    if (laggingChannels.length > 8) {
      console.log(`   ... and ${laggingChannels.length - 8} more`);
    }
  }
  
  // If specific channel is provided, use only that channel
  if (inputChannel) {
    channels = Array(limit).fill(inputChannel);
    console.log(`\n🎯 Specific channel selected: ${inputChannel} (generating ${limit} question(s))`);
    console.log(`   Current count: ${channelCounts[inputChannel] || 0} questions`);
  } else if (balanceChannels && inputLimit > 0) {
    // Use weighted selection to prioritize channels with fewer questions
    // This will EXCLUDE channels in the top 25% by question count
    channels = selectChannelsWeighted(channelCounts, allChannels, limit);
    console.log(`\n🎯 Weighted selection (excluding top 25%, prioritizing lagging channels):`);
    channels.forEach(ch => {
      const count = channelCounts[ch] || 0;
      const avgCount = Object.values(channelCounts).reduce((a, b) => a + b, 0) / allChannels.length;
      const status = count < avgCount * 0.5 ? '🔴 CRITICAL' : count < avgCount ? '🟡 LOW' : '🟢';
      console.log(`   ${ch}: ${count} questions ${status}`);
    });
  } else if (inputLimit > 0) {
    channels = allChannels.sort(() => Math.random() - 0.5).slice(0, limit);
    console.log(`\nRandom selection: ${channels.join(', ')}`);
  } else {
    channels = allChannels;
    console.log(`\nProcessing all ${channels.length} channels`);
  }

  const addedQuestions = [];
  const failedAttempts = [];

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const subChannelConfig = getRandomSubChannel(channel);
    
    console.log(`\n--- Channel ${i + 1}/${channels.length}: ${channel} ---`);
    
    const difficulty = inputDifficulty === 'random'
      ? difficulties[Math.floor(Math.random() * difficulties.length)]
      : inputDifficulty;

    console.log(`Sub-channel: ${subChannelConfig.subChannel}`);
    console.log(`Difficulty: ${difficulty}`);

    // Select random top companies for this question
    const targetCompanies = getRandomTopCompanies(3);
    console.log(`Target companies: ${targetCompanies.join(', ')}`);

    // Real interview scenarios by channel - used to provide context in prompts
const REAL_SCENARIOS = {
  'system-design': [
    { scenario: 'Design Twitter/X feed', scale: '500M users, 10K tweets/sec', focus: 'fan-out, caching, real-time' },
    { scenario: 'Design Uber ride matching', scale: '1M concurrent rides', focus: 'geospatial, real-time, matching' },
    { scenario: 'Design Netflix video streaming', scale: '200M subscribers', focus: 'CDN, encoding, recommendations' },
    { scenario: 'Design Slack messaging', scale: '10M concurrent users', focus: 'websockets, presence, search' },
    { scenario: 'Design payment processing', scale: '$1B daily transactions', focus: 'consistency, idempotency, fraud' },
    { scenario: 'Design notification system', scale: '1B push notifications/day', focus: 'delivery, batching, preferences' },
    { scenario: 'Design rate limiter', scale: '10M requests/minute', focus: 'distributed, algorithms, fairness' },
    { scenario: 'Design URL shortener', scale: '100M URLs', focus: 'hashing, redirection, analytics' },
  ],
  'algorithms': [
    { problem: 'LRU Cache', pattern: 'HashMap + Doubly Linked List', complexity: 'O(1) get/put' },
    { problem: 'Merge K sorted lists', pattern: 'Min Heap', complexity: 'O(N log K)' },
    { problem: 'Word ladder', pattern: 'BFS', complexity: 'O(M² × N)' },
    { problem: 'Meeting rooms II', pattern: 'Interval + Heap', complexity: 'O(N log N)' },
    { problem: 'Serialize binary tree', pattern: 'Preorder DFS', complexity: 'O(N)' },
    { problem: 'Median finder', pattern: 'Two Heaps', complexity: 'O(log N) insert' },
    { problem: 'Trapping rain water', pattern: 'Two Pointers', complexity: 'O(N)' },
    { problem: 'Course schedule', pattern: 'Topological Sort', complexity: 'O(V + E)' },
  ],
  'frontend': [
    { topic: 'Virtual DOM diffing', context: 'React reconciliation algorithm' },
    { topic: 'State management', context: 'Redux vs Context vs Zustand trade-offs' },
    { topic: 'Bundle optimization', context: 'Code splitting, tree shaking, lazy loading' },
    { topic: 'Accessibility', context: 'ARIA, keyboard navigation, screen readers' },
    { topic: 'SSR vs CSR vs SSG', context: 'Next.js rendering strategies' },
  ],
  'devops': [
    { scenario: 'Blue-green deployment', context: 'Zero-downtime releases' },
    { scenario: 'GitOps workflow', context: 'ArgoCD, Flux, declarative infrastructure' },
    { scenario: 'Secret management', context: 'Vault, AWS Secrets Manager, rotation' },
    { scenario: 'Multi-stage Docker builds', context: 'Image optimization, security' },
  ],
  'sre': [
    { scenario: 'Production incident', context: 'On-call response, root cause analysis' },
    { scenario: 'Error budget exhaustion', context: 'SLO negotiation, feature freeze' },
    { scenario: 'Capacity planning', context: 'Load testing, forecasting, autoscaling' },
    { scenario: 'Chaos experiment', context: 'Failure injection, blast radius' },
  ],
  'database': [
    { topic: 'Query optimization', context: 'EXPLAIN plans, index selection' },
    { topic: 'Sharding strategy', context: 'Horizontal partitioning, consistent hashing' },
    { topic: 'ACID vs BASE', context: 'Consistency trade-offs, CAP theorem' },
    { topic: 'Connection pooling', context: 'PgBouncer, HikariCP, connection limits' },
  ],
  'behavioral': [
    { scenario: 'Technical disagreement', context: 'Conflict resolution, influence without authority' },
    { scenario: 'Project failure', context: 'Learning from mistakes, accountability' },
    { scenario: 'Tight deadline', context: 'Prioritization, scope negotiation' },
    { scenario: 'Mentoring junior', context: 'Knowledge transfer, patience' },
  ],
};

// Get a random scenario hint for the channel
function getScenarioHint(channel) {
  const scenarios = REAL_SCENARIOS[channel];
  if (!scenarios || scenarios.length === 0) return '';
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  return JSON.stringify(scenario);
}

const scenarioHint = getScenarioHint(channel);

const prompt = `You are a senior technical interviewer at ${targetCompanies[0]}. Generate a REAL interview question that you would actually ask candidates.

CONTEXT:
- Channel: ${channel}/${subChannelConfig.subChannel}
- Difficulty: ${difficulty}
- Topics: ${subChannelConfig.tags.join(', ')}
- Target companies: ${targetCompanies.join(', ')}
${scenarioHint ? `- Example scenario for inspiration (create something DIFFERENT but similar quality): ${scenarioHint}` : ''}

REQUIREMENTS:
1. Question must be SPECIFIC and PRACTICAL - something actually asked in interviews
2. For ${difficulty} level:
   - beginner: Fundamental concepts, basic implementation
   - intermediate: Real-world scenarios, trade-offs, debugging
   - advanced: System design at scale, complex algorithms, production issues
3. Include a realistic scenario or context when appropriate
4. The answer should be actionable and demonstrate expertise

QUESTION TYPES TO CONSIDER:
${channel === 'algorithms' ? '- Coding problem with clear input/output\n- Time/space complexity analysis\n- Edge case handling' : ''}
${channel === 'system-design' ? '- Design a specific system with scale requirements\n- Architecture decisions and trade-offs\n- Handling failures and edge cases' : ''}
${channel === 'frontend' ? '- Framework-specific implementation\n- Performance optimization\n- Browser/DOM concepts' : ''}
${channel === 'behavioral' ? '- STAR method scenario\n- Leadership/conflict resolution\n- Technical decision making' : ''}
${['devops', 'sre', 'kubernetes'].includes(channel) ? '- Production incident scenario\n- Infrastructure automation\n- Monitoring and alerting' : ''}

DIAGRAM REQUIREMENTS (CRITICAL):
- Create a MEANINGFUL diagram with 5-8 specific nodes showing the actual technical concept
- DO NOT create trivial diagrams like "Start -> End" or "Step 1 -> Step 2 -> Step 3"
- DO NOT use generic labels like "Concept", "Implementation", "Input", "Output", "Process"
- Each node must have a specific, descriptive label related to the actual content
- If you cannot create a meaningful diagram, set diagram to null

${channel === 'system-design' ? `
SYSTEM DESIGN EXPLANATION FORMAT (MANDATORY):
For system design questions, the explanation MUST include these sections in order:

## Functional Requirements
- List 4-6 specific functional requirements (what the system must do)
- Be specific: "Users can post tweets up to 280 characters" not "Users can post"

## Non-Functional Requirements (NFRs)
- Availability: Target uptime (e.g., 99.99%)
- Latency: Response time targets (e.g., p99 < 200ms)
- Scalability: Expected growth and peak loads
- Consistency: Strong vs eventual consistency trade-offs
- Durability: Data loss tolerance

## Back-of-Envelope Calculations
- Daily/Monthly Active Users (DAU/MAU)
- Requests per second (read/write ratio)
- Storage requirements (per user, total)
- Bandwidth requirements
- Cache size estimates
- Show your math!

## High-Level Design
- Describe the main components and their interactions
- Explain data flow for key operations

## System Architecture Diagram
(This will be in the diagram field)

## Deep Dive: Key Components
- Pick 2-3 critical components and explain in detail
- Database schema design
- API design
- Caching strategy

## Trade-offs & Considerations
- CAP theorem implications
- Cost vs performance trade-offs
- Technology choices and alternatives

## Failure Scenarios & Mitigations
- What happens when X fails?
- How to handle data center outages
- Graceful degradation strategies
` : ''}

Output ONLY this JSON (no markdown, no explanation):
{"question":"[Specific, practical interview question ending with ?]","answer":"[Concise answer under 150 chars that directly addresses the question]","explanation":"${channel === 'system-design' ? '## Functional Requirements\\n- [Requirement 1]\\n- [Requirement 2]\\n- [Requirement 3]\\n- [Requirement 4]\\n\\n## Non-Functional Requirements (NFRs)\\n- **Availability**: [Target]\\n- **Latency**: [Target]\\n- **Scalability**: [Target]\\n- **Consistency**: [Type and reasoning]\\n- **Durability**: [Requirements]\\n\\n## Back-of-Envelope Calculations\\n### Users & Traffic\\n- DAU: [Number]\\n- Peak QPS: [Number]\\n- Read:Write ratio: [Ratio]\\n\\n### Storage\\n- Per user: [Size]\\n- Total (5 years): [Size]\\n\\n### Bandwidth\\n- Ingress: [Size/sec]\\n- Egress: [Size/sec]\\n\\n## High-Level Design\\n[Description of main components]\\n\\n## Deep Dive: Key Components\\n### [Component 1]\\n[Details]\\n\\n### [Component 2]\\n[Details]\\n\\n## Trade-offs & Considerations\\n- [Trade-off 1]\\n- [Trade-off 2]\\n\\n## Failure Scenarios & Mitigations\\n- [Scenario 1]: [Mitigation]\\n- [Scenario 2]: [Mitigation]' : '## Why This Is Asked\\n[Why ' + targetCompanies[0] + ' asks this - what skills it tests]\\n\\n## Expected Answer\\n[What a strong candidate would say]\\n\\n## Code Example\\n```' + (channel === 'algorithms' ? 'python' : channel === 'frontend' ? 'javascript' : 'typescript') + '\\n[Working code example]\\n```\\n\\n## Follow-up Questions\\n- [Follow-up 1]\\n- [Follow-up 2]\\n- [Follow-up 3]'}","diagram":"flowchart TD\\n  A[Specific Technical Step] --> B[Another Specific Step]\\n  B --> C{Decision Point}\\n  C -->|Yes| D[Outcome 1]\\n  C -->|No| E[Outcome 2]\\n  D --> F[Final Result]\\n  E --> F","companies":${JSON.stringify(targetCompanies)},"sourceUrl":null,"videos":{"shortVideo":null,"longVideo":null}}`;

    console.log('\n📝 PROMPT:');
    console.log('─'.repeat(50));
    console.log(prompt);
    console.log('─'.repeat(50));

    const response = await runWithRetries(prompt);
    
    if (!response) {
      console.log('❌ OpenCode failed after all retries.');
      failedAttempts.push({ channel, reason: 'OpenCode timeout' });
      continue;
    }

    const data = parseJson(response);
    
    if (!validateQuestion(data)) {
      console.log('❌ Invalid response format.');
      failedAttempts.push({ channel, reason: 'Invalid JSON format' });
      continue;
    }

    // Quality checks for realistic interview questions
    const questionQuality = validateQuestionQuality(data.question, channel, difficulty);
    if (!questionQuality.valid) {
      console.log(`❌ Quality check failed: ${questionQuality.reason}`);
      failedAttempts.push({ channel, reason: questionQuality.reason });
      continue;
    }

    if (await isDuplicateUnified(data.question)) {
      console.log('❌ Duplicate question detected.');
      failedAttempts.push({ channel, reason: 'Duplicate detected' });
      continue;
    }

    console.log('🎬 Validating YouTube videos...');
    const validatedVideos = await validateYouTubeVideos(data.videos);

    // Validate diagram - reject trivial ones
    let validatedDiagram = data.diagram;
    if (validatedDiagram && isTrivialDiagram(validatedDiagram)) {
      console.log('⚠️ Generated diagram is trivial, setting to null');
      validatedDiagram = null;
    }

    const newQuestion = {
      id: await generateUnifiedId(),
      question: data.question,
      answer: data.answer.substring(0, 200),
      explanation: data.explanation,
      tags: subChannelConfig.tags,
      difficulty: difficulty,
      diagram: validatedDiagram || null,
      sourceUrl: data.sourceUrl || null,
      videos: {
        shortVideo: validatedVideos.shortVideo,
        longVideo: validatedVideos.longVideo
      },
      companies: normalizeCompanies(data.companies),
      lastUpdated: new Date().toISOString()
    };

    const channelMappings = [{ channel, subChannel: subChannelConfig.subChannel }];

    await addUnifiedQuestion(newQuestion, channelMappings);
    
    // Log bot activity
    await logBotActivity(newQuestion.id, 'generate', 'new question created', 'completed', {
      channel,
      subChannel: subChannelConfig.subChannel,
      difficulty
    });
    
    addedQuestions.push({ ...newQuestion, mappedChannels: channelMappings });

    console.log(`✅ Added: ${newQuestion.id}`);
    console.log(`Q: ${newQuestion.question.substring(0, 60)}...`);
  }

  const totalQuestions = await getQuestionCount();
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Added: ${addedQuestions.length}/${channels.length}`);
  
  if (addedQuestions.length > 0) {
    console.log('\n✅ Successfully Added Questions:');
    addedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}] (${q.difficulty})`);
      console.log(`     Q: ${q.question.substring(0, 70)}...`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => console.log(`  - ${f.channel}: ${f.reason}`));
  }

  console.log(`\nTotal Questions in Database: ${totalQuestions}`);
  console.log('=== END SUMMARY ===\n');

  if (addedQuestions.length > 0) {
    const channelsAffected = addedQuestions.flatMap(q => q.mappedChannels.map(m => m.channel));
    logQuestionsAdded(addedQuestions.length, channelsAffected, addedQuestions.map(q => q.id));
  }

  writeGitHubOutput({
    added_count: addedQuestions.length,
    failed_count: failedAttempts.length,
    total_questions: totalQuestions,
    added_ids: addedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
