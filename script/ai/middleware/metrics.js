/**
 * Metrics Middleware
 * Tracks AI call success rates, latency, and usage
 */

class MetricsCollector {
  constructor() {
    this.metrics = {};
    this.startTime = Date.now();
  }

  /**
   * Initialize metrics for a task type
   */
  initTask(taskType) {
    if (!this.metrics[taskType]) {
      this.metrics[taskType] = {
        success: 0,
        failed: 0,
        retries: 0,
        cacheHits: 0,
        totalLatencyMs: 0,
        minLatencyMs: Infinity,
        maxLatencyMs: 0,
        validationFailures: 0,
        lastRun: null
      };
    }
  }

  /**
   * Record a successful call
   */
  recordSuccess(taskType, latencyMs, fromCache = false) {
    this.initTask(taskType);
    const m = this.metrics[taskType];
    
    m.success++;
    m.totalLatencyMs += latencyMs;
    m.minLatencyMs = Math.min(m.minLatencyMs, latencyMs);
    m.maxLatencyMs = Math.max(m.maxLatencyMs, latencyMs);
    m.lastRun = new Date().toISOString();
    
    if (fromCache) m.cacheHits++;
  }

  /**
   * Record a failed call
   */
  recordFailure(taskType, reason = 'unknown') {
    this.initTask(taskType);
    const m = this.metrics[taskType];
    
    m.failed++;
    m.lastRun = new Date().toISOString();
    
    if (reason === 'validation') {
      m.validationFailures++;
    }
  }

  /**
   * Record a retry attempt
   */
  recordRetry(taskType) {
    this.initTask(taskType);
    this.metrics[taskType].retries++;
  }

  /**
   * Get metrics for a specific task
   */
  getTaskMetrics(taskType) {
    const m = this.metrics[taskType];
    if (!m) return null;
    
    const total = m.success + m.failed;
    const successRate = total > 0 ? (m.success / total * 100).toFixed(1) : 0;
    const avgLatency = m.success > 0 ? (m.totalLatencyMs / m.success).toFixed(0) : 0;
    
    return {
      ...m,
      total,
      successRate: `${successRate}%`,
      avgLatencyMs: parseInt(avgLatency),
      minLatencyMs: m.minLatencyMs === Infinity ? 0 : m.minLatencyMs,
      cacheHitRate: total > 0 ? `${(m.cacheHits / total * 100).toFixed(1)}%` : '0%'
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const result = {};
    for (const taskType of Object.keys(this.metrics)) {
      result[taskType] = this.getTaskMetrics(taskType);
    }
    return result;
  }

  /**
   * Get summary across all tasks
   */
  getSummary() {
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalRetries = 0;
    let totalCacheHits = 0;
    
    for (const m of Object.values(this.metrics)) {
      totalSuccess += m.success;
      totalFailed += m.failed;
      totalRetries += m.retries;
      totalCacheHits += m.cacheHits;
    }
    
    const total = totalSuccess + totalFailed;
    
    return {
      totalCalls: total,
      successRate: total > 0 ? `${(totalSuccess / total * 100).toFixed(1)}%` : '0%',
      totalRetries,
      cacheHitRate: total > 0 ? `${(totalCacheHits / total * 100).toFixed(1)}%` : '0%',
      uptimeMs: Date.now() - this.startTime,
      taskCount: Object.keys(this.metrics).length
    };
  }

  /**
   * Print metrics report
   */
  printReport() {
    console.log('\n📊 AI Metrics Report');
    console.log('═'.repeat(50));
    
    const summary = this.getSummary();
    console.log(`Total Calls: ${summary.totalCalls}`);
    console.log(`Success Rate: ${summary.successRate}`);
    console.log(`Cache Hit Rate: ${summary.cacheHitRate}`);
    console.log(`Total Retries: ${summary.totalRetries}`);
    
    console.log('\nPer-Task Breakdown:');
    for (const [taskType, metrics] of Object.entries(this.getAllMetrics())) {
      console.log(`  ${taskType}:`);
      console.log(`    Success: ${metrics.success}, Failed: ${metrics.failed}`);
      console.log(`    Avg Latency: ${metrics.avgLatencyMs}ms`);
      console.log(`    Success Rate: ${metrics.successRate}`);
    }
    
    console.log('═'.repeat(50));
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {};
    this.startTime = Date.now();
  }
}

// Global metrics instance
const globalMetrics = new MetricsCollector();

export { MetricsCollector, globalMetrics };
export default globalMetrics;
