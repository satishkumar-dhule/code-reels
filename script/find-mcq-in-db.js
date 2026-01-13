#!/usr/bin/env node
/**
 * Find questions with MCQ format in database
 */

import 'dotenv/config';
import { dbClient } from './utils.js';

console.log('=== Finding MCQ Format Questions in Database ===\n');

try {
  // Get all questions
  const result = await dbClient.execute('SELECT id, channel, question, answer FROM questions WHERE status != "deleted"');
  
  console.log(`Total questions: ${result.rows.length}\n`);
  
  // Find questions with MCQ format
  const mcqQuestions = result.rows.filter(q => {
    const answer = q.answer;
    if (!answer || typeof answer !== 'string') return false;
    return answer.trim().startsWith('[{') || answer.trim().startsWith('{"id"');
  });
  
  console.log(`Questions with MCQ format: ${mcqQuestions.length}\n`);
  
  if (mcqQuestions.length > 0) {
    console.log('Examples:\n');
    
    // Group by channel
    const byChannel = {};
    for (const q of mcqQuestions) {
      if (!byChannel[q.channel]) byChannel[q.channel] = [];
      byChannel[q.channel].push(q);
    }
    
    console.log('By Channel:');
    for (const [channel, questions] of Object.entries(byChannel)) {
      console.log(`  ${channel}: ${questions.length}`);
    }
    
    console.log('\nFirst 5 examples:');
    for (let i = 0; i < Math.min(5, mcqQuestions.length); i++) {
      const q = mcqQuestions[i];
      console.log(`\n${i + 1}. ID: ${q.id}`);
      console.log(`   Channel: ${q.channel}`);
      console.log(`   Question: ${q.question.substring(0, 80)}...`);
      console.log(`   Answer preview: ${q.answer.substring(0, 100)}...`);
    }
  } else {
    console.log('✅ No questions with MCQ format found!');
  }
  
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
