/**
 * LangGraph-based Question Improvement Bot
 * 
 * Uses a stateful graph to intelligently improve questions through
 * multiple specialized nodes with conditional routing.
 * 
 * Also handles review status for questions:
 * - approved: score >= 90
 * - needs_improvement: score 50-89
 * - needs_manual: score < 50
 * 
 * Usage:
 *   BATCH_SIZE=5 node script/langgraph-improve-bot.js
 *   REVIEW_ONLY=true node script/langgraph-improve-bot.js  # Only review, don't improve
 *   MARK_ALL_FOR_REVIEW=true node script/langgraph-improve-bot.js  # Reset all review status
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
const REVIEW_ONLY = process.env.REVIEW_ONLY === 'true';
const MARK_ALL_FOR_REVIEW = process.env.MARK_ALL_FOR_REVIEW === 'true';
const CHANNEL = process.env.CHANNEL || null;

// Review status threshold
const APPROVED_THRESHOLD = 90;

/**
 * Determine review status based on relevance score
 */
function getReviewStatus(score) {
  return score >= APPROVED_THRESHOLD ? 'approved' : 'needs_improvement';
}

/**
 * Initialize review columns in questions table
 */
async function initReviewColumns() {
  console.log('📦 Ensuring review columns exist...');
  
  const columns = [
    { name: 'review_status', type: 'TEXT DEFAULT "pending"' },
    { name: 'review_notes', type: 'TEXT' },
    { name: 'reviewed_at', type: 'TEXT' },
    { name: 'quality_score', type: 'INTEGER DEFAULT 0' },
  ];
  
  for (const col of columns) {
    try {
      await dbClient.execute(`ALTER TABLE questions ADD COLUMN ${col.name} ${col.type}`);
      console.log(`  ✓ Added column: ${col.name}`);
    } catch (e) {
      // Column already exists
    }
  }
  
  try {
    await dbClient.execute(`CREATE INDEX IF NOT EXISTS idx_questions_review_status ON questions(review_status)`);
  } catch (e) {}
  
  console.log('✅ Review columns ready\n');
}

/**
 * Mark all questions for review
 */
async function markAllForReview() {
  console.log('🔄 Marking all questions for review...');
  
  let sql = `UPDATE questions SET review_status = 'pending', review_notes = NULL, reviewed_at = NULL`;
  if (CHANNEL) sql += ` WHERE channel = '${CHANNEL}'`;
  
  const result = await dbClient.execute(sql);
  console.log(`✅ Marked ${result.rowsAffected} questions for review\n`);
  return result.rowsAffected;
}

/**
 * Update review status in database
 */
async function updateReviewStatus(id, score, notes = null) {
  const status = getReviewStatus(score);
  await dbClient.execute({
    sql: `UPDATE questions 
          SET review_status = ?, quality_score = ?, review_notes = ?, reviewed_at = ?
          WHERE id = ?`,
    args: [status, score, notes ? JSON.stringify(notes) : null, new Date().toISOString(), id]
  });
  return status;
}

/**
 * Get review statistics
 */
async function getReviewStats() {
  let sql = `SELECT review_status, COUNT(*) as count, AVG(relevance_score) as avg_score FROM questions`;
  if (CHANNEL) sql += ` WHERE channel = '${CHANNEL}'`;
  sql += ` GROUP BY review_status`;
  
  const result = await dbClient.execute(sql);
  const stats = { pending: 0, approved: 0, needs_improvement: 0, total: 0, avgScore: 0 };
  let totalScore = 0, totalCount = 0;
  
  for (const row of result.rows) {
    const status = row.review_status || 'pending';
    stats[status] = row.count;
    stats.total += row.count;
    totalScore += (row.avg_score || 0) * row.count;
    totalCount += row.count;
  }
  stats.avgScore = totalCount > 0 ? Math.round(totalScore / totalCount) : 0;
  return stats;
}

