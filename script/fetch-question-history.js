#!/usr/bin/env node
/**
 * Fetch Question History for Static Build
 * 
 * Retrieves history from the database and generates static JSON files.
 * For questions without history, creates a default "created" entry using
 * the question's created_at date.
 * 
 * Output:
 * - public/data/history/index.json - Summary of all questions with history
 * - public/data/history/{questionId}.json - Individual question history
 */

import { createClient } from '@libsql/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:questions.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const OUTPUT_DIR = 'client/public/data/history';

async function fetchQuestionHistory() {
  console.log('📜 Fetching question history from database...\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created directory: ${OUTPUT_DIR}`);
  }

  const historyByQuestion = new Map();
  const summaryByQuestion = new Map();

  try {
    // First, get all questions with their created_at dates
    console.log('📊 Fetching all questions...');
    const questionsResult = await client.execute(`
      SELECT id, channel, created_at, last_updated
      FROM questions
    `);
    console.log(`   Found ${questionsResult.rows.length} questions`);

    // Create default history for all questions
    for (const row of questionsResult.rows) {
      const questionId = row.id;
      const createdAt = row.created_at || row.last_updated || new Date().toISOString();
      
      historyByQuestion.set(questionId, [{
        eventType: 'created',
        eventSource: 'system',
        sourceName: 'content-pipeline',
        changesSummary: `Question added to ${row.channel} channel`,
        changedFields: null,
        reason: null,
        metadata: null,
        createdAt: createdAt,
      }]);
      
      summaryByQuestion.set(questionId, {
        questionType: 'question',
        totalEvents: 1,
        latestEvent: { eventType: 'created', createdAt },
        eventTypes: { created: 1 }
      });
    }

    // Get coding challenges
    console.log('📊 Fetching coding challenges...');
    try {
      const challengesResult = await client.execute(`
        SELECT id, category, created_at
        FROM coding_challenges
      `);
      console.log(`   Found ${challengesResult.rows.length} coding challenges`);

      for (const row of challengesResult.rows) {
        const questionId = row.id;
        const createdAt = row.created_at || new Date().toISOString();
        
        historyByQuestion.set(questionId, [{
          eventType: 'created',
          eventSource: 'system',
          sourceName: 'challenge-generator',
          changesSummary: `Coding challenge added to ${row.category} category`,
          changedFields: null,
          reason: null,
          metadata: null,
          createdAt: createdAt,
        }]);
        
        summaryByQuestion.set(questionId, {
          questionType: 'coding',
          totalEvents: 1,
          latestEvent: { eventType: 'created', createdAt },
          eventTypes: { created: 1 }
        });
      }
    } catch (e) {
      console.log('   No coding_challenges table found, skipping');
    }

    // Get tests
    console.log('📊 Fetching tests...');
    try {
      const testsResult = await client.execute(`
        SELECT id, channel_name, created_at
        FROM tests
      `);
      console.log(`   Found ${testsResult.rows.length} tests`);

      for (const row of testsResult.rows) {
        const testId = row.id;
        const createdAt = row.created_at || new Date().toISOString();
        
        historyByQuestion.set(testId, [{
          eventType: 'created',
          eventSource: 'system',
          sourceName: 'test-generator',
          changesSummary: `Test created for ${row.channel_name} channel`,
          changedFields: null,
          reason: null,
          metadata: null,
          createdAt: createdAt,
        }]);
        
        summaryByQuestion.set(testId, {
          questionType: 'test',
          totalEvents: 1,
          latestEvent: { eventType: 'created', createdAt },
          eventTypes: { created: 1 }
        });
      }
    } catch (e) {
      console.log('   No tests table found, skipping');
    }

    // Now overlay actual history records from question_history table
    console.log('📊 Fetching history records...');
    try {
      const historyResult = await client.execute(`
        SELECT 
          question_id,
          question_type,
          event_type,
          event_source,
          source_name,
          changes_summary,
          changed_fields,
          reason,
          metadata,
          created_at
        FROM question_history
        ORDER BY created_at DESC
      `);
      console.log(`   Found ${historyResult.rows.length} history records`);

      // Group history by question, replacing default entries
      for (const row of historyResult.rows) {
        const questionId = row.question_id;
        
        const record = {
          eventType: row.event_type,
          eventSource: row.event_source,
          sourceName: row.source_name,
          changesSummary: row.changes_summary,
          changedFields: row.changed_fields ? JSON.parse(row.changed_fields) : null,
          reason: row.reason,
          metadata: row.metadata ? JSON.parse(row.metadata) : null,
          createdAt: row.created_at,
        };

        // If this question already has default history, check if we should replace or add
        if (historyByQuestion.has(questionId)) {
          const existing = historyByQuestion.get(questionId);
          // If only has default "created" entry, replace it
          if (existing.length === 1 && existing[0].eventSource === 'system') {
            historyByQuestion.set(questionId, [record]);
            summaryByQuestion.set(questionId, {
              questionType: row.question_type,
              totalEvents: 1,
              latestEvent: { eventType: row.event_type, createdAt: row.created_at },
              eventTypes: { [row.event_type]: 1 }
            });
          } else {
            // Add to existing history
            existing.unshift(record);
            const summary = summaryByQuestion.get(questionId);
            summary.totalEvents++;
            summary.eventTypes[row.event_type] = (summary.eventTypes[row.event_type] || 0) + 1;
            if (new Date(row.created_at) > new Date(summary.latestEvent.createdAt)) {
              summary.latestEvent = { eventType: row.event_type, createdAt: row.created_at };
            }
          }
        } else {
          // New question from history table
          historyByQuestion.set(questionId, [record]);
          summaryByQuestion.set(questionId, {
            questionType: row.question_type,
            totalEvents: 1,
            latestEvent: { eventType: row.event_type, createdAt: row.created_at },
            eventTypes: { [row.event_type]: 1 }
          });
        }
      }
    } catch (e) {
      console.log('   No question_history table found, using default history only');
    }

    // Write individual question history files
    let filesWritten = 0;
    for (const [questionId, records] of historyByQuestion) {
      const filePath = join(OUTPUT_DIR, `${questionId}.json`);
      writeFileSync(filePath, JSON.stringify({
        questionId,
        ...summaryByQuestion.get(questionId),
        history: records
      }, null, 2));
      filesWritten++;
    }

    console.log(`\n✅ Written ${filesWritten} individual history files`);

    // Write index file with summaries
    const index = {
      questions: Object.fromEntries(
        Array.from(summaryByQuestion.entries()).map(([id, summary]) => [id, summary])
      ),
      totalEvents: Array.from(summaryByQuestion.values()).reduce((sum, s) => sum + s.totalEvents, 0),
      totalQuestions: historyByQuestion.size,
      generatedAt: new Date().toISOString()
    };

    writeFileSync(
      join(OUTPUT_DIR, 'index.json'),
      JSON.stringify(index, null, 2)
    );

    console.log(`✅ Written index.json with ${historyByQuestion.size} question summaries`);
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('❌ Error fetching history:', error);
    
    // Create empty index file on error
    writeFileSync(
      join(OUTPUT_DIR, 'index.json'),
      JSON.stringify({ questions: {}, totalEvents: 0, generatedAt: new Date().toISOString() }, null, 2)
    );
  }
}

fetchQuestionHistory();
