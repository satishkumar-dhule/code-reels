/**
 * RCA Blog Generation Template
 * Creates engaging blog posts from real company incidents
 */

import { jsonOutputRule, buildSystemContext } from './base.js';

export const schema = {
  title: "Compelling title that creates curiosity (include company name and impact)",
  introduction: "Opening hook that draws readers in - start with the incident moment",
  sections: [
    {
      heading: "Section heading",
      content: "Section content in markdown with inline citations [1], [2]"
    }
  ],
  diagram: "Mermaid diagram showing the failure/architecture (without ```mermaid wrapper)",
  diagramType: "flowchart|sequence|timeline",
  diagramLabel: "Human-readable label for the diagram",
  glossary: [{ term: "Technical term", definition: "Simple explanation" }],
  sources: [{ title: "Source title", url: "https://...", type: "postmortem|blog|news" }],
  quickReference: ["Key lesson 1", "Key lesson 2", "Key lesson 3"],
  funFact: "Interesting context about the incident or company",
  conclusion: "What engineers should take away from this",
  metaDescription: "SEO meta description (150-160 chars)",
  difficulty: "beginner|intermediate|advanced",
  tags: ["tag1", "tag2", "tag3"],
  socialSnippet: {
    hook: "Attention-grabbing first line with emoji",
    body: "3-4 bullet points about the incident",
    cta: "Call-to-action to read more",
    hashtags: "#Engineering #Postmortem #TechIncident"
  }
};

export const guidelines = [
  'Start with the MOMENT of crisis - "It was 3am when..." or "The dashboard turned red..."',
  'Tell the story chronologically: Detection → Investigation → Root Cause → Fix → Lessons',
  'Include specific technical details - what systems failed, what metrics showed',
  'Add the human element - how the team responded, the pressure they faced',
  'Include actual numbers: downtime duration, users affected, revenue impact if known',
  'Explain the root cause in a way that teaches - why did this happen?',
  'Draw parallels to common patterns other engineers might face',
  'End with actionable lessons - what can readers do to prevent similar issues?',
  'Use inline citations [1], [2] to reference the original postmortem',
  'Create a diagram showing the failure point in the system',
  'NEVER use first person - write in third person or address the reader as "you"'
];

export function build(context) {
  const { company, incident } = context;
  
  return `${buildSystemContext('rcaBlog')}

Create an ENGAGING blog post about this REAL incident from ${company}.

INCIDENT DETAILS:
Company: ${company}
Title: ${incident.title || 'Unknown'}
Date: ${incident.date || 'Unknown'}
Description: ${incident.description || 'N/A'}
Impact: ${incident.impact || 'N/A'}
Root Cause: ${incident.rootCause || 'N/A'}
Key Lesson: ${incident.lesson || 'N/A'}
Source URL: ${incident.sourceUrl || 'N/A'}
Source Title: ${incident.sourceTitle || 'N/A'}
Type: ${incident.type || 'outage'}

STORYTELLING REQUIREMENTS:
${guidelines.map(g => `- ${g}`).join('\n')}

STRUCTURE:
1. THE MOMENT: Start with the crisis moment - alarms, dashboards, the first sign
2. THE INVESTIGATION: How did they figure out what was wrong?
3. THE ROOT CAUSE: What actually caused this? Explain technically but clearly
4. THE FIX: How did they resolve it? What was the immediate fix vs long-term?
5. THE LESSONS: What did they learn? What should readers learn?
6. PREVENTION: How can others avoid this?

TITLE FORMAT:
Use formats like:
- "The $X Million [Incident]: How [Company] [What Happened]"
- "When [Company]'s [System] Went Down: A [Duration] Postmortem"
- "How a [Small Thing] Took Down [Company] for [Duration]"
- "[Company]'s [Year] [Incident]: The [Root Cause] That [Impact]"

SOURCES:
- First source MUST be the original postmortem: ${incident.sourceUrl || 'company engineering blog'}
- Add 5-8 additional relevant sources (documentation, related incidents, technical references)

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, guidelines, build };
