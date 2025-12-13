import fs from 'fs';
import {
  QUESTIONS_DIR,
  loadAllQuestions,
  loadChannelQuestions,
  saveChannelQuestions,
  getChannelQuestionCounts,
  generateUniqueId,
  isDuplicate,
  runWithRetries,
  parseJson,
  validateQuestion,
  updateIndexFile,
  writeGitHubOutput,
  getQuestionsFile
} from './utils.js';

const categories = [
  { channel: 'system-design', subChannel: 'infrastructure', tags: ['infra', 'scale'] },
  { channel: 'system-design', subChannel: 'distributed-systems', tags: ['dist-sys', 'architecture'] },
  { channel: 'system-design', subChannel: 'api-design', tags: ['api', 'rest'] },
  { channel: 'algorithms', subChannel: 'data-structures', tags: ['struct', 'basics'] },
  { channel: 'algorithms', subChannel: 'sorting', tags: ['sort', 'complexity'] },
  { channel: 'algorithms', subChannel: 'dynamic-programming', tags: ['dp', 'optimization'] },
  { channel: 'frontend', subChannel: 'react', tags: ['react', 'perf'] },
  { channel: 'frontend', subChannel: 'javascript', tags: ['js', 'core'] },
  { channel: 'frontend', subChannel: 'performance', tags: ['perf', 'optimization'] },
  { channel: 'database', subChannel: 'sql', tags: ['sql', 'indexing'] },
  { channel: 'database', subChannel: 'nosql', tags: ['nosql', 'mongodb'] },
  { channel: 'database', subChannel: 'transactions', tags: ['acid', 'transactions'] },
  { channel: 'devops', subChannel: 'kubernetes', tags: ['k8s', 'orchestration'] },
  { channel: 'devops', subChannel: 'cicd', tags: ['cicd', 'automation'] },
  { channel: 'devops', subChannel: 'docker', tags: ['docker', 'containers'] },
  { channel: 'devops', subChannel: 'terraform', tags: ['terraform', 'iac'] },
  { channel: 'devops', subChannel: 'aws', tags: ['aws', 'cloud'] },
  { channel: 'devops', subChannel: 'gitops', tags: ['gitops', 'argocd'] },
  { channel: 'devops', subChannel: 'helm', tags: ['helm', 'k8s'] },
  { channel: 'devops', subChannel: 'security', tags: ['devsecops', 'security'] },
  { channel: 'sre', subChannel: 'observability', tags: ['metrics', 'monitoring'] },
  { channel: 'sre', subChannel: 'reliability', tags: ['reliability', 'incident'] },
  { channel: 'sre', subChannel: 'slo-sli', tags: ['slo', 'sli', 'error-budget'] },
  { channel: 'sre', subChannel: 'incident-management', tags: ['incident', 'postmortem'] },
  { channel: 'sre', subChannel: 'chaos-engineering', tags: ['chaos', 'resilience'] },
  { channel: 'sre', subChannel: 'capacity-planning', tags: ['capacity', 'scaling'] },
];

const difficulties = ['beginner', 'intermediate', 'advanced'];

function getWeightedCategory(cats) {
  const channelCounts = getChannelQuestionCounts();
  
  const counts = Object.values(channelCounts);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  const weighted = [];
  cats.forEach(c => {
    const count = channelCounts[c.channel] || 0;
    const weight = maxCount - count + 1;
    for (let i = 0; i < weight; i++) {
      weighted.push(c);
    }
  });

  return weighted[Math.floor(Math.random() * weighted.length)];
}

async function main() {
  console.log('=== Daily Question Generator (OpenCode Free Tier) ===\n');

  const inputChannel = process.env.INPUT_CHANNEL || 'random';
  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'random';
  const NUM_QUESTIONS = 20;

  const allQuestions = loadAllQuestions();
  console.log(`Loaded ${allQuestions.length} existing questions`);
  console.log(`Target: Generate ${NUM_QUESTIONS} questions\n`);

  const addedQuestions = [];
  const failedAttempts = [];

  for (let i = 0; i < NUM_QUESTIONS; i++) {
    console.log(`\n--- Question ${i + 1}/${NUM_QUESTIONS} ---`);
    
    const filteredCats = inputChannel === 'random' 
      ? categories 
      : categories.filter(c => c.channel === inputChannel);
    
    const category = getWeightedCategory(filteredCats);
    const difficulty = inputDifficulty === 'random'
      ? difficulties[Math.floor(Math.random() * difficulties.length)]
      : inputDifficulty;

    console.log(`Category: ${category.channel}/${category.subChannel}`);
    console.log(`Difficulty: ${difficulty}`);

    const prompt = `Generate a unique technical interview question for ${category.channel} (${category.subChannel}). Difficulty: ${difficulty}. Return ONLY valid JSON with no other text: {"question": "the question text", "answer": "brief answer under 150 chars", "explanation": "detailed markdown explanation", "diagram": "mermaid diagram starting with graph TD or LR"}`;

    const response = await runWithRetries(prompt);
    
    if (!response) {
      console.log('❌ OpenCode failed after all retries.');
      failedAttempts.push({ index: i + 1, reason: 'OpenCode timeout' });
      continue;
    }

    const data = parseJson(response);
    
    if (!validateQuestion(data)) {
      console.log('❌ Invalid response format.');
      failedAttempts.push({ index: i + 1, reason: 'Invalid JSON format' });
      continue;
    }

    if (isDuplicate(data.question, allQuestions)) {
      console.log('❌ Duplicate question detected.');
      failedAttempts.push({ index: i + 1, reason: 'Duplicate detected' });
      continue;
    }

    const channelQuestions = loadChannelQuestions(category.channel);

    const newQuestion = {
      id: generateUniqueId(allQuestions, category.channel),
      question: data.question,
      answer: data.answer.substring(0, 200),
      explanation: data.explanation,
      tags: category.tags,
      difficulty: difficulty,
      channel: category.channel,
      subChannel: category.subChannel,
      diagram: data.diagram || 'graph TD\n    A[Concept] --> B[Implementation]',
      lastUpdated: new Date().toISOString()
    };

    channelQuestions.push(newQuestion);
    saveChannelQuestions(category.channel, channelQuestions);
    updateIndexFile();
    
    allQuestions.push(newQuestion);
    addedQuestions.push(newQuestion);

    console.log(`✅ Added: ${newQuestion.id}`);
    console.log(`Q: ${newQuestion.question.substring(0, 60)}...`);
  }

  // Print summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Added: ${addedQuestions.length}/${NUM_QUESTIONS}`);
  
  if (addedQuestions.length > 0) {
    console.log('\n✅ Successfully Added Questions:');
    addedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}] ${q.channel}/${q.subChannel} (${q.difficulty})`);
      console.log(`     Q: ${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => {
      console.log(`  - Question ${f.index}: ${f.reason}`);
    });
  }

  console.log(`\nTotal Questions in Database: ${allQuestions.length}`);
  console.log('=== END SUMMARY ===\n');

  writeGitHubOutput({
    added_count: addedQuestions.length,
    failed_count: failedAttempts.length,
    total_questions: allQuestions.length,
    added_ids: addedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
