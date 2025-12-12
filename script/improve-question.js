import fs from 'fs';
import { spawn } from 'child_process';

const QUESTIONS_DIR = 'client/src/lib/questions';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000;
const TIMEOUT_MS = 120000;

function loadAllQuestions() {
  const all = [];
  try {
    fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json')).forEach(f => {
      try {
        const questions = JSON.parse(fs.readFileSync(`${QUESTIONS_DIR}/${f}`, 'utf8'));
        questions.forEach(q => all.push({ ...q, _file: f }));
      } catch (e) {}
    });
  } catch (e) {}
  return all;
}

function runOpenCode(prompt) {
  return new Promise((resolve) => {
    let output = '';
    let resolved = false;
    
    // Use plain text output (no --format json) for simpler parsing
    const proc = spawn('opencode', ['run', prompt], {
      timeout: TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill('SIGTERM');
        resolve(null);
      }
    }, TIMEOUT_MS);
    
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });
    
    proc.on('close', () => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        resolve(output || null);
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        console.log(`Process error: ${err.message}`);
        resolve(null);
      }
    });
  });
}

async function runWithRetries(prompt) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n[Attempt ${attempt}/${MAX_RETRIES}] Calling OpenCode CLI...`);
    const result = await runOpenCode(prompt);
    if (result) return result;
    
    if (attempt < MAX_RETRIES) {
      console.log(`Failed. Waiting ${RETRY_DELAY_MS/1000}s before retry...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  return null;
}

function parseJson(response) {
  if (!response) return null;
  
  // Try direct parse first
  try { return JSON.parse(response.trim()); } catch (e) {}
  
  // Try to find JSON in markdown code blocks or raw JSON
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /(\{"question"[\s\S]*?"diagram"[^}]*\})/,
    /(\{[\s\S]*\})/
  ];
  for (const p of patterns) {
    const m = response.match(p);
    if (m) {
      try {
        let jsonStr = m[1].trim()
          .replace(/,\s*}/g, '}');
        return JSON.parse(jsonStr);
      } catch (e) {}
    }
  }
  return null;
}

function needsImprovement(q) {
  const issues = [];

  // Check answer length (should be concise, 50-150 chars ideal)
  if (q.answer.length < 30) issues.push('answer_too_short');
  if (q.answer.length > 200) issues.push('answer_too_long');

  // Check explanation length (should be comprehensive, 200-1000 chars)
  if (q.explanation.length < 100) issues.push('explanation_too_short');

  // Check for missing or basic diagram
  if (!q.diagram) issues.push('no_diagram');
  else if (q.diagram.length < 50) issues.push('diagram_too_simple');
  else if (!q.diagram.includes('-->') && !q.diagram.includes('---')) issues.push('diagram_no_connections');

  // Check question quality
  if (q.question.length < 20) issues.push('question_too_short');
  if (!q.question.endsWith('?')) issues.push('question_no_question_mark');

  // Check for truncated content (common issue)
  if (q.answer.endsWith('...') || q.explanation.endsWith('...')) issues.push('truncated_content');

  return issues;
}

function updateIndexFile() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
  const channels = files.map(f => f.replace('.json', ''));
  const imports = channels.map(c => `import ${c.replace(/-/g, '_')} from "./${c}.json";`).join('\n');
  const exports = channels.map(c => `  "${c}": ${c.replace(/-/g, '_')}`).join(',\n');
  fs.writeFileSync(`${QUESTIONS_DIR}/index.ts`, `${imports}\n\nexport const questionsByChannel: Record<string, any[]> = {\n${exports}\n};\n\nexport const allQuestions = Object.values(questionsByChannel).flat();\n`);
}

