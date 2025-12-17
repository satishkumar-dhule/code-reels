#!/usr/bin/env node
/**
 * Migrate questions from JSON files to Turso database
 * Run with: node script/migrate-questions-to-turso.js
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables (use write credentials)
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  console.error('Run with: TURSO_WRITE_MODE=true node script/migrate-questions-to-turso.js');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function createTables() {
  console.log('📦 Creating tables...');
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      diagram TEXT,
      difficulty TEXT NOT NULL,
      tags TEXT,
      channel TEXT NOT NULL,
      sub_channel TEXT NOT NULL,
      source_url TEXT,
      videos TEXT,
      companies TEXT,
      eli5 TEXT,
      last_updated TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS channel_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      sub_channel TEXT NOT NULL,
      question_id TEXT NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // Create indexes for faster queries
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_questions_channel ON questions(channel)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_mappings_channel ON channel_mappings(channel_id)`);
  
  console.log('✅ Tables created');
}

async function loadQuestions() {
  const questionsPath = path.join(__dirname, '../client/src/lib/questions');
  
  // Load all-questions.json
  const allQuestionsFile = path.join(questionsPath, 'all-questions.json');
  const allQuestionsData = JSON.parse(fs.readFileSync(allQuestionsFile, 'utf-8'));
  const questionsById = allQuestionsData.questions || {};
  
  // Load channel-mappings.json
  const mappingsFile = path.join(questionsPath, 'channel-mappings.json');
  const mappingsData = JSON.parse(fs.readFileSync(mappingsFile, 'utf-8'));
  const channelMappings = mappingsData.channels || {};
  
  return { questionsById, channelMappings };
}

async function migrateQuestions() {
  const { questionsById, channelMappings } = await loadQuestions();
  
  console.log(`📝 Found ${Object.keys(questionsById).length} questions`);
  console.log(`📁 Found ${Object.keys(channelMappings).length} channels`);
  
  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await client.execute('DELETE FROM channel_mappings');
  await client.execute('DELETE FROM questions');
  
  // Build channel info for each question
  const questionChannels = new Map();
  
  for (const [channelId, mapping] of Object.entries(channelMappings)) {
    for (const [subChannel, questionIds] of Object.entries(mapping.subChannels || {})) {
      for (const qId of questionIds) {
        if (!questionChannels.has(qId)) {
          questionChannels.set(qId, { channel: channelId, subChannel });
        }
      }
    }
  }
  
  // Insert questions in batches
  console.log('📥 Inserting questions...');
  const questionBatch = [];
  
  for (const [id, q] of Object.entries(questionsById)) {
    const channelInfo = questionChannels.get(id) || { channel: 'unknown', subChannel: 'general' };
    
    questionBatch.push({
      sql: `INSERT INTO questions (id, question, answer, explanation, diagram, difficulty, tags, channel, sub_channel, source_url, videos, companies, eli5, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        q.question,
        q.answer,
        q.explanation,
        q.diagram || null,
        q.difficulty || 'intermediate',
        q.tags ? JSON.stringify(q.tags) : null,
        channelInfo.channel,
        channelInfo.subChannel,
        q.sourceUrl || null,
        q.videos ? JSON.stringify(q.videos) : null,
        q.companies ? JSON.stringify(q.companies) : null,
        q.eli5 || null,
        q.lastUpdated || null
      ]
    });
  }
  
  // Execute in batches of 50
  const qBatchSize = 50;
  for (let i = 0; i < questionBatch.length; i += qBatchSize) {
    const chunk = questionBatch.slice(i, i + qBatchSize);
    await client.batch(chunk);
    process.stdout.write(`\r📥 Inserted ${Math.min(i + qBatchSize, questionBatch.length)}/${questionBatch.length} questions`);
  }
  
  console.log(`\n✅ Inserted ${questionBatch.length} questions`);
  
  // Insert channel mappings in batches
  console.log('📥 Inserting channel mappings...');
  let mappingsInserted = 0;
  const batch = [];
  
  for (const [channelId, mapping] of Object.entries(channelMappings)) {
    for (const [subChannel, questionIds] of Object.entries(mapping.subChannels || {})) {
      for (const qId of questionIds) {
        if (questionsById[qId]) {
          batch.push({
            sql: `INSERT INTO channel_mappings (channel_id, sub_channel, question_id) VALUES (?, ?, ?)`,
            args: [channelId, subChannel, qId]
          });
          mappingsInserted++;
        }
      }
    }
  }
  
  // Execute in batches of 100
  const batchSize = 100;
  for (let i = 0; i < batch.length; i += batchSize) {
    const chunk = batch.slice(i, i + batchSize);
    await client.batch(chunk);
    process.stdout.write(`\r📥 Inserted ${Math.min(i + batchSize, batch.length)}/${batch.length} mappings`);
  }
  
  console.log(`\n✅ Inserted ${mappingsInserted} channel mappings`);
}

async function main() {
  try {
    await createTables();
    await migrateQuestions();
    
    // Verify
    const countResult = await client.execute('SELECT COUNT(*) as count FROM questions');
    console.log(`\n🎉 Migration complete! Total questions in DB: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
