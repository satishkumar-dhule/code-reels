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

  // Fetch bot activity from work_queue
  console.log('\n📥 Fetching bot activity...');
  try {
    const activityResult = await client.execute(`
      SELECT 
        w.id,
        w.bot_type as botType,
        w.question_id as questionId,
        q.question as questionText,
        q.channel,
        w.reason as action,
        w.status,
        w.result,
        w.completed_at as completedAt
      FROM work_queue w
      LEFT JOIN questions q ON w.question_id = q.id
      WHERE w.status IN ('completed', 'failed')
      ORDER BY w.completed_at DESC
      LIMIT 100
    `);

    const activities = activityResult.rows.map(row => ({
      id: row.id,
      botType: row.botType,
      questionId: row.questionId,
      questionText: row.questionText ? String(row.questionText).substring(0, 100) : 'Unknown question',
      channel: row.channel || 'unknown',
      action: row.action || 'processed',
      status: row.status,
      completedAt: row.completedAt
    }));

    // Calculate stats per bot
    const statsResult = await client.execute(`
      SELECT 
        bot_type as botType,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        MAX(completed_at) as lastRun
      FROM work_queue
      WHERE status IN ('completed', 'failed')
      GROUP BY bot_type
      ORDER BY lastRun DESC
    `);

    const botStats = statsResult.rows.map(row => ({
      botType: row.botType,
      completed: Number(row.completed) || 0,
      failed: Number(row.failed) || 0,
      lastRun: row.lastRun || new Date().toISOString()
    }));

    const botActivityFile = path.join(OUTPUT_DIR, 'bot-activity.json');
    fs.writeFileSync(botActivityFile, JSON.stringify({
      activities,
      stats: botStats,
      lastUpdated: new Date().toISOString()
    }, null, 0));
    console.log(`   ✓ bot-activity.json (${activities.length} activities, ${botStats.length} bots)`);
  } catch (e) {
    console.log(`   ⚠️ Could not fetch bot activity: ${e.message}`);
    // Write empty bot activity file
    const botActivityFile = path.join(OUTPUT_DIR, 'bot-activity.json');
    fs.writeFileSync(botActivityFile, JSON.stringify({
      activities: [],
      stats: [],
      lastUpdated: new Date().toISOString()
    }, null, 0));
    console.log(`   ✓ bot-activity.json (empty - work_queue may not exist)`);
  }

  // Fetch GitHub analytics
  console.log('\n📥 Fetching GitHub analytics...');
  try {
    // Get recent views/clones data
    const viewsResult = await client.execute(`
      SELECT date, repo, metric_type, metric_name, count, uniques
      FROM github_analytics
      WHERE metric_type IN ('views', 'clones')
      ORDER BY date DESC
      LIMIT 60
    `);

    // Get latest referrers
    const referrersResult = await client.execute(`
      SELECT metric_name as referrer, count, uniques
      FROM github_analytics
      WHERE metric_type = 'referrer'
      AND date = (SELECT MAX(date) FROM github_analytics WHERE metric_type = 'referrer')
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get latest repo stats
    const repoStatsResult = await client.execute(`
      SELECT repo, metric_name, count
      FROM github_analytics
      WHERE metric_type = 'repo_stat'
      AND date = (SELECT MAX(date) FROM github_analytics WHERE metric_type = 'repo_stat')
    `);

    // Aggregate views by date
    const viewsByDate = {};
    const clonesByDate = {};
    for (const row of viewsResult.rows) {
      const date = row.date;
      if (row.metric_type === 'views') {
        if (!viewsByDate[date]) viewsByDate[date] = { count: 0, uniques: 0 };
        viewsByDate[date].count += Number(row.count) || 0;
        viewsByDate[date].uniques += Number(row.uniques) || 0;
      } else if (row.metric_type === 'clones') {
        if (!clonesByDate[date]) clonesByDate[date] = { count: 0, uniques: 0 };
        clonesByDate[date].count += Number(row.count) || 0;
        clonesByDate[date].uniques += Number(row.uniques) || 0;
      }
    }

    // Format for chart display
    const views = Object.entries(viewsByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const clones = Object.entries(clonesByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const referrers = referrersResult.rows.map(row => ({
      referrer: row.referrer,
      count: Number(row.count) || 0,
      uniques: Number(row.uniques) || 0
    }));

    // Aggregate repo stats
    const repoStats = {};
    for (const row of repoStatsResult.rows) {
      const repo = row.repo;
      if (!repoStats[repo]) repoStats[repo] = {};
      repoStats[repo][row.metric_name] = Number(row.count) || 0;
    }

    const githubAnalyticsFile = path.join(OUTPUT_DIR, 'github-analytics.json');
    fs.writeFileSync(githubAnalyticsFile, JSON.stringify({
      views,
      clones,
      referrers,
      repoStats,
      lastUpdated: new Date().toISOString()
    }, null, 0));
    console.log(`   ✓ github-analytics.json (${views.length} days of data)`);
  } catch (e) {
    console.log(`   ⚠️ Could not fetch GitHub analytics: ${e.message}`);
    // Write empty analytics file
    const githubAnalyticsFile = path.join(OUTPUT_DIR, 'github-analytics.json');
    fs.writeFileSync(githubAnalyticsFile, JSON.stringify({
      views: [],
      clones: [],
      referrers: [],
      repoStats: {},
      lastUpdated: new Date().toISOString()
    }, null, 0));
    console.log(`   ✓ github-analytics.json (empty - table may not exist yet)`);
  }

  console.log('\n✅ Static data files generated successfully!');
  console.log(`   Output directory: ${OUTPUT_DIR}`);
  console.log(`   Total questions: ${questions.length}`);
  console.log(`   Total channels: ${channelStats.length}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
