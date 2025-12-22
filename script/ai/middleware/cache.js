/**
 * Cache Middleware
 * Caches AI responses to reduce API calls and costs
 */

import crypto from 'crypto';
import config from '../config.js';

class ResponseCache {
  constructor(options = {}) {
    this.enabled = options.enabled ?? config.cache.enabled;
    this.ttlMs = options.ttlMs || config.cache.ttlMs;
    this.maxSize = options.maxSize || config.cache.maxSize;
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Generate cache key from prompt and options
   */
  generateKey(taskType, context, options = {}) {
    const data = JSON.stringify({ taskType, context, model: options.model });
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Get cached response
   */
  get(key) {
    if (!this.enabled) return null;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    console.log(`📦 Cache HIT (${key.substring(0, 8)}...)`);
    return entry.value;
  }

  /**
   * Set cached response
   */
  set(key, value) {
    if (!this.enabled) return;
    
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      createdAt: Date.now()
    });
  }

  /**
   * Clear all cached entries
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Global cache instance
const globalCache = new ResponseCache();

export { ResponseCache, globalCache };
export default globalCache;
