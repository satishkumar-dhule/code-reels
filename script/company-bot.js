import {
  loadUnifiedQuestions,
  saveQuestion,
  getAllUnifiedQuestions,
  runWithRetries,
  parseJson,
  writeGitHubOutput,
  normalizeCompanies,
  dbClient
} from './utils.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5', 10);
const RATE_LIMIT_MS = 2000; // NFR: Rate limiting between API calls
const MIN_COMPANIES = 3; // Minimum companies per question

// Known tech companies for validation
const KNOWN_COMPANIES = new Set([
  'Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Netflix', 'Uber', 'Airbnb',
  'LinkedIn', 'Twitter', 'Stripe', 'Salesforce', 'Adobe', 'Oracle', 'IBM',
  'Spotify', 'Snap', 'Pinterest', 'Dropbox', 'Slack', 'Zoom', 'Shopify',
  'Square', 'PayPal', 'Intuit', 'VMware', 'Cisco', 'Intel', 'AMD', 'NVIDIA',
  'Tesla', 'SpaceX', 'Palantir', 'Databricks', 'Snowflake', 'MongoDB',
  'Coinbase', 'Robinhood', 'DoorDash', 'Instacart', 'Lyft', 'Reddit',
  'TikTok', 'ByteDance', 'Alibaba', 'Tencent', 'Baidu', 'Samsung',
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bloomberg', 'Citadel',
  'Two Sigma', 'Jane Street', 'DE Shaw', 'Bridgewater', 'Visa', 'Mastercard',
  'OpenAI', 'Anthropic', 'Figma', 'Notion', 'Canva', 'Atlassian', 'ServiceNow',
  'Workday', 'Splunk', 'Elastic', 'HashiCorp', 'Confluent', 'Cloudflare',
  'Twilio', 'Okta', 'CrowdStrike', 'Datadog', 'Palo Alto Networks'
]);

// Load bot state from database
async function loadState() {
  try {
    const result = await dbClient.execute({
      sql: "SELECT value FROM bot_state WHERE bot_name = ?",
      args: ['company-bot']
    });
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value);
    }
  } catch (e) {
    // Table might not exist yet
  }
  return {
    lastProcessedIndex: 0,
    lastRunDate: null,
    totalProcessed: 0,
    totalCompaniesAdded: 0,
    questionsUpdated: 0
  };
}

