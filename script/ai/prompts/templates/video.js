/**
 * Video Bot Prompt Templates
 * Multi-step video finding: keyword extraction + video search
 */

import { jsonOutputRule } from './base.js';

// Step 1: Keyword extraction schema
export const keywordSchema = {
  keywords: ["keyword1", "keyword2", "keyword3"],
  searchQuery: "best youtube search query for tutorials"
};

// Step 2: Video search schema
export const videoSchema = {
  shortVideo: { id: "xxxxxxxxxxx", title: "Short explanation title", channel: "Channel Name" },
  longVideo: { id: "xxxxxxxxxxx", title: "Deep dive title", channel: "Channel Name" },
  confidence: "high|medium|low"
};

export const TRUSTED_CHANNELS = [
  'Fireship', 'Traversy Media', 'The Net Ninja', 'Web Dev Simplified',
  'TechWorld with Nana', 'freeCodeCamp', 'Academind', 'Hussein Nasser',
  'ByteByteGo', 'System Design Interview', 'Gaurav Sen',
  'Corey Schafer', 'Sentdex', 'Tech With Tim',
  'Java Brains', 'Amigoscode',
  'Ben Awad', 'Theo', 'ThePrimeagen'
];

export function buildKeywordPrompt(context) {
  const { question, channel, subChannel, tags } = context;

  return `You are a keyword extractor. Output ONLY valid JSON, no explanations.

Extract 3-5 search keywords from this technical interview question that would help find relevant YouTube tutorial videos.

Question: "${question}"
Topic: ${channel}/${subChannel || 'general'}
Tags: ${(tags || []).join(', ')}

Focus on:
- Core technical concepts
- Technology names
- Programming patterns
- Specific terms interviewers care about

Output this exact JSON structure:
${JSON.stringify(keywordSchema, null, 2)}

${jsonOutputRule}`;
}

export function buildVideoSearchPrompt(context) {
  const { question, channel, subChannel, keywords, searchQuery } = context;

  return `You are a YouTube video finder. Output ONLY valid JSON, no explanations.

Find real, educational YouTube videos for this technical topic.

Topic: ${channel} - ${subChannel || 'general'}
Keywords: ${keywords.join(', ')}
Search Query: ${searchQuery}
Question Context: ${question.substring(0, 100)}

CRITICAL RULES:
1. ONLY suggest videos from well-known tech educators:
   ${TRUSTED_CHANNELS.map((c, i) => i % 3 === 0 ? `\n   - ${c}` : `, ${c}`).join('')}
   
2. Video IDs must be EXACTLY 11 characters (letters, numbers, - and _)
3. DO NOT make up video IDs - only suggest if you're confident it exists
4. If unsure, return null for that video type

Output this exact JSON structure:
${JSON.stringify(videoSchema, null, 2)}

If you cannot find a reliable video, use null:
{"shortVideo":null,"longVideo":null,"confidence":"low"}

${jsonOutputRule}`;
}

export default { 
  keywordSchema, 
  videoSchema, 
  TRUSTED_CHANNELS,
  buildKeywordPrompt, 
  buildVideoSearchPrompt 
};
