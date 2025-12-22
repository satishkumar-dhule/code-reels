/**
 * Retry Middleware
 * Handles retries with exponential backoff
 */

import config from '../config.js';

/**
 * Execute a function with retries
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result of the function
 */
export async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts || config.retry.maxAttempts;
  const delayMs = options.delayMs || config.retry.delayMs;
  const backoffMultiplier = options.backoffMultiplier || config.retry.backoffMultiplier;
  const onRetry = options.onRetry || (() => {});
  
  let lastError;
  let currentDelay = delayMs;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(attempt);
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        console.log(`[Attempt ${attempt}/${maxAttempts}] Failed: ${error.message}`);
        console.log(`Waiting ${currentDelay / 1000}s before retry...`);
        
        onRetry(attempt, error, currentDelay);
        
        await sleep(currentDelay);
        currentDelay = Math.floor(currentDelay * backoffMultiplier);
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retryable version of a function
 */
export function makeRetryable(fn, options = {}) {
  return (...args) => withRetry(() => fn(...args), options);
}

export default { withRetry, makeRetryable };
