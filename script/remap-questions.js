import {
  getAllUnifiedQuestions,
  loadUnifiedQuestions,
  saveChannelMappings,
  dbClient
} from './utils.js';

// Channel keyword mappings for fuzzy matching
const channelKeywords = {
  'system-design': {
    keywords: ['scalable', 'distributed', 'architecture', 'microservices', 'load balancer', 'caching', 'cdn', 'api gateway', 'message queue', 'event-driven', 'cap theorem', 'consistency', 'availability', 'partition', 'sharding', 'replication', 'rate limiting', 'circuit breaker'],
    subChannels: {
      'infrastructure': ['infrastructure', 'scale', 'horizontal', 'vertical', 'cluster', 'node'],
      'distributed-systems': ['distributed', 'consensus', 'cap theorem', 'partition', 'replication', 'raft', 'paxos'],
      'api-design': ['api', 'rest', 'graphql', 'grpc', 'endpoint', 'versioning'],
      'caching': ['cache', 'redis', 'memcached', 'cdn', 'invalidation', 'ttl'],
      'load-balancing': ['load balancer', 'nginx', 'haproxy', 'round robin', 'sticky session'],
      'message-queues': ['kafka', 'rabbitmq', 'sqs', 'pubsub', 'queue', 'message broker', 'event']
    }
  },
  'algorithms': {
    keywords: ['algorithm', 'data structure', 'complexity', 'big o', 'time complexity', 'space complexity', 'sort', 'search', 'tree', 'graph', 'dynamic programming', 'recursion', 'array', 'linked list', 'hash', 'heap', 'stack', 'queue'],
    subChannels: {
      'data-structures': ['array', 'linked list', 'hash', 'heap', 'stack', 'queue', 'trie', 'data structure'],
      'sorting': ['sort', 'quicksort', 'mergesort', 'heapsort', 'bubble', 'insertion'],
      'dynamic-programming': ['dynamic programming', 'dp', 'memoization', 'tabulation', 'subproblem', 'optimal substructure'],
      'graphs': ['graph', 'bfs', 'dfs', 'dijkstra', 'shortest path', 'topological', 'cycle'],
      'trees': ['tree', 'binary', 'bst', 'avl', 'red-black', 'traversal', 'inorder', 'preorder']
    }
  },
  'frontend': {
    keywords: ['react', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html', 'dom', 'browser', 'webpack', 'vite', 'component', 'state management', 'redux', 'hooks', 'virtual dom', 'ssr', 'spa'],
    subChannels: {
      'react': ['react', 'hooks', 'usestate', 'useeffect', 'context', 'redux', 'jsx', 'component'],
      'javascript': ['javascript', 'js', 'es6', 'closure', 'promise', 'async', 'await', 'prototype'],
      'css': ['css', 'flexbox', 'grid', 'animation', 'responsive', 'media query', 'sass', 'tailwind'],
      'performance': ['lighthouse', 'bundle', 'lazy loading', 'code splitting', 'tree shaking', 'web vitals'],
      'web-apis': ['dom', 'fetch', 'websocket', 'service worker', 'indexeddb', 'localstorage']
    }
  },
  'backend': {
    keywords: ['server', 'api', 'rest', 'graphql', 'microservice', 'authentication', 'authorization', 'jwt', 'oauth', 'session', 'middleware', 'orm', 'database connection'],
    subChannels: {
      'apis': ['rest', 'graphql', 'grpc', 'openapi', 'swagger', 'endpoint'],
      'microservices': ['microservice', 'saga', 'cqrs', 'event sourcing', 'service mesh'],
      'caching': ['redis', 'memcached', 'cache invalidation', 'cache aside', 'write through'],
      'authentication': ['jwt', 'oauth', 'oidc', 'saml', 'session', 'token', 'authentication', 'authorization'],
      'server-architecture': ['scaling', 'sharding', 'replication', 'connection pool']
    }
  },
  'database': {
    keywords: ['sql', 'nosql', 'database', 'query', 'index', 'transaction', 'acid', 'join', 'normalization', 'denormalization', 'postgres', 'mysql', 'mongodb', 'redis', 'cassandra'],
    subChannels: {
      'sql': ['sql', 'join', 'index', 'normalization', 'postgres', 'mysql', 'query optimization'],
      'nosql': ['nosql', 'mongodb', 'dynamodb', 'cassandra', 'document', 'key-value'],
      'indexing': ['index', 'btree', 'hash index', 'composite', 'covering index'],
      'transactions': ['transaction', 'acid', 'isolation', 'mvcc', 'deadlock', 'lock'],
      'query-optimization': ['explain', 'query plan', 'partition', 'execution plan']
    }
  },
  'devops': {
    keywords: ['ci/cd', 'pipeline', 'jenkins', 'github actions', 'gitlab', 'docker', 'container', 'deployment', 'automation', 'infrastructure as code', 'ansible', 'puppet', 'chef'],
    subChannels: {
      'cicd': ['ci/cd', 'pipeline', 'github actions', 'jenkins', 'gitlab ci', 'continuous'],
      'docker': ['docker', 'dockerfile', 'compose', 'container', 'image', 'registry'],
      'automation': ['ansible', 'puppet', 'chef', 'automation', 'script'],
      'gitops': ['argocd', 'flux', 'gitops', 'declarative']
    }
  },
  'sre': {
    keywords: ['reliability', 'slo', 'sli', 'sla', 'error budget', 'incident', 'monitoring', 'alerting', 'observability', 'chaos engineering', 'postmortem', 'on-call'],
    subChannels: {
      'observability': ['prometheus', 'grafana', 'opentelemetry', 'metrics', 'traces', 'logs', 'monitoring'],
      'reliability': ['slo', 'sli', 'error budget', 'availability', 'reliability', 'uptime'],
      'incident-management': ['incident', 'pagerduty', 'runbook', 'postmortem', 'on-call'],
      'chaos-engineering': ['chaos', 'fault injection', 'resilience', 'failure testing'],
      'capacity-planning': ['capacity', 'forecasting', 'autoscaling', 'load testing']
    }
  },
  'kubernetes': {
    keywords: ['kubernetes', 'k8s', 'pod', 'deployment', 'service', 'ingress', 'helm', 'operator', 'kubectl', 'namespace', 'configmap', 'secret'],
    subChannels: {
      'pods': ['pod', 'container', 'init container', 'sidecar', 'lifecycle'],
      'services': ['service', 'clusterip', 'nodeport', 'loadbalancer', 'ingress'],
      'deployments': ['deployment', 'rolling update', 'canary', 'blue-green', 'replica'],
      'helm': ['helm', 'chart', 'values', 'template', 'release'],
      'operators': ['operator', 'crd', 'controller', 'reconciliation']
    }
  },
  'aws': {
    keywords: ['aws', 'amazon', 'ec2', 's3', 'lambda', 'rds', 'dynamodb', 'cloudformation', 'iam', 'vpc', 'route53', 'cloudfront', 'sqs', 'sns'],
    subChannels: {
      'compute': ['ec2', 'ecs', 'eks', 'fargate', 'lambda', 'instance'],
      'storage': ['s3', 'ebs', 'efs', 'glacier', 'bucket'],
      'serverless': ['lambda', 'api gateway', 'step functions', 'serverless'],
      'database': ['rds', 'aurora', 'dynamodb', 'elasticache', 'redshift'],
      'networking': ['vpc', 'route53', 'cloudfront', 'alb', 'elb', 'subnet']
    }
  },
  'terraform': {
    keywords: ['terraform', 'hcl', 'infrastructure as code', 'iac', 'state', 'module', 'provider', 'resource', 'plan', 'apply'],
    subChannels: {
      'basics': ['hcl', 'resource', 'data source', 'provider', 'variable'],
      'modules': ['module', 'composition', 'versioning', 'registry'],
      'state-management': ['state', 'remote state', 'locking', 'workspace', 'backend'],
      'best-practices': ['dry', 'terragrunt', 'atlantis', 'sentinel']
    }
  },
  'data-engineering': {
    keywords: ['etl', 'data pipeline', 'spark', 'airflow', 'dbt', 'data warehouse', 'data lake', 'streaming', 'batch', 'kafka', 'flink'],
    subChannels: {
      'etl': ['etl', 'extract', 'transform', 'load', 'spark', 'airflow', 'dbt'],
      'data-pipelines': ['pipeline', 'dag', 'orchestration', 'scheduling', 'workflow'],
      'warehousing': ['warehouse', 'snowflake', 'bigquery', 'redshift', 'olap'],
      'streaming': ['streaming', 'kafka', 'flink', 'kinesis', 'real-time']
    }
  },
  'machine-learning': {
    keywords: ['machine learning', 'ml', 'model', 'training', 'inference', 'neural network', 'deep learning', 'classification', 'regression', 'clustering'],
    subChannels: {
      'algorithms': ['regression', 'classification', 'clustering', 'decision tree', 'random forest'],
      'model-training': ['hyperparameter', 'cross-validation', 'regularization', 'overfitting'],
      'deployment': ['mlflow', 'kubeflow', 'sagemaker', 'model serving', 'inference'],
      'deep-learning': ['cnn', 'rnn', 'transformer', 'attention', 'neural network'],
      'evaluation': ['precision', 'recall', 'f1', 'auc', 'roc', 'confusion matrix']
    }
  },
  'generative-ai': {
    keywords: ['llm', 'gpt', 'chatgpt', 'generative', 'prompt', 'rag', 'fine-tuning', 'embedding', 'vector', 'langchain', 'agent'],
    subChannels: {
      'llm-fundamentals': ['transformer', 'attention', 'tokenization', 'llm', 'language model'],
      'fine-tuning': ['lora', 'qlora', 'peft', 'adapter', 'fine-tune'],
      'rag': ['rag', 'retrieval', 'embedding', 'vector', 'chunking', 'semantic search'],
      'agents': ['agent', 'langchain', 'autogen', 'tool use', 'planning', 'chain'],
      'evaluation': ['hallucination', 'faithfulness', 'relevance', 'evaluation']
    }
  },
  'prompt-engineering': {
    keywords: ['prompt', 'chain of thought', 'few-shot', 'zero-shot', 'instruction', 'system prompt'],
    subChannels: {
      'techniques': ['chain of thought', 'few-shot', 'zero-shot', 'cot', 'prompting'],
      'optimization': ['prompt tuning', 'dspy', 'automatic prompting'],
      'safety': ['jailbreak', 'guardrails', 'content filtering', 'safety'],
      'structured-output': ['json mode', 'function calling', 'schema', 'structured']
    }
  },
  'llm-ops': {
    keywords: ['llm deployment', 'inference server', 'quantization', 'vllm', 'tgi', 'model optimization'],
    subChannels: {
      'deployment': ['vllm', 'tgi', 'triton', 'onnx', 'inference server'],
      'optimization': ['quantization', 'pruning', 'distillation', 'optimization'],
      'monitoring': ['latency', 'throughput', 'cost tracking', 'token usage'],
      'infrastructure': ['gpu', 'tpu', 'inference', 'batch']
    }
  },
  'computer-vision': {
    keywords: ['image', 'vision', 'cnn', 'object detection', 'segmentation', 'yolo', 'opencv'],
    subChannels: {
      'image-classification': ['classification', 'cnn', 'resnet', 'efficientnet'],
      'object-detection': ['yolo', 'rcnn', 'detr', 'detection', 'bounding box'],
      'segmentation': ['segmentation', 'unet', 'mask rcnn', 'sam', 'semantic'],
      'multimodal': ['clip', 'blip', 'llava', 'vision transformer', 'multimodal']
    }
  },
  'nlp': {
    keywords: ['nlp', 'natural language', 'text', 'tokenization', 'embedding', 'bert', 'sentiment', 'ner'],
    subChannels: {
      'text-processing': ['tokenization', 'stemming', 'ner', 'pos tagging', 'preprocessing'],
      'embeddings': ['word2vec', 'bert', 'sentence transformer', 'embedding', 'vector'],
      'sequence-models': ['lstm', 'gru', 'seq2seq', 'rnn', 'sequence'],
      'transformers': ['bert', 'gpt', 't5', 'llama', 'transformer', 'attention']
    }
  },
  'python': {
    keywords: ['python', 'pip', 'virtualenv', 'decorator', 'generator', 'comprehension', 'pandas', 'numpy'],
    subChannels: {
      'fundamentals': ['generator', 'decorator', 'context manager', 'comprehension', 'iterator'],
      'libraries': ['pandas', 'numpy', 'scikit-learn', 'matplotlib'],
      'best-practices': ['pep8', 'typing', 'testing', 'linting'],
      'async': ['asyncio', 'aiohttp', 'concurrency', 'async', 'await']
    }
  },
  'security': {
    keywords: ['security', 'vulnerability', 'xss', 'csrf', 'sql injection', 'encryption', 'authentication', 'owasp'],
    subChannels: {
      'application-security': ['xss', 'csrf', 'sql injection', 'ssrf', 'injection'],
      'owasp': ['owasp', 'top 10', 'asvs', 'security testing'],
      'encryption': ['encryption', 'aes', 'rsa', 'tls', 'hashing', 'ssl'],
      'authentication': ['mfa', 'passkey', 'zero trust', '2fa', 'authentication']
    }
  },
  'networking': {
    keywords: ['network', 'tcp', 'udp', 'http', 'dns', 'ip', 'routing', 'firewall', 'load balancer'],
    subChannels: {
      'tcp-ip': ['tcp', 'udp', 'http', 'quic', 'protocol', 'socket'],
      'dns': ['dns', 'resolution', 'caching', 'dnssec', 'domain'],
      'load-balancing': ['load balancer', 'l4', 'l7', 'consistent hashing', 'reverse proxy'],
      'cdn': ['cdn', 'edge', 'caching', 'purging', 'cloudflare']
    }
  },
  'ios': {
    keywords: ['ios', 'swift', 'swiftui', 'uikit', 'xcode', 'cocoapods', 'apple', 'iphone'],
    subChannels: {
      'swift': ['swift', 'optional', 'protocol', 'generic', 'closure'],
      'uikit': ['uikit', 'autolayout', 'tableview', 'collectionview', 'storyboard'],
      'swiftui': ['swiftui', 'state', 'binding', 'environment', 'view'],
      'architecture': ['mvvm', 'viper', 'clean architecture', 'coordinator']
    }
  },
  'android': {
    keywords: ['android', 'kotlin', 'java', 'jetpack', 'compose', 'gradle', 'activity', 'fragment'],
    subChannels: {
      'kotlin': ['kotlin', 'coroutine', 'flow', 'sealed class', 'extension'],
      'jetpack-compose': ['compose', 'composable', 'state', 'navigation', 'material'],
      'architecture': ['mvvm', 'mvi', 'clean architecture', 'repository'],
      'lifecycle': ['viewmodel', 'livedata', 'savedstate', 'lifecycle', 'activity']
    }
  },
  'react-native': {
    keywords: ['react native', 'expo', 'metro', 'native module', 'bridge'],
    subChannels: {
      'components': ['flatlist', 'navigation', 'gesture', 'animated'],
      'native-modules': ['turbo module', 'fabric', 'jsi', 'native module', 'bridge'],
      'performance': ['hermes', 'reanimated', 'profiling', 'performance'],
      'architecture': ['new architecture', 'bridgeless', 'fabric']
    }
  },
  'engineering-management': {
    keywords: ['management', 'leadership', 'team', 'hiring', 'one on one', '1:1', 'agile', 'scrum'],
    subChannels: {
      'team-leadership': ['leadership', 'delegation', 'mentoring', 'growth', 'team'],
      'one-on-ones': ['1:1', 'one on one', 'feedback', 'career', 'coaching'],
      'hiring': ['hiring', 'interview', 'sourcing', 'onboarding', 'recruiting'],
      'project-management': ['agile', 'scrum', 'kanban', 'okr', 'sprint', 'project']
    }
  },
  'behavioral': {
    keywords: ['behavioral', 'star', 'leadership principle', 'soft skill', 'communication', 'conflict'],
    subChannels: {
      'star-method': ['star', 'situation', 'task', 'action', 'result'],
      'leadership-principles': ['ownership', 'bias for action', 'customer obsession', 'leadership'],
      'soft-skills': ['communication', 'collaboration', 'influence', 'teamwork'],
      'conflict-resolution': ['conflict', 'negotiation', 'mediation', 'feedback', 'difficult']
    }
  },
  'testing': {
    keywords: ['test', 'unit test', 'integration test', 'tdd', 'mock', 'stub', 'coverage', 'assertion'],
    subChannels: {
      'unit-testing': ['unit test', 'jest', 'mocha', 'pytest', 'junit', 'assertion'],
      'integration-testing': ['integration test', 'api test', 'database test', 'mock'],
      'tdd': ['tdd', 'test driven', 'red green refactor', 'test first'],
      'test-strategies': ['test pyramid', 'coverage', 'mutation testing', 'strategy']
    }
  },
  'e2e-testing': {
    keywords: ['e2e', 'end to end', 'playwright', 'cypress', 'selenium', 'browser automation', 'ui test'],
    subChannels: {
      'playwright': ['playwright', 'browser automation', 'selector', 'locator'],
      'cypress': ['cypress', 'component testing', 'fixture', 'intercept'],
      'selenium': ['selenium', 'webdriver', 'grid', 'chromedriver'],
      'visual-testing': ['screenshot', 'visual regression', 'percy', 'visual']
    }
  },
  'api-testing': {
    keywords: ['api test', 'postman', 'rest assured', 'contract test', 'pact'],
    subChannels: {
      'rest-testing': ['postman', 'rest assured', 'supertest', 'api test'],
      'contract-testing': ['pact', 'contract', 'consumer driven', 'schema validation'],
      'graphql-testing': ['graphql test', 'apollo', 'introspection'],
      'mocking': ['wiremock', 'mockserver', 'msw', 'mock api']
    }
  },
  'performance-testing': {
    keywords: ['performance test', 'load test', 'stress test', 'jmeter', 'k6', 'gatling', 'benchmark'],
    subChannels: {
      'load-testing': ['load test', 'jmeter', 'k6', 'gatling', 'locust'],
      'stress-testing': ['stress test', 'spike', 'soak', 'breakpoint'],
      'profiling': ['profiling', 'cpu', 'memory', 'flame graph'],
      'benchmarking': ['benchmark', 'latency', 'throughput', 'percentile']
    }
  }
};

// Fuzzy matching function - calculates relevance score
function calculateRelevanceScore(question, channelConfig) {
  const text = `${question.question} ${question.answer} ${question.explanation} ${(question.tags || []).join(' ')}`.toLowerCase();
  let score = 0;
  
  for (const keyword of channelConfig.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 10;
    }
  }
  
  if (question.tags) {
    for (const tag of question.tags) {
      if (channelConfig.keywords.some(k => k.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(k.toLowerCase()))) {
        score += 15;
      }
    }
  }
  
  return score;
}

