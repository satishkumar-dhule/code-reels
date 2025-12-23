/**
 * ELI5 (Explain Like I'm 5) Prompt Template
 */

import { jsonOutputRule, qualityRules, buildSystemContext } from './base.js';
import config from '../../config.js';

export const schema = {
  eli5: "Your simple explanation here using everyday analogies"
};

export const examples = [
  {
    input: { question: "What is a database index?", answer: "A data structure that improves query speed" },
    output: { eli5: "Imagine you have a huge book with thousands of pages. An index is like the table of contents at the back - instead of reading every page to find 'dinosaurs', you look up 'D' in the index and it tells you exactly which pages to go to. Databases use indexes the same way to find information super fast!" }
  },
  {
    input: { question: "What is a load balancer?", answer: "Distributes traffic across multiple servers" },
    output: { eli5: "Think of a busy McDonald's with 5 cashiers. The manager at the front is like a load balancer - when you walk in, they point you to the cashier with the shortest line. This way, no single cashier gets overwhelmed and everyone gets served faster!" }
  }
];

// Use centralized guidelines from config
export const guidelines = [
  `Keep it under ${config.qualityThresholds.eli5.maxLength} characters`,
  ...config.guidelines.eli5
];

export function build(context) {
  const { question, answer } = context;
  
  return `${buildSystemContext('eli5')}

Create an "Explain Like I'm 5" explanation for this technical interview question.
Make it simple, fun, and use everyday analogies a child would understand.

Question: "${question}"
Technical Answer: "${answer || 'N/A'}"

Guidelines:
${guidelines.map(g => `- ${g}`).join('\n')}

${qualityRules.beginner}

Output this exact JSON structure:
${JSON.stringify(schema)}

${jsonOutputRule}`;
}

export default { schema, examples, guidelines, build };
