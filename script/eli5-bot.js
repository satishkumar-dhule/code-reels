/**
 * ELI5 Bot - Using the new AI Framework
 * Generates "Explain Like I'm 5" explanations for technical questions
 */

import ai from './ai/index.js';
import {
  saveQuestion,
  writeGitHubOutput,
  postBotCommentToDiscussion,
  BaseBotRunner,
  getQuestionsNeedingEli5
} from './utils.js';

class Eli5Bot extends BaseBotRunner {
  constructor() {
    super('eli5-bot', {
      workQueueBotType: 'eli5',
      rateLimitMs: 2000,
      defaultBatchSize: '100'
    });
  }

  getEmoji() { return '🧒'; }
  getDisplayName() { return 'Simplify Bot - Making Complex Simple'; }

  getDefaultState() {
    return {
      lastProcessedIndex: 0,
      lastRunDate: null,
      totalProcessed: 0,
      totalEli5Added: 0
    };
  }

  needsProcessing(question) {
    if (!question.eli5 || question.eli5.length < 50) {
      return { needs: true, reason: 'missing' };
    }
    return { needs: false, reason: 'already has ELI5' };
  }

  async processItem(question) {
    console.log('🧒 Generating ELI5 explanation...');
    
    try {
      // Use the new AI framework
      const result = await ai.run('eli5', {
        question: question.question,
        answer: question.answer
      });
      
      if (!result || !result.eli5) {
        console.log('❌ Failed to generate ELI5');
        return false;
      }
      
      const eli5 = result.eli5;
      console.log(`✅ Generated ELI5 (${eli5.length} chars)`);
      console.log(`   Preview: ${eli5.substring(0, 100)}...`);
      
      // Update question in database
      question.eli5 = eli5;
      question.lastUpdated = new Date().toISOString();
      await saveQuestion(question);
      console.log('💾 Saved to database');
      
      // Post comment to Giscus discussion
      await postBotCommentToDiscussion(question.id, 'ELI5 Bot', 'eli5_added', {
        summary: 'Added simple explanation for beginners',
        changes: [`ELI5 explanation: ${eli5.substring(0, 150)}...`]
      });
      
      return true;
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  const bot = new Eli5Bot();
  
  await bot.run({
    fallbackQuery: getQuestionsNeedingEli5,
    onComplete: () => {
      // Print AI metrics at the end
      ai.printMetrics();
    }
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
