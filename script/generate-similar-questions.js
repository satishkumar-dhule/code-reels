#!/usr/bin/env node
/**
 * Generate Similar Questions Data (Build-time)
 * 
 * Uses Vector DB to pre-compute similar questions for each question.
 * Outputs static JSON files for the client to use.
 * 
 * Usage:
 *   node script/generate-similar-questions.js
 *   node script/generate-similar-questions.js --channel=system-design
 *   node script/generate-similar-questions.js --limit=100
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vectorDB from './ai/services/vector-db.js';
import { getAllUnifiedQuestions } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse CLI args
const args = process.argv.slice(2);
const options = {
  channel: null,
  limit: null,
  topK: 5, // Number of similar questions per question
  threshold: 0.15, // Similarity threshold for TF-IDF
  dryRun: false
};

for (const arg of args) {
  if (arg.startsWith('--channel=')) options.channel = arg.split('=')[1];
  else if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1]);
  else if (arg.startsWith('--top-k=')) options.topK = parseInt(arg.split('=')[1]);
  else if (arg.startsWith('--threshold=')) options.threshold = parseFloat(arg.split('=')[1]);
  else if (arg === '--dry-run') options.dryRun = true;
}

async function generateSimilarQuestions() {
  console.log('═'.repeat(60));
  console.log('🔗 SIMILAR QUESTIONS GENERATOR');
  console.log('═'.repeat(60));
  console.log('Options:', options);
  console.log('');

  // Initialize vector DB
  console.log('📦 Initializing Vector DB...');
  await vectorDB.init();
  
  // Get all questions
  let questions = await getAllUnifiedQuestions();
  console.log(`📚 Loaded ${questions.length} questions`);
  
  // Filter by channel if specified
  if (options.channel) {
    questions = questions.filter(q => q.channel === options.channel);
    console.log(`   Filtered to ${questions.length} questions in ${options.channel}`);
  }
  
  // Limit if specified
  if (options.limit) {
    questions = questions.slice(0, options.limit);
    console.log(`   Limited to ${questions.length} questions`);
  }
  
  // Generate similarity map
  const similarityMap = {};
  let processed = 0;
  let errors = 0;
  
  console.log('\n🔍 Finding similar questions...\n');
  
  for (const question of questions) {
    try {
      const similar = await vectorDB.findSimilar(
        vectorDB.buildEmbeddingText(question),
        {
          limit: options.topK + 1, // +1 to exclude self
          threshold: options.threshold,
          channel: null, // Cross-channel similarity
          excludeIds: [question.id]
        }
      );
      
      // Filter out self and limit to topK
      const filtered = similar
        .filter(s => s.id !== question.id)
        .slice(0, options.topK);
      
      if (filtered.length > 0) {
        similarityMap[question.id] = filtered.map(s => ({
          id: s.id,
          question: s.question.substring(0, 100),
          channel: s.channel,
          similarity: s.similarity
        }));
      }
      
      processed++;
      if (processed % 50 === 0) {
        console.log(`   Processed ${processed}/${questions.length} questions`);
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Error for ${question.id}: ${error.message}`);
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTS');
  console.log('═'.repeat(60));
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Questions with similar: ${Object.keys(similarityMap).length}`);
  
  // Calculate stats
  const similarCounts = Object.values(similarityMap).map(arr => arr.length);
  const avgSimilar = similarCounts.length > 0 
    ? (similarCounts.reduce((a, b) => a + b, 0) / similarCounts.length).toFixed(1)
    : 0;
  console.log(`Avg similar per question: ${avgSimilar}`);
  
  if (!options.dryRun) {
    // Save to static JSON file
    const outputPath = path.join(__dirname, '..', 'client', 'public', 'data', 'similar-questions.json');
    
    const output = {
      generated: new Date().toISOString(),
      totalQuestions: questions.length,
      questionsWithSimilar: Object.keys(similarityMap).length,
      threshold: options.threshold,
      topK: options.topK,
      similarities: similarityMap
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Saved to: ${outputPath}`);
  } else {
    console.log('\n⚠️ Dry run - no files written');
    
    // Show sample
    const sampleId = Object.keys(similarityMap)[0];
    if (sampleId) {
      console.log('\n📋 Sample output:');
      console.log(JSON.stringify({ [sampleId]: similarityMap[sampleId] }, null, 2));
    }
  }
  
  return similarityMap;
}

// Run
generateSimilarQuestions()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
