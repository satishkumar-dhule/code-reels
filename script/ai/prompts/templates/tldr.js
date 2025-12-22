/**
 * TLDR (Too Long; Didn't Read) Prompt Template
 */

import { jsonOutputRule, qualityRules, buildSystemContext } from './base.js';

export const schema = {
  tldr: "Your concise one-liner here"
};

export const examples = [
  {
    input: { question: "What is database indexing?", answer: "Indexing creates a data structure to speed up queries..." },
    output: { tldr: "Use indexes on frequently queried columns to speed up lookups" }
  },
  {
    input: { question: "What's the difference between REST and GraphQL?", answer: "REST uses multiple endpoints..." },
    output: { tldr: "REST uses HTTP verbs with multiple endpoints; GraphQL uses one endpoint with flexible queries" }
  },
  {
    input: { question: "What are microservices?", answer: "Microservices architecture splits applications..." },
    output: { tldr: "Split monoliths into small, independent services that deploy and scale separately" }
  }
];

export const guidelines = [
  'Maximum 100 characters',
  'Start with a verb or key concept',
  'Be direct and actionable',
  'Focus on the "what" not the "why"',
  'No filler words like "basically", "essentially", "simply"',
  'Capture the single most important takeaway'
];

export function build(context) {
  const { question, answer } = context;
  
  return `${buildSystemContext('tldr')}

Create a TL;DR (Too Long; Didn't Read) summary for this technical interview question.
The TLDR should be a single, concise sentence that captures the key point.

Question: "${question}"
Answer: "${(answer || '').substring(0, 500)}"

Guidelines:
${guidelines.map(g => `- ${g}`).join('\n')}

${qualityRules.concise}

Output this exact JSON structure:
${JSON.stringify(schema)}

${jsonOutputRule}`;
}

export default { schema, examples, guidelines, build };
