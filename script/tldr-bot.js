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
  postBotCommentToDiscussion
} from './utils.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const RATE_LIMIT_MS = 2000;
const USE_WORK_QUEUE = process.env.USE_WORK_QUEUE !== 'false';

// Check if question needs TLDR
function needsTldr(question) {
  if (!question.tldr || question.tldr.length < 20) {
    return { needs: true, reason: 'missing' };
  }
  return { needs: false, reason: 'exists' };
}

// Generate TLDR using AI
async function generateTldr(question) {
  const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Create a TL;DR (Too Long; Didn't Read) summary for this technical interview question.
The TLDR should be a single, concise sentence that captures the key point.

Question: "${question.question}"
Answer: "${question.answer?.substring(0, 500) || ''}"

Guidelines:
- Maximum 100 characters
- Start with a verb or key concept
- Be direct and actionable
- Focus on the "what" not the "why"
- No fluff words like "basically" or "essentially"

Examples of good TLDRs:
- "Use indexes on frequently queried columns to speed up lookups"
- "REST uses HTTP verbs; GraphQL uses a single endpoint with queries"
- "Microservices split apps into independent, deployable services"

Output this exact JSON structure:
{"tldr":"Your concise one-liner here"}

IMPORTANT: Return ONLY the JSON object. No other text.`;

  console.log('\n📝 PROMPT:');
  console.log('─'.repeat(50));
  console.log(prompt);
  console.log('─'.repeat(50));

  const response = await runWithRetries(prompt);
  if (!response) return null;
  
  const data = parseJson(response);
  if (!data || !data.tldr || data.tldr.length < 10) {
    console.log('  ⚠️ Invalid TLDR response');
    return null;
  }
  
  // Truncate if too long
  let tldr = data.tldr;
  if (tldr.length > 150) {
    tldr = tldr.substring(0, 147) + '...';
  }
  
  return tldr;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== ⚡ Quickshot Bot - One-Liner Summaries ===\n');
  
  await initWorkQueue();
  
  let batch = [];
  let usingWorkQueue = false;
  
  // First try work queue
  if (USE_WORK_QUEUE) {
    console.log('📋 Checking work queue for tldr tasks...');
    const workItems = await getPendingWork('tldr', BATCH_SIZE);
    if (workItems.length > 0) {
      batch = workItems.map(w => ({ ...w.question, workId: w.workId, workReason: w.reason }));
      usingWorkQueue = true;
      console.log(`📦 Found ${batch.length} tldr tasks in work queue\n`);
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
    
    // Find questions needing TLDR
    const needingTldrQuestions = sortedQuestions.filter(q => needsTldr(q).needs);
    console.log(`📦 Questions needing TLDR: ${needingTldrQuestions.length}\n`);
    
    batch = needingTldrQuestions.slice(0, BATCH_SIZE);
  }
  
  const results = {
    processed: 0,
    tldrAdded: 0,
    skipped: 0,
    failed: 0
  };
  
  for (let i = 0; i < batch.length; i++) {
    const question = batch[i];
    const workId = question.workId;
    
    console.log(`\n--- [${i + 1}/${batch.length}] ${question.id} ---`);
    console.log(`Q: ${question.question.substring(0, 60)}...`);
    if (workId) console.log(`Work ID: ${workId} (${question.workReason})`);
    
    // Mark work as started
    if (workId) await startWorkItem(workId);
    
    // Check if already has TLDR
    if (question.tldr && question.tldr.length >= 20) {
      console.log('✅ Already has TLDR, skipping');
      if (workId) await completeWorkItem(workId, { status: 'already_exists' });
      results.skipped++;
      results.processed++;
      continue;
    }
    
    console.log('📝 Generating TLDR...');
    
    if (i > 0) await sleep(RATE_LIMIT_MS);
    
    const tldr = await generateTldr(question);
    
    if (!tldr) {
      console.log('❌ Failed to generate TLDR');
      if (workId) await failWorkItem(workId, 'Failed to generate TLDR');
      results.failed++;
      results.processed++;
      continue;
    }
    
    console.log(`✅ Generated TLDR (${tldr.length} chars)`);
    console.log(`   "${tldr}"`);
    
    // Update question in database
    question.tldr = tldr;
    question.lastUpdated = new Date().toISOString();
    await saveQuestion(question);
    console.log('💾 Saved to database');
    
    // Post comment to Giscus discussion
    await postBotCommentToDiscussion(question.id, 'TLDR Bot', 'tldr_added', {
      summary: 'Added quick summary',
      changes: [
        `TL;DR: ${tldr}`
      ]
    });
    
    // Mark work as completed
    if (workId) await completeWorkItem(workId, { tldrLength: tldr.length });
    
    results.tldrAdded++;
    results.processed++;
  }
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`TLDR Added: ${results.tldrAdded}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    processed: results.processed,
    tldr_added: results.tldrAdded,
    skipped: results.skipped,
    failed: results.failed
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
