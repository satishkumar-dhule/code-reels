/**
 * Bot Run Tracking
 * Records bot execution history
 */

import { getDb } from './db.js';

/**
 * Start a new bot run
 */
export async function startRun(botName) {
  const db = getDb();
  
  const result = await db.execute({
    sql: `INSERT INTO bot_runs (bot_name, started_at, status) VALUES (?, ?, 'running')`,
    args: [botName, new Date().toISOString()]
  });
  
  return {
    id: result.lastInsertRowid,
    botName,
    startedAt: new Date().toISOString(),
    stats: {
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0
    }
  };
}

/**
 * Update run stats
 */
export async function updateRunStats(runId, stats) {
  const db = getDb();
  
  await db.execute({
    sql: `UPDATE bot_runs SET 
          items_processed = ?,
          items_created = ?,
          items_updated = ?,
          items_deleted = ?
          WHERE id = ?`,
    args: [
      stats.processed || 0,
      stats.created || 0,
      stats.updated || 0,
      stats.deleted || 0,
      runId
    ]
  });
}

/**
 * Complete a bot run
 */
export async function completeRun(runId, stats, summary = null) {
  const db = getDb();
  
  await db.execute({
    sql: `UPDATE bot_runs SET 
          completed_at = ?,
          status = 'completed',
          items_processed = ?,
          items_created = ?,
          items_updated = ?,
          items_deleted = ?,
          summary = ?
          WHERE id = ?`,
    args: [
      new Date().toISOString(),
      stats.processed || 0,
      stats.created || 0,
      stats.updated || 0,
      stats.deleted || 0,
      summary ? JSON.stringify(summary) : null,
      runId
    ]
  });
}

/**
 * Fail a bot run
 */
export async function failRun(runId, error) {
  const db = getDb();
  
  await db.execute({
    sql: `UPDATE bot_runs SET 
          completed_at = ?,
          status = 'failed',
          summary = ?
          WHERE id = ?`,
    args: [
      new Date().toISOString(),
      JSON.stringify({ error: error.message || error }),
      runId
    ]
  });
}

/**
 * Get recent bot runs
 */
export async function getRecentRuns(limit = 20) {
  const db = getDb();
  
  const result = await db.execute({
    sql: `SELECT * FROM bot_runs ORDER BY started_at DESC LIMIT ?`,
    args: [limit]
  });
  
  return result.rows.map(row => ({
    id: row.id,
    botName: row.bot_name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    itemsProcessed: row.items_processed,
    itemsCreated: row.items_created,
    itemsUpdated: row.items_updated,
    itemsDeleted: row.items_deleted,
    summary: row.summary ? JSON.parse(row.summary) : null
  }));
}

/**
 * Get bot run stats
 */
export async function getBotStats() {
  const db = getDb();
  
  const result = await db.execute(`
    SELECT 
      bot_name,
      COUNT(*) as total_runs,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
      SUM(items_created) as total_created,
      SUM(items_updated) as total_updated,
      SUM(items_deleted) as total_deleted,
      MAX(started_at) as last_run
    FROM bot_runs
    GROUP BY bot_name
  `);
  
  return result.rows.map(row => ({
    botName: row.bot_name,
    totalRuns: row.total_runs,
    successfulRuns: row.successful_runs,
    totalCreated: row.total_created,
    totalUpdated: row.total_updated,
    totalDeleted: row.total_deleted,
    lastRun: row.last_run
  }));
}

export default { startRun, updateRunStats, completeRun, failRun, getRecentRuns, getBotStats };
