import {
  getAllUnifiedQuestions,
  loadChannelMappings,
  saveQuestion,
  runWithRetries,
  parseJson,
  validateQuestion,
  writeGitHubOutput,
  logQuestionsImproved,
  validateYouTubeVideos,
  normalizeCompanies,
  getQuestionsNeedingImprovement,
  getChannelStats
} from './utils.js';

const CHANNEL_STRUCTURE = {
  'system-design': ['infrastructure', 'distributed-systems', 'api-design', 'caching', 'load-balancing', 'message-queues'],
  'algorithms': ['data-structures', 'sorting', 'dynamic-programming', 'graphs', 'trees'],
  'frontend': ['react', 'javascript', 'css', 'performance', 'web-apis'],
  'backend': ['apis', 'microservices', 'caching', 'authentication', 'server-architecture'],
  'database': ['sql', 'nosql', 'indexing', 'transactions', 'query-optimization'],
  'devops': ['cicd', 'docker', 'automation', 'gitops'],
  'sre': ['observability', 'reliability', 'incident-management', 'chaos-engineering', 'capacity-planning'],
  'kubernetes': ['pods', 'services', 'deployments', 'helm', 'operators'],
  'aws': ['compute', 'storage', 'serverless', 'database', 'networking'],
  'generative-ai': ['llm-fundamentals', 'fine-tuning', 'rag', 'agents', 'evaluation'],
  'machine-learning': ['algorithms', 'model-training', 'deployment', 'deep-learning', 'evaluation'],
  'security': ['application-security', 'owasp', 'encryption', 'authentication'],
  'testing': ['unit-testing', 'integration-testing', 'tdd', 'test-strategies'],
  'behavioral': ['star-method', 'leadership-principles', 'soft-skills', 'conflict-resolution']
};

function needsImprovement(q) {
  const issues = [];
  if (!q.answer || q.answer.length < 20) issues.push('short_answer');
  if (!q.answer || q.answer.length > 300) issues.push('long_answer');
  if (!q.explanation || q.explanation.length < 50) issues.push('short_explanation');
  if (!q.diagram || q.diagram.length < 10) issues.push('no_diagram');
  if (q.explanation && q.explanation.includes('[truncated')) issues.push('truncated');
  if (!q.question.endsWith('?')) issues.push('no_question_mark');
  if (!q.sourceUrl) issues.push('no_source_url');
  if (!q.videos?.shortVideo) issues.push('no_short_video');
  if (!q.videos?.longVideo) issues.push('no_long_video');
  if (!q.companies || q.companies.length < 2) issues.push('no_companies');
  
  const hasInterviewContext = q.explanation && (
    q.explanation.toLowerCase().includes('interview') ||
    q.explanation.toLowerCase().includes('commonly asked') ||
    q.explanation.includes('## Interview Context') ||
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

    const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Improve ${question.channel} interview question. Fix: ${issues.slice(0, 4).join(', ')}

Current Q: "${question.question.substring(0, 120)}"
Current A: "${question.answer.substring(0, 100)}"

Output this exact JSON structure:
{"question":"improved question ending with ?","answer":"concise answer under 150 chars","explanation":"## Why Asked\\nInterview context\\n## Key Concepts\\nCore knowledge\\n## Code Example\\n\`\`\`\\nImplementation\\n\`\`\`\\n## Follow-up Questions\\nCommon follow-ups","diagram":"flowchart TD\\n  A[Start] --> B[End]","companies":["Google","Amazon","Meta"],"sourceUrl":null,"videos":{"shortVideo":null,"longVideo":null}}

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

    console.log('🎬 Validating YouTube videos...');
    const validatedVideos = await validateYouTubeVideos(data.videos);
    const existingVideos = question.videos || {};

    const existingCompanies = question.companies || [];
    const newCompanies = normalizeCompanies(data.companies);

    // Update question
    question.question = data.question;
    question.answer = data.answer.substring(0, 200);
    question.explanation = data.explanation;
    question.diagram = data.diagram || question.diagram;
    question.sourceUrl = data.sourceUrl || question.sourceUrl || null;
    question.videos = {
      shortVideo: validatedVideos.shortVideo || existingVideos.shortVideo || null,
      longVideo: validatedVideos.longVideo || existingVideos.longVideo || null
    };
    question.companies = newCompanies.length > 0 ? newCompanies : existingCompanies;
    question.lastUpdated = new Date().toISOString();

    await saveQuestion(question);
    
    improvedQuestions.push(question);
    console.log(`✅ Improved: ${question.id}`);
  }

  const totalQuestions = (await getAllUnifiedQuestions()).length;
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
