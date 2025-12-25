/**
 * Blog Article Generation Prompt Template
 * Transforms Q&A content into engaging, story-driven blog articles
 */

import { jsonOutputRule, buildSystemContext } from './base.js';

export const schema = {
  title: "Compelling story-driven title that creates curiosity",
  introduction: "Opening hook that draws readers in with a story, problem, or provocative question (3-4 sentences)",
  sections: [
    {
      heading: "Section heading that advances the narrative",
      content: "Section content in markdown - story-driven with real scenarios, code examples, and insights"
    }
  ],
  realWorldExample: {
    company: "Famous company name (Netflix, Uber, Spotify, etc.)",
    scenario: "The story of how they faced this challenge and what happened",
    lesson: "The insight they gained that changed their approach"
  },
  diagram: "Mermaid diagram code showing architecture/flow (without ```mermaid wrapper)",
  diagramType: "Type of diagram: flowchart|sequence|state|class|er|gantt|pie|mindmap|timeline|architecture",
  diagramLabel: "Human-readable label for the diagram (e.g., 'System Flow', 'Event Sequence', 'State Transitions')",
  glossary: [
    { term: "Technical term", definition: "Simple explanation" }
  ],
  sources: [
    { title: "Source title", url: "https://example.com", type: "documentation|blog|paper|video" }
  ],
  quickReference: ["Key insight 1", "Key insight 2", "Key insight 3"],
  funFact: "Surprising story or historical context about this topic",
  conclusion: "The moral of the story and what to do next",
  metaDescription: "SEO meta description (150-160 chars)",
  socialSnippet: {
    hook: "Attention-grabbing first line with emoji (max 100 chars)",
    body: "3-4 punchy bullet points with insights/stats that create FOMO",
    cta: "Compelling call-to-action to read the full article",
    hashtags: "5-8 relevant hashtags for LinkedIn (e.g., #SoftwareEngineering #SystemDesign #TechCareers)"
  }
};

