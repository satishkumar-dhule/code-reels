/**
 * TLDR Bot - Using the new AI Framework
 * Generates concise one-liner summaries for questions
 */

import ai from './ai/index.js';
import {
  saveQuestion,
  writeGitHubOutput,
  postBotCommentToDiscussion,
  BaseBotRunner,
  getQuestionsNeedingTldr
} from './utils.js';

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

  needsProcessing(question) {
    if (!question.tldr || question.tldr.length < 20) {
      return { needs: true, reason: 'missing' };
    }
    return { needs: false, reason: 'already has TLDR' };
  }

  async processItem(question) {
    console.log('📝 Generating TLDR...');
    
    try {
      // Use the new AI framework
      const result = await ai.run('tldr', {
        question: question.question,
        answer: question.answer
      });
      
      if (!result || !result.tldr) {
        console.log('❌ Failed to generate TLDR');
        return false;
      }
      
      let tldr = result.tldr;
      // Truncate if too long
      if (tldr.length > 150) {
        tldr = tldr.substring(0, 147) + '...';
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
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  const bot = new TldrBot();
  
  await bot.run({
    fallbackQuery: getQuestionsNeedingTldr,
    onComplete: () => {
      ai.printMetrics();
    }
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