// Find best subchannel for a question within a channel
function findBestSubChannel(question, channelConfig) {
  const text = `${question.question} ${question.answer} ${question.explanation} ${(question.tags || []).join(' ')}`.toLowerCase();
  let bestSubChannel = 'general';
  let bestScore = 0;
  
  for (const [subChannel, keywords] of Object.entries(channelConfig.subChannels)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSubChannel = subChannel;
    }
  }
  
  return bestSubChannel;
}

// Main remapping function
async function remapQuestions() {
  console.log('=== Fuzzy Question Remapping (Database) ===\n');
  
  const questions = await getAllUnifiedQuestions();
  console.log(`Loaded ${questions.length} questions from database\n`);
  
  // Build new mappings
  const newMappings = {};
  
  // Initialize all channels
  for (const channelId of Object.keys(channelKeywords)) {
    newMappings[channelId] = { subChannels: {} };
  }
  
  // Track statistics
  const stats = {
    totalQuestions: 0,
    mappedQuestions: 0,
    multiChannelQuestions: 0,
    channelCounts: {}
  };
  
  // Process each question
  for (const question of questions) {
    stats.totalQuestions++;
    
    // Calculate relevance scores for all channels
    const channelScores = [];
    for (const [channelId, channelConfig] of Object.entries(channelKeywords)) {
      const score = calculateRelevanceScore(question, channelConfig);
      if (score > 0) {
        channelScores.push({ channelId, score, config: channelConfig });
      }
    }
    
    // Sort by score descending
    channelScores.sort((a, b) => b.score - a.score);
    
    const threshold = 15;
    const relatedThreshold = 0.5;
    const mappedChannels = [];
    
    if (channelScores.length > 0 && channelScores[0].score >= threshold) {
      const primaryScore = channelScores[0].score;
      
      for (const { channelId, score, config } of channelScores) {
        if (score >= threshold && (mappedChannels.length === 0 || score >= primaryScore * relatedThreshold)) {
          const subChannel = findBestSubChannel(question, config);
          mappedChannels.push({ channelId, subChannel, score });
          
          if (!newMappings[channelId].subChannels[subChannel]) {
            newMappings[channelId].subChannels[subChannel] = [];
          }
          newMappings[channelId].subChannels[subChannel].push(question.id);
          
          stats.channelCounts[channelId] = (stats.channelCounts[channelId] || 0) + 1;
        }
        
        if (mappedChannels.length >= 3) break;
      }
    }
    
    if (mappedChannels.length > 0) {
      stats.mappedQuestions++;
      if (mappedChannels.length > 1) {
        stats.multiChannelQuestions++;
      }
    } else {
      // Fallback: use existing channel from question
      const fallbackChannel = question.channel;
      if (fallbackChannel && channelKeywords[fallbackChannel]) {
        const subChannel = question.subChannel || findBestSubChannel(question, channelKeywords[fallbackChannel]);
        if (!newMappings[fallbackChannel].subChannels[subChannel]) {
          newMappings[fallbackChannel].subChannels[subChannel] = [];
        }
        newMappings[fallbackChannel].subChannels[subChannel].push(question.id);
        stats.mappedQuestions++;
        stats.channelCounts[fallbackChannel] = (stats.channelCounts[fallbackChannel] || 0) + 1;
      } else {
        console.log(`  ⚠️ Could not map: ${question.id}`);
      }
    }
  }
  
  // Clean up empty subchannels and channels
  for (const [channelId, channelData] of Object.entries(newMappings)) {
    for (const [subChannel, questionIds] of Object.entries(channelData.subChannels)) {
      if (questionIds.length === 0) {
        delete channelData.subChannels[subChannel];
      }
    }
    if (Object.keys(channelData.subChannels).length === 0) {
      delete newMappings[channelId];
    }
  }
  
  // Save new mappings to database
  await saveChannelMappings(newMappings);
  
  // Print statistics
  console.log('\n=== Remapping Statistics ===');
  console.log(`Total Questions: ${stats.totalQuestions}`);
  console.log(`Mapped Questions: ${stats.mappedQuestions}`);
  console.log(`Multi-Channel Questions: ${stats.multiChannelQuestions}`);
  console.log(`\nQuestions per Channel:`);
  
  const sortedChannels = Object.entries(stats.channelCounts).sort((a, b) => b[1] - a[1]);
  for (const [channel, count] of sortedChannels) {
    console.log(`  ${channel}: ${count}`);
  }
  
  console.log('\n✅ Remapping complete! Saved to database');
}

remapQuestions().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
