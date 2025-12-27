#!/usr/bin/env node
/**
 * Fetch Bot Monitor Data
 * Generates bot-monitor.json for the frontend
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fetchBotStats() {
  try {
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
      totalRuns: row.total_runs || 0,
      successfulRuns: row.successful_runs || 0,
      totalCreated: row.total_created || 0,
      totalUpdated: row.total_updated || 0,
      totalDeleted: row.total_deleted || 0,
      lastRun: row.last_run
    }));
  } catch (e) {
    console.log('No bot_runs table yet');
    return [];
  }
}

async function fetchRecentRuns() {
  try {
    const result = await db.execute(`
      SELECT * FROM bot_runs 
      ORDER BY started_at DESC 
      LIMIT 50
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      botName: row.bot_name,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      itemsProcessed: row.items_processed || 0,
      itemsCreated: row.items_created || 0,
      itemsUpdated: row.items_updated || 0,
      itemsDeleted: row.items_deleted || 0,
      summary: row.summary ? JSON.parse(row.summary) : null
    }));
  } catch (e) {
    console.log('No bot_runs table yet');
    return [];
  }
}

async function fetchWorkQueue() {
  try {
    const result = await db.execute(`
      SELECT * FROM work_queue 
      ORDER BY priority ASC, created_at DESC 
      LIMIT 100
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      itemType: row.item_type,
      itemId: row.item_id,
      action: row.action,
      priority: row.priority || 5,
      status: row.status || 'pending',
      reason: row.reason,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));
  } catch (e) {
    console.log('No work_queue table yet');
    return [];
  }
}

async function fetchLedger() {
  try {
    const result = await db.execute(`
      SELECT * FROM bot_ledger 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      botName: row.bot_name,
      action: row.action,
      itemType: row.item_type,
      itemId: row.item_id,
      reason: row.reason,
      createdAt: row.created_at
    }));
  } catch (e) {
    console.log('No bot_ledger table yet');
    return [];
  }
}

async function main() {
  console.log('Fetching bot monitor data...');
  
  const [stats, runs, queue, ledger] = await Promise.all([
    fetchBotStats(),
    fetchRecentRuns(),
    fetchWorkQueue(),
    fetchLedger()
  ]);
  
  const data = {
    stats,
    runs,
    queue,
    ledger,
    generatedAt: new Date().toISOString()
  };
  
  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'client/public/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write data file
  const outputPath = path.join(outputDir, 'bot-monitor.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`✓ Generated ${outputPath}`);
  console.log(`  Stats: ${stats.length} bots`);
  console.log(`  Runs: ${runs.length} recent runs`);
  console.log(`  Queue: ${queue.length} items`);
  console.log(`  Ledger: ${ledger.length} entries`);
}

main().catch(console.error);
