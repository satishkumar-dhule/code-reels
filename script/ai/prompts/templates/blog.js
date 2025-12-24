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
  glossary: [
    { term: "Technical term", definition: "Simple explanation" }
  ],
  sources: [
    { title: "Source title", url: "https://example.com", type: "documentation|blog|paper|video" }
  ],
  quickReference: ["Key insight 1", "Key insight 2", "Key insight 3"],
  funFact: "Surprising story or historical context about this topic",
  conclusion: "The moral of the story and what to do next",
  metaDescription: "SEO meta description (150-160 chars)"
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
  
  // SOURCES & CREDIBILITY
  'Include 2-4 credible sources (engineering blogs, official docs, papers)',
  'Reference specific incidents or case studies when possible',
  
  // ENDING
  'Conclude with the "so what?" - what should they do differently tomorrow?',
  'Leave them with one memorable insight they can share with their team'
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
