/**
 * Coding Challenge Generator Bot
 * Generates coding challenges using OpenCode CLI (same pattern as other bots)
 * Saves challenges to database as the source of truth
 * 
 * Usage:
 *   node script/coding-challenge-bot.js
 * 
 * Environment variables:
 *   INPUT_DIFFICULTY - 'easy', 'medium', or 'random' (default: random)
 *   INPUT_CATEGORY - specific category or 'random' (default: random)
 *   INPUT_COUNT - number of challenges to generate (default: 1)
 */

import { writeGitHubOutput, dbClient } from './utils.js';
import ai from './ai/index.js';
import { categories as CATEGORIES, difficulties as DIFFICULTIES, topCompanies as TOP_COMPANIES } from './ai/prompts/templates/coding-challenge.js';

// Get 2-4 random companies
function getRandomCompanies() {
  const count = Math.floor(Math.random() * 3) + 2; // 2-4 companies
  const shuffled = [...TOP_COMPANIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Initialize coding_challenges table
async function initCodingChallengesTable() {
  console.log('📦 Ensuring coding_challenges table exists...');
  
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS coding_challenges (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT,
      companies TEXT,
      starter_code_js TEXT,
      starter_code_py TEXT,
      test_cases TEXT NOT NULL,
      hints TEXT,
      solution_js TEXT,
      solution_py TEXT,
      complexity_time TEXT,
      complexity_space TEXT,
      complexity_explanation TEXT,
      time_limit INTEGER DEFAULT 15,
      created_at TEXT,
      last_updated TEXT
    )
  `);
  
  // Create indexes
  await dbClient.execute(`CREATE INDEX IF NOT EXISTS idx_coding_difficulty ON coding_challenges(difficulty)`);
  await dbClient.execute(`CREATE INDEX IF NOT EXISTS idx_coding_category ON coding_challenges(category)`);
  
  console.log('✅ Table ready');
}

// Generate unique ID for coding challenge
async function generateChallengeId() {
  const result = await dbClient.execute(`
    SELECT MAX(CAST(SUBSTR(id, 3) AS INTEGER)) as max_num 
    FROM coding_challenges 
    WHERE id LIKE 'cc%' AND id GLOB 'cc[0-9]*'
  `);
  
  const maxNum = result.rows[0]?.max_num || 0;
  return `cc${maxNum + 1}`;
}

// Check for duplicate challenge by title similarity (fuzzy match)
async function isDuplicateChallenge(title) {
  // Normalize title for comparison
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const result = await dbClient.execute('SELECT title FROM coding_challenges');
  
  for (const row of result.rows) {
    const existingNormalized = row.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Exact match after normalization
    if (existingNormalized === normalizedTitle) {
      return true;
    }
    
    // Check if one contains the other (catches "Two Sum" vs "Two Sum II")
    if (existingNormalized.includes(normalizedTitle) || normalizedTitle.includes(existingNormalized)) {
      // Only flag if they're very similar (>80% overlap)
      const shorter = Math.min(existingNormalized.length, normalizedTitle.length);
      const longer = Math.max(existingNormalized.length, normalizedTitle.length);
      if (shorter / longer > 0.8) {
        return true;
      }
    }
  }
  
  return false;
}

// Get existing challenge titles for a category (for prompt context)
async function getExistingTitlesForCategory(category) {
  const result = await dbClient.execute({
    sql: 'SELECT title FROM coding_challenges WHERE category = ? LIMIT 20',
    args: [category]
  });
  return result.rows.map(r => r.title);
}

// Validate challenge structure
function validateChallenge(data) {
  if (!data) return false;
  
  const required = ['title', 'description', 'difficulty', 'starterCode', 'testCases', 'sampleSolution', 'complexity'];
  for (const field of required) {
    if (!data[field]) {
      console.log(`❌ Missing required field: ${field}`);
      return false;
    }
  }
  
  if (!data.starterCode.javascript || !data.starterCode.python) {
    console.log('❌ Missing starter code for JS or Python');
    return false;
  }
  
  if (!data.sampleSolution.javascript || !data.sampleSolution.python) {
    console.log('❌ Missing sample solution for JS or Python');
    return false;
  }
  
  if (!Array.isArray(data.testCases) || data.testCases.length < 2) {
    console.log('❌ Need at least 2 test cases');
    return false;
  }
  
  // Validate test cases have required fields
  for (const tc of data.testCases) {
    if (!tc.input || tc.expectedOutput === undefined) {
      console.log('❌ Test case missing input or expectedOutput');
      return false;
    }
  }
  
  return true;
}

// Save challenge to database
async function saveChallengeToDb(challenge) {
  const id = await generateChallengeId();
  const now = new Date().toISOString();
  
  await dbClient.execute({
    sql: `INSERT INTO coding_challenges 
          (id, title, description, difficulty, category, tags, companies,
           starter_code_js, starter_code_py, test_cases, hints,
           solution_js, solution_py, complexity_time, complexity_space,
           complexity_explanation, time_limit, created_at, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      challenge.title,
      challenge.description,
      challenge.difficulty,
      challenge.category,
      JSON.stringify(challenge.tags || []),
      JSON.stringify(challenge.companies || []),
      challenge.starterCode?.javascript || '',
      challenge.starterCode?.python || '',
      JSON.stringify(challenge.testCases),
      JSON.stringify(challenge.hints || []),
      challenge.sampleSolution?.javascript || '',
      challenge.sampleSolution?.python || '',
      challenge.complexity?.time || 'O(n)',
      challenge.complexity?.space || 'O(1)',
      challenge.complexity?.explanation || '',
      challenge.timeLimit || 15,
      now,
      now
    ]
  });
  
  return id;
}

