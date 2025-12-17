/**
 * Fetch questions from Turso database and generate static JSON files for GitHub Pages build.
 * This script runs during the build process to embed all questions into the static site.
 */
import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'client/public/data';

// Use read-only credentials
const url = process.env.TURSO_DATABASE_URL_RO || process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN_RO || process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ Missing TURSO_DATABASE_URL environment variable');
  process.exit(1);
}

const client = createClient({ url, authToken });

function parseQuestionRow(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    diagram: row.diagram,
    difficulty: row.difficulty,
    tags: row.tags ? JSON.parse(row.tags) : [],
    channel: row.channel,
    subChannel: row.sub_channel,
    sourceUrl: row.source_url,
    videos: row.videos ? JSON.parse(row.videos) : null,
    companies: row.companies ? JSON.parse(row.companies) : null,
    eli5: row.eli5,
    lastUpdated: row.last_updated,
  };
}

async function main() {
  console.log('=== Fetching Questions from Turso for Static Build ===\n');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Fetch all questions
  console.log('📥 Fetching all questions...');
  const result = await client.execute('SELECT * FROM questions ORDER BY channel, sub_channel, id');
  const questions = result.rows.map(parseQuestionRow);
  console.log(`   Found ${questions.length} questions`);

  // Group questions by channel
  const channelData = {};
  const channelStats = [];

  for (const q of questions) {
    if (!channelData[q.channel]) {
      channelData[q.channel] = {
        questions: [],
        subChannels: new Set(),
        companies: new Set(),
        stats: { total: 0, beginner: 0, intermediate: 0, advanced: 0 }
      };
    }
    
    channelData[q.channel].questions.push(q);
    channelData[q.channel].subChannels.add(q.subChannel);
    channelData[q.channel].stats.total++;
    channelData[q.channel].stats[q.difficulty]++;
    
    if (q.companies) {
      q.companies.forEach(c => channelData[q.channel].companies.add(c));
    }
  }

  // Write individual channel files
  console.log('\n📝 Writing channel files...');
  for (const [channelId, data] of Object.entries(channelData)) {
    const channelFile = path.join(OUTPUT_DIR, `${channelId}.json`);
    fs.writeFileSync(channelFile, JSON.stringify({
      questions: data.questions,
      subChannels: Array.from(data.subChannels).sort(),
      companies: Array.from(data.companies).sort(),
      stats: data.stats
    }, null, 0)); // Minified for production
    console.log(`   ✓ ${channelId}.json (${data.questions.length} questions)`);
    
    channelStats.push({
      id: channelId,
      questionCount: data.stats.total,
      ...data.stats
    });
  }

  // Write channels index
  const channelsFile = path.join(OUTPUT_DIR, 'channels.json');
  fs.writeFileSync(channelsFile, JSON.stringify(channelStats, null, 0));
  console.log(`   ✓ channels.json (${channelStats.length} channels)`);

  // Write all questions index (for search)
  const allQuestionsFile = path.join(OUTPUT_DIR, 'all-questions.json');
  const searchIndex = questions.map(q => ({
    id: q.id,
    question: q.question,
    channel: q.channel,
    subChannel: q.subChannel,
    difficulty: q.difficulty,
    tags: q.tags,
    companies: q.companies
  }));
  fs.writeFileSync(allQuestionsFile, JSON.stringify(searchIndex, null, 0));
  console.log(`   ✓ all-questions.json (search index)`);

  // Write stats
  const statsFile = path.join(OUTPUT_DIR, 'stats.json');
  fs.writeFileSync(statsFile, JSON.stringify({
    totalQuestions: questions.length,
    totalChannels: channelStats.length,
    channels: channelStats,
    lastUpdated: new Date().toISOString()
  }, null, 0));
  console.log(`   ✓ stats.json`);

  console.log('\n✅ Static data files generated successfully!');
  console.log(`   Output directory: ${OUTPUT_DIR}`);
  console.log(`   Total questions: ${questions.length}`);
  console.log(`   Total channels: ${channelStats.length}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
