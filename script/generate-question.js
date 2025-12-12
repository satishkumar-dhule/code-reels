import fs from 'fs';
import { execSync } from 'child_process';

const QUESTIONS_DIR = 'client/src/lib/questions';
const getQuestionsFile = (ch) => `${QUESTIONS_DIR}/${ch}.json`;
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000;

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

function sleep(ms) {
  execSync(`sleep ${ms / 1000}`);
}

function loadAllQuestions() {
  const all = [];
  try {
    fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json')).forEach(f => {
      try { all.push(...JSON.parse(fs.readFileSync(`${QUESTIONS_DIR}/${f}`, 'utf8'))); } catch(e) {}
    });
  } catch(e) {}
  return all;
}

function generateUniqueId(questions, channel) {
  const prefix = channel.substring(0, 2);
  const ids = new Set(questions.map(q => q.id));
  let c = questions.length + 1, id;
  do { id = `${prefix}-${c++}`; } while (ids.has(id));
  return id;
}

function normalizeText(t) {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isDuplicate(q, existing) {
  const norm = normalizeText(q);
  return existing.some(e => normalizeText(e.question) === norm);
}

function runOpenCode(prompt, attempt = 1) {
  console.log(`\n[Attempt ${attempt}/${MAX_RETRIES}] Calling OpenCode...`);
  try {
    const escaped = prompt.replace(/'/g, "'\\''").replace(/"/g, '\\"');
    // Use 'opencode run' which is the non-interactive mode
    const result = execSync(`opencode run "${escaped}"`, {
      encoding: 'utf8',
      timeout: 120000, // 2 minutes
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, CI: 'true' }
    });
    return result;
  } catch (err) {
    const errMsg = err.message?.split('\n')[0] || 'Unknown error';
    console.log(`Failed: ${errMsg}`);
    if (attempt < MAX_RETRIES) {
      console.log(`Waiting ${RETRY_DELAY/1000}s before retry...`);
      sleep(RETRY_DELAY);
      return runOpenCode(prompt, attempt + 1);
    }
    return null;
  }
}

function parseJson(response) {
  if (!response) return null;
  try { return JSON.parse(response.trim()); } catch(e) {}
  const patterns = [/```json\s*([\s\S]*?)\s*```/, /```\s*([\s\S]*?)\s*```/, /(\{[\s\S]*\})/];
  for (const p of patterns) {
    const m = response.match(p);
    if (m) { try { return JSON.parse(m[1].trim()); } catch(e) {} }
  }
  return null;
}

function validateQuestion(d) {
  return d && d.question?.length > 10 && d.answer?.length > 5 && d.explanation?.length > 20;
}

function updateIndexFile() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
  const channels = files.map(f => f.replace('.json', ''));
  const imports = channels.map(c => `import ${c.replace(/-/g,'_')} from "./${c}.json";`).join('\n');
  const exports = channels.map(c => `  "${c}": ${c.replace(/-/g,'_')}`).join(',\n');
  fs.writeFileSync(`${QUESTIONS_DIR}/index.ts`, `${imports}\n\nexport const questionsByChannel: Record<string, any[]> = {\n${exports}\n};\n\nexport const allQuestions = Object.values(questionsByChannel).flat();\n`);
}

async function main() {
  console.log('=== Daily Question Generator (OpenCode Only) ===\n');

  // Check for API keys
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  
  if (!hasOpenAI && !hasAnthropic) {
    console.log('⚠️  No API keys found (OPENAI_API_KEY or ANTHROPIC_API_KEY)');
    console.log('Please add API keys as repository secrets to enable question generation.');
    console.log('Exiting gracefully - no question added.\n');
    process.exit(0);
  }
  
  console.log(`API Keys: OpenAI=${hasOpenAI ? '✓' : '✗'}, Anthropic=${hasAnthropic ? '✓' : '✗'}`);

  const inputChannel = process.env.INPUT_CHANNEL || 'random';
  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'random';

  const filteredCats = inputChannel === 'random' ? categories : categories.filter(c => c.channel === inputChannel);
  const category = filteredCats[Math.floor(Math.random() * filteredCats.length)] || categories[0];

  const difficulty = inputDifficulty === 'random'
    ? difficulties[Math.floor(Math.random() * difficulties.length)]
    : inputDifficulty;

  const allQuestions = loadAllQuestions();
  console.log(`Loaded ${allQuestions.length} existing questions`);
  console.log(`Category: ${category.channel}/${category.subChannel}`);
  console.log(`Difficulty: ${difficulty}`);

  const prompt = `Generate a unique technical interview question for ${category.channel} (${category.subChannel}). Difficulty: ${difficulty}.

Return ONLY valid JSON: {"question": "...", "answer": "brief answer under 150 chars", "explanation": "detailed markdown explanation", "diagram": "mermaid diagram starting with graph TD or LR"}

Requirements: practical interview question, comprehensive explanation, visualizing diagram.`;

  const response = runOpenCode(prompt);
  
  if (!response) {
    console.log('\n❌ OpenCode failed after all retries. No question added.');
    process.exit(0);
  }

  const data = parseJson(response);
  
  if (!validateQuestion(data)) {
    console.log('\n❌ Invalid response format. No question added.');
    console.log('Response preview:', response.substring(0, 200));
    process.exit(0);
  }

  if (isDuplicate(data.question, allQuestions)) {
    console.log('\n❌ Duplicate question detected. No question added.');
    process.exit(0);
  }

  const channelFile = getQuestionsFile(category.channel);
  let channelQuestions = [];
  try { channelQuestions = JSON.parse(fs.readFileSync(channelFile, 'utf8')); } catch(e) {}

  const newQuestion = {
    id: generateUniqueId(allQuestions, category.channel),
    question: data.question,
    answer: data.answer.substring(0, 200),
    explanation: data.explanation,
    tags: category.tags,
    difficulty: difficulty,
    channel: category.channel,
    subChannel: category.subChannel,
    diagram: data.diagram || 'graph TD\n    A[Concept] --> B[Implementation]'
  };

  channelQuestions.push(newQuestion);
  fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
  fs.writeFileSync(channelFile, JSON.stringify(channelQuestions, null, 2));
  updateIndexFile();

  console.log('\n✅ Success!');
  console.log(`ID: ${newQuestion.id}`);
  console.log(`Question: ${newQuestion.question}`);

  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, `new_question=${JSON.stringify(newQuestion).replace(/\n/g,'\\n')}\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
