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
  
  // Logging
  logging: {
    logPrompts: process.env.LOG_PROMPTS === 'true',
    logResponses: process.env.LOG_RESPONSES === 'true',
    logMetrics: true
  }
};
