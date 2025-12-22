/**
 * Question Classification Prompt Template
 */

import { jsonOutputRule, buildSystemContext } from './base.js';

export const schema = {
  classifications: [
    { channel: "channel-id", subChannel: "subchannel-id", isPrimary: true },
    { channel: "secondary-channel", subChannel: "subchannel", isPrimary: false }
  ],
  confidence: "high|medium|low",
  reasoning: "brief explanation"
};

export const channelStructure = {
  'system-design': ['infrastructure', 'distributed-systems', 'api-design', 'caching', 'load-balancing', 'message-queues'],
  'algorithms': ['data-structures', 'sorting', 'dynamic-programming', 'graphs', 'trees'],
  'frontend': ['react', 'javascript', 'css', 'performance', 'web-apis'],
  'backend': ['apis', 'microservices', 'caching', 'authentication', 'server-architecture'],
  'database': ['sql', 'nosql', 'indexing', 'transactions', 'query-optimization'],
  'devops': ['cicd', 'docker', 'automation', 'gitops'],
  'sre': ['observability', 'reliability', 'incident-management', 'chaos-engineering', 'capacity-planning'],
  'kubernetes': ['pods', 'services', 'deployments', 'helm', 'operators'],
  'aws': ['compute', 'storage', 'serverless', 'database', 'networking'],
  'terraform': ['basics', 'modules', 'state-management', 'best-practices'],
  'data-engineering': ['etl', 'data-pipelines', 'warehousing', 'streaming'],
  'machine-learning': ['algorithms', 'model-training', 'deployment', 'deep-learning', 'evaluation'],
  'generative-ai': ['llm-fundamentals', 'fine-tuning', 'rag', 'agents', 'evaluation'],
  'prompt-engineering': ['techniques', 'optimization', 'safety', 'structured-output'],
  'llm-ops': ['deployment', 'optimization', 'monitoring', 'infrastructure'],
  'computer-vision': ['image-classification', 'object-detection', 'segmentation', 'multimodal'],
  'nlp': ['text-processing', 'embeddings', 'sequence-models', 'transformers'],
  'python': ['fundamentals', 'libraries', 'best-practices', 'async'],
  'security': ['application-security', 'owasp', 'encryption', 'authentication'],
  'networking': ['tcp-ip', 'dns', 'load-balancing', 'cdn'],
  'operating-systems': ['processes', 'memory', 'file-systems', 'scheduling'],
  'linux': ['commands', 'shell-scripting', 'system-administration', 'networking'],
  'unix': ['fundamentals', 'commands', 'system-programming'],
  'ios': ['swift', 'uikit', 'swiftui', 'architecture'],
  'android': ['kotlin', 'jetpack-compose', 'architecture', 'lifecycle'],
  'react-native': ['components', 'native-modules', 'performance', 'architecture'],
  'testing': ['unit-testing', 'integration-testing', 'tdd', 'test-strategies'],
  'e2e-testing': ['playwright', 'cypress', 'selenium', 'visual-testing'],
  'api-testing': ['rest-testing', 'contract-testing', 'graphql-testing', 'mocking'],
  'performance-testing': ['load-testing', 'stress-testing', 'profiling', 'benchmarking'],
  'engineering-management': ['team-leadership', 'one-on-ones', 'hiring', 'project-management'],
  'behavioral': ['star-method', 'leadership-principles', 'soft-skills', 'conflict-resolution']
};

export const examples = [
  {
    input: { question: "Design a rate limiter for an API", tags: ["api", "system-design"] },
    output: {
      classifications: [
        { channel: "system-design", subChannel: "api-design", isPrimary: true },
        { channel: "backend", subChannel: "apis", isPrimary: false }
      ],
      confidence: "high",
      reasoning: "Rate limiting is primarily a system design topic but also relevant to backend API development"
    }
  }
];

export const guidelines = [
  'Return the PRIMARY channel first (most relevant)',
  'Include SECONDARY channels only if genuinely relevant',
  'Maximum 3 channels per question',
  'Only add secondary channels if confidence > medium',
  'Use exact channel and subchannel IDs from the provided structure'
];

export function build(context) {
  const { question, answer, tags, currentChannel, currentSubChannel } = context;
  
  const channelList = Object.entries(channelStructure)
    .map(([ch, subs]) => `${ch}: [${subs.join(', ')}]`)
    .join('\n');

  return `${buildSystemContext('classify')}

Analyze this technical interview question and determine ALL relevant channel and subchannel classifications.
A question can belong to MULTIPLE channels if it spans different topics.

Question: "${question}"
Answer: "${(answer || '').substring(0, 200)}"
Tags: ${(tags || []).slice(0, 5).join(', ')}
Current Channel: ${currentChannel || 'none'}
Current SubChannel: ${currentSubChannel || 'none'}

Available channels and subchannels:
${channelList}

Guidelines:
${guidelines.map(g => `- ${g}`).join('\n')}

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, channelStructure, examples, guidelines, build };
