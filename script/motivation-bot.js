import fs from 'fs';
import path from 'path';
import { runWithRetries, parseJson } from './utils.js';

const QUOTES_FILE = 'client/src/lib/quotes/daily-quotes.json';
const MIN_QUOTES = 30; // Maintain at least 30 quotes
const QUOTES_TO_ADD = 5; // Add 5 new quotes per run

// Load existing quotes
function loadQuotes() {
  try {
    return JSON.parse(fs.readFileSync(QUOTES_FILE, 'utf-8'));
  } catch {
    return { quotes: [], todayIndex: 0, lastUpdated: new Date().toISOString().split('T')[0] };
  }
}

// Save quotes
function saveQuotes(data) {
  data.lastUpdated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(QUOTES_FILE, JSON.stringify(data, null, 2));
}

// Generate new motivational quotes using AI
async function generateQuotes(existingQuotes) {
  const existingTexts = existingQuotes.map(q => q.text.toLowerCase());
  
  const categories = [
    'coding wisdom',
    'career growth',
    'problem solving',
    'perseverance',
    'learning mindset',
    'interview success',
    'software craftsmanship',
    'debugging humor',
    'tech leadership',
    'innovation'
  ];
  
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];

  const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Generate ${QUOTES_TO_ADD} unique motivational quotes for software engineers about "${randomCategory}".

Requirements:
- Mix famous tech leaders, programmers, and original wisdom
- Keep quotes concise (under 150 characters)
- Make them inspiring and memorable
- Include a mix of serious and slightly humorous quotes
- Avoid these existing quotes: ${existingTexts.slice(0, 5).join('; ')}

Output this exact JSON structure:
{"quotes":[{"text":"quote text here","author":"Author Name","category":"${randomCategory}"}]}

IMPORTANT: Return ONLY the JSON object. No other text.`;

  console.log(`\n📝 Generating ${QUOTES_TO_ADD} quotes about "${randomCategory}"...`);
  
  const response = await runWithRetries(prompt);
  if (!response) {
    console.log('❌ AI generation failed');
    return [];
  }

  const data = parseJson(response);
  if (!data || !data.quotes || !Array.isArray(data.quotes)) {
    console.log('❌ Invalid response format');
    return [];
  }

  // Filter out duplicates and validate
  const newQuotes = data.quotes.filter(q => {
    if (!q.text || !q.author) return false;
    const textLower = q.text.toLowerCase();
    return !existingTexts.some(existing => 
      existing.includes(textLower.slice(0, 30)) || textLower.includes(existing.slice(0, 30))
    );
  });

  return newQuotes;
}

// Remove oldest quotes if we have too many
function pruneQuotes(quotes, maxQuotes = 50) {
  if (quotes.length <= maxQuotes) return quotes;
  
  // Keep the first 10 (classic quotes) and the most recent ones
  const classics = quotes.slice(0, 10);
  const recent = quotes.slice(-(maxQuotes - 10));
  return [...classics, ...recent];
}

async function main() {
  console.log('=== 💪 Inspirer Bot - Daily Dose of Motivation ===\n');

  const data = loadQuotes();
  console.log(`📚 Current quotes: ${data.quotes.length}`);

  // Check if we need more quotes
  if (data.quotes.length >= MIN_QUOTES) {
    console.log(`✅ Already have ${data.quotes.length} quotes (min: ${MIN_QUOTES})`);
    
    // Still rotate the index for variety
    data.todayIndex = (data.todayIndex + 1) % data.quotes.length;
    saveQuotes(data);
    console.log(`📅 Updated today's index to: ${data.todayIndex}`);
    return;
  }

  // Generate new quotes
  const newQuotes = await generateQuotes(data.quotes);
  
  if (newQuotes.length > 0) {
    data.quotes = [...data.quotes, ...newQuotes];
    data.quotes = pruneQuotes(data.quotes);
    data.todayIndex = (data.todayIndex + 1) % data.quotes.length;
    
    saveQuotes(data);
    
    console.log(`\n✅ Added ${newQuotes.length} new quotes`);
    newQuotes.forEach((q, i) => {
      console.log(`  ${i + 1}. "${q.text}" — ${q.author}`);
    });
    console.log(`\n📚 Total quotes: ${data.quotes.length}`);
  } else {
    console.log('⚠️ No new quotes generated');
  }

  console.log('\n=== Motivation Bot Complete ===');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
