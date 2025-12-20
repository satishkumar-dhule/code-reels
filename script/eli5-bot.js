import {
  getAllUnifiedQuestions,
  saveQuestion,
  runWithRetries,
  parseJson,
  writeGitHubOutput,
  getPendingWork,
  startWorkItem,
  completeWorkItem,
  failWorkItem,
  initWorkQueue,
  clearCaches
} from './utils.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const RATE_LIMIT_MS = 2000;
const USE_WORK_QUEUE = process.env.USE_WORK_QUEUE !== 'false'; // Default to true

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== 🧒 Simplify Bot - Making Complex Simple ===\n');
  
  await initWorkQueue();
  
  let batch = [];
  let usingWorkQueue = false;
  
  // First try work queue
  if (USE_WORK_QUEUE) {
    console.log('📋 Checking work queue for eli5 tasks...');
    const workItems = await getPendingWork('eli5', BATCH_SIZE);
    if (workItems.length > 0) {
      batch = workItems.map(w => ({ ...w.question, workId: w.workId, workReason: w.reason }));
      usingWorkQueue = true;
      console.log(`📦 Found ${batch.length} eli5 tasks in work queue\n`);
    }
  }
  
  // Fallback to scanning if no work queue items
  if (batch.length === 0) {
    const allQuestions = await getAllUnifiedQuestions();
    
    console.log(`📊 Database: ${allQuestions.length} questions`);
    console.log(`⚙️ Batch size: ${BATCH_SIZE}\n`);
    
    // Sort questions by ID for consistent ordering
    const sortedQuestions = [...allQuestions].sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    
    // Find questions needing ELI5
    const needingEli5Questions = sortedQuestions.filter(q => needsEli5(q).needs);
    console.log(`📦 Questions needing ELI5: ${needingEli5Questions.length}\n`);
    
    batch = needingEli5Questions.slice(0, BATCH_SIZE);
  }
  
  const results = {
    processed: 0,
    eli5Added: 0,
    skipped: 0,
    failed: 0
  };
  
  for (let i = 0; i < batch.length; i++) {
    const question = batch[i];
    const workId = question.workId; // From work queue if applicable
    
    console.log(`\n--- [${i + 1}/${batch.length}] ${question.id} ---`);
    console.log(`Q: ${question.question.substring(0, 60)}...`);
    if (workId) console.log(`Work ID: ${workId} (${question.workReason})`);
    
    // Mark work as started
    if (workId) await startWorkItem(workId);
    
    // Check if already has ELI5
    if (question.eli5 && question.eli5.length >= 50) {
      console.log('✅ Already has ELI5, skipping');
      if (workId) await completeWorkItem(workId, { status: 'already_exists' });
      results.skipped++;
      results.processed++;
      continue;
    }
    
    console.log('🧒 Generating ELI5 explanation...');
    
    if (i > 0) await sleep(RATE_LIMIT_MS);
    
    const eli5 = await generateEli5(question);
    
    if (!eli5) {
      console.log('❌ Failed to generate ELI5');
      if (workId) await failWorkItem(workId, 'Failed to generate ELI5');
      results.failed++;
      results.processed++;
      continue;
    }
    
    console.log(`✅ Generated ELI5 (${eli5.length} chars)`);
    console.log(`   Preview: ${eli5.substring(0, 100)}...`);
    
    // Update question in database
    question.eli5 = eli5;
    question.lastUpdated = new Date().toISOString();
    await saveQuestion(question);
    console.log('💾 Saved to database');
    
    // Mark work as completed
    if (workId) await completeWorkItem(workId, { eli5Length: eli5.length });
    
    results.eli5Added++;
    results.processed++;
  }
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`ELI5 Added: ${results.eli5Added}`);
  console.log(`Failed: ${results.failed}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    processed: results.processed,
    eli5_added: results.eli5Added,
    failed: results.failed
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
