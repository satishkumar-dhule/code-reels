/**
 * Mermaid Diagram Prompt Template
 */

import { jsonOutputRule, qualityRules, buildSystemContext } from './base.js';
import config from '../../config.js';

export const schema = {
  diagram: "flowchart TD\\n  A[Step 1] --> B[Step 2]",
  diagramType: "flowchart|sequence|class|state",
  confidence: "high|medium|low"
};

export const examples = [
  {
    input: { question: "How does DNS resolution work?", tags: ["networking", "dns"] },
    output: {
      diagram: "flowchart TD\n  A[Browser] -->|1. Query| B[Local DNS Cache]\n  B -->|2. Miss| C[Recursive Resolver]\n  C -->|3. Query| D[Root Server]\n  D -->|4. Referral| E[TLD Server]\n  E -->|5. Referral| F[Authoritative Server]\n  F -->|6. IP Address| C\n  C -->|7. Response| A",
      diagramType: "flowchart",
      confidence: "high"
    }
  },
  {
    input: { question: "Explain OAuth 2.0 flow", tags: ["security", "authentication"] },
    output: {
      diagram: "sequenceDiagram\n  participant U as User\n  participant C as Client App\n  participant A as Auth Server\n  participant R as Resource Server\n  U->>C: 1. Click Login\n  C->>A: 2. Authorization Request\n  A->>U: 3. Login Prompt\n  U->>A: 4. Credentials\n  A->>C: 5. Authorization Code\n  C->>A: 6. Exchange Code for Token\n  A->>C: 7. Access Token\n  C->>R: 8. API Request + Token\n  R->>C: 9. Protected Resource",
      diagramType: "sequence",
      confidence: "high"
    }
  }
];

export const badExamples = [
  'A[Start] --> B[End]',
  'A[Input] --> B[Process] --> C[Output]',
  'A[Step 1] --> B[Step 2] --> C[Step 3]',
  'A[Concept] --> B[Implementation]'
];

// Use centralized guidelines from config
export const guidelines = [
  `Create a diagram with ${config.qualityThresholds.diagram.minNodes}-8 specific nodes`,
  ...config.guidelines.diagram,
  'DO NOT create trivial diagrams like "Start -> End"',
  'DO NOT use generic labels like "Step 1", "Concept", "Implementation"'
];

export function build(context) {
  const { question, answer, tags } = context;
  
  return `${buildSystemContext('diagram')}

Create a detailed, meaningful Mermaid diagram for this interview question.

Question: "${question}"
Answer: "${(answer || '').substring(0, 300)}"
Tags: ${(tags || []).slice(0, 4).join(', ') || 'technical'}

CRITICAL REQUIREMENTS:
${guidelines.map(g => `- ${g}`).join('\n')}

EXAMPLES OF BAD DIAGRAMS (DO NOT CREATE):
${badExamples.map(e => `- ${e}`).join('\n')}

${qualityRules.technical}

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, examples, badExamples, guidelines, build };
