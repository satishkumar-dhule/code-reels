/**
 * Audit Ledger for Bot Actions
 * Records all bot actions for transparency and debugging
 */

import { getDb } from './db.js';

/**
 * Log an action to the ledger
 */
export async function logAction({
  botName,
  action,
  itemType,
  itemId,
  beforeState = null,
  afterState = null,
  reason = null
}) {
  const db = getDb();
  
  await db.execute({
    sql: `INSERT INTO bot_ledger (bot_name, action, item_type, item_id, before_state, after_state, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      botName,
      action,
      itemType,
      itemId,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      reason,
      new Date().toISOString()
    ]
  });
}

/**
 * Get recent ledger entries
 */
export async function getLedgerEntries({ botName = null, itemType = null, limit = 100 } = {}) {
  const db = getDb();
  
  let sql = 'SELECT * FROM bot_ledger WHERE 1=1';
  const args = [];
  
  if (botName) {
    sql += ' AND bot_name = ?';
    args.push(botName);
  }
  
  if (itemType) {
    sql += ' AND item_type = ?';
    args.push(itemType);
  }
  
  sql += ' ORDER BY created_at DESC LIMIT ?';
  args.push(limit);
  
  const result = await db.execute({ sql, args });
  return result.rows.map(row => ({
    id: row.id,
    botName: row.bot_name,
    action: row.action,
    itemType: row.item_type,
    itemId: row.item_id,
    beforeState: row.before_state ? JSON.parse(row.before_state) : null,
    afterState: row.after_state ? JSON.parse(row.after_state) : null,
    reason: row.reason,
    createdAt: row.created_at
  }));
}

/**
 * Get ledger stats
 */
export async function getLedgerStats() {
  const db = getDb();
  
  const result = await db.execute(`
    SELECT 
      bot_name,
      action,
      COUNT(*) as count
    FROM bot_ledger
    WHERE created_at > datetime('now', '-7 days')
    GROUP BY bot_name, action
    ORDER BY bot_name, count DESC
  `);
  
  const stats = {};
  for (const row of result.rows) {
    if (!stats[row.bot_name]) {
      stats[row.bot_name] = {};
    }
    stats[row.bot_name][row.action] = row.count;
  }
  
  return stats;
}

export default { logAction, getLedgerEntries, getLedgerStats };
