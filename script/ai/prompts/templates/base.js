/**
 * Base prompt template components
 * Shared across all prompts for consistency
 */

export const jsonOutputRule = `IMPORTANT: Return ONLY the JSON object. No other text, no markdown, no explanations.`;

export const qualityRules = {
  technical: `
- Be technically accurate and precise
- Use industry-standard terminology
- Include specific examples where helpful`,
  
  beginner: `
- Use simple, everyday language
- Avoid technical jargon
- Use relatable analogies`,
  
  concise: `
- Be direct and to the point
- No filler words or phrases
- Focus on the key insight`
};

/**
 * Build the system context for a prompt
 */
export function buildSystemContext(taskType) {
  const contexts = {
    eli5: 'You are an expert at explaining complex technical concepts in simple terms that anyone can understand.',
    tldr: 'You are an expert at distilling complex information into concise, actionable one-liners.',
    diagram: 'You are an expert at creating clear, meaningful technical diagrams using Mermaid syntax.',
    company: 'You are an expert recruiter who knows which companies ask specific interview questions.',
    classify: 'You are an expert at categorizing technical interview questions into appropriate channels.',
    improve: 'You are a senior technical interviewer who creates high-quality interview content.',
    generate: 'You are a senior technical interviewer at a top tech company creating realistic interview questions.',
    relevance: 'You are an expert at evaluating interview question quality and relevance.',
    blog: 'You are a senior tech writer who creates engaging, story-driven technical blog posts that developers love to read.',
    'real-world-case': 'You are a tech industry analyst with deep knowledge of how major companies solve technical challenges. You know the famous incidents, scaling stories, and engineering decisions at companies like Netflix, Uber, Stripe, and others.'
  };
  
  return contexts[taskType] || 'You are a helpful AI assistant.';
}

/**
 * Build JSON output format instruction
 */
export function buildOutputFormat(schema) {
  return `Output this exact JSON structure:\n${JSON.stringify(schema, null, 2)}`;
}

/**
 * Build examples section for few-shot prompting
 */
export function buildExamplesSection(examples) {
  if (!examples || examples.length === 0) return '';
  
  let section = '\n\nEXAMPLES:\n';
  examples.forEach((ex, i) => {
    section += `\nExample ${i + 1}:\nInput: ${JSON.stringify(ex.input)}\nOutput: ${JSON.stringify(ex.output)}\n`;
  });
  return section;
}