export const guidelines = [
  // STORYTELLING FOCUS
  'Write like youre telling a story to a friend over coffee, not writing documentation',
  'Start with a HOOK: a problem, a failure, a "picture this" moment, or a provocative question',
  'Example hooks: "It was 3am when the pager went off...", "Picture this: your CEO just tweeted about the new feature...", "Everyone told me this was the right approach. They were wrong."',
  'Build TENSION: what could go wrong? what are the stakes? why should they care?',
  'Use the "hero journey" structure: Problem → Struggle → Discovery → Solution → Transformation',
  'Include "plot twists" - counterintuitive insights that challenge assumptions',
  'End sections with cliffhangers or questions that pull readers forward',
  
  // VOICE & TONE
  'Write for a developer with ~3 years experience - they know the basics, show them the nuances',
  'Be conversational: use "you", "we", "I" - like youre pair programming',
  'Add personality: opinions, hot takes, things that surprised you',
  'Include "confession" moments: "I used to think X, until I learned Y"',
  'Use humor and wit naturally - dont force it, but dont be dry either',
  
  // REAL-WORLD GROUNDING
  'Every concept needs a "when would I actually use this?" answer',
  'Include a REAL company war story (Netflix, Uber, Stripe, etc.) - what broke, how they fixed it',
  'Add "battle scars" - common mistakes and how to avoid them',
  'Include specific numbers: latency, throughput, cost savings, team size',
  
  // STRUCTURE & FORMAT
  'Sections should flow like chapters in a story, not disconnected topics',
  'Use bullet lists for "heres what you need to know" moments',
  'Use tables for comparisons: "Option A vs Option B - heres the real tradeoff"',
  'Include a Mermaid diagram that tells the visual story',
  'Use callouts strategically: 💡 Insight, ⚠️ Watch Out, 🔥 Hot Take, 🎯 Key Point',
  
  // SOURCES & CREDIBILITY - CRITICAL
  'MUST include AT LEAST 12 credible sources with REAL, WORKING URLs',
  'USE ONLY these stable URL patterns that actually exist:',
  '  - Wikipedia: https://en.wikipedia.org/wiki/[Topic]',
  '  - MDN: https://developer.mozilla.org/en-US/docs/...',
  '  - GitHub repos: https://github.com/[org]/[repo]',
  '  - ArXiv papers: https://arxiv.org/abs/[paper-id]',
  '  - RFC docs: https://datatracker.ietf.org/doc/html/rfc[number]',
  '  - Python docs: https://docs.python.org/3/...',
  '  - AWS docs: https://docs.aws.amazon.com/...',
  '  - Kubernetes: https://kubernetes.io/docs/...',
  '  - DigitalOcean tutorials: https://www.digitalocean.com/community/tutorials/...',
  'DO NOT make up URLs - only use URLs you are confident exist',
  'DO NOT use company engineering blog URLs (netflix, uber, stripe blogs) - they frequently 404',
  
  // ENDING
  'Conclude with the "so what?" - what should they do differently tomorrow?',
  'Leave them with one memorable insight they can share with their team',
  
  // SOCIAL SNIPPET (for sharing)
  'Create a socialSnippet that is ready to copy-paste to LinkedIn/Twitter',
  'Hook: Start with a provocative statement or surprising stat with emoji (🔥💡🚀)',
  'Body: 3-4 bullet points that create urgency/FOMO - use numbers, percentages, bold claims',
  'CTA: End with curiosity gap - hint at what they will learn without giving it away',
  'Use line breaks for readability, keep it under 300 words total',
  'Make it feel like insider knowledge being shared',
  'Hashtags: Include 5-8 relevant LinkedIn hashtags based on the topic, channel, and tags',
  'Common hashtags to consider: #SoftwareEngineering #SystemDesign #TechCareers #CodingInterview #BackendDevelopment #Frontend #DevOps #CloudComputing #DataEngineering #MachineLearning #AI #WebDevelopment #Programming #TechTips #CareerGrowth',
  
  // DIAGRAM TYPE DETECTION
  'Analyze the mermaid diagram syntax to determine diagramType:',
  '  - "flowchart" or "graph" → flowchart',
  '  - "sequenceDiagram" → sequence',
  '  - "stateDiagram" → state',
  '  - "classDiagram" → class',
  '  - "erDiagram" → er (entity relationship)',
  '  - "gantt" → gantt',
  '  - "pie" → pie',
  '  - "mindmap" → mindmap',
  '  - "timeline" → timeline',
  '  - Default to "architecture" if unclear',
  'Set diagramLabel to a human-friendly name like "System Flow", "Event Sequence", "State Machine", "Class Hierarchy", "Data Model", "Project Timeline", etc.',
  
  // HUMAN TOUCH - Make it feel authentic
  'Add personal touches that make the content feel human-written:',
  '  - Include "confession" moments: "I used to think X until I learned Y"',
  '  - Add relatable struggles: "We have all been there - staring at a 500 error at 2am"',
  '  - Use conversational transitions: "Here is the thing though...", "But wait, it gets better"',
  '  - Include mild opinions: "Honestly, this is my favorite pattern because..."',
  '  - Add empathy: "If this feels overwhelming, you are not alone"',
  '  - Use rhetorical questions: "Sound familiar?", "Ever wondered why...?"',
  '  - Include "pro tips" from experience: "After debugging this 100 times, here is what I learned"',
  '  - Add humor where appropriate: light jokes, relatable dev memes references',
  '  - Use varied sentence lengths - mix short punchy sentences with longer explanations',
  '  - Avoid robotic phrases like "In this article we will explore" or "Let us delve into"'
];

export function build(context) {
  const { question, answer, explanation, channel, difficulty, tags } = context;

  return `${buildSystemContext('blog')}

Transform this interview Q&A into an ENGAGING, STORY-DRIVEN blog article.

Your goal: Make the reader feel like theyre on a journey of discovery, not reading a textbook.

ORIGINAL CONTENT:
Question: ${question}
Answer: ${answer || 'N/A'}
Explanation: ${explanation || 'N/A'}
Topic: ${channel}
Difficulty: ${difficulty}
Tags: ${(tags || []).join(', ')}

STORYTELLING REQUIREMENTS:
${guidelines.map(g => `- ${g}`).join('\n')}

STRUCTURE YOUR STORY:
1. HOOK: Start with a compelling scenario, problem, or question that creates tension
2. CONTEXT: Set the stage - why does this matter? what are the stakes?
3. THE JOURNEY: Walk through the concepts as discoveries, not lectures
4. THE TWIST: Include counterintuitive insights or "aha moments"
5. REAL-WORLD PROOF: Show how a real company dealt with this
6. THE PAYOFF: Concrete takeaways and next steps

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, guidelines, build };
