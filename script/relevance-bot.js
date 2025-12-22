import {
  writeGitHubOutput,
  logBotActivity,
  dbClient,
  postBotCommentToDiscussion
} from './utils.js';
import ai from './ai/index.js';
import { scoringWeights, calculateWeightedScore } from './ai/prompts/templates/relevance.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const RATE_LIMIT_MS = 2000;

// Scoring criteria weights - imported from template
const SCORING_WEIGHTS = scoringWeights;

// Initialize relevance columns if not exists
async function initRelevanceColumns() {
  const columns = [
    { name: 'relevance_score', type: 'INTEGER DEFAULT NULL' },
    { name: 'relevance_details', type: 'TEXT DEFAULT NULL' },
    { name: 'improvement_suggestions', type: 'TEXT DEFAULT NULL' },
    { name: 'relevance_recommendation', type: 'TEXT DEFAULT NULL' }
  ];
  
  for (const col of columns) {
    try {
      await dbClient.execute(`ALTER TABLE questions ADD COLUMN ${col.name} ${col.type}`);
      console.log(`✅ Added ${col.name} column`);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        console.log(`ℹ️ ${col.name} column already exists`);
      }
    }
  }
}

// Generate relevance score using AI framework with detailed improvement suggestions
async function scoreQuestion(question) {
  console.log('\n📝 Scoring question...');
  
  try {
    const data = await ai.run('relevance', {
      question: question.question,
      answer: question.answer,
      explanation: question.explanation,
      channel: question.channel,
      difficulty: question.difficulty,
      tags: question.tags,
      companies: question.companies
    });
    
    if (!data || !data.interviewFrequency) {
      console.log('  ⚠️ Invalid scoring response');
      return null;
    }
    
    // Calculate weighted score using template function
    const weightedScore = calculateWeightedScore(data);
    
    return {
      score: weightedScore,
      details: {
        interviewFrequency: data.interviewFrequency,
        practicalRelevance: data.practicalRelevance,
        conceptDepth: data.conceptDepth,
        industryDemand: data.industryDemand,
        difficultyAppropriate: data.difficultyAppropriate,
        questionClarity: data.questionClarity,
        answerQuality: data.answerQuality,
        reasoning: data.reasoning
      },
      recommendation: data.recommendation || 'keep',
      improvements: data.improvements || null
    };
  } catch (error) {
    console.log(`  ❌ AI error: ${error.message}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get questions that need scoring, prioritizing unscored ones
async function getQuestionsToScore(limit) {
  const result = await dbClient.execute({
    sql: `
      SELECT * FROM questions 
      WHERE relevance_score IS NULL 
      ORDER BY RANDOM() 
      LIMIT ?
    `,
    args: [limit]
  });
  
  return result.rows.map(row => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    channel: row.channel,
    subChannel: row.sub_channel,
    difficulty: row.difficulty,
    tags: row.tags ? JSON.parse(row.tags) : [],
    companies: row.companies ? JSON.parse(row.companies) : [],
    relevanceScore: row.relevance_score,
    relevanceDetails: row.relevance_details ? JSON.parse(row.relevance_details) : null
  }));
}

// Save relevance score to database with improvement suggestions
async function saveRelevanceScore(questionId, score, details, recommendation, improvements) {
  await dbClient.execute({
    sql: `UPDATE questions SET 
          relevance_score = ?, 
          relevance_details = ?, 
          relevance_recommendation = ?,
          improvement_suggestions = ?,
          last_updated = ? 
          WHERE id = ?`,
    args: [
      score, 
      JSON.stringify(details), 
      recommendation,
      improvements ? JSON.stringify(improvements) : null,
      new Date().toISOString(), 
      questionId
    ]
  });
}

async function main() {
  console.log('=== 📊 Ranker Bot - Interview Likelihood Scoring ===\n');
  
  await initRelevanceColumns();
  
  // Get questions needing scoring
  const questions = await getQuestionsToScore(BATCH_SIZE);
  
  if (questions.length === 0) {
    console.log('✅ All questions have been scored!');
    
    // Show score distribution
    const statsResult = await dbClient.execute(`
      SELECT 
        CASE 
          WHEN relevance_score >= 80 THEN 'excellent'
          WHEN relevance_score >= 60 THEN 'good'
          WHEN relevance_score >= 40 THEN 'fair'
          ELSE 'needs_review'
        END as tier,
        COUNT(*) as count
      FROM questions
      WHERE relevance_score IS NOT NULL
      GROUP BY tier
      ORDER BY tier
    `);
    
    console.log('\n📊 Score Distribution:');
    statsResult.rows.forEach(row => {
      console.log(`   ${row.tier}: ${row.count} questions`);
    });
    
    writeGitHubOutput({ processed: 0, scored: 0 });
    return;
  }
  
  console.log(`📦 Found ${questions.length} questions to score\n`);
  
  const results = {
    processed: 0,
    scored: 0,
    excellent: 0,  // 80-100
    good: 0,       // 60-79
    fair: 0,       // 40-59
    needsReview: 0, // 0-39
    failed: 0
  };
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    console.log(`\n--- [${i + 1}/${questions.length}] ${question.id} ---`);
    console.log(`Channel: ${question.channel}`);
    console.log(`Q: ${question.question.substring(0, 60)}...`);
    
    if (i > 0) await sleep(RATE_LIMIT_MS);
    
    const scoring = await scoreQuestion(question);
    
    if (!scoring) {
      console.log('❌ Failed to score question');
      results.failed++;
      results.processed++;
      continue;
    }
    
    console.log(`✅ Score: ${scoring.score}/100 (${scoring.recommendation})`);
    console.log(`   Reasoning: ${scoring.details.reasoning}`);
    
    // Log improvement suggestions if present
    if (scoring.improvements && scoring.recommendation === 'improve') {
      console.log(`   📝 Improvement Suggestions:`);
      if (scoring.improvements.questionIssues?.length > 0) {
        console.log(`      Question Issues: ${scoring.improvements.questionIssues.join(', ')}`);
      }
      if (scoring.improvements.answerIssues?.length > 0) {
        console.log(`      Answer Issues: ${scoring.improvements.answerIssues.join(', ')}`);
      }
      if (scoring.improvements.missingTopics?.length > 0) {
        console.log(`      Missing Topics: ${scoring.improvements.missingTopics.join(', ')}`);
      }
      if (scoring.improvements.suggestedAdditions?.length > 0) {
        console.log(`      Suggested Additions: ${scoring.improvements.suggestedAdditions.join(', ')}`);
      }
      if (scoring.improvements.difficultyAdjustment !== 'none') {
        console.log(`      Difficulty: ${scoring.improvements.difficultyAdjustment}`);
      }
    }
    
    // Categorize
    if (scoring.score >= 80) results.excellent++;
    else if (scoring.score >= 60) results.good++;
    else if (scoring.score >= 40) results.fair++;
    else results.needsReview++;
    
    // Save to database with improvement suggestions
    await saveRelevanceScore(question.id, scoring.score, scoring.details, scoring.recommendation, scoring.improvements);
    console.log('💾 Saved to database (with improvement suggestions)');
    
    // Post comment to Giscus discussion
    await postBotCommentToDiscussion(question.id, 'Relevance Bot', 'relevance_scored', {
      summary: `Interview relevance score: ${scoring.score}/100 (${scoring.recommendation})`,
      changes: [
        `Score: ${scoring.score}/100`,
        `Recommendation: ${scoring.recommendation}`,
        `Reasoning: ${scoring.details.reasoning}`,
        scoring.improvements?.questionIssues?.length > 0 ? `Question issues: ${scoring.improvements.questionIssues.join(', ')}` : null,
        scoring.improvements?.missingTopics?.length > 0 ? `Missing topics: ${scoring.improvements.missingTopics.join(', ')}` : null
      ].filter(Boolean)
    });
    
    // Log bot activity
    await logBotActivity(question.id, 'relevance', `scored ${scoring.score}/100`, 'completed', {
      score: scoring.score,
      recommendation: scoring.recommendation
    });
    
    results.scored++;
    results.processed++;
  }
  
  // Get overall stats
  const totalScored = await dbClient.execute(`
    SELECT COUNT(*) as count FROM questions WHERE relevance_score IS NOT NULL
  `);
  const totalUnscored = await dbClient.execute(`
    SELECT COUNT(*) as count FROM questions WHERE relevance_score IS NULL
  `);
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`Scored: ${results.scored}`);
  console.log(`Failed: ${results.failed}`);
  console.log('\nScore Distribution (this batch):');
  console.log(`  🌟 Excellent (80-100): ${results.excellent}`);
  console.log(`  ✅ Good (60-79): ${results.good}`);
  console.log(`  ⚠️ Fair (40-59): ${results.fair}`);
  console.log(`  🔴 Needs Review (<40): ${results.needsReview}`);
  console.log(`\nOverall Progress:`);
  console.log(`  Scored: ${totalScored.rows[0].count}`);
  console.log(`  Remaining: ${totalUnscored.rows[0].count}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    processed: results.processed,
    scored: results.scored,
    excellent: results.excellent,
    good: results.good,
    fair: results.fair,
    needs_review: results.needsReview,
    failed: results.failed
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
