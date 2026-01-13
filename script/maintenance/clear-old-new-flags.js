/**
 * Maintenance: Clear is_new flag for questions older than 7 days
 * 
 * Run this daily via cron or GitHub Actions to keep the "NEW" badge accurate
 */

import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const dbClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function clearOldNewFlags() {
  console.log('🧹 Clearing is_new flag for questions older than 7 days...\n');

  try {
    // Check if is_new column exists
    const tableInfo = await dbClient.execute('PRAGMA table_info(questions)');
    const hasColumn = tableInfo.rows.some(row => row.name === 'is_new');

    if (!hasColumn) {
      console.log('⚠️  Column is_new does not exist yet');
      console.log('💡 Run migration: node script/migrations/add-is-new-column.js');
      console.log('✅ Skipping maintenance (no error)');
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    // Clear is_new for old questions
    const result = await dbClient.execute({
      sql: `
        UPDATE questions 
        SET is_new = 0 
        WHERE is_new = 1 AND created_at < ?
      `,
      args: [cutoffDate]
    });

    console.log(`✅ Cleared NEW flag from ${result.rowsAffected} questions`);

    // Count remaining new questions
    const newCount = await dbClient.execute(`
      SELECT COUNT(*) as count FROM questions WHERE is_new = 1
    `);
    console.log(`📊 Questions still marked as NEW: ${newCount.rows[0].count}`);

    // Show breakdown by channel
    const byChannel = await dbClient.execute(`
      SELECT channel, COUNT(*) as count 
      FROM questions 
      WHERE is_new = 1 
      GROUP BY channel 
      ORDER BY count DESC 
      LIMIT 10
    `);

    if (byChannel.rows.length > 0) {
      console.log('\n📈 New questions by channel:');
      byChannel.rows.forEach(row => {
        console.log(`   ${row.channel}: ${row.count}`);
      });
    }

    console.log('\n✅ Maintenance complete!');
  } catch (error) {
    console.error('❌ Maintenance failed:', error);
    process.exit(1);
  }
}

clearOldNewFlags();