async function main() {
  console.log('=== Question Improvement Bot (OpenCode Free Tier) ===\n');

  const NUM_IMPROVEMENTS = 5;
  const allQuestions = loadAllQuestions();
  console.log(`Loaded ${allQuestions.length} questions`);
  console.log(`Target: Improve ${NUM_IMPROVEMENTS} questions\n`);

  if (allQuestions.length === 0) {
    console.log('No questions found. Exiting.');
    process.exit(0);
  }

  // Find questions that need improvement
  const questionsWithIssues = allQuestions
    .map(q => ({ question: q, issues: needsImprovement(q) }))
    .filter(x => x.issues.length > 0);

  console.log(`Found ${questionsWithIssues.length} questions with potential improvements\n`);

  if (questionsWithIssues.length === 0) {
    console.log('All questions look good! No improvements needed.');
    process.exit(0);
  }

  // Sort by lastUpdated (oldest first) to prioritize older questions
  const sortedByAge = questionsWithIssues.sort((a, b) => {
    const dateA = new Date(a.question.lastUpdated || new Date()).getTime();
    const dateB = new Date(b.question.lastUpdated || new Date()).getTime();
    return dateA - dateB;
  });

  console.log(`Prioritizing oldest questions for review...\n`);

  const improvedQuestions = [];
  const failedAttempts = [];
  const numToImprove = Math.min(NUM_IMPROVEMENTS, sortedByAge.length);

  for (let i = 0; i < numToImprove; i++) {
    console.log(`\n--- Improvement ${i + 1}/${numToImprove} ---`);
    
    // Pick from oldest questions first
    const target = sortedByAge[i];
    const q = target.question;
    const lastUpdatedDate = new Date(q.lastUpdated || new Date());
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Question ID: ${q.id}`);
    console.log(`Last Updated: ${daysSinceUpdate} days ago`);
    console.log(`Issues: ${target.issues.join(', ')}`);
    console.log(`Current: ${q.question.substring(0, 70)}...`);

    const prompt = `Improve this technical interview question. Fix these issues: ${target.issues.join(', ')}. Current: Question="${q.question}" Answer="${q.answer}" Explanation="${q.explanation}" Diagram="${q.diagram || 'MISSING'}". Return ONLY valid JSON: {"question":"improved question ending with ?","answer":"concise answer 50-150 chars","explanation":"markdown explanation with bullets","diagram":"mermaid graph TD with 3+ nodes"}`;

    const response = await runWithRetries(prompt);

    if (!response) {
      console.log('❌ OpenCode failed after retries.');
      failedAttempts.push({ id: q.id, reason: 'OpenCode timeout' });
      continue;
    }

    const improved = parseJson(response);

    if (!improved || !improved.question || !improved.answer || !improved.explanation) {
      console.log('❌ Invalid response format.');
      failedAttempts.push({ id: q.id, reason: 'Invalid JSON format' });
      continue;
    }

    // Update the question in its file
    const filePath = `${QUESTIONS_DIR}/${q._file}`;
    const fileQuestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const idx = fileQuestions.findIndex(fq => fq.id === q.id);

    if (idx === -1) {
      console.log('❌ Could not find question in file.');
      failedAttempts.push({ id: q.id, reason: 'Question not found in file' });
      continue;
    }

    // Apply improvements
    fileQuestions[idx] = {
      ...fileQuestions[idx],
      question: improved.question || fileQuestions[idx].question,
      answer: (improved.answer || fileQuestions[idx].answer).substring(0, 200),
      explanation: improved.explanation || fileQuestions[idx].explanation,
      diagram: improved.diagram || fileQuestions[idx].diagram || 'graph TD\n    A[Concept] --> B[Implementation]',
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(fileQuestions, null, 2));
    updateIndexFile();

    improvedQuestions.push({
      id: q.id,
      file: q._file,
      issues: target.issues,
      question: improved.question,
      daysSinceLastUpdate: daysSinceUpdate
    });

    console.log(`✅ Improved: ${q.id}`);
    console.log(`Fixed: ${target.issues.join(', ')}`);
  }

  // Print summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Improved: ${improvedQuestions.length}/${numToImprove}`);
  
  if (improvedQuestions.length > 0) {
    console.log('\n✅ Successfully Improved Questions:');
    improvedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}] (${q.file}) - Last updated ${q.daysSinceLastUpdate} days ago`);
      console.log(`     Issues Fixed: ${q.issues.join(', ')}`);
      console.log(`     New Q: ${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => {
      console.log(`  - [${f.id}]: ${f.reason}`);
    });
  }

  console.log(`\nQuestions Available for Improvement: ${questionsWithIssues.length}`);
  console.log('=== END SUMMARY ===\n');

  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    fs.appendFileSync(out, `improved_count=${improvedQuestions.length}\n`);
    fs.appendFileSync(out, `failed_count=${failedAttempts.length}\n`);
    fs.appendFileSync(out, `available_count=${questionsWithIssues.length}\n`);
    fs.appendFileSync(out, `improved_ids=${improvedQuestions.map(q => q.id).join(',')}\n`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
