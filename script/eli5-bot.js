import {
  loadUnifiedQuestions,
  saveUnifiedQuestions,
  getAllUnifiedQuestions,
  runWithRetries,
  parseJson,
  updateUnifiedIndexFile,
  writeGitHubOutput
} from './utils.js';
import fs from 'fs';

// State tracking for resumable runs
const STATE_FILE = 'client/src/lib/questions/eli5-bot-state.json';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5', 10);
const RATE_LIMIT_MS = 2000;

// Load bot state
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return {
      lastProcessedIndex: 0,
      lastRunDate: null,
      totalProcessed: 0,
      totalEli5Added: 0
    };
  }
}

// Save bot state
function saveState(state) {
  state.lastRunDate = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Check if question needs ELI5 explanation
function needsEli5(question) {
  if (!question.eli5 || question.eli5.length < 50) {
    return { needs: true, reason: 'missing' };
  }
  return { needs: false, reason: 'exists' };
}

// Generate ELI5 explanation using AI
async function generateEli5(question) {
  const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Create an "Explain Like I'm 5" explanation for this technical interview question.
Make it simple, fun, and use everyday analogies a child would understand.
Use simple words, short sentences, and relatable examples (toys, games, food, etc.)

Question: "${question.question}"
Technical Answer: "${question.answer}"

Guidelines:
- Use analogies from everyday life (building blocks, toys, kitchen, playground)
- Avoid ALL technical jargon
- Keep it under 200 words
- Make it engaging and memorable
- Use "imagine" or "think of it like" to start analogies

Output this exact JSON structure:
{"eli5":"Your simple explanation here using everyday analogies"}

IMPORTANT: Return ONLY the JSON object. No other text.`;

  console.log('\n📝 PROMPT:');
  console.log('─'.repeat(50));
  console.log(prompt);
  console.log('─'.repeat(50));

  const response = await runWithRetries(prompt);
  if (!response) return null;
  
  const data = parseJson(response);
  if (!data || !data.eli5 || data.eli5.length < 30) {
    console.log('  ⚠️ Invalid ELI5 response');
    return null;
  }
  
  return data.eli5;
}

// Rate limiting helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== ELI5 Bot - Explain Like I\'m 5 ===\n');
  
  const state = loadState();
  const allQuestions = getAllUnifiedQuestions();
  
  console.log(`📊 Database: ${allQuestions.length} questions`);
  console.log(`📍 Last processed index: ${state.lastProcessedIndex}`);
  console.log(`📅 Last run: ${state.lastRunDate || 'Never'}`);
  console.log(`⚙️ Batch size: ${BATCH_SIZE}\n`);
  
  // Sort questions by ID for consistent ordering
  const sortedQuestions = [...allQuestions].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
  
  // Calculate start index (wrap around if needed)
  let startIndex = state.lastProcessedIndex;
  if (startIndex >= sortedQuestions.length) {
    startIndex = 0;
    console.log('🔄 Wrapped around to beginning\n');
  }
  
  const endIndex = Math.min(startIndex + BATCH_SIZE, sortedQuestions.length);
  const batch = sortedQuestions.slice(startIndex, endIndex);
  
  console.log(`📦 Processing: questions ${startIndex + 1} to ${endIndex} of ${sortedQuestions.length}\n`);
  
  const questions = loadUnifiedQuestions();
  const results = {
    processed: 0,
    eli5Added: 0,
    skipped: 0,
    failed: 0
  };
  
  for (let i = 0; i < batch.length; i++) {
    const question = batch[i];
    const globalIndex = startIndex + i + 1;
    
    console.log(`\n--- [${globalIndex}/${sortedQuestions.length}] ${question.id} ---`);
    console.log(`Q: ${question.question.substring(0, 60)}...`);
    
    const check = needsEli5(question);
    console.log(`Status: ${check.reason}`);
    
    if (!check.needs) {
      console.log('✅ ELI5 exists, skipping');
      results.skipped++;
      results.processed++;
      
      saveState({
        ...state,
        lastProcessedIndex: startIndex + i + 1,
        totalProcessed: state.totalProcessed + results.processed
      });
      continue;
    }
    
    console.log('🧒 Generating ELI5 explanation...');
    
    // Rate limiting
    if (i > 0) await sleep(RATE_LIMIT_MS);
    
    const eli5 = await generateEli5(question);
    
    if (!eli5) {
      console.log('❌ Failed to generate ELI5');
      results.failed++;
      results.processed++;
      
      saveState({
        ...state,
        lastProcessedIndex: startIndex + i + 1,
        totalProcessed: state.totalProcessed + results.processed
      });
      continue;
    }
    
    console.log(`✅ Generated ELI5 (${eli5.length} chars)`);
    console.log(`   Preview: ${eli5.substring(0, 100)}...`);
    
    // Update question
    questions[question.id] = {
      ...questions[question.id],
      eli5: eli5,
      lastEli5Update: new Date().toISOString()
    };
    
    // Save immediately after each update
    saveUnifiedQuestions(questions);
    console.log('💾 Saved');
    
    results.eli5Added++;
    results.processed++;
    
    // Update state after each question
    saveState({
      ...state,
      lastProcessedIndex: startIndex + i + 1,
      totalProcessed: state.totalProcessed + results.processed,
      totalEli5Added: state.totalEli5Added + results.eli5Added
    });
  }
  
  // Final updates
  updateUnifiedIndexFile();
  
  const newState = {
    lastProcessedIndex: endIndex >= sortedQuestions.length ? 0 : endIndex,
    lastRunDate: new Date().toISOString(),
    totalProcessed: state.totalProcessed + results.processed,
    totalEli5Added: state.totalEli5Added + results.eli5Added
  };
  saveState(newState);
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`ELI5 Added: ${results.eli5Added}`);
  console.log(`Skipped (exists): ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`\nNext run starts at: ${newState.lastProcessedIndex}`);
  console.log(`All-time ELI5 added: ${newState.totalEli5Added}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    processed: results.processed,
    eli5_added: results.eli5Added,
    skipped: results.skipped,
    failed: results.failed,
    next_index: newState.lastProcessedIndex
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
