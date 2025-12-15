import {
  getAllUnifiedQuestions,
  addUnifiedQuestion,
  generateUnifiedId,
  isDuplicateUnified,
  runWithRetries,
  parseJson,
  validateQuestion,
  updateUnifiedIndexFile,
  writeGitHubOutput,
  logQuestionsAdded,
  validateYouTubeVideos,
  normalizeCompanies
} from './utils.js';

// Complete channel configurations matching channels-config.ts
// Each channel has sub-channels and tags for question generation
const channelConfigs = {
  // Engineering Channels
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

  // DevOps & Cloud Channels
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
  'terraform': [
    { subChannel: 'basics', tags: ['hcl', 'resources', 'data-sources'] },
    { subChannel: 'modules', tags: ['composition', 'versioning', 'registry'] },
    { subChannel: 'state-management', tags: ['remote-state', 'locking', 'workspaces'] },
    { subChannel: 'best-practices', tags: ['dry', 'terragrunt', 'atlantis'] },
  ],

  // Data & AI Channels
  'data-engineering': [
    { subChannel: 'etl', tags: ['spark', 'airflow', 'dbt'] },
    { subChannel: 'data-pipelines', tags: ['dag', 'orchestration', 'scheduling'] },
    { subChannel: 'warehousing', tags: ['snowflake', 'bigquery', 'redshift'] },
    { subChannel: 'streaming', tags: ['kafka', 'flink', 'kinesis'] },
  ],
  'machine-learning': [
    { subChannel: 'algorithms', tags: ['regression', 'classification', 'clustering'] },
    { subChannel: 'model-training', tags: ['hyperparameter', 'cross-validation', 'regularization'] },
    { subChannel: 'deployment', tags: ['mlflow', 'kubeflow', 'sagemaker'] },
    { subChannel: 'deep-learning', tags: ['cnn', 'rnn', 'transformer', 'attention'] },
    { subChannel: 'evaluation', tags: ['precision', 'recall', 'auc-roc', 'f1'] },
  ],
  'python': [
    { subChannel: 'fundamentals', tags: ['generators', 'decorators', 'context-managers'] },
    { subChannel: 'libraries', tags: ['pandas', 'numpy', 'scikit-learn'] },
    { subChannel: 'best-practices', tags: ['pep8', 'typing', 'testing'] },
    { subChannel: 'async', tags: ['asyncio', 'aiohttp', 'concurrency'] },
  ],

  // NEW: AI & GenAI Channels
  'generative-ai': [
    { subChannel: 'llm-fundamentals', tags: ['transformer', 'attention', 'tokenization'] },
    { subChannel: 'fine-tuning', tags: ['lora', 'qlora', 'peft', 'adapter'] },
    { subChannel: 'rag', tags: ['retrieval', 'embeddings', 'vector-db', 'chunking'] },
    { subChannel: 'agents', tags: ['langchain', 'autogen', 'tool-use', 'planning'] },
    { subChannel: 'evaluation', tags: ['hallucination', 'faithfulness', 'relevance'] },
  ],
  'prompt-engineering': [
    { subChannel: 'techniques', tags: ['chain-of-thought', 'few-shot', 'zero-shot'] },
    { subChannel: 'optimization', tags: ['prompt-tuning', 'dspy', 'automatic-prompting'] },
    { subChannel: 'safety', tags: ['jailbreak', 'guardrails', 'content-filtering'] },
    { subChannel: 'structured-output', tags: ['json-mode', 'function-calling', 'schema'] },
  ],
  'llm-ops': [
    { subChannel: 'deployment', tags: ['vllm', 'tgi', 'triton', 'onnx'] },
    { subChannel: 'optimization', tags: ['quantization', 'pruning', 'distillation'] },
    { subChannel: 'monitoring', tags: ['latency', 'throughput', 'cost-tracking'] },
    { subChannel: 'infrastructure', tags: ['gpu', 'tpu', 'inference-server'] },
  ],
  'computer-vision': [
    { subChannel: 'image-classification', tags: ['cnn', 'resnet', 'efficientnet'] },
    { subChannel: 'object-detection', tags: ['yolo', 'rcnn', 'detr'] },
    { subChannel: 'segmentation', tags: ['unet', 'mask-rcnn', 'sam'] },
    { subChannel: 'multimodal', tags: ['clip', 'blip', 'llava', 'vision-transformer'] },
  ],
  'nlp': [
    { subChannel: 'text-processing', tags: ['tokenization', 'stemming', 'ner'] },
    { subChannel: 'embeddings', tags: ['word2vec', 'bert', 'sentence-transformers'] },
    { subChannel: 'sequence-models', tags: ['lstm', 'gru', 'seq2seq'] },
    { subChannel: 'transformers', tags: ['bert', 'gpt', 't5', 'llama'] },
  ],

  // Security Channel
  'security': [
    { subChannel: 'application-security', tags: ['xss', 'csrf', 'sqli', 'ssrf'] },
    { subChannel: 'owasp', tags: ['top10', 'asvs', 'samm'] },
    { subChannel: 'encryption', tags: ['aes', 'rsa', 'tls', 'hashing'] },
    { subChannel: 'authentication', tags: ['mfa', 'passkeys', 'zero-trust'] },
  ],
  'networking': [
    { subChannel: 'tcp-ip', tags: ['tcp', 'udp', 'http2', 'quic'] },
    { subChannel: 'dns', tags: ['resolution', 'caching', 'dnssec'] },
    { subChannel: 'load-balancing', tags: ['l4', 'l7', 'consistent-hashing'] },
    { subChannel: 'cdn', tags: ['edge', 'caching', 'purging'] },
  ],

  // Mobile Channels
  'ios': [
    { subChannel: 'swift', tags: ['optionals', 'protocols', 'generics'] },
    { subChannel: 'uikit', tags: ['autolayout', 'tableview', 'collectionview'] },
    { subChannel: 'swiftui', tags: ['state', 'binding', 'environment'] },
    { subChannel: 'architecture', tags: ['mvvm', 'viper', 'clean-architecture'] },
  ],
  'android': [
    { subChannel: 'kotlin', tags: ['coroutines', 'flow', 'sealed-classes'] },
    { subChannel: 'jetpack-compose', tags: ['composables', 'state', 'navigation'] },
    { subChannel: 'architecture', tags: ['mvvm', 'mvi', 'clean-architecture'] },
    { subChannel: 'lifecycle', tags: ['viewmodel', 'livedata', 'savedstate'] },
  ],
  'react-native': [
    { subChannel: 'components', tags: ['flatlist', 'navigation', 'gestures'] },
    { subChannel: 'native-modules', tags: ['turbo-modules', 'fabric', 'jsi'] },
    { subChannel: 'performance', tags: ['hermes', 'reanimated', 'profiling'] },
    { subChannel: 'architecture', tags: ['new-architecture', 'bridgeless'] },
  ],

  // Testing & QA Channels
  'testing': [
    { subChannel: 'unit-testing', tags: ['jest', 'mocha', 'pytest', 'junit'] },
    { subChannel: 'integration-testing', tags: ['api-testing', 'database-testing', 'mocking'] },
    { subChannel: 'tdd', tags: ['test-driven', 'red-green-refactor', 'test-first'] },
    { subChannel: 'test-strategies', tags: ['test-pyramid', 'coverage', 'mutation-testing'] },
  ],
  'e2e-testing': [
    { subChannel: 'playwright', tags: ['playwright', 'browser-automation', 'selectors'] },
    { subChannel: 'cypress', tags: ['cypress', 'component-testing', 'fixtures'] },
    { subChannel: 'selenium', tags: ['selenium', 'webdriver', 'grid'] },
    { subChannel: 'visual-testing', tags: ['screenshot', 'visual-regression', 'percy'] },
  ],
  'api-testing': [
    { subChannel: 'rest-testing', tags: ['postman', 'rest-assured', 'supertest'] },
    { subChannel: 'contract-testing', tags: ['pact', 'consumer-driven', 'schema-validation'] },
    { subChannel: 'graphql-testing', tags: ['graphql', 'apollo', 'introspection'] },
    { subChannel: 'mocking', tags: ['wiremock', 'mockserver', 'msw'] },
  ],
  'performance-testing': [
    { subChannel: 'load-testing', tags: ['jmeter', 'k6', 'gatling', 'locust'] },
    { subChannel: 'stress-testing', tags: ['spike-testing', 'soak-testing', 'breakpoint'] },
    { subChannel: 'profiling', tags: ['cpu-profiling', 'memory-profiling', 'flame-graphs'] },
    { subChannel: 'benchmarking', tags: ['latency', 'throughput', 'percentiles'] },
  ],

  // Management & Soft Skills Channels
  'engineering-management': [
    { subChannel: 'team-leadership', tags: ['delegation', 'mentoring', 'growth'] },
    { subChannel: 'one-on-ones', tags: ['feedback', 'career-development', 'coaching'] },
    { subChannel: 'hiring', tags: ['sourcing', 'interviewing', 'onboarding'] },
    { subChannel: 'project-management', tags: ['agile', 'scrum', 'kanban', 'okrs'] },
  ],
  'behavioral': [
    { subChannel: 'star-method', tags: ['situation', 'task', 'action', 'result'] },
    { subChannel: 'leadership-principles', tags: ['ownership', 'bias-for-action', 'customer-obsession'] },
    { subChannel: 'soft-skills', tags: ['communication', 'collaboration', 'influence'] },
    { subChannel: 'conflict-resolution', tags: ['negotiation', 'mediation', 'feedback'] },
  ],
};

