import {
  getAllUnifiedQuestions,
  loadChannelMappings,
  saveQuestion,
  runWithRetries,
  parseJson,
  validateQuestion,
  writeGitHubOutput,
  logQuestionsImproved,
  getQuestionsNeedingImprovement,
  getChannelStats,
  logBotActivity,
  getQuestionCount,
  dbClient,
  postBotCommentToDiscussion
} from './utils.js';

// Focus on answer/explanation quality only
// Diagrams, videos, companies handled by dedicated bots
function needsImprovement(q) {
  const issues = [];
  if (!q.answer || q.answer.length < 20) issues.push('short_answer');
  if (!q.answer || q.answer.length > 300) issues.push('long_answer');
  if (!q.explanation || q.explanation.length < 50) issues.push('short_explanation');
  if (q.explanation && q.explanation.includes('[truncated')) issues.push('truncated');
  if (!q.question.endsWith('?')) issues.push('no_question_mark');
  
  const hasInterviewContext = q.explanation && (
    q.explanation.toLowerCase().includes('interview') ||
    q.explanation.toLowerCase().includes('commonly asked') ||
    q.explanation.includes('## Why Asked') ||
    q.explanation.includes('## Follow-up')
  );
  if (!hasInterviewContext) issues.push('missing_interview_context');
  
  return issues;
}