// Get count of challenges in database
async function getChallengeCount() {
  const result = await dbClient.execute('SELECT COUNT(*) as count FROM coding_challenges');
  return result.rows[0]?.count || 0;
}

async function generateChallenge(difficulty, category) {
  const companies = getRandomCompanies();
  const categoryTitles = await getExistingTitlesForCategory(category);
  
  console.log(`\n🎯 Generating ${difficulty} challenge for ${category}...`);
  console.log(`🏢 Target companies: ${companies.join(', ')}`);
  
  console.log('\n📝 Using AI framework for generation');
  console.log('─'.repeat(50));
  
  try {
    const data = await ai.run('coding-challenge', {
      difficulty,
      category,
      companies,
      existingTitles: categoryTitles
    });
    
    if (!validateChallenge(data)) {
      console.log('❌ Invalid challenge format');
      return null;
    }
    
    // Ensure test case IDs
    data.testCases = data.testCases.map((tc, i) => ({
      ...tc,
      id: tc.id || String(i + 1),
    }));
    
    // Ensure tags array
    if (!Array.isArray(data.tags)) {
      data.tags = [category];
    }
    
    // Ensure hints array
    if (!Array.isArray(data.hints)) {
      data.hints = ['Think about the problem step by step'];
    }
    
    // Ensure companies array
    if (!Array.isArray(data.companies)) {
      data.companies = companies;
    }
    
    return data;
  } catch (error) {
    console.log(`❌ AI error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('=== 🤖 Coding Challenge Generator Bot ===\n');
  
  // Initialize database table
  await initCodingChallengesTable();
  
  const initialCount = await getChallengeCount();
  console.log(`📊 Current challenges in database: ${initialCount}`);
  
  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'random';
  const inputCategory = process.env.INPUT_CATEGORY || 'random';
  const inputCount = parseInt(process.env.INPUT_COUNT || '1', 10);
  
  console.log(`\nConfiguration:`);
  console.log(`  Difficulty: ${inputDifficulty}`);
  console.log(`  Category: ${inputCategory}`);
  console.log(`  Count: ${inputCount}`);
  
  const generated = [];
  const failed = [];
  
  for (let i = 0; i < inputCount; i++) {
    console.log(`\n--- Challenge ${i + 1}/${inputCount} ---`);
    
    const difficulty = inputDifficulty === 'random'
      ? DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)]
      : inputDifficulty;
    
    const category = inputCategory === 'random'
      ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
      : inputCategory;
    
    const challenge = await generateChallenge(difficulty, category);
    
    if (challenge) {
      // Check for duplicates
      if (await isDuplicateChallenge(challenge.title)) {
        console.log(`⚠️ Duplicate title detected: ${challenge.title}`);
        failed.push({ difficulty, category, reason: 'Duplicate title' });
        continue;
      }
      
      // Save to database
      try {
        const challengeId = await saveChallengeToDb(challenge);
        challenge.id = challengeId;
        generated.push(challenge);
        
        console.log(`✅ Saved to database: ${challengeId}`);
        console.log(`   Title: ${challenge.title}`);
        console.log(`   Difficulty: ${challenge.difficulty}`);
        console.log(`   Category: ${challenge.category}`);
        console.log(`   Companies: ${challenge.companies?.join(', ') || 'N/A'}`);
        console.log(`   Test cases: ${challenge.testCases.length}`);
        
        // Note: Skip logBotActivity for coding challenges since they're not in questions table
        // The work_queue has a foreign key constraint on question_id
      } catch (dbError) {
        console.log(`❌ Database error: ${dbError.message}`);
        failed.push({ difficulty, category, reason: `DB error: ${dbError.message}` });
      }
    } else {
      failed.push({ difficulty, category, reason: 'Generation failed' });
    }
  }
  
  const finalCount = await getChallengeCount();
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Generated: ${generated.length}/${inputCount}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total challenges in database: ${finalCount}`);
  
  if (generated.length > 0) {
    console.log('\n✅ Added Challenges:');
    generated.forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.id}] ${c.title} (${c.difficulty}, ${c.category})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed:');
    failed.forEach(f => console.log(`  - ${f.category} (${f.difficulty}): ${f.reason}`));
  }
  
  writeGitHubOutput({
    generated_count: generated.length,
    failed_count: failed.length,
    total_challenges: finalCount,
    added_ids: generated.map(c => c.id).join(',')
  });
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