// Save bot state to database
async function saveState(state) {
  state.lastRunDate = new Date().toISOString();
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS bot_state (
        bot_name TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `);
    await dbClient.execute({
      sql: "INSERT OR REPLACE INTO bot_state (bot_name, value, updated_at) VALUES (?, ?, ?)",
      args: ['company-bot', JSON.stringify(state), new Date().toISOString()]
    });
  } catch (e) {
    console.error('Failed to save state:', e.message);
  }
}

// NFR: Validate company data
function validateCompanies(companies) {
  if (!companies || !Array.isArray(companies)) return [];
  
  return companies
    .filter(c => c && typeof c === 'string' && c.length >= 2)
    .map(c => c.trim())
    .filter(c => {
      // Check if it's a known company or looks like a valid company name
      const isKnown = [...KNOWN_COMPANIES].some(
        known => known.toLowerCase() === c.toLowerCase()
      );
      const looksValid = /^[A-Za-z0-9\s&.-]+$/.test(c) && c.length <= 50;
      return isKnown || looksValid;
    });
}

// Check if question needs company data
function needsCompanyWork(question) {
  const companies = question.companies || [];
  const validCompanies = validateCompanies(companies);
  
  if (validCompanies.length === 0) return { needs: true, reason: 'missing' };
  if (validCompanies.length < MIN_COMPANIES) return { needs: true, reason: 'insufficient' };
  
  return { needs: false, reason: 'valid', count: validCompanies.length };
}

// Find companies that ask this type of question using AI
async function findCompaniesForQuestion(question) {
  const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Find real tech companies that ask this interview question or similar ones.

Question: "${question.question}"
Topic: ${question.tags?.slice(0, 4).join(', ') || 'technical interview'}
Difficulty: ${question.difficulty || 'intermediate'}

Research which companies are known to ask this type of question in their interviews.
Consider: FAANG, top tech (Microsoft, Uber, Airbnb, LinkedIn, Stripe), finance tech (Goldman Sachs, Bloomberg, Citadel), startups (Databricks, Snowflake, Coinbase).

Output this exact JSON structure:
{"companies":["Company1","Company2","Company3","Company4","Company5"],"confidence":"high|medium|low","reasoning":"brief explanation"}

IMPORTANT: Return ONLY the JSON object. No other text.`;

  const response = await runWithRetries(prompt);
  if (!response) return null;
  
  const data = parseJson(response);
  if (!data || !data.companies) return null;
  
  // NFR: Validate and normalize companies
  const validated = normalizeCompanies(data.companies);
  
  if (validated.length === 0) {
    console.log('  ⚠️ No valid companies in response');
    return null;
  }
  
  return {
    companies: validated,
    confidence: data.confidence || 'low',
    reasoning: data.reasoning || ''
  };
}

// NFR: Rate limiting helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Company Bot - Add Company Data ===\n');
  
  const state = await loadState();
  const allQuestions = await getAllUnifiedQuestions();
  
  console.log(`📊 Database: ${allQuestions.length} questions`);
  console.log(`📍 Last processed index: ${state.lastProcessedIndex}`);
  console.log(`📅 Last run: ${state.lastRunDate || 'Never'}`);
  console.log(`⚙️ Batch size: ${BATCH_SIZE}`);
  console.log(`🏢 Min companies required: ${MIN_COMPANIES}\n`);
  
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
  
  const questions = await loadUnifiedQuestions();
  const results = {
    processed: 0,
    companiesAdded: 0,
    questionsUpdated: 0,
    skipped: 0,
    failed: 0
  };
  
  for (let i = 0; i < batch.length; i++) {
    const question = batch[i];
    const globalIndex = startIndex + i + 1;
    
    console.log(`\n--- [${globalIndex}/${sortedQuestions.length}] ${question.id} ---`);
    console.log(`Q: ${question.question.substring(0, 50)}...`);
    
    const currentCompanies = question.companies || [];
    console.log(`Current companies: ${currentCompanies.length > 0 ? currentCompanies.join(', ') : 'none'}`);
    
    const check = needsCompanyWork(question);
    console.log(`Status: ${check.reason}${check.count ? ` (${check.count} companies)` : ''}`);
    
    if (!check.needs) {
      console.log('✅ Company data is good, skipping');
      results.skipped++;
      results.processed++;
      
      // NFR: Update state after each question
      await saveState({
        ...state,
        lastProcessedIndex: startIndex + i + 1,
        totalProcessed: state.totalProcessed + results.processed
      });
      continue;
    }
    
    console.log(`🔍 Finding companies (reason: ${check.reason})...`);
    
    // NFR: Rate limiting
    if (i > 0) await sleep(RATE_LIMIT_MS);
    
    const found = await findCompaniesForQuestion(question);
    
    if (!found) {
      console.log('❌ Failed to find companies');
      results.failed++;
      results.processed++;
      
      await saveState({
        ...state,
        lastProcessedIndex: startIndex + i + 1,
        totalProcessed: state.totalProcessed + results.processed
      });
      continue;
    }
    
    console.log(`✅ Found ${found.companies.length} companies (confidence: ${found.confidence})`);
    console.log(`   Companies: ${found.companies.join(', ')}`);
    
    // Merge with existing companies (deduplicate)
    const existingNormalized = normalizeCompanies(currentCompanies);
    const mergedCompanies = [...new Set([...existingNormalized, ...found.companies])].sort();
    
    const newCompaniesCount = mergedCompanies.length - existingNormalized.length;
    
    // Update question
    const updatedQuestion = {
      ...questions[question.id],
      companies: mergedCompanies,
      lastUpdated: new Date().toISOString()
    };
    questions[question.id] = updatedQuestion;
    
    // NFR: Save immediately after each update
    await saveQuestion(updatedQuestion);
    console.log(`💾 Saved (added ${newCompaniesCount} new companies)`);
    
    results.companiesAdded += newCompaniesCount;
    results.questionsUpdated++;
    results.processed++;
    
    // NFR: Update state after each question
    await saveState({
      ...state,
      lastProcessedIndex: startIndex + i + 1,
      totalProcessed: state.totalProcessed + results.processed,
      totalCompaniesAdded: state.totalCompaniesAdded + results.companiesAdded,
      questionsUpdated: state.questionsUpdated + results.questionsUpdated
    });
  }
  
  const newState = {
    lastProcessedIndex: endIndex >= sortedQuestions.length ? 0 : endIndex,
    lastRunDate: new Date().toISOString(),
    totalProcessed: state.totalProcessed + results.processed,
    totalCompaniesAdded: state.totalCompaniesAdded + results.companiesAdded,
    questionsUpdated: state.questionsUpdated + results.questionsUpdated
  };
  await saveState(newState);
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`Questions Updated: ${results.questionsUpdated}`);
  console.log(`Companies Added: ${results.companiesAdded}`);
  console.log(`Skipped (valid): ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`\nNext run starts at: ${newState.lastProcessedIndex}`);
  console.log(`All-time companies added: ${newState.totalCompaniesAdded}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    processed: results.processed,
    questions_updated: results.questionsUpdated,
    companies_added: results.companiesAdded,
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
