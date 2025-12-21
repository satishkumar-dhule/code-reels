import {
  saveQuestion,
  runWithCircuitBreaker,
  parseJson,
  writeGitHubOutput,
  postBotCommentToDiscussion,
  BaseBotRunner,
  getQuestionsNeedingTldr
} from './utils.js';

/**
 * TLDR Bot - Refactored to use BaseBotRunner
 * Generates concise one-liner summaries for questions
 */
class TldrBot extends BaseBotRunner {
  constructor() {
    super('tldr-bot', {
      workQueueBotType: 'tldr',
      rateLimitMs: 2000,
      defaultBatchSize: '100'
    });
  }

  getEmoji() { return '⚡'; }
  getDisplayName() { return 'Quickshot Bot - One-Liner Summaries'; }

  getDefaultState() {
    return {
      lastProcessedIndex: 0,
      lastRunDate: null,
      totalProcessed: 0,
      totalTldrAdded: 0
    };
  }

  // Check if question needs TLDR
  needsProcessing(question) {
    if (!question.tldr || question.tldr.length < 20) {
      return { needs: true, reason: 'missing' };
    }
    return { needs: false, reason: 'already has TLDR' };
  }

  // Generate TLDR using AI
  async generateTldr(question) {
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

    const response = await runWithCircuitBreaker(prompt);
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

  // Process a single question
  async processItem(question) {
    console.log('📝 Generating TLDR...');
    
    const tldr = await this.generateTldr(question);
    
    if (!tldr) {
      console.log('❌ Failed to generate TLDR');
      return false;
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
      changes: [`TL;DR: ${tldr}`]
    });
    
    return true;
  }
}

// Main execution
async function main() {
  const bot = new TldrBot();
  
  await bot.run({
    // Use targeted query instead of fetching all questions
    fallbackQuery: getQuestionsNeedingTldr
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
