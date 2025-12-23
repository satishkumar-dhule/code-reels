/**
 * Central AI Configuration
 * All GenAI settings in one place for consistency across bots
 */

export default {
  // Default provider and model
  defaultProvider: 'opencode',
  defaultModel: process.env.OPENCODE_MODEL || 'opencode/big-pickle',
  
  // Retry settings
  retry: {
    maxAttempts: 3,
    delayMs: 10000,
    backoffMultiplier: 1.5
  },
  
  // Circuit breaker settings
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 300000 // 5 minutes
  },
  
  // Cache settings
  cache: {
    enabled: true,
    ttlMs: 86400000, // 24 hours
    maxSize: 1000
  },
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: 30,
    delayBetweenRequestsMs: 2000
  },
  
  // Global prompt rules - applied to ALL prompts
  globalRules: [
    'You are a JSON generator. Output ONLY valid JSON.',
    'No markdown code blocks, no explanations, no text before or after.',
    'Follow the exact JSON structure specified.',
    'Be concise and accurate.'
  ],
  
  // Quality thresholds for validation
  qualityThresholds: {
    eli5: { minLength: 50, maxLength: 500 },
    tldr: { minLength: 20, maxLength: 150 },
    diagram: { minLength: 50, minNodes: 4 },
    explanation: { minLength: 100 },
    answer: { minLength: 150, maxLength: 500 }
  },
  
  // Centralized guidelines for each task type
  guidelines: {
    tldr: [
      'Start with a verb or key concept',
      'Be direct and actionable',
      'Focus on the "what" not the "why"',
      'No filler words like "basically", "essentially", "simply"',
      'Capture the single most important takeaway',
      'If the concept is complex, focus on ONE key point only'
    ],
    eli5: [
      'Use simple everyday analogies',
      'Avoid technical jargon completely',
      'Explain like talking to a curious 5-year-old',
      'Use concrete examples over abstract concepts',
      'Keep sentences short and simple'
    ],
    diagram: [
      'Use clear, descriptive node labels',
      'Show relationships with labeled edges',
      'Keep diagrams focused on key concepts',
      'Use appropriate diagram type (flowchart, sequence, etc.)',
      'Each node must have a descriptive label related to the actual content',
      'Show the actual technical flow, architecture, or process'
    ],
    answer: [
      'Be technically accurate and precise',
      'Include practical examples when helpful',
      'Cover the key points interviewers expect',
      'Structure for easy scanning',
      'Balance depth with conciseness',
      'Demonstrate technical depth with specific technologies, patterns, or trade-offs'
    ],
    explanation: [
      'Provide deeper context beyond the answer',
      'Explain the "why" behind concepts',
      'Include edge cases and gotchas',
      'Reference real-world applications',
      'Build on the answer without repeating it',
      'Add code examples where relevant'
    ],
    classify: [
      'Return the PRIMARY channel first (most relevant)',
      'Include SECONDARY channels only if genuinely relevant',
      'Maximum 3 channels per question',
      'Only add secondary channels if confidence > medium',
      'Use exact channel and subchannel IDs from the provided structure'
    ],
    codingChallenge: [
      'Generate problems solvable in 10-20 minutes',
      'Test case inputs/outputs MUST be valid JSON',
      'Function names: camelCase for JS, snake_case for Python',
      'Include 3-4 test cases covering normal AND edge cases',
      'Solutions must be CORRECT and produce exact expected outputs',
      'Starter code has function signature only with "// Your code here"'
    ],
    company: [
      'Return 4-6 real tech companies known to ask this type of question',
      'Prioritize FAANG and top-tier tech companies',
      'Consider the question topic when selecting companies',
      'Include a mix of company sizes (big tech + unicorns)',
      'Only include companies that actually conduct technical interviews'
    ],
    relevance: [
      'Score each criterion from 1-10 based on the scale provided',
      'Provide specific improvement suggestions if score is below 80',
      'Recommendation should be: keep (80+), improve (40-79), retire (<40)',
      'Be specific about what topics are missing or need improvement'
    ],
    generate: [
      'Question must be SPECIFIC and PRACTICAL - something actually asked in interviews',
      'Include a realistic scenario or context when appropriate',
      'Do NOT give high-level definitions - give answers that show expertise',
      'CRITICAL: Use proper markdown formatting - all ** bold markers must be properly paired',
      'Each section header must be on its own line with ## prefix',
      'Bullet points must start with - on a new line, not inline'
    ]
  },
  
  // Logging
  logging: {
    logPrompts: process.env.LOG_PROMPTS === 'true',
    logResponses: process.env.LOG_RESPONSES === 'true',
    logMetrics: true
  }
};
