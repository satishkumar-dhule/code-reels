import {
  saveQuestion,
  writeGitHubOutput,
  normalizeCompanies,
  postBotCommentToDiscussion,
  BaseBotRunner,
  getQuestionsNeedingCompanies
} from './utils.js';
import ai from './ai/index.js';
import { knownCompanies } from './ai/prompts/templates/company.js';

const MIN_COMPANIES = 3;

// Validate company data using known companies from template
function validateCompanies(companies) {
  if (!companies || !Array.isArray(companies)) return [];
  
  const knownSet = new Set(knownCompanies.map(c => c.toLowerCase()));
  
  return companies
    .filter(c => c && typeof c === 'string' && c.length >= 2)
    .map(c => c.trim())
    .filter(c => {
      const isKnown = knownSet.has(c.toLowerCase());
      const looksValid = /^[A-Za-z0-9\s&.-]+$/.test(c) && c.length <= 50;
      return isKnown || looksValid;
    });
}

/**
 * Company Bot - Refactored to use BaseBotRunner
 * Finds companies that ask specific interview questions
 */
class CompanyBot extends BaseBotRunner {
  constructor() {
    super('company-bot', {
      workQueueBotType: 'company',
      rateLimitMs: 2000,
      defaultBatchSize: '100'
    });
    this.companiesAdded = 0;
  }

  getEmoji() { return '🏢'; }
  getDisplayName() { return 'Recruiter Bot - Who Asks This?'; }

  getDefaultState() {
    return {
      lastProcessedIndex: 0,
      lastRunDate: null,
      totalProcessed: 0,
      totalCompaniesAdded: 0,
      questionsUpdated: 0
    };
  }

  // Check if question needs company data
  needsProcessing(question) {
    const companies = question.companies || [];
    const validCompanies = validateCompanies(companies);
    
    if (validCompanies.length === 0) return { needs: true, reason: 'missing' };
    if (validCompanies.length < MIN_COMPANIES) return { needs: true, reason: `insufficient (${validCompanies.length}/${MIN_COMPANIES})` };
    
    return { needs: false, reason: `valid (${validCompanies.length} companies)` };
  }

  // Find companies that ask this type of question using AI framework
  async findCompaniesForQuestion(question) {
    try {
      const result = await ai.run('company', {
        question: question.question,
        tags: question.tags,
        difficulty: question.difficulty
      });
      
      if (!result || !result.companies) return null;
      
      const validated = normalizeCompanies(result.companies);
      
      if (validated.length === 0) {
        console.log('  ⚠️ No valid companies in response');
        return null;
      }
      
      return {
        companies: validated,
        confidence: result.confidence || 'low',
        reasoning: result.reasoning || ''
      };
    } catch (error) {
      console.log(`  ❌ AI error: ${error.message}`);
      return null;
    }
  }

  // Process a single question
  async processItem(question) {
    const currentCompanies = question.companies || [];
    console.log(`Current companies: ${currentCompanies.length > 0 ? currentCompanies.join(', ') : 'none'}`);
    console.log('🔍 Finding companies...');
    
    const found = await this.findCompaniesForQuestion(question);
    
    if (!found) {
      console.log('❌ Failed to find companies');
      return false;
    }
    
    console.log(`✅ Found ${found.companies.length} companies (confidence: ${found.confidence})`);
    console.log(`   Companies: ${found.companies.join(', ')}`);
    
    // Merge with existing companies (deduplicate)
    const existingNormalized = normalizeCompanies(currentCompanies);
    const mergedCompanies = [...new Set([...existingNormalized, ...found.companies])].sort();
    const newCompaniesCount = mergedCompanies.length - existingNormalized.length;
    
    // Update question
    const oldCompanies = question.companies || [];
    question.companies = mergedCompanies;
    question.lastUpdated = new Date().toISOString();
    
    await saveQuestion(question);
    console.log(`💾 Saved (added ${newCompaniesCount} new companies)`);
    
    this.companiesAdded += newCompaniesCount;
    
    // Post comment to Giscus discussion
    if (newCompaniesCount > 0) {
      await postBotCommentToDiscussion(question.id, 'Company Bot', 'companies_added', {
        summary: `Added ${newCompaniesCount} companies that ask this question`,
        changes: [
          `New companies: ${mergedCompanies.filter(c => !oldCompanies.includes(c)).join(', ')}`,
          `Total companies: ${mergedCompanies.length}`
        ]
      });
    }
    
    return true;
  }

  // Custom summary
  printSummary(state) {
    console.log('\n\n=== SUMMARY ===');
    console.log(`Processed: ${this.results.processed}`);
    console.log(`Questions Updated: ${this.results.succeeded}`);
    console.log(`Companies Added: ${this.companiesAdded}`);
    console.log(`Skipped (valid): ${this.results.skipped}`);
    console.log(`Failed: ${this.results.failed}`);
    if (state.lastProcessedIndex !== undefined) {
      console.log(`\nNext run starts at: ${state.lastProcessedIndex}`);
    }
    console.log('=== END ===\n');
  }
}

// Main execution
async function main() {
  const bot = new CompanyBot();
  
  await bot.run({
    // Use targeted query instead of fetching all questions
    fallbackQuery: getQuestionsNeedingCompanies
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
