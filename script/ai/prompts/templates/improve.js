/**
 * Question Improvement Prompt Template
 */

import { jsonOutputRule, qualityRules, buildSystemContext } from './base.js';

export const schema = {
  question: "improved question ending with ?",
  answer: "comprehensive interview answer (200-400 chars) that demonstrates expertise",
  explanation: "detailed explanation with sections"
};

export const explanationFormat = {
  standard: `## Why This Is Asked
[Interview context]

## Key Concepts
- Concept 1
- Concept 2

## Code Example
\`\`\`
[Implementation if applicable]
\`\`\`

## Follow-up Questions
- Follow-up 1
- Follow-up 2`,

  systemDesign: `## Functional Requirements
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
- [Scenario]: [Mitigation]`
};

export const examples = [
  {
    input: { 
      question: "What is caching", 
      answer: "storing data", 
      issues: ["short_answer", "no_question_mark"] 
    },
    output: {
      question: "What is caching and when should you use it in a web application?",
      answer: "Caching stores frequently accessed data in fast storage (memory/Redis) to reduce latency and database load. Use it for read-heavy data that doesn't change often. Key strategies include cache-aside (lazy loading), write-through, and write-behind. Always consider TTL, invalidation strategy, and cache stampede prevention.",
      explanation: "## Why This Is Asked\nCaching is fundamental to building scalable systems..."
    }
  }
];

export const guidelines = [
  'Ensure question ends with a question mark',
  'Answer MUST be 200-400 characters - comprehensive enough to impress an interviewer',
  'Answer should demonstrate technical depth, not just define the concept',
  'Include specific technologies, patterns, or trade-offs in the answer',
  'Explanation should include interview context',
  'Add code examples where relevant',
  'Include 2-3 follow-up questions interviewers might ask',
  'For system design, use the NFR format with calculations',
  'CRITICAL: Use proper markdown formatting - ensure all ** bold markers are properly paired',
  'Each section header should be on its own line with ## prefix',
  'Bullet points should start with - on a new line'
];

export function build(context) {
  const { question, answer, explanation, channel, issues, relevanceFeedback } = context;
  
  const isSystemDesign = channel === 'system-design' || 
    question.toLowerCase().includes('design') ||
    question.toLowerCase().includes('architect');

  let feedbackSection = '';
  if (relevanceFeedback) {
    feedbackSection = `\nRELEVANCE FEEDBACK TO ADDRESS:`;
    if (relevanceFeedback.questionIssues?.length > 0) {
      feedbackSection += `\n- Question Issues: ${relevanceFeedback.questionIssues.join('; ')}`;
    }
    if (relevanceFeedback.answerIssues?.length > 0) {
      feedbackSection += `\n- Answer Issues: ${relevanceFeedback.answerIssues.join('; ')}`;
    }
    if (relevanceFeedback.missingTopics?.length > 0) {
      feedbackSection += `\n- Missing Topics: ${relevanceFeedback.missingTopics.join('; ')}`;
    }
  }

  return `${buildSystemContext('improve')}

Improve this ${channel || 'technical'} interview question. Fix: ${(issues || []).slice(0, 3).join(', ')}
${feedbackSection}

Current Question: "${(question || '').substring(0, 150)}"
Current Answer: "${(answer || 'missing').substring(0, 150)}"

${isSystemDesign ? 'Use the SYSTEM DESIGN format with NFRs and calculations.' : 'Use the STANDARD format with code examples.'}

Guidelines:
${guidelines.map(g => `- ${g}`).join('\n')}

${qualityRules.technical}

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, explanationFormat, examples, guidelines, build };
