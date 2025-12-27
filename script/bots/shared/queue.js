/**
 * Work Queue Management
 * Coordinates work between bots
 */

import { getDb } from './db.js';

/**
 * Add item to work queue
 */
export async function addToQueue({
  itemType,
  itemId,
  action,
  priority = 5,
  reason = null,
  createdBy = null,
  assignedTo = null
}) {
  const db = getDb();
  
  // Check if similar work item already exists
  const existing = await db.execute({
    sql: `SELECT id FROM work_queue 
          WHERE item_type = ? AND item_id = ? AND action = ? AND status = 'pending'`,
    args: [itemType, itemId, action]
  });
  
  if (existing.rows.length > 0) {
    return { id: existing.rows[0].id, isNew: false };
  }
  
  const result = await db.execute({
    sql: `INSERT INTO work_queue (item_type, item_id, action, priority, reason, created_by, assigned_to, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [itemType, itemId, action, priority, reason, createdBy, assignedTo, new Date().toISOString()]
  });
  
  return { id: result.lastInsertRowid, isNew: true };
}

/**
 * Get next work item for a bot
 */
export async function getNextWorkItem(assignedTo = null) {
  const db = getDb();
  
  let sql = `SELECT * FROM work_queue WHERE status = 'pending'`;
  const args = [];
  
  if (assignedTo) {
    sql += ` AND (assigned_to = ? OR assigned_to IS NULL)`;
    args.push(assignedTo);
  }
  
  sql += ` ORDER BY priority ASC, created_at ASC LIMIT 1`;
  
  const result = await db.execute({ sql, args });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  
  // Mark as processing
  await db.execute({
    sql: `UPDATE work_queue SET status = 'processing' WHERE id = ?`,
    args: [row.id]
  });
  
  return {
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    action: row.action,
    priority: row.priority,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

/**
 * Complete a work item
 */
export async function completeWorkItem(id, result = null) {
  const db = getDb();
  
  await db.execute({
    sql: `UPDATE work_queue SET status = 'completed', processed_at = ?, result = ? WHERE id = ?`,
    args: [new Date().toISOString(), result ? JSON.stringify(result) : null, id]
  });
}

/**
 * Fail a work item
 */
export async function failWorkItem(id, error) {
  const db = getDb();
  
  await db.execute({
    sql: `UPDATE work_queue SET status = 'failed', processed_at = ?, result = ? WHERE id = ?`,
    args: [new Date().toISOString(), JSON.stringify({ error: error.message || error }), id]
  });
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const db = getDb();
  
  const result = await db.execute(`
    SELECT 
      status,
      action,
      item_type,
      COUNT(*) as count
    FROM work_queue
    GROUP BY status, action, item_type
  `);
  
  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    byAction: {},
    byType: {}
  };
  
  for (const row of result.rows) {
    stats[row.status] = (stats[row.status] || 0) + row.count;
    stats.byAction[row.action] = (stats.byAction[row.action] || 0) + row.count;
    stats.byType[row.item_type] = (stats.byType[row.item_type] || 0) + row.count;
  }
  
  return stats;
}

/**
 * Get pending work items
 */
export async function getPendingItems(limit = 50) {
  const db = getDb();
  
  const result = await db.execute({
    sql: `SELECT * FROM work_queue WHERE status = 'pending' ORDER BY priority ASC, created_at ASC LIMIT ?`,
    args: [limit]
  });
  
  return result.rows.map(row => ({
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    action: row.action,
    priority: row.priority,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at
  }));
}

export default { addToQueue, getNextWorkItem, completeWorkItem, failWorkItem, getQueueStats, getPendingItems };
