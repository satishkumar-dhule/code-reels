/**
 * Company Finder Prompt Template
 */

import { jsonOutputRule, qualityRules, buildSystemContext } from './base.js';

export const schema = {
  companies: ["Company1", "Company2", "Company3", "Company4", "Company5"],
  confidence: "high|medium|low",
  reasoning: "brief explanation"
};

export const knownCompanies = [
  // FAANG/MAANG
  'Google', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Microsoft',
  // Big Tech
  'Nvidia', 'Tesla', 'Salesforce', 'Adobe', 'Oracle', 'IBM',
  // Cloud & Infrastructure
  'Snowflake', 'Databricks', 'Cloudflare', 'MongoDB', 'HashiCorp',
  // Fintech
  'Stripe', 'Square', 'PayPal', 'Plaid', 'Robinhood', 'Coinbase',
  // E-commerce & Delivery
  'Shopify', 'Instacart', 'DoorDash', 'Uber', 'Lyft', 'Airbnb',
  // Social & Communication
  'LinkedIn', 'Twitter', 'Snap', 'Discord', 'Slack', 'Zoom', 'Twilio',
  // Enterprise
  'ServiceNow', 'Workday', 'Atlassian', 'Splunk', 'Datadog',
  // AI/ML
  'OpenAI', 'Anthropic', 'Scale AI', 'Hugging Face',
  // Finance
  'Goldman Sachs', 'Morgan Stanley', 'Bloomberg', 'Citadel', 'Two Sigma'
];

export const examples = [
  {
    input: { question: "Design a URL shortener", tags: ["system-design"] },
    output: {
      companies: ["Google", "Twitter", "LinkedIn", "Uber", "Stripe"],
      confidence: "high",
      reasoning: "Classic system design question asked at most FAANG companies"
    }
  },
  {
    input: { question: "Implement LRU Cache", tags: ["algorithms", "data-structures"] },
    output: {
      companies: ["Amazon", "Meta", "Microsoft", "Bloomberg", "Apple"],
      confidence: "high",
      reasoning: "Fundamental data structure question common in coding interviews"
    }
  }
];

export const guidelines = [
  'Return 4-6 real tech companies known to ask this type of question',
  'Prioritize FAANG and top-tier tech companies',
  'Consider the question topic when selecting companies',
  'Include a mix of company sizes (big tech + unicorns)',
  'Only include companies that actually conduct technical interviews'
];

export function build(context) {
  const { question, tags, difficulty } = context;
  
  return `${buildSystemContext('company')}

Find real tech companies that ask this interview question or similar ones.

Question: "${question}"
Topic: ${(tags || []).slice(0, 4).join(', ') || 'technical interview'}
Difficulty: ${difficulty || 'intermediate'}

Research which companies are known to ask this type of question.
Consider: ${knownCompanies.slice(0, 20).join(', ')}, and others.

Guidelines:
${guidelines.map(g => `- ${g}`).join('\n')}

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, knownCompanies, examples, guidelines, build };