const difficulties = ['beginner', 'intermediate', 'advanced'];

// Get all channels from the config (source of truth)
// This ensures we generate questions for all defined channels
function getAllChannels() {
  return Object.keys(channelConfigs);
}

// Get a random sub-channel config for a given channel
function getRandomSubChannel(channel) {
  const configs = channelConfigs[channel];
  if (!configs || configs.length === 0) {
    return { subChannel: 'general', tags: [channel] };
  }
  return configs[Math.floor(Math.random() * configs.length)];
}

async function main() {
  console.log('=== Daily Question Generator (Unified Storage) ===\n');
  console.log('Mode: 1 question per channel (can map to multiple channels)\n');

  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'random';
  const inputAdditionalChannels = process.env.INPUT_ADDITIONAL_CHANNELS || '';
  
  // Get all channels from config
  const channels = getAllChannels();
  console.log(`Found ${channels.length} channels: ${channels.join(', ')}\n`);

  const allQuestions = getAllUnifiedQuestions();
  console.log(`Loaded ${allQuestions.length} existing questions`);
  console.log(`Target: Generate 1 question per channel (${channels.length} total)\n`);

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

    // Compact difficulty hints
    const difficultyHint = {
      beginner: 'fundamentals, definitions, basic use cases',
      intermediate: 'implementation, trade-offs, real-world patterns',
      advanced: 'edge cases, optimization, production-scale challenges'
    };
    
    // Topic context for better search hints
    const topicHint = `${channel.replace(/-/g, ' ')} ${subChannelConfig.subChannel.replace(/-/g, ' ')}`;

    const prompt = `Generate a ${difficulty} ${channel}/${subChannelConfig.subChannel} interview question.

Focus: ${difficultyHint[difficulty]}
Tags: ${subChannelConfig.tags.join(', ')}

CRITICAL VIDEO RULES:
- Videos MUST be real educational content about "${topicHint}"
- NEVER use placeholder/meme videos (dQw4w9WgXcQ is BLOCKED)
- If unsure, leave video fields as null
- Only use videos from: Fireship, NeetCode, ByteByteGo, Traversy Media, freeCodeCamp, Web Dev Simplified

Return JSON:
{
  "question": "specific technical question ending with ?",
  "answer": "concise answer under 150 chars",
  "explanation": "markdown: ## Concept, ## Implementation (code), ## Trade-offs, ## Pitfalls",
  "diagram": "mermaid flowchart visualizing the concept",
  "relatedChannels": ["1-2 related channel IDs"],
  "sourceUrl": "real URL: official docs, MDN, AWS docs, or reputable tech blog",
  "videos": {
    "shortVideo": null,
    "longVideo": null
  },
  "companies": ["2-4 companies: Google, Amazon, Meta, Microsoft, Apple, Netflix, Uber, Stripe"]
}`;

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

    if (isDuplicateUnified(data.question)) {
      console.log('❌ Duplicate question detected.');
      failedAttempts.push({ channel, reason: 'Duplicate detected' });
      continue;
    }

    // Validate YouTube videos if provided
    console.log('🎬 Validating YouTube videos...');
    const validatedVideos = await validateYouTubeVideos(data.videos);

    const newQuestion = {
      id: generateUnifiedId(),
      question: data.question,
      answer: data.answer.substring(0, 200),
      explanation: data.explanation,
      tags: subChannelConfig.tags,
      difficulty: difficulty,
      diagram: data.diagram || 'graph TD\n    A[Concept] --> B[Implementation]',
      sourceUrl: data.sourceUrl || null,
      videos: {
        shortVideo: validatedVideos.shortVideo,
        longVideo: validatedVideos.longVideo
      },
      companies: normalizeCompanies(data.companies),
      lastUpdated: new Date().toISOString()
    };

    // Build channel mappings - primary channel + any related channels
    const channelMappings = [{ channel, subChannel: subChannelConfig.subChannel }];
    
    // Add related channels if provided by AI and they exist in our config
    if (data.relatedChannels && Array.isArray(data.relatedChannels)) {
      data.relatedChannels.forEach(relatedChannel => {
        if (channelConfigs[relatedChannel] && relatedChannel !== channel) {
          // Pick a relevant subchannel for the related channel
          const relatedSubChannel = getRandomSubChannel(relatedChannel);
          channelMappings.push({ 
            channel: relatedChannel, 
            subChannel: relatedSubChannel.subChannel 
          });
        }
      });
    }

    // Add question to unified storage with all channel mappings
    addUnifiedQuestion(newQuestion, channelMappings);
    updateUnifiedIndexFile();
    
    addedQuestions.push({ ...newQuestion, mappedChannels: channelMappings });

    console.log(`✅ Added: ${newQuestion.id}`);
    console.log(`Q: ${newQuestion.question.substring(0, 60)}...`);
    if (channelMappings.length > 1) {
      console.log(`📎 Also mapped to: ${channelMappings.slice(1).map(m => m.channel).join(', ')}`);
    }
  }

  // Print summary
  const totalQuestions = getAllUnifiedQuestions().length;
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Added: ${addedQuestions.length}/${channels.length}`);
  
  if (addedQuestions.length > 0) {
    console.log('\n✅ Successfully Added Questions:');
    addedQuestions.forEach((q, idx) => {
      const channels = q.mappedChannels.map(m => `${m.channel}/${m.subChannel}`).join(', ');
      console.log(`  ${idx + 1}. [${q.id}] (${q.difficulty})`);
      console.log(`     Q: ${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}`);
      console.log(`     Channels: ${channels}`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => {
      console.log(`  - ${f.channel}: ${f.reason}`);
    });
  }

  console.log(`\nTotal Questions in Database: ${totalQuestions}`);
  console.log('=== END SUMMARY ===\n');

  // Log to changelog
  if (addedQuestions.length > 0) {
    const channelsAffected = addedQuestions.flatMap(q => q.mappedChannels.map(m => m.channel));
    logQuestionsAdded(
      addedQuestions.length,
      channelsAffected,
      addedQuestions.map(q => q.id)
    );
    console.log('📝 Changelog updated with new questions');
  }

  writeGitHubOutput({
    added_count: addedQuestions.length,
    failed_count: failedAttempts.length,
    total_questions: totalQuestions,
    added_ids: addedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