// Get questions that need improvement (low relevance score, short answers, or missing content)
async function getQuestionsNeedingImprovement(limit) {
  let sql = `
    SELECT * FROM questions 
    WHERE 
      (relevance_score IS NULL OR relevance_score < 70)
      OR eli5 IS NULL OR LENGTH(eli5) < 50
      OR tldr IS NULL OR LENGTH(tldr) < 20
      OR diagram IS NULL OR LENGTH(diagram) < 50
      OR LENGTH(answer) < 150
      OR LENGTH(explanation) < 100
  `;
  
  if (CHANNEL) sql += ` AND channel = '${CHANNEL}'`;
  
  sql += `
    ORDER BY 
      LENGTH(answer) ASC,
      CASE WHEN relevance_score IS NULL THEN 0 ELSE relevance_score END ASC,
      last_updated ASC
    LIMIT ?
  `;
  
  const result = await dbClient.execute({ sql, args: [limit] });
  
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

// Get questions pending review
async function getQuestionsPendingReview(limit) {
  let sql = `SELECT * FROM questions WHERE review_status = 'pending' OR review_status IS NULL`;
  if (CHANNEL) sql += ` AND channel = '${CHANNEL}'`;
  sql += ` ORDER BY last_updated ASC LIMIT ?`;
  
  const result = await dbClient.execute({ sql, args: [limit] });
  return result.rows;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🤖 LANGGRAPH IMPROVEMENT BOT');
  console.log('═'.repeat(60));
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Mode: ${REVIEW_ONLY ? 'Review Only' : 'Review + Improve'}`);
  if (CHANNEL) console.log(`Channel filter: ${CHANNEL}`);
  console.log('');
  
  // Initialize review columns
  await initReviewColumns();
  
  // Mark all for review if requested
  if (MARK_ALL_FOR_REVIEW) {
    await markAllForReview();
  }
  
  // Show current review stats
  const initialStats = await getReviewStats();
  console.log('📊 Current Review Status:');
  console.log(`   Pending: ${initialStats.pending}`);
  console.log(`   Approved: ${initialStats.approved}`);
  console.log(`   Needs Improvement: ${initialStats.needs_improvement}`);
  console.log(`   Total: ${initialStats.total}`);
  console.log(`   Avg Score: ${initialStats.avgScore}/100\n`);
  
  // If review only mode, just update review status based on existing scores
  if (REVIEW_ONLY) {
    const pendingQuestions = await getQuestionsPendingReview(BATCH_SIZE);
    
    if (pendingQuestions.length === 0) {
      console.log('✅ No questions pending review!');
      writeGitHubOutput({ reviewed: 0, approved: 0, needs_improvement: 0 });
      return;
    }
    
    console.log(`📝 Reviewing ${pendingQuestions.length} questions...\n`);
    
    const reviewResults = { reviewed: 0, approved: 0, needs_improvement: 0 };
    
    for (const q of pendingQuestions) {
      const score = q.relevance_score || 0;
      const status = await updateReviewStatus(q.id, score);
      reviewResults.reviewed++;
      reviewResults[status]++;
      
      const emoji = status === 'approved' ? '✅' : '🔧';
      console.log(`${emoji} ${q.id}: ${score}/100 - ${q.question?.substring(0, 50)}...`);
    }
    
    const finalStats = await getReviewStats();
    console.log('\n' + '═'.repeat(50));
    console.log('📊 REVIEW SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Reviewed: ${reviewResults.reviewed}`);
    console.log(`Approved: ${reviewResults.approved}`);
    console.log(`Needs Improvement: ${reviewResults.needs_improvement}`);
    console.log(`\nOverall: ${finalStats.approved} approved, ${finalStats.needs_improvement} need improvement`);
    
    writeGitHubOutput(reviewResults);
    return;
  }
  
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
      const originalScore = question.relevanceScore || 0;
      
      // Callback to save after each improvement step
      const onImprovement = async (updatedQuestion, meta) => {
        await saveQuestion(updatedQuestion);
        
        // Update relevance score and review status in DB after each improvement
        await dbClient.execute({
          sql: `UPDATE questions SET relevance_score = ?, last_updated = ? WHERE id = ?`,
          args: [meta.currentScore, new Date().toISOString(), question.id]
        });
        
        // Update review status based on new score
        await updateReviewStatus(question.id, meta.currentScore);
      };
      
      // Run the LangGraph improvement pipeline with save callback
      const result = await improveQuestion(question, { onImprovement });
      
      results.processed++;
      
      if (result.success && result.improvements.length > 0) {
        results.improved++;
        results.improvements.push({
          id: question.id,
          originalScore: result.originalScore,
          finalScore: result.score,
          scoreChange: result.scoreChange,
          types: result.improvements.map(i => i.type)
        });
        
        console.log(`\n📊 Score: ${result.originalScore} → ${result.score} (${result.scoreChange >= 0 ? '+' : ''}${result.scoreChange})`);
        
        // Update final review status
        const finalStatus = await updateReviewStatus(question.id, result.score);
        console.log(`📋 Review Status: ${finalStatus}`);
        
        // Post to discussion
        await postBotCommentToDiscussion(question.id, 'LangGraph Improve Bot', 'improved', {
          summary: `Improved question using adaptive pipeline (score: ${result.originalScore} → ${result.score}/100)`,
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
  
  // Final stats
  const finalStats = await getReviewStats();
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Processed: ${results.processed}`);
  console.log(`Improved: ${results.improved}`);
  console.log(`Failed: ${results.failed}`);
  
  console.log(`\nReview Status:`);
  console.log(`   Approved: ${finalStats.approved}`);
  console.log(`   Needs Improvement: ${finalStats.needs_improvement}`);
  console.log(`   Avg Score: ${finalStats.avgScore}/100`);
  
  if (results.improvements.length > 0) {
    console.log('\nImprovements made:');
    results.improvements.forEach(imp => {
      const changeStr = imp.scoreChange >= 0 ? `+${imp.scoreChange}` : `${imp.scoreChange}`;
      console.log(`  ${imp.id}: ${imp.originalScore} → ${imp.finalScore} (${changeStr}), types: ${imp.types.join(', ')}`);
    });
  }
  
  console.log('═'.repeat(60) + '\n');
  
  writeGitHubOutput({
    processed: results.processed,
    improved: results.improved,
    failed: results.failed,
    approved: finalStats.approved,
    needs_improvement: finalStats.needs_improvement,
    avg_score: finalStats.avgScore
  });
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
