/**
 * Circuit Breaker Middleware
 * Prevents cascade failures when AI provider is down
 */

import config from '../config.js';

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || config.circuitBreaker.failureThreshold;
    this.resetTimeoutMs = options.resetTimeoutMs || config.circuitBreaker.resetTimeoutMs;
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  isOpen() {
    if (this.state === 'CLOSED') return false;
    
    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (Date.now() - this.openedAt > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log('🟡 Circuit breaker HALF_OPEN - allowing test request');
        return false;
      }
      return true;
    }
    
    return false; // HALF_OPEN allows requests
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.openedAt = null;
      console.log('🟢 Circuit breaker CLOSED - service recovered');
    }
  }

  recordFailure() {
    this.consecutiveFailures++;
    
    if (this.state === 'HALF_OPEN') {
      // Failed during test, go back to OPEN
      this.state = 'OPEN';
      this.openedAt = Date.now();
      console.log('🔴 Circuit breaker OPEN - test request failed');
      return;
    }
    
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      console.log(`🔴 Circuit breaker OPEN after ${this.consecutiveFailures} failures`);
    }
  }

  reset() {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.state = 'CLOSED';
  }

  getState() {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt
    };
  }
}

// Global circuit breaker instance
const globalCircuitBreaker = new CircuitBreaker();

export { CircuitBreaker, globalCircuitBreaker };
export default globalCircuitBreaker;
