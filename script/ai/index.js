/**
 * AI Framework - Main Entry Point
 * Unified interface for all GenAI operations
 * 
 * Usage:
 *   import ai from './ai/index.js';
 *   const result = await ai.run('eli5', { question, answer });
 */

import config from './config.js';
import circuitBreaker from './middleware/circuit-breaker.js';
import { withRetry } from './middleware/retry.js';
import cache from './middleware/cache.js';
import { validate } from './middleware/validator.js';
import metrics from './middleware/metrics.js';
import opencode from './providers/opencode.js';

// Import prompt templates
import eli5Template from './prompts/templates/eli5.js';
import tldrTemplate from './prompts/templates/tldr.js';
import diagramTemplate from './prompts/templates/diagram.js';
import companyTemplate from './prompts/templates/company.js';
import classifyTemplate from './prompts/templates/classify.js';
import improveTemplate from './prompts/templates/improve.js';
import generateTemplate from './prompts/templates/generate.js';
import relevanceTemplate from './prompts/templates/relevance.js';
import codingChallengeTemplate from './prompts/templates/coding-challenge.js';
import blogTemplate from './prompts/templates/blog.js';
import intakeTemplate from './prompts/templates/intake.js';
import videoTemplate from './prompts/templates/video.js';
import testTemplate from './prompts/templates/test.js';
import blogInputTemplate from './prompts/templates/blog-input.js';
import realWorldCaseTemplate from './prompts/templates/real-world-case.js';

// Template registry
const templates = {
  eli5: eli5Template,
  tldr: tldrTemplate,
  diagram: diagramTemplate,
  company: companyTemplate,
  classify: classifyTemplate,
  improve: improveTemplate,
  generate: generateTemplate,
  relevance: relevanceTemplate,
  'coding-challenge': codingChallengeTemplate,
  blog: blogTemplate,
  intake: intakeTemplate,
  video: videoTemplate,
  test: testTemplate,
  'blog-input': blogInputTemplate,
  'realWorldCase': realWorldCaseTemplate
};

// Provider registry
const providers = {
  opencode
};

/**
 * Main AI runner
 * @param {string} taskType - Type of task (eli5, tldr, diagram, etc.)
 * @param {object} context - Context data for the prompt
 * @param {object} options - Optional settings
 * @returns {Promise<object>} - Parsed AI response
 */
async function run(taskType, context, options = {}) {
  const startTime = Date.now();
  const template = templates[taskType];
  
  if (!template) {
    throw new Error(`Unknown task type: ${taskType}. Available: ${Object.keys(templates).join(', ')}`);
  }
  
  // Build the prompt
  const prompt = template.build(context);
  
  // Check cache first
  if (options.cache !== false) {
    const cacheKey = cache.generateKey(taskType, context, options);
    const cached = cache.get(cacheKey);
    if (cached) {
      metrics.recordSuccess(taskType, Date.now() - startTime, true);
      return cached;
    }
  }
  
  // Check circuit breaker
  if (circuitBreaker.isOpen()) {
    metrics.recordFailure(taskType, 'circuit_breaker');
    throw new Error('Circuit breaker is open - AI service unavailable');
  }
  
  // Log prompt if enabled
  if (config.logging.logPrompts) {
    console.log('\n📝 PROMPT:');
    console.log('─'.repeat(50));
    console.log(prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''));
    console.log('─'.repeat(50));
  }
  
  // Execute with retries
  const provider = providers[options.provider || config.defaultProvider];
  let response;
  
  try {
    response = await withRetry(
      async (attempt) => {
        if (attempt > 1) metrics.recordRetry(taskType);
        
        const rawResponse = await provider.call(prompt, options);
        const parsed = provider.parseResponse(rawResponse);
        
        if (!parsed) {
          throw new Error('Failed to parse AI response');
        }
        
        return parsed;
      },
      {
        maxAttempts: options.retries || config.retry.maxAttempts,
        delayMs: config.retry.delayMs,
        backoffMultiplier: config.retry.backoffMultiplier
      }
    );
    
    circuitBreaker.recordSuccess();
  } catch (error) {
    circuitBreaker.recordFailure();
    metrics.recordFailure(taskType, 'provider');
    throw error;
  }
  
  // Log response if enabled
  if (config.logging.logResponses) {
    console.log('\n📥 RESPONSE:');
    console.log(JSON.stringify(response, null, 2).substring(0, 500));
  }
  
  // Validate response
  if (options.validate !== false) {
    const validation = validate(taskType, response, template.schema);
    
    if (!validation.valid) {
      console.log(`⚠️ Validation issues for ${taskType}:`);
      validation.schemaErrors?.forEach(e => console.log(`  Schema: ${e}`));
      validation.qualityWarnings?.forEach(w => console.log(`  Quality: ${w}`));
      
      // Don't fail on quality warnings, only schema errors
      if (validation.schemaErrors?.length > 0) {
        metrics.recordFailure(taskType, 'validation');
        throw new Error(`Validation failed: ${validation.schemaErrors.join(', ')}`);
      }
    }
  }
  
  // Cache successful response
  if (options.cache !== false) {
    const cacheKey = cache.generateKey(taskType, context, options);
    cache.set(cacheKey, response);
  }
  
  // Record metrics
  const latency = Date.now() - startTime;
  metrics.recordSuccess(taskType, latency);
  
  return response;
}

/**
 * Get available task types
 */
function getTaskTypes() {
  return Object.keys(templates);
}

/**
 * Get template for a task type
 */
function getTemplate(taskType) {
  return templates[taskType];
}

/**
 * Get current metrics
 */
function getMetrics() {
  return metrics.getAllMetrics();
}

/**
 * Print metrics report
 */
function printMetrics() {
  metrics.printReport();
}

/**
 * Get cache stats
 */
function getCacheStats() {
  return cache.getStats();
}

/**
 * Get circuit breaker state
 */
function getCircuitBreakerState() {
  return circuitBreaker.getState();
}

/**
 * Reset circuit breaker
 */
function resetCircuitBreaker() {
  circuitBreaker.reset();
}

/**
 * Clear cache
 */
function clearCache() {
  cache.clear();
}

// Export main interface
export default {
  run,
  getTaskTypes,
  getTemplate,
  getMetrics,
  printMetrics,
  getCacheStats,
  getCircuitBreakerState,
  resetCircuitBreaker,
  clearCache,
  config
};

// Named exports for convenience
export {
  run,
  getTaskTypes,
  getTemplate,
  getMetrics,
  printMetrics,
  getCacheStats,
  getCircuitBreakerState,
  resetCircuitBreaker,
  clearCache,
  config,
  templates,
  providers
};
