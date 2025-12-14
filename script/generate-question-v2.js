import {
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
  writeGitHubOutput
} from './utils.js';

// Enhanced categories with interview context
const categories = [
  { channel: 'system-design', subChannel: 'infrastructure', tags: ['infra', 'scale'], context: 'scalability and infrastructure' },
  { channel: 'system-design', subChannel: 'distributed-systems', tags: ['dist-sys', 'architecture'], context: 'distributed systems architecture' },
  { channel: 'system-design', subChannel: 'api-design', tags: ['api', 'rest'], context: 'API design and REST principles' },
  { channel: 'algorithms', subChannel: 'data-structures', tags: ['struct', 'basics'], context: 'data structures and algorithms' },
  { channel: 'algorithms', subChannel: 'sorting', tags: ['sort', 'complexity'], context: 'sorting algorithms and complexity' },
  { channel: 'algorithms', subChannel: 'dynamic-programming', tags: ['dp', 'optimization'], context: 'dynamic programming optimization' },
  { channel: 'frontend', subChannel: 'react', tags: ['react', 'perf'], context: 'React performance and best practices' },
  { channel: 'frontend', subChannel: 'javascript', tags: ['js', 'core'], context: 'JavaScript core concepts' },
  { channel: 'frontend', subChannel: 'performance', tags: ['perf', 'optimization'], context: 'frontend performance optimization' },
  { channel: 'database', subChannel: 'sql', tags: ['sql', 'indexing'], context: 'SQL optimization and indexing' },
  { channel: 'database', subChannel: 'nosql', tags: ['nosql', 'mongodb'], context: 'NoSQL databases and MongoDB' },
  { channel: 'database', subChannel: 'transactions', tags: ['acid', 'transactions'], context: 'database transactions and ACID' },
  { channel: 'devops', subChannel: 'kubernetes', tags: ['k8s', 'orchestration'], context: 'Kubernetes orchestration' },
  { channel: 'devops', subChannel: 'cicd', tags: ['cicd', 'automation'], context: 'CI/CD pipelines and automation' },
  { channel: 'devops', subChannel: 'docker', tags: ['docker', 'containers'], context: 'Docker containerization' },
  { channel: 'devops', subChannel: 'terraform', tags: ['terraform', 'iac'], context: 'Terraform infrastructure as code' },
  { channel: 'devops', subChannel: 'aws', tags: ['aws', 'cloud'], context: 'AWS cloud services' },
  { channel: 'devops', subChannel: 'gitops', tags: ['gitops', 'argocd'], context: 'GitOps and ArgoCD' },
  { channel: 'devops', subChannel: 'helm', tags: ['helm', 'k8s'], context: 'Helm package management' },
  { channel: 'devops', subChannel: 'security', tags: ['devsecops', 'security'], context: 'DevSecOps and security' },
  { channel: 'sre', subChannel: 'observability', tags: ['metrics', 'monitoring'], context: 'observability and monitoring' },
  { channel: 'sre', subChannel: 'reliability', tags: ['reliability', 'incident'], context: 'reliability engineering' },
  { channel: 'sre', subChannel: 'slo-sli', tags: ['slo', 'sli', 'error-budget'], context: 'SLO/SLI and error budgets' },
  { channel: 'sre', subChannel: 'incident-management', tags: ['incident', 'postmortem'], context: 'incident management' },
  { channel: 'sre', subChannel: 'chaos-engineering', tags: ['chaos', 'resilience'], context: 'chaos engineering' },
  { channel: 'sre', subChannel: 'capacity-planning', tags: ['capacity', 'scaling'], context: 'capacity planning' },
];

const difficulties = ['beginner', 'intermediate', 'advanced'];


// Interview-style prompt templates
const interviewPrompts = {
  beginner: (context) => `You are a senior technical interviewer. Create a realistic beginner-level interview question about ${context}. 
The question should:
- Be clear and specific
- Test fundamental understanding
- Be answerable in 2-3 minutes
- Include a practical scenario
- End with a question mark

Return ONLY valid JSON (no markdown, no extra text):
{
  "question": "the interview question with practical context",
  "answer": "concise answer in under 150 characters",
  "explanation": "detailed explanation with code examples in markdown format, include best practices",
  "diagram": "mermaid diagram (graph TD or LR) showing the concept visually"
}`,

  intermediate: (context) => `You are a senior technical interviewer. Create a realistic intermediate-level interview question about ${context}.
The question should:
- Test practical application and trade-offs
- Include a real-world scenario
- Require analysis and decision-making
- Be answerable in 3-5 minutes
- End with a question mark

Return ONLY valid JSON (no markdown, no extra text):
{
  "question": "the interview question with real-world scenario",
  "answer": "concise answer highlighting key trade-offs in under 150 characters",
  "explanation": "detailed explanation with code examples, trade-offs, and best practices in markdown",
  "diagram": "mermaid diagram (graph TD, LR, or sequenceDiagram) showing the architecture or flow"
}`,

  advanced: (context) => `You are a senior technical interviewer. Create a realistic advanced-level interview question about ${context}.
The question should:
- Test deep understanding and system thinking
- Include complex real-world scenarios
- Require architectural decisions
- Be answerable in 5-10 minutes
- End with a question mark

Return ONLY valid JSON (no markdown, no extra text):
{
  "question": "the interview question with complex scenario and constraints",
  "answer": "concise answer highlighting key architectural decisions in under 150 characters",
  "explanation": "comprehensive explanation with multiple approaches, trade-offs, scalability considerations, code examples in markdown",
  "diagram": "detailed mermaid diagram (graph TD, LR, sequenceDiagram, or C4Context) showing system architecture"
}`
};

function getWeightedCategory(cats) {
  const channelCounts = getChannelQuestionCounts();
  const counts = Object.values(channelCounts);
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
  console.log('=== Interview Question Generator V2 (Enhanced) ===\n');

  const inputChannel = process.env.INPUT_CHANNEL || 'random';
  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'random';
  const NUM_QUESTIONS = 5;

  const allQuestions = loadAllQuestions();
  console.log(`Loaded ${allQuestions.length} existing questions`);
  console.log(`Target: Generate ${NUM_QUESTIONS} interview-style questions\n`);

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
    console.log(`Context: ${category.context}`);

    const prompt = interviewPrompts[difficulty](category.context);
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

    // Ensure question ends with ?
    if (!data.question.trim().endsWith('?')) {
      data.question = data.question.trim() + '?';
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
      diagramType: 'mermaid', // Mark as mermaid for future conversion
      lastUpdated: new Date().toISOString()
    };

    channelQuestions.push(newQuestion);
    saveChannelQuestions(category.channel, channelQuestions);
    updateIndexFile();
    
    allQuestions.push(newQuestion);
    addedQuestions.push(newQuestion);

    console.log(`✅ Added: ${newQuestion.id}`);
    console.log(`Q: ${newQuestion.question.substring(0, 80)}...`);
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Added: ${addedQuestions.length}/${NUM_QUESTIONS}`);
  
  if (addedQuestions.length > 0) {
    console.log('\n✅ Successfully Added Interview Questions:');
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
