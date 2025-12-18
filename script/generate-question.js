import {
  getAllUnifiedQuestions,
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

function getAllChannels() {
  return Object.keys(channelConfigs);
}

function getRandomSubChannel(channel) {
  const configs = channelConfigs[channel];
  if (!configs || configs.length === 0) {
    return { subChannel: 'general', tags: [channel] };
  }
  return configs[Math.floor(Math.random() * configs.length)];
}

// Prioritize channels with fewer questions (weighted random selection)
function selectChannelsWeighted(channelCounts, allChannels, limit) {
  // Calculate weights - channels with fewer questions get higher weight
  const maxCount = Math.max(...Object.values(channelCounts), 1);
  const weights = allChannels.map(ch => {
    const count = channelCounts[ch] || 0;
    // Inverse weight: fewer questions = higher weight
    // Add 1 to avoid division by zero, multiply by factor for channels with 0 questions
    return Math.pow((maxCount - count + 10) / maxCount, 2);
  });
  
  const selected = [];
  const available = [...allChannels];
  const availableWeights = [...weights];
  
  while (selected.length < limit && available.length > 0) {
    // Weighted random selection
    let random = Math.random() * availableWeights.reduce((a, b) => a + b, 0);
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

async function main() {
  console.log('=== 🚀 Creator Bot - Crafting New Questions ===\n');

  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'random';
  const inputLimit = parseInt(process.env.INPUT_LIMIT || '0', 10);
  const balanceChannels = process.env.BALANCE_CHANNELS !== 'false'; // Default to true
  
  const allChannels = getAllChannels();
  
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
  
  if (balanceChannels && inputLimit > 0) {
    // Use weighted selection to prioritize channels with fewer questions
    channels = selectChannelsWeighted(channelCounts, allChannels, limit);
    console.log(`\n🎯 Balanced selection (prioritizing low-count channels):`);
    channels.forEach(ch => {
      console.log(`   ${ch}: ${channelCounts[ch] || 0} questions`);
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

    const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Generate ${difficulty} ${channel}/${subChannelConfig.subChannel} interview question.
Topics: ${subChannelConfig.tags.join(', ')}

Output this exact JSON structure:
{"question":"specific technical question ending with ?","answer":"concise answer under 150 chars","explanation":"## Why Asked\\nInterview context\\n## Key Concepts\\nCore knowledge\\n## Code Example\\n\`\`\`\\nImplementation\\n\`\`\`\\n## Follow-up Questions\\nCommon follow-ups","diagram":"flowchart TD\\n  A[Start] --> B[End]","companies":["Google","Amazon","Meta"],"sourceUrl":null,"videos":{"shortVideo":null,"longVideo":null}}

IMPORTANT: Return ONLY the JSON object. No other text.`;

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

    if (await isDuplicateUnified(data.question)) {
      console.log('❌ Duplicate question detected.');
      failedAttempts.push({ channel, reason: 'Duplicate detected' });
      continue;
    }

    console.log('🎬 Validating YouTube videos...');
    const validatedVideos = await validateYouTubeVideos(data.videos);

    const newQuestion = {
      id: await generateUnifiedId(),
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
