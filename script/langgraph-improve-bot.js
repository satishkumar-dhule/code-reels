/**
 * LangGraph-based Question Improvement Bot
 * 
 * Uses a stateful graph to intelligently improve questions through
 * multiple specialized nodes with conditional routing.
 * 
 * Usage:
 *   BATCH_SIZE=5 node script/langgraph-improve-bot.js
 */

import {
  getAllUnifiedQuestions,
  saveQuestion,
  writeGitHubOutput,
  dbClient,
  postBotCommentToDiscussion
} from './utils.js';
import { improveQuestion } from './ai/graphs/improvement-graph.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5', 10);

// Get questions that need improvement (low relevance score, short answers, or missing content)
async function getQuestionsNeedingImprovement(limit) {
  const result = await dbClient.execute({
    sql: `
      SELECT * FROM questions 
      WHERE 
        (relevance_score IS NULL OR relevance_score < 70)
        OR eli5 IS NULL OR LENGTH(eli5) < 50
        OR tldr IS NULL OR LENGTH(tldr) < 20
        OR diagram IS NULL OR LENGTH(diagram) < 50
        OR LENGTH(answer) < 150
        OR LENGTH(explanation) < 100
      ORDER BY 
        LENGTH(answer) ASC,
        CASE WHEN relevance_score IS NULL THEN 0 ELSE relevance_score END ASC,
        last_updated ASC
      LIMIT ?
    `,
    args: [limit]
  });
  
  return result.rows.map(row => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    diagram: row.diagram,
    difficulty: row.difficulty,
    tags: row.tags ? JSON.parse(row.tags) : [],
    channel: row.channel,
    subChannel: row.sub_channel,
    eli5: row.eli5,
    tldr: row.tldr,
    relevanceScore: row.relevance_score
  }));
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🤖 LANGGRAPH IMPROVEMENT BOT');
  console.log('═'.repeat(60));
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');
  
  // Get questions needing improvement
  const questions = await getQuestionsNeedingImprovement(BATCH_SIZE);
  
  if (questions.length === 0) {
    console.log('✅ No questions need improvement!');
    writeGitHubOutput({ processed: 0, improved: 0 });
    return;
  }
  
  console.log(`Found ${questions.length} questions to process\n`);
  
  const results = {
    processed: 0,
    improved: 0,
    failed: 0,
    improvements: []
  };
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[${i + 1}/${questions.length}] ${question.id}`);
    console.log(`${'─'.repeat(60)}`);
    
    try {
      // Run the LangGraph improvement pipeline
      const result = await improveQuestion(question);
      
      results.processed++;
      
      if (result.success && result.improvements.length > 0) {
        // Save the improved question
        const updated = result.updatedQuestion;
        updated.lastUpdated = new Date().toISOString();
        
        await saveQuestion(updated);
        
        // Update relevance score
        await dbClient.execute({
          sql: `UPDATE questions SET relevance_score = ?, last_updated = ? WHERE id = ?`,
          args: [result.score, new Date().toISOString(), question.id]
        });
        
        results.improved++;
        results.improvements.push({
          id: question.id,
          score: result.score,
          types: result.improvements.map(i => i.type)
        });
        
        console.log(`💾 Saved improvements for ${question.id}`);
        
        // Post to discussion
        await postBotCommentToDiscussion(question.id, 'LangGraph Improve Bot', 'improved', {
          summary: `Improved question using adaptive pipeline (score: ${result.score}/100)`,
          changes: result.improvements.map(i => `Added/improved: ${i.type}`)
        });
      } else if (!result.success) {
        results.failed++;
        console.log(`❌ Failed to improve ${question.id}: ${result.error || result.status}`);
      }
      
    } catch (error) {
      results.failed++;
      console.error(`❌ Error processing ${question.id}:`, error.message);
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Processed: ${results.processed}`);
  console.log(`Improved: ${results.improved}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.improvements.length > 0) {
    console.log('\nImprovements made:');
    results.improvements.forEach(imp => {
      console.log(`  ${imp.id}: score ${imp.score}, types: ${imp.types.join(', ')}`);
    });
  }
  
  console.log('═'.repeat(60) + '\n');
  
  writeGitHubOutput({
    processed: results.processed,
    improved: results.improved,
    failed: results.failed
  });
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
