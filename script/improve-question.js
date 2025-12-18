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
  getQuestionCount
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

async function main() {
  console.log('=== Question Improvement Bot (Database Mode) ===\n');
  
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

  // Use database query to get prioritized questions needing improvement
  console.log('\n🔍 Querying database for questions needing improvement...');
  const prioritizedQuestions = await getQuestionsNeedingImprovement(improveLimit * 2);
  
  // Also check with local function for additional issues
  const improvableQuestions = prioritizedQuestions.filter(q => needsImprovement(q).length > 0);
  console.log(`Found ${improvableQuestions.length} questions needing improvement (prioritized by severity)\n`);

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
    
    console.log(`\n--- Question ${i + 1}/${batch.length}: ${question.id} ---`);
    console.log(`Channel: ${question.channel}/${question.subChannel}`);
    console.log(`Issues: ${issues.join(', ')}`);
    console.log(`Current Q: ${question.question.substring(0, 60)}...`);

    // Focus on answer/explanation only - diagrams, videos, companies handled by dedicated bots
    const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Improve this ${question.channel} interview question's answer and explanation. Fix: ${issues.slice(0, 3).join(', ')}

Current Q: "${question.question.substring(0, 150)}"
Current A: "${question.answer?.substring(0, 150) || 'missing'}"

Output this exact JSON structure:
{"question":"improved question ending with ?","answer":"concise answer under 150 chars","explanation":"## Why Asked\\nInterview context explaining why this is commonly asked\\n\\n## Key Concepts\\n- Concept 1\\n- Concept 2\\n\\n## Code Example\\n\`\`\`\\nImplementation if applicable\\n\`\`\`\\n\\n## Follow-up Questions\\n- Common follow-up 1\\n- Common follow-up 2"}

IMPORTANT: Return ONLY the JSON object. No other text.`;

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
    question.question = data.question;
    question.answer = data.answer.substring(0, 200);
    question.explanation = data.explanation;
    question.lastUpdated = new Date().toISOString();

    await saveQuestion(question);
    
    // Log bot activity
    await logBotActivity(question.id, 'improve', issues.join(', '), 'completed', {
      channel: question.channel,
      issuesFixed: issues.length
    });
    
    improvedQuestions.push(question);
    console.log(`✅ Improved: ${question.id}`);
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
