import {
  QUESTIONS_DIR,
  loadChannelQuestions,
  saveChannelQuestions,
  runWithRetries,
  parseJson,
  validateQuestion,
  updateIndexFile,
  writeGitHubOutput,
  getQuestionsFile
} from './utils.js';
import fs from 'fs';

function loadAllQuestionsWithFile() {
  const all = [];
  try {
    fs.readdirSync(QUESTIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .forEach(f => {
        try {
          const questions = JSON.parse(fs.readFileSync(`${QUESTIONS_DIR}/${f}`, 'utf8'));
          questions.forEach(q => all.push({ ...q, _file: f }));
        } catch (e) {}
      });
  } catch (e) {}
  return all;
}

function needsImprovement(q) {
  const issues = [];
  
  // Answer quality checks
  if (!q.answer || q.answer.length < 20) issues.push('short_answer');
  if (!q.answer || q.answer.length > 300) issues.push('long_answer');
  
  // Explanation quality checks
  if (!q.explanation || q.explanation.length < 100) issues.push('short_explanation');
  if (q.explanation && q.explanation.includes('[truncated')) issues.push('truncated');
  if (q.explanation && !q.explanation.includes('```')) issues.push('no_code_examples');
  
  // Diagram checks
  if (!q.diagram || q.diagram.length < 20) issues.push('no_diagram');
  if (q.diagram && q.diagram.split('\n').length < 3) issues.push('simple_diagram');
  
  // Question format checks
  if (!q.question.endsWith('?')) issues.push('no_question_mark');
  if (q.question.length < 30) issues.push('too_short_question');
  if (!q.question.includes('how') && !q.question.includes('what') && !q.question.includes('why') && 
      !q.question.includes('when') && !q.question.includes('explain') && !q.question.includes('describe')) {
    issues.push('not_interview_style');
  }
  
  // Interview context checks
  if (!q.explanation.toLowerCase().includes('example') && !q.explanation.includes('```')) {
    issues.push('no_examples');
  }
  
  return issues;
}


// Interview-style improvement prompts
const improvementPrompts = {
  beginner: (q, issues) => `You are a senior technical interviewer reviewing a beginner-level question. 

Current Question: "${q.question}"
Current Answer: "${q.answer}"
Current Explanation: "${q.explanation}"
Issues to fix: ${issues.join(', ')}

Improve this to be a realistic interview question that:
- Tests fundamental understanding
- Includes practical context
- Has clear, concise answer
- Provides detailed explanation with code examples
- Includes a helpful diagram
- Ends with a question mark

Return ONLY valid JSON (no markdown, no extra text):
{
  "question": "improved interview question",
  "answer": "improved concise answer under 150 characters",
  "explanation": "improved detailed markdown explanation with code examples and best practices",
  "diagram": "improved mermaid diagram (graph TD or LR)"
}`,

  intermediate: (q, issues) => `You are a senior technical interviewer reviewing an intermediate-level question.

Current Question: "${q.question}"
Current Answer: "${q.answer}"
Current Explanation: "${q.explanation}"
Issues to fix: ${issues.join(', ')}

Improve this to be a realistic interview question that:
- Tests practical application and trade-offs
- Includes real-world scenario
- Has answer highlighting key trade-offs
- Provides comprehensive explanation with multiple approaches
- Includes architectural diagram
- Ends with a question mark

Return ONLY valid JSON (no markdown, no extra text):
{
  "question": "improved interview question with scenario",
  "answer": "improved answer with trade-offs under 150 characters",
  "explanation": "improved detailed markdown with code examples, trade-offs, and best practices",
  "diagram": "improved mermaid diagram (graph TD, LR, or sequenceDiagram)"
}`,

  advanced: (q, issues) => `You are a senior technical interviewer reviewing an advanced-level question.

Current Question: "${q.question}"
Current Answer: "${q.answer}"
Current Explanation: "${q.explanation}"
Issues to fix: ${issues.join(', ')}

Improve this to be a realistic interview question that:
- Tests deep system thinking
- Includes complex real-world scenario with constraints
- Has answer highlighting architectural decisions
- Provides comprehensive explanation with multiple solutions
- Includes detailed system diagram
- Ends with a question mark

Return ONLY valid JSON (no markdown, no extra text):
{
  "question": "improved interview question with complex scenario",
  "answer": "improved answer with architectural decisions under 150 characters",
  "explanation": "improved comprehensive markdown with multiple approaches, scalability, code examples",
  "diagram": "improved detailed mermaid diagram (graph TD, LR, sequenceDiagram, or C4Context)"
}`
};


async function main() {
  console.log('=== Interview Question Improvement Bot V2 (Enhanced) ===\n');

  const allQuestions = loadAllQuestionsWithFile();
  console.log(`Loaded ${allQuestions.length} questions`);

  const improvableQuestions = allQuestions.filter(q => needsImprovement(q).length > 0);
  console.log(`Found ${improvableQuestions.length} questions needing improvement\n`);

  if (improvableQuestions.length === 0) {
    console.log('✅ All questions are interview-ready!');
    writeGitHubOutput({
      improved_count: 0,
      failed_count: 0,
      total_questions: allQuestions.length
    });
    return;
  }

  // Sort by lastUpdated (oldest first)
  improvableQuestions.sort((a, b) => {
    const dateA = new Date(a.lastUpdated || 0).getTime();
    const dateB = new Date(b.lastUpdated || 0).getTime();
    return dateA - dateB;
  });

  const improvedQuestions = [];
  const failedAttempts = [];
  const NUM_TO_IMPROVE = 5;

  for (let i = 0; i < Math.min(NUM_TO_IMPROVE, improvableQuestions.length); i++) {
    const question = improvableQuestions[i];
    const issues = needsImprovement(question);
    
    console.log(`\n--- Question ${i + 1}/${Math.min(NUM_TO_IMPROVE, improvableQuestions.length)} ---`);
    console.log(`ID: ${question.id}`);
    console.log(`Difficulty: ${question.difficulty}`);
    console.log(`Issues: ${issues.join(', ')}`);
    console.log(`Current Q: ${question.question.substring(0, 60)}...`);

    const difficulty = question.difficulty || 'intermediate';
    const prompt = improvementPrompts[difficulty](question, issues);
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

    // Ensure question ends with ?
    if (!data.question.trim().endsWith('?')) {
      data.question = data.question.trim() + '?';
    }

    // Load channel questions and find the question to update
    const channelQuestions = loadChannelQuestions(question.channel);
    const qIndex = channelQuestions.findIndex(q => q.id === question.id);
    
    if (qIndex === -1) {
      console.log('❌ Question not found in channel file.');
      failedAttempts.push({ id: question.id, reason: 'Not found in file' });
      continue;
    }

    // Update the question
    channelQuestions[qIndex] = {
      ...channelQuestions[qIndex],
      question: data.question,
      answer: data.answer.substring(0, 200),
      explanation: data.explanation,
      diagram: data.diagram || channelQuestions[qIndex].diagram,
      diagramType: channelQuestions[qIndex].diagramType || 'mermaid',
      lastUpdated: new Date().toISOString()
    };

    saveChannelQuestions(question.channel, channelQuestions);
    updateIndexFile();
    
    improvedQuestions.push(channelQuestions[qIndex]);
    console.log(`✅ Improved: ${question.id}`);
    console.log(`New Q: ${data.question.substring(0, 70)}...`);
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Improved: ${improvedQuestions.length}/${Math.min(NUM_TO_IMPROVE, improvableQuestions.length)}`);
  
  if (improvedQuestions.length > 0) {
    console.log('\n✅ Successfully Improved Questions:');
    improvedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}] ${q.channel}/${q.subChannel} (${q.difficulty})`);
      console.log(`     Q: ${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => {
      console.log(`  - ${f.id}: ${f.reason}`);
    });
  }

  console.log(`\nTotal Questions in Database: ${allQuestions.length}`);
  console.log(`Questions Still Needing Improvement: ${improvableQuestions.length - improvedQuestions.length}`);
  console.log('=== END SUMMARY ===\n');

  writeGitHubOutput({
    improved_count: improvedQuestions.length,
    failed_count: failedAttempts.length,
    total_questions: allQuestions.length,
    improved_ids: improvedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
