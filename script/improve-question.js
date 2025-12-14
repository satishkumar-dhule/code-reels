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

// Get all available channels from the questions directory
function getAllChannels() {
  try {
    return fs.readdirSync(QUESTIONS_DIR)
      .filter(f => f.endsWith('.json') && f !== 'index.ts')
      .map(f => f.replace('.json', ''));
  } catch (e) {
    return [];
  }
}

// Group questions by channel
function groupQuestionsByChannel(questions) {
  const byChannel = {};
  questions.forEach(q => {
    if (!byChannel[q.channel]) byChannel[q.channel] = [];
    byChannel[q.channel].push(q);
  });
  return byChannel;
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
  console.log('Mode: 1 question per channel\n');

  const allQuestions = loadAllQuestionsWithFile();
  const channels = getAllChannels();
  
  console.log(`Loaded ${allQuestions.length} questions from ${channels.length} channels`);

  // Find improvable questions and group by channel
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

  // Group improvable questions by channel
  const byChannel = groupQuestionsByChannel(improvableQuestions);
  
  // Sort each channel's questions by lastUpdated (oldest first)
  Object.keys(byChannel).forEach(channel => {
    byChannel[channel].sort((a, b) => {
      const dateA = new Date(a.lastUpdated || 0).getTime();
      const dateB = new Date(b.lastUpdated || 0).getTime();
      return dateA - dateB;
    });
  });

  const improvedQuestions = [];
  const failedAttempts = [];
  const skippedChannels = [];

  // Process 1 question per channel
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const channelImprovable = byChannel[channel];
    
    console.log(`\n--- Channel ${i + 1}/${channels.length}: ${channel} ---`);
    
    if (!channelImprovable || channelImprovable.length === 0) {
      console.log('✅ No questions need improvement in this channel');
      skippedChannels.push(channel);
      continue;
    }

    // Pick the oldest question that needs improvement
    const question = channelImprovable[0];
    const issues = needsImprovement(question);
    
    console.log(`ID: ${question.id}`);
    console.log(`Issues: ${issues.join(', ')}`);
    console.log(`Current Q: ${question.question.substring(0, 60)}...`);

    const prompt = `Improve this technical interview question. Current question: "${question.question}". Current answer: "${question.answer}". Current explanation: "${question.explanation}". Issues to fix: ${issues.join(', ')}. Return ONLY valid JSON: {"question": "improved question", "answer": "improved answer under 150 chars", "explanation": "detailed markdown explanation with examples", "diagram": "mermaid diagram if helpful"}`;

    const response = await runWithRetries(prompt);
    
    if (!response) {
      console.log('❌ OpenCode failed after retries.');
      failedAttempts.push({ id: question.id, channel, reason: 'OpenCode timeout' });
      continue;
    }

    const data = parseJson(response);
    
    if (!validateQuestion(data)) {
      console.log('❌ Invalid response format.');
      failedAttempts.push({ id: question.id, channel, reason: 'Invalid JSON' });
      continue;
    }

    // Load channel questions and find the question to update
    const channelQuestions = loadChannelQuestions(question.channel);
    
    const qIndex = channelQuestions.findIndex(q => q.id === question.id);
    if (qIndex === -1) {
      console.log('❌ Question not found in channel file.');
      failedAttempts.push({ id: question.id, channel, reason: 'Not found in file' });
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
  const processedChannels = channels.length - skippedChannels.length;
  console.log('\n\n=== SUMMARY ===');
  console.log(`Channels Processed: ${processedChannels}/${channels.length}`);
  console.log(`Total Questions Improved: ${improvedQuestions.length}/${processedChannels}`);
  
  if (skippedChannels.length > 0) {
    console.log(`\n⏭️ Skipped Channels (no improvements needed): ${skippedChannels.join(', ')}`);
  }
  
  if (improvedQuestions.length > 0) {
    console.log('\n✅ Successfully Improved Questions:');
    improvedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}] ${q.channel}/${q.subChannel}`);
      console.log(`     Q: ${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => {
      console.log(`  - [${f.channel}] ${f.id}: ${f.reason}`);
    });
  }

  console.log(`\nTotal Questions in Database: ${allQuestions.length}`);
  console.log('=== END SUMMARY ===\n');

  writeGitHubOutput({
    improved_count: improvedQuestions.length,
    failed_count: failedAttempts.length,
    skipped_channels: skippedChannels.length,
    total_questions: allQuestions.length,
    improved_ids: improvedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
