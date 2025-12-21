import {
  runWithRetries,
  parseJson,
  writeGitHubOutput,
  logBotActivity,
  dbClient,
  postBotCommentToDiscussion
} from './utils.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const RATE_LIMIT_MS = 2000;

// Scoring criteria weights
const SCORING_WEIGHTS = {
  interviewFrequency: 0.25,    // How often asked in real interviews
  practicalRelevance: 0.20,   // Real-world applicability
  conceptDepth: 0.15,         // Tests deep understanding
  industryDemand: 0.15,       // Current market demand for this skill
  difficultyAppropriate: 0.10, // Matches stated difficulty
  questionClarity: 0.10,      // Clear, well-formed question
  answerQuality: 0.05         // Answer is accurate and helpful
};

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

// Generate relevance score using AI with detailed improvement suggestions
async function scoreQuestion(question) {
  const prompt = `You are an expert technical interviewer and hiring manager. Analyze this interview question and score its relevance for real technical interviews.

Question: "${question.question}"
Answer: "${question.answer?.substring(0, 500) || 'N/A'}"
Explanation: "${question.explanation?.substring(0, 300) || 'N/A'}"
Channel: ${question.channel}
Difficulty: ${question.difficulty}
Tags: ${question.tags?.join(', ') || 'N/A'}
Companies: ${question.companies?.join(', ') || 'N/A'}

Score each criterion from 1-10:

1. INTERVIEW_FREQUENCY (25%): How often is this exact question or similar asked in real FAANG/top-tier interviews?
   - 10: Asked in almost every interview for this role
   - 7-9: Commonly asked, appears frequently
   - 4-6: Sometimes asked, moderate frequency
   - 1-3: Rarely asked, niche topic

2. PRACTICAL_RELEVANCE (20%): How applicable is this to real-world engineering work?
   - 10: Essential daily skill
   - 7-9: Frequently used in production
   - 4-6: Occasionally useful
   - 1-3: Mostly theoretical

3. CONCEPT_DEPTH (15%): Does this test deep understanding vs surface knowledge?
   - 10: Requires deep expertise and critical thinking
   - 7-9: Tests solid understanding
   - 4-6: Tests basic knowledge
   - 1-3: Trivial/memorization only

4. INDUSTRY_DEMAND (15%): Current market demand for this skill (2024-2025)?
   - 10: Extremely hot skill, high demand
   - 7-9: Strong demand
   - 4-6: Moderate demand
   - 1-3: Declining or niche demand

5. DIFFICULTY_APPROPRIATE (10%): Does the question match its stated difficulty level?
   - 10: Perfect match
   - 5: Somewhat mismatched
   - 1: Completely wrong difficulty

6. QUESTION_CLARITY (10%): Is the question clear, specific, and well-formed?
   - 10: Crystal clear, specific
   - 5: Somewhat ambiguous
   - 1: Confusing or vague

7. ANSWER_QUALITY (5%): Is the provided answer accurate and helpful?
   - 10: Excellent, comprehensive
   - 5: Adequate
   - 1: Incorrect or unhelpful

Also provide specific improvement suggestions if the score is below 80.

Output ONLY this JSON:
{
  "interviewFrequency":N,
  "practicalRelevance":N,
  "conceptDepth":N,
  "industryDemand":N,
  "difficultyAppropriate":N,
  "questionClarity":N,
  "answerQuality":N,
  "reasoning":"Brief 1-2 sentence explanation of the overall assessment",
  "recommendation":"keep|improve|retire",
  "improvements":{
    "questionIssues":["list of issues with the question text, empty if none"],
    "answerIssues":["list of issues with the answer, empty if none"],
    "missingTopics":["important topics that should be covered but aren't"],
    "suggestedAdditions":["specific content to add like trade-offs, examples, edge cases"],
    "difficultyAdjustment":"none|increase|decrease"
  }
}

IMPORTANT: Return ONLY the JSON object. No other text.`;

  console.log('\n📝 Scoring question...');
  
  const response = await runWithRetries(prompt);
  if (!response) return null;
  
  const data = parseJson(response);
  if (!data || !data.interviewFrequency) {
    console.log('  ⚠️ Invalid scoring response');
    return null;
  }
  
  // Calculate weighted score (0-100)
  const weightedScore = Math.round(
    (data.interviewFrequency * SCORING_WEIGHTS.interviewFrequency +
     data.practicalRelevance * SCORING_WEIGHTS.practicalRelevance +
     data.conceptDepth * SCORING_WEIGHTS.conceptDepth +
     data.industryDemand * SCORING_WEIGHTS.industryDemand +
     data.difficultyAppropriate * SCORING_WEIGHTS.difficultyAppropriate +
     data.questionClarity * SCORING_WEIGHTS.questionClarity +
     data.answerQuality * SCORING_WEIGHTS.answerQuality) * 10
  );
  
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
