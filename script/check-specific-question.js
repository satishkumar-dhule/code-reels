#!/usr/bin/env node
/**
 * Check a specific question by ID
 */

import 'dotenv/config';
import { dbClient } from './utils.js';

const questionId = process.argv[2] || 'services-1768286130309-0';

console.log(`Checking question: ${questionId}\n`);

try {
  const result = await dbClient.execute({
    sql: 'SELECT * FROM questions WHERE id = ?',
    args: [questionId]
  });
  
  if (result.rows.length === 0) {
    console.log('❌ Question not found in database');
    process.exit(1);
  }
  
  const q = result.rows[0];
  
  console.log('Question Details:');
  console.log('================');
  console.log(`ID: ${q.id}`);
  console.log(`Channel: ${q.channel}`);
  console.log(`SubChannel: ${q.sub_channel}`);
  console.log(`Question: ${q.question}`);
  console.log(`\nAnswer (first 200 chars):`);
  console.log(q.answer?.substring(0, 200));
  console.log(`\nAnswer starts with JSON: ${q.answer?.trim().startsWith('[{') ? 'YES ❌' : 'NO ✅'}`);
  console.log(`\nExplanation (first 200 chars):`);
  console.log(q.explanation?.substring(0, 200));
  
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
