/**
 * Coding Challenge Generation Prompt Template
 */

import { jsonOutputRule, buildSystemContext } from './base.js';
import config from '../../config.js';

export const schema = {
  title: "Unique Problem Title",
  description: "Clear description with constraints.",
  difficulty: "easy|medium",
  category: "arrays",
  tags: ["arrays", "tag2"],
  companies: ["Google", "Amazon"],
  starterCode: {
    javascript: "function solve(param) {\n  // Your code here\n}",
    python: "def solve(param):\n    # Your code here\n    pass"
  },
  testCases: [
    { id: "1", input: "[1,2,3]", expectedOutput: "6", description: "Basic" },
    { id: "2", input: "[]", expectedOutput: "0", description: "Empty" }
  ],
  hints: ["Hint 1", "Hint 2"],
  sampleSolution: {
    javascript: "function solve(param) { return result; }",
    python: "def solve(param): return result"
  },
  complexity: {
    time: "O(n)",
    space: "O(1)",
    explanation: "Why"
  },
  timeLimit: 15
};

export const categories = [
  'arrays',
  'strings',
  'hash-maps',
  'two-pointers',
  'stacks',
  'math',
  'sorting',
  'searching',
  'dynamic-programming',
  'linked-lists',
];

export const difficulties = ['easy', 'medium'];

export const topCompanies = [
  'Google', 'Amazon', 'Meta', 'Apple', 'Microsoft', 'Netflix',
  'Uber', 'Lyft', 'Airbnb', 'Stripe', 'Square', 'PayPal',
  'LinkedIn', 'Twitter', 'Snap', 'Pinterest', 'Dropbox',
  'Bloomberg', 'Goldman Sachs', 'Citadel', 'Two Sigma',
  'Databricks', 'Snowflake', 'Coinbase', 'Robinhood',
  'OpenAI', 'Anthropic', 'SpaceX', 'Tesla'
];

// Use centralized guidelines from config
export const guidelines = config.guidelines.codingChallenge;

export function build(context) {
  const { difficulty, category, companies, existingTitles } = context;
  
  const avoidTitlesSection = existingTitles?.length > 0 
    ? `\nExisting ${category} challenges (create something DIFFERENT): ${existingTitles.join(', ')}`
    : '';

  return `${buildSystemContext('generate')}

Generate a ${difficulty} coding challenge for category: ${category}
Companies: ${(companies || []).join(', ')}${avoidTitlesSection}

CRITICAL RULES:
${guidelines.map(g => `- ${g}`).join('\n')}

Requirements:
- Difficulty: ${difficulty} (${difficulty === 'easy' ? 'basic, 10 min' : 'medium, 15-20 min'})
- Category: ${category}
- 3-4 test cases with edge cases
- Working JS and Python solutions
- UNIQUE title not similar to existing ones

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, categories, difficulties, topCompanies, guidelines, build };
