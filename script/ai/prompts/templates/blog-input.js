/**
 * Blog from Input Prompt Template
 * Generates blog posts from a topic/question input
 * Auto-detects channel and difficulty from the topic
 */

import { jsonOutputRule } from './base.js';

export const schema = {
  channel: "auto-detected channel (system-design|algorithms|frontend|backend|database|devops|kubernetes|aws|security|machine-learning|generative-ai|sre|testing|behavioral|general)",
  difficulty: "auto-detected difficulty (beginner|intermediate|advanced)",
  title: "Engaging SEO-friendly title (50-60 chars)",
  introduction: "Hook the reader with why this matters - use storytelling, start with a problem or scenario (2-3 paragraphs)",
  sections: [
    {
      heading: "Section heading that advances the narrative",
      content: "Detailed content with code examples if relevant, use markdown formatting. Include inline citations like [1], [2] referencing sources array"
    }
  ],
  conclusion: "Key takeaways and call to action",
  metaDescription: "SEO meta description (150-160 chars)",
  quickReference: ["Key point 1", "Key point 2", "Key point 3"],
  glossary: [
    { term: "Technical term", definition: "Simple explanation" }
  ],
  realWorldExample: {
    company: "Famous company name (Netflix, Uber, Spotify, etc.)",
    scenario: "How they faced this challenge",
    lesson: "What we can learn"
  },
  funFact: "Interesting fact about this topic",
  tags: ["tag1", "tag2", "tag3"],
  diagram: "mermaid diagram code showing architecture/flow (without mermaid wrapper)",
  diagramType: "flowchart|sequence|state|class|er",
  diagramLabel: "Diagram title",
  sources: [
    { title: "Source title", url: "https://example.com", type: "documentation" }
  ],
  images: [
    { 
      url: "https://images.unsplash.com/photo-xxx or other free image URL",
      alt: "Descriptive alt text for accessibility",
      caption: "Optional caption explaining the image",
      placement: "after-intro|after-section-1|after-section-2|before-conclusion"
    }
  ],
  socialSnippet: {
    hook: "Attention-grabbing first line with emoji (max 100 chars)",
    body: "3-4 punchy bullet points with insights",
    cta: "Compelling call-to-action",
    hashtags: "#SoftwareEngineering #TechCareers"
  }
};

export const CHANNELS = [
  'system-design', 'algorithms', 'frontend', 'backend', 'database',
  'devops', 'kubernetes', 'aws', 'security', 'machine-learning',
  'generative-ai', 'sre', 'testing', 'behavioral', 'general'
];

export const guidelines = [
  'Write like you are telling a story to a friend, not documentation',
  'Start with a HOOK: a problem, failure, or "picture this" moment',
  'Include practical code examples where relevant',
  'Add real-world context from actual companies',
  'Make it engaging and not boring',
  'Include at least 3-4 sections',
  'Use markdown in content (headers, code blocks, lists)',
  'Auto-detect the most appropriate channel based on the topic',
  'Auto-detect difficulty: beginner (basics), intermediate (practical), advanced (deep dive)',
  'ADD INLINE CITATIONS throughout using [1], [2], [3] format referencing sources array',
  'Include at least 8-12 credible sources with real URLs (Wikipedia, MDN, GitHub, official docs)',
  'Include 2-3 relevant images from Unsplash or Pexels with proper placement'
];

export function build(context) {
  const { topic } = context;

  return `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Create an engaging, comprehensive technical blog post about the following topic.
AUTOMATICALLY determine the best channel and difficulty level based on the topic content.

Topic/Question: "${topic}"

Available channels: ${CHANNELS.join(', ')}

Difficulty levels:
- beginner: Basic concepts, introductions, getting started
- intermediate: Practical implementations, common patterns, real-world usage
- advanced: Deep dives, optimization, edge cases, expert-level content

Generate a blog post with this exact JSON structure:
${JSON.stringify(schema, null, 2)}

REQUIREMENTS:
${guidelines.map(g => `- ${g}`).join('\n')}

CHANNEL DETECTION HINTS:
- System design topics (scalability, architecture, distributed) → system-design
- Data structures, sorting, algorithms → algorithms
- React, CSS, JavaScript, UI → frontend
- APIs, microservices, servers → backend
- SQL, NoSQL, databases → database
- CI/CD, Docker, automation → devops
- K8s, pods, containers → kubernetes
- AWS services, cloud → aws
- Security, auth, encryption → security
- ML, AI models, training → machine-learning
- LLMs, prompts, RAG → generative-ai
- Monitoring, reliability → sre
- Testing strategies → testing
- Interview soft skills → behavioral
- General tech topics → general

${jsonOutputRule}`;
}

export default { schema, CHANNELS, guidelines, build };
