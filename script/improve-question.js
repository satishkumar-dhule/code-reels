import fs from 'fs';
import {
  QUESTIONS_DIR,
  loadAllQuestions,
  loadChannelQuestions,
  saveChannelQuestions,
  runWithRetries,
  parseJson,
  validateQuestion,
  updateIndexFile,
  writeGitHubOutput,
  calculateSimilarity,
  getQuestionsFile
} from './utils.js';

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
  if (!q.answer || q.answer.length < 20) issues.push('short_answer');
  if (!q.answer || q.answer.length > 300) issues.push('long_answer');
  if (!q.explanation || q.explanation.length < 50) issues.push('short_explanation');
  if (!q.diagram || q.diagram.length < 10) issues.push('no_diagram');
  if (q.explanation && q.explanation.includes('[truncated')) issues.push('truncated');
  if (!q.question.endsWith('?')) issues.push('no_question_mark');
  return issues;
}

async function main() {
  console.log('=== Question Improvement Bot (OpenCode Free Tier) ===\n');

  const allQuestions = loadAllQuestionsWithFile();
  console.log(`Loaded ${allQuestions.length} questions`);

  const improvableQuestions = allQuestions.filter(q => needsImprovement(q).length > 0);
  console.log(`Found ${improvableQuestions.length} questions needing improvement\n`);

  if (improvableQuestions.length === 0) {
    console.log('✅ All questions are in good shape!');
    writeGitHubOutput({
      improved_count: 0,
      failed_count: 0,
      total_questions: allQuestions.length
    });
    return;
  }

  // Sort by lastUpdated (oldest first) to prioritize old questions
  improvableQuestions.sort((a, b) => {
    const dateA = new Date(a.lastUpdated || 0).getTime();
    const dateB = new Date(b.lastUpdated || 0).getTime();
    return dateA - dateB;
  });

  const improvedQuestions = [];
  const failedAttempts = [];
  const NUM_TO_IMPROVE = 20;

  for (let i = 0; i < Math.min(NUM_TO_IMPROVE, improvableQuestions.length); i++) {
    const question = improvableQuestions[i];
    const issues = needsImprovement(question);
    
    console.log(`\n--- Question ${i + 1}/${Math.min(NUM_TO_IMPROVE, improvableQuestions.length)} ---`);
    console.log(`ID: ${question.id}`);
    console.log(`Issues: ${issues.join(', ')}`);
    console.log(`Current Q: ${question.question.substring(0, 60)}...`);

    const prompt = `Improve this technical interview question. Current question: "${question.question}". Current answer: "${question.answer}". Current explanation: "${question.explanation}". Issues to fix: ${issues.join(', ')}. Return ONLY valid JSON: {"question": "improved question", "answer": "improved answer under 150 chars", "explanation": "detailed markdown explanation with examples", "diagram": "mermaid diagram if helpful"}`;

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

    // Load channel questions and find the question to update
    const channelFile = getQuestionsFile(question.channel);
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
      lastUpdated: new Date().toISOString()
    };

    saveChannelQuestions(question.channel, channelQuestions);
    updateIndexFile();
    
    improvedQuestions.push(channelQuestions[qIndex]);
    console.log(`✅ Improved: ${question.id}`);
  }

  // Print summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Improved: ${improvedQuestions.length}/${Math.min(NUM_TO_IMPROVE, improvableQuestions.length)}`);
  
  if (improvedQuestions.length > 0) {
    console.log('\n✅ Successfully Improved Questions:');
    improvedQuestions.forEach((q, idx) => {
      const daysAgo = Math.floor((Date.now() - new Date(q.lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  ${idx + 1}. [${q.id}] ${q.channel}/${q.subChannel}`);
      console.log(`     Q: ${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}`);
      console.log(`     Last Updated: ${daysAgo} days ago`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => {
      console.log(`  - ${f.id}: ${f.reason}`);
    });
  }

  console.log(`\nTotal Questions in Database: ${allQuestions.length}`);
  console.log('=== END SUMMARY ===\n');

  writeGitHubOutput({
    improved_count: improvedQuestions.length,
    failed_count: failedAttempts.length,
    total_questions: allQuestions.length,
    improved_ids: improvedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
