/**
 * Question Generation Prompt Template
 */

import { jsonOutputRule, buildSystemContext } from './base.js';

export const schema = {
  question: "Specific, practical interview question ending with ?",
  answer: "Concise answer under 150 chars",
  explanation: "Detailed explanation with sections",
  diagram: "flowchart TD\\n  A[Step] --> B[Step]",
  companies: ["Company1", "Company2"],
  sourceUrl: null,
  videos: { shortVideo: null, longVideo: null }
};

export const channelConfigs = {
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
  'generative-ai': [
    { subChannel: 'llm-fundamentals', tags: ['transformer', 'attention', 'tokenization'] },
    { subChannel: 'fine-tuning', tags: ['lora', 'qlora', 'peft', 'adapter'] },
    { subChannel: 'rag', tags: ['retrieval', 'embeddings', 'vector-db', 'chunking'] },
    { subChannel: 'agents', tags: ['langchain', 'autogen', 'tool-use', 'planning'] },
    { subChannel: 'evaluation', tags: ['hallucination', 'faithfulness', 'relevance'] },
  ],
  'behavioral': [
    { subChannel: 'star-method', tags: ['situation', 'task', 'action', 'result'] },
    { subChannel: 'leadership-principles', tags: ['ownership', 'bias-for-action', 'customer-obsession'] },
    { subChannel: 'soft-skills', tags: ['communication', 'collaboration', 'influence'] },
    { subChannel: 'conflict-resolution', tags: ['negotiation', 'mediation', 'feedback'] },
  ],
};

export const topCompanies = [
  'Google', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Microsoft',
  'Nvidia', 'Tesla', 'Salesforce', 'Adobe', 'Oracle', 'IBM',
  'Snowflake', 'Databricks', 'Cloudflare', 'MongoDB', 'HashiCorp',
  'Stripe', 'Square', 'PayPal', 'Plaid', 'Robinhood', 'Coinbase',
  'Uber', 'Lyft', 'Airbnb', 'DoorDash', 'Instacart',
  'LinkedIn', 'Twitter', 'Snap', 'Discord', 'Slack', 'Zoom',
  'OpenAI', 'Anthropic', 'Scale AI', 'Hugging Face',
  'Bloomberg', 'Goldman Sachs', 'Citadel', 'Two Sigma'
];

export const realScenarios = {
  'system-design': [
    { scenario: 'Design Twitter/X feed', scale: '500M users, 10K tweets/sec', focus: 'fan-out, caching, real-time' },
    { scenario: 'Design Uber ride matching', scale: '1M concurrent rides', focus: 'geospatial, real-time, matching' },
    { scenario: 'Design Netflix video streaming', scale: '200M subscribers', focus: 'CDN, encoding, recommendations' },
  ],
  'algorithms': [
    { problem: 'LRU Cache', pattern: 'HashMap + Doubly Linked List', complexity: 'O(1) get/put' },
    { problem: 'Merge K sorted lists', pattern: 'Min Heap', complexity: 'O(N log K)' },
  ],
};

export const systemDesignFormat = `## Functional Requirements
- [Requirement 1]
- [Requirement 2]

## Non-Functional Requirements (NFRs)
- **Availability**: [Target]
- **Latency**: [Target]
- **Scalability**: [Target]
- **Consistency**: [Type]

## Back-of-Envelope Calculations
### Users & Traffic
- DAU: [Number]
- Peak QPS: [Number]

### Storage
- Per user: [Size]
- Total: [Size]

## High-Level Design
[Description]

## Deep Dive: Key Components
### [Component 1]
[Details]

## Trade-offs & Considerations
- [Trade-off 1]

## Failure Scenarios & Mitigations
- [Scenario]: [Mitigation]`;

export const standardFormat = `## Why This Is Asked
[Interview context]

## Key Concepts
- Concept 1
- Concept 2

## Code Example
\`\`\`
[Implementation]
\`\`\`

## Follow-up Questions
- Follow-up 1
- Follow-up 2`;

export const guidelines = [
  'Question must be SPECIFIC and PRACTICAL - something actually asked in interviews',
  'Include a realistic scenario or context when appropriate',
  'Answer should be actionable and demonstrate expertise',
  'Create a MEANINGFUL diagram with 5-8 specific nodes',
  'DO NOT create trivial diagrams like "Start -> End"'
];

export function build(context) {
  const { channel, subChannel, difficulty, tags, targetCompanies, scenarioHint } = context;
  
  const isSystemDesign = channel === 'system-design';
  const explanationFormat = isSystemDesign ? systemDesignFormat : standardFormat;

  return `${buildSystemContext('generate')}

Generate a REAL interview question that you would actually ask candidates.

CONTEXT:
- Channel: ${channel}/${subChannel}
- Difficulty: ${difficulty}
- Topics: ${(tags || []).join(', ')}
- Target companies: ${(targetCompanies || []).join(', ')}
${scenarioHint ? `- Example scenario for inspiration: ${scenarioHint}` : ''}

REQUIREMENTS:
${guidelines.map(g => `- ${g}`).join('\n')}

For ${difficulty} level:
- beginner: Fundamental concepts, basic implementation
- intermediate: Real-world scenarios, trade-offs, debugging
- advanced: System design at scale, complex algorithms, production issues

${isSystemDesign ? 'SYSTEM DESIGN EXPLANATION FORMAT (MANDATORY):\n' + systemDesignFormat : ''}

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, channelConfigs, topCompanies, realScenarios, guidelines, build };
