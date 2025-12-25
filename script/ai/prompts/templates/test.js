/**
 * Test Bot Prompt Template
 * Generates MCQ questions from Q&A content
 */

import { jsonOutputRule } from './base.js';

export const schema = [
  {
    q: "question text",
    o: ["option a", "option b", "option c", "option d"],
    c: [0],
    e: "brief explanation"
  }
];

export const guidelines = [
  'Rephrase questions slightly for variety',
  'Make wrong options realistic and plausible',
  'Ensure exactly 4 options per question',
  'Correct indices are 0-based',
  'Keep explanations brief but informative'
];

export function build(context) {
  const { questions } = context;
  
  const summaries = questions.map((q, i) => 
    `${i + 1}. Q: ${q.question.substring(0, 100)} A: ${q.answer.substring(0, 150)}`
  ).join('\n');

  return `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown.

Create ${questions.length} multiple choice questions (MCQs) from these Q&As:

${summaries}

Return a JSON array with this exact structure:
${JSON.stringify(schema, null, 2)}

Where:
- q = question text (rephrase slightly for variety)
- o = array of 4 plausible options (make wrong options realistic)
- c = array of correct option indices (0-based)
- e = brief explanation of why the answer is correct

GUIDELINES:
${guidelines.map(g => `- ${g}`).join('\n')}

${jsonOutputRule}`;
}

export default { schema, guidelines, build };