// Get questions flagged by relevance bot for improvement (highest priority)
async function getQuestionsWithRelevanceFeedback(limit = 10) {
  const result = await dbClient.execute({
    sql: `
      SELECT * FROM questions 
      WHERE relevance_recommendation = 'improve' 
        AND improvement_suggestions IS NOT NULL
      ORDER BY relevance_score ASC, last_updated ASC
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
    sourceUrl: row.source_url,
    videos: row.videos ? JSON.parse(row.videos) : null,
    companies: row.companies ? JSON.parse(row.companies) : null,
    eli5: row.eli5,
    tldr: row.tldr,
    lastUpdated: row.last_updated,
    relevanceScore: row.relevance_score,
    relevanceRecommendation: row.relevance_recommendation,
    improvementSuggestions: row.improvement_suggestions ? JSON.parse(row.improvement_suggestions) : null
  }));
}

// Build improvement prompt using relevance feedback
function buildImprovementPrompt(question, issues, relevanceFeedback) {
  let feedbackSection = '';
  
  if (relevanceFeedback) {
    feedbackSection = `
RELEVANCE BOT FEEDBACK (use this to guide improvements):`;
    
    if (relevanceFeedback.questionIssues?.length > 0) {
      feedbackSection += `
- Question Issues: ${relevanceFeedback.questionIssues.join('; ')}`;
    }
    if (relevanceFeedback.answerIssues?.length > 0) {
      feedbackSection += `
- Answer Issues: ${relevanceFeedback.answerIssues.join('; ')}`;
    }
    if (relevanceFeedback.missingTopics?.length > 0) {
      feedbackSection += `
- Missing Topics to Cover: ${relevanceFeedback.missingTopics.join('; ')}`;
    }
    if (relevanceFeedback.suggestedAdditions?.length > 0) {
      feedbackSection += `
- Suggested Additions: ${relevanceFeedback.suggestedAdditions.join('; ')}`;
    }
    if (relevanceFeedback.difficultyAdjustment && relevanceFeedback.difficultyAdjustment !== 'none') {
      feedbackSection += `
- Difficulty Adjustment: ${relevanceFeedback.difficultyAdjustment}`;
    }
  }

  // Check if this is a system design question
  const isSystemDesign = question.channel === 'system-design' || 
    question.question.toLowerCase().includes('design') ||
    question.question.toLowerCase().includes('architect') ||
    question.question.toLowerCase().includes('scale');

  const systemDesignFormat = `
SYSTEM DESIGN EXPLANATION FORMAT (MANDATORY):
The explanation MUST include these sections in order:

## Functional Requirements
- List 4-6 specific functional requirements (what the system must do)

## Non-Functional Requirements (NFRs)
- Availability: Target uptime (e.g., 99.99%)
- Latency: Response time targets (e.g., p99 < 200ms)
- Scalability: Expected growth and peak loads
- Consistency: Strong vs eventual consistency trade-offs
- Durability: Data loss tolerance

## Back-of-Envelope Calculations
- Daily/Monthly Active Users (DAU/MAU)
- Requests per second (read/write ratio)
- Storage requirements (per user, total)
- Bandwidth requirements
- Show your math!

## High-Level Design
- Describe the main components and their interactions

## Deep Dive: Key Components
- Pick 2-3 critical components and explain in detail
- Database schema design
- API design
- Caching strategy

## Trade-offs & Considerations
- CAP theorem implications
- Cost vs performance trade-offs

## Failure Scenarios & Mitigations
- What happens when X fails?
- Graceful degradation strategies`;

  const standardFormat = `## Why Asked
Interview context explaining why this is commonly asked

## Key Concepts
- Concept 1
- Concept 2

## Code Example
\`\`\`
Implementation if applicable
\`\`\`

## Follow-up Questions
- Common follow-up 1
- Common follow-up 2`;

  return `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Improve this ${question.channel} interview question's answer and explanation. Fix: ${issues.slice(0, 3).join(', ')}
${feedbackSection}

Current Q: "${question.question.substring(0, 150)}"
Current A: "${question.answer?.substring(0, 150) || 'missing'}"

${isSystemDesign ? systemDesignFormat : ''}

Output this exact JSON structure:
{"question":"improved question ending with ?","answer":"concise answer under 150 chars","explanation":"${isSystemDesign ? '## Functional Requirements\\n- [Requirement 1]\\n- [Requirement 2]\\n\\n## Non-Functional Requirements (NFRs)\\n- **Availability**: [Target]\\n- **Latency**: [Target]\\n- **Scalability**: [Target]\\n- **Consistency**: [Type]\\n\\n## Back-of-Envelope Calculations\\n### Users & Traffic\\n- DAU: [Number]\\n- Peak QPS: [Number]\\n\\n### Storage\\n- Per user: [Size]\\n- Total: [Size]\\n\\n## High-Level Design\\n[Description]\\n\\n## Deep Dive: Key Components\\n### [Component 1]\\n[Details]\\n\\n## Trade-offs & Considerations\\n- [Trade-off 1]\\n\\n## Failure Scenarios & Mitigations\\n- [Scenario]: [Mitigation]' : standardFormat.replace(/\n/g, '\\n')}"}

IMPORTANT: Return ONLY the JSON object. No other text.`;
}

async function main() {
  console.log('=== ✨ Polisher Bot - Making Good Answers Great ===\n');
  
  const inputLimit = parseInt(process.env.INPUT_LIMIT || '0', 10);
  const improveLimit = inputLimit > 0 ? inputLimit : 5;
  
  console.log(`Mode: Improve up to ${improveLimit} questions\n`);

  const allQuestions = await getAllUnifiedQuestions();
  const mappings = await loadChannelMappings();
  const channels = Object.keys(mappings);
  
  console.log(`Loaded ${allQuestions.length} questions from ${channels.length} channels`);

  // Show channel stats for context
  console.log('\n📊 Channel Statistics:');
  const channelStats = await getChannelStats();
  channelStats.slice(0, 5).forEach(stat => {
    console.log(`  ${stat.channel}: ${stat.question_count} questions, ${stat.missing_diagrams} missing diagrams, ${stat.missing_explanations} missing explanations`);
  });

  // PRIORITY 1: Get questions flagged by relevance bot for improvement
  console.log('\n🎯 Checking for questions with relevance bot feedback...');
  const relevanceFlaggedQuestions = await getQuestionsWithRelevanceFeedback(improveLimit);
  console.log(`Found ${relevanceFlaggedQuestions.length} questions flagged by relevance bot for improvement`);

  // PRIORITY 2: Use database query to get other prioritized questions needing improvement
  let improvableQuestions = [];
  
  if (relevanceFlaggedQuestions.length < improveLimit) {
    console.log('\n🔍 Querying database for additional questions needing improvement...');
    const prioritizedQuestions = await getQuestionsNeedingImprovement((improveLimit - relevanceFlaggedQuestions.length) * 2);
    
    // Filter out questions already in relevanceFlaggedQuestions
    const flaggedIds = new Set(relevanceFlaggedQuestions.map(q => q.id));
    const additionalQuestions = prioritizedQuestions.filter(q => 
      !flaggedIds.has(q.id) && needsImprovement(q).length > 0
    );
    
    // Combine: relevance-flagged first, then others
    improvableQuestions = [...relevanceFlaggedQuestions, ...additionalQuestions];
  } else {
    improvableQuestions = relevanceFlaggedQuestions;
  }
  
  console.log(`Total ${improvableQuestions.length} questions to process (prioritized by relevance feedback)\n`);

  if (improvableQuestions.length === 0) {
    console.log('✅ All questions are in good shape!');
    writeGitHubOutput({ improved_count: 0, failed_count: 0, total_questions: allQuestions.length });
    return;
  }

  const improvedQuestions = [];
  const failedAttempts = [];
  const batch = improvableQuestions.slice(0, improveLimit);

  for (let i = 0; i < batch.length; i++) {
    const question = batch[i];
    const issues = needsImprovement(question);
    const hasRelevanceFeedback = question.improvementSuggestions != null;
    
    console.log(`\n--- Question ${i + 1}/${batch.length}: ${question.id} ---`);
    console.log(`Channel: ${question.channel}/${question.subChannel}`);
    console.log(`Issues: ${issues.length > 0 ? issues.join(', ') : 'relevance feedback only'}`);
    if (hasRelevanceFeedback) {
      console.log(`🎯 Has relevance bot feedback (score: ${question.relevanceScore}/100)`);
    }
    console.log(`Current Q: ${question.question.substring(0, 60)}...`);

    // Build prompt with relevance feedback if available
    const prompt = buildImprovementPrompt(question, issues, question.improvementSuggestions);

    console.log('\n📝 PROMPT:');
    console.log('─'.repeat(50));
    console.log(prompt);
    console.log('─'.repeat(50));

    const response = await runWithRetries(prompt);
    
    if (!response) {
      console.log('❌ OpenCode failed after retries.');
      failedAttempts.push({ id: question.id, reason: 'OpenCode timeout' });
      continue;
    }

    const data = parseJson(response);
    
    if (!validateQuestion(data)) {
      console.log('❌ Invalid response format.');
      failedAttempts.push({ id: question.id, reason: 'Invalid JSON' });
      continue;
    }

    // Update only question, answer, explanation - other fields handled by dedicated bots
    const oldAnswer = question.answer;
    const oldExplanation = question.explanation;
    
    question.question = data.question;
    question.answer = data.answer.substring(0, 200);
    question.explanation = data.explanation;
    question.lastUpdated = new Date().toISOString();

    await saveQuestion(question);
    
    // Clear the relevance recommendation since we've addressed the feedback
    if (hasRelevanceFeedback) {
      await dbClient.execute({
        sql: `UPDATE questions SET relevance_recommendation = 'improved', last_updated = ? WHERE id = ?`,
        args: [new Date().toISOString(), question.id]
      });
      console.log(`✅ Improved with relevance feedback: ${question.id}`);
    } else {
      console.log(`✅ Improved: ${question.id}`);
    }
    
    // Log bot activity
    await logBotActivity(question.id, 'improve', issues.join(', ') || 'relevance_feedback', 'completed', {
      channel: question.channel,
      issuesFixed: issues.length,
      usedRelevanceFeedback: hasRelevanceFeedback
    });
    
    // Post comment to Giscus discussion
    await postBotCommentToDiscussion(question.id, 'Improve Bot', 'improved', {
      summary: `Improved question quality based on ${hasRelevanceFeedback ? 'relevance feedback' : 'detected issues'}`,
      changes: [
        ...issues.map(i => `Fixed: ${i}`),
        hasRelevanceFeedback ? 'Applied relevance bot suggestions' : null
      ].filter(Boolean),
      before: oldAnswer,
      after: question.answer
    });
    
    improvedQuestions.push(question);
  }

  const totalQuestions = await getQuestionCount();
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Improved: ${improvedQuestions.length}`);
  
  if (improvedQuestions.length > 0) {
    console.log('\n✅ Successfully Improved Questions:');
    improvedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}] ${q.question.substring(0, 60)}...`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => console.log(`  - ${f.id}: ${f.reason}`));
  }

  console.log(`\nTotal Questions in Database: ${totalQuestions}`);
  console.log('=== END SUMMARY ===\n');

  if (improvedQuestions.length > 0) {
    const channelsAffected = improvedQuestions.map(q => q.channel);
    logQuestionsImproved(improvedQuestions.length, channelsAffected, improvedQuestions.map(q => q.id));
  }

  writeGitHubOutput({
    improved_count: improvedQuestions.length,
    failed_count: failedAttempts.length,
    total_questions: totalQuestions,
    improved_ids: improvedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
