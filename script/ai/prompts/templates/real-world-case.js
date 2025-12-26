/**
 * Real-World Case Discovery Prompt Template
 * Finds compelling real-world use cases for technical topics
 */

import { jsonOutputRule, buildSystemContext } from './base.js';

export const schema = {
  company: "Famous tech company name (Netflix, Uber, Stripe, Airbnb, etc.) or null if no good case",
  scenario: "The specific situation or challenge they faced (2-3 sentences)",
  challenge: "What technical problem they needed to solve",
  solution: "How they applied this concept/technology to solve it",
  outcome: "Measurable results (latency reduced by X%, handled Y million requests, etc.)",
  lesson: "The key insight or lesson learned",
  sourceUrl: "URL to the original source (blog post, article, talk) where this case was documented - REQUIRED if company is not null",
  sourceTitle: "Title of the source article/blog/talk",
  interestScore: "1-10 score for how interesting/compelling this case is",
  reason: "Why this score - what makes it interesting or not"
};

export const guidelines = [
  // CASE QUALITY
  'Find cases from REAL, well-known companies - not hypothetical scenarios',
  'Prioritize cases with SPECIFIC, MEASURABLE outcomes (numbers, percentages, scale)',
  'Look for cases that had REAL STAKES - production incidents, scaling challenges, cost issues',
  'The best cases have a "plot twist" - something unexpected or counterintuitive',
  
  // SOURCE REQUIREMENT - CRITICAL
  'You MUST provide a sourceUrl for every case - this is required for citation',
  'Use stable URLs from: Wikipedia, engineering blogs, conference talks, news articles',
  'Preferred sources: Wikipedia articles, GitHub repos, official docs, well-known tech news',
  'The sourceUrl must be a real, verifiable link to where this story is documented',
  
  // SCORING CRITERIA
  'Score 9-10: Famous incident/case study, specific numbers, surprising outcome, widely discussed',
  'Score 7-8: Real company case, good details, clear lesson, moderately well-known',
  'Score 5-6: Generic application, lacks specific details, common knowledge',
  'Score 1-4: Hypothetical, no real company, or topic too abstract for real-world case',
  
  // WHAT MAKES A CASE INTERESTING
  'Production incidents that taught hard lessons (Knight Capital, AWS outages, etc.)',
  'Scaling stories with before/after metrics',
  'Cost optimization wins with dollar amounts',
  'Performance improvements with latency/throughput numbers',
  'Architecture decisions that enabled growth',
  
  // WHEN TO RETURN NULL
  'Return null for company if the topic is too theoretical/academic',
  'Return null if you can only think of generic/hypothetical examples',
  'Return null if the "case" would just be "Company X uses technology Y"',
  'Be honest - a low score with null company is better than a made-up case',
  
  // COMPANIES TO CONSIDER
  'FAANG: Netflix, Google, Amazon, Meta, Apple',
  'Fintech: Stripe, Square, Robinhood, Coinbase',
  'Ride-sharing: Uber, Lyft, DoorDash',
  'Travel: Airbnb, Booking.com, Expedia',
  'Social: Twitter/X, LinkedIn, Discord, Slack',
  'E-commerce: Shopify, Etsy, eBay',
  'Gaming: Epic Games, Riot, Roblox',
  'Streaming: Spotify, Twitch, Disney+',
  'Infrastructure: Cloudflare, Datadog, PagerDuty'
];

export function build(context) {
  const { question, answer, explanation, channel, tags, companies, excludeCompanies } = context;

  const excludeSection = excludeCompanies?.length > 0 
    ? `\nDO NOT USE THESE COMPANIES (their sources were invalid): ${excludeCompanies.join(', ')}\nFind a DIFFERENT company with a valid, working source URL.\n`
    : '';

  return `${buildSystemContext('real-world-case')}

Find a COMPELLING real-world case study for this technical topic.

Your goal: Find a case that would make developers say "Oh wow, I didn't know that!" or "That's exactly the problem I'm facing!"
${excludeSection}
TOPIC DETAILS:
Question: ${question}
Answer: ${answer || 'N/A'}
Explanation: ${explanation || 'N/A'}
Channel: ${channel}
Tags: ${(tags || []).join(', ')}
${companies?.length > 0 ? `Companies mentioned: ${companies.join(', ')}` : ''}

DISCOVERY GUIDELINES:
${guidelines.map(g => `- ${g}`).join('\n')}

IMPORTANT:
- Only return a case if it's GENUINELY interesting and REAL
- If you can't find a compelling case, return null for company and explain why
- The interestScore should honestly reflect how engaging this case would be
- A score below 6 means we should skip this topic for blog generation

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, guidelines, build };
