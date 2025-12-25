/**
 * Blog from Input Prompt Template
 * Generates blog posts from a topic/question input
 */

import { jsonOutputRule } from './base.js';

export const schema = {
  title: "Engaging SEO-friendly title (50-60 chars)",
  introduction: "Hook the reader with why this matters - use storytelling, start with a problem or scenario (2-3 paragraphs)",
  sections: [
    {
      heading: "Section heading that advances the narrative",
      content: "Detailed content with code examples if relevant, use markdown formatting"
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
  socialSnippet: {
    hook: "Attention-grabbing first line with emoji (max 100 chars)",
    body: "3-4 punchy bullet points with insights",
    cta: "Compelling call-to-action",
    hashtags: "#SoftwareEngineering #TechCareers"
  }
};

export const guidelines = [
  'Write like you are telling a story to a friend, not documentation',
  'Start with a HOOK: a problem, failure, or "picture this" moment',
  'Include practical code examples where relevant',
  'Add real-world context from actual companies',
  'Make it engaging and not boring',
  'Include at least 3-4 sections',
  'Use markdown in content (headers, code blocks, lists)'
];

export function build(context) {
  const { topic, channel, difficulty } = context;

  return `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Create an engaging, comprehensive technical blog post about the following topic.

Topic/Question: "${topic}"
Target Channel: ${channel || 'general tech'}
Difficulty Level: ${difficulty || 'intermediate'}

Generate a blog post with this exact JSON structure:
${JSON.stringify(schema, null, 2)}

REQUIREMENTS:
${guidelines.map(g => `- ${g}`).join('\n')}

${jsonOutputRule}`;
}

export default { schema, guidelines, build };
