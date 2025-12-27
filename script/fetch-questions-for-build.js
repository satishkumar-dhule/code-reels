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
    relevanceScore: row.relevance_score,
    voiceKeywords: row.voice_keywords ? JSON.parse(row.voice_keywords) : null,
    lastUpdated: row.last_updated,
    createdAt: row.created_at,
  };
}

// Check if a date is within the last 7 days
function isWithinLastWeek(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= weekAgo;
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
        stats: { total: 0, beginner: 0, intermediate: 0, advanced: 0, newThisWeek: 0 }
      };
    }
    
    channelData[q.channel].questions.push(q);
    channelData[q.channel].subChannels.add(q.subChannel);
    channelData[q.channel].stats.total++;
    channelData[q.channel].stats[q.difficulty]++;
    
    // Count questions added in the last week
    if (isWithinLastWeek(q.createdAt)) {
      channelData[q.channel].stats.newThisWeek++;
    }
    
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
    // Get only the most recent activity per question per bot (no duplicates)
    const activityResult = await client.execute(`
      WITH RankedActivity AS (
        SELECT 
          w.id,
          w.bot_type as botType,
          w.question_id as questionId,
          q.question as questionText,
          q.channel,
          w.reason as action,
          w.status,
          w.result,
          w.completed_at as completedAt,
          ROW_NUMBER() OVER (PARTITION BY w.bot_type, w.question_id ORDER BY w.completed_at DESC) as rn
        FROM work_queue w
        LEFT JOIN questions q ON w.question_id = q.id
        WHERE w.status IN ('completed', 'failed')
      )
      SELECT id, botType, questionId, questionText, channel, action, status, result, completedAt
      FROM RankedActivity
      WHERE rn = 1
      ORDER BY completedAt DESC
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

    // Calculate stats per bot (still count all runs for accurate totals)
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

  // Fetch tests from database
  console.log('\n📥 Fetching tests...');
  try {
    const testsResult = await client.execute(`
      SELECT id, channel_id, channel_name, title, description, questions, passing_score, created_at, last_updated, version
      FROM tests
      ORDER BY channel_name
    `);

    // Filter out irrelevant questions that reference specific scenarios/case studies
    const isIrrelevantQuestion = (q) => {
      const text = (q.question || '').toLowerCase();
      return (
        text.includes('percentage') && text.includes('candidate') ||
        text.includes('the candidate') && text.includes('when') ||
        text.includes('how many') && text.includes('candidate') ||
        text.includes('what number') && text.includes('candidate') ||
        text.includes('the team') && text.includes('when they') ||
        text.includes('in the scenario') ||
        text.includes('in this case') ||
        text.includes('monitoring data') && text.includes('decision') ||
        text.includes('critical database migration') ||
        text.length < 30
      );
    };

    const tests = testsResult.rows.map(row => {
      const allQuestions = JSON.parse(row.questions);
      // Filter out irrelevant questions
      const filteredQuestions = allQuestions.filter(q => !isIrrelevantQuestion(q));
      
      return {
        id: row.id,
        channelId: row.channel_id,
        channelName: row.channel_name,
        title: row.title,
        description: row.description,
        questions: filteredQuestions,
        passingScore: row.passing_score || 70,
        createdAt: row.created_at,
        lastUpdated: row.last_updated,
        version: row.version || 1
      };
    });

    const testsFile = path.join(OUTPUT_DIR, 'tests.json');
    fs.writeFileSync(testsFile, JSON.stringify(tests, null, 0));
    console.log(`   ✓ tests.json (${tests.length} tests)`);
  } catch (e) {
    console.log(`   ⚠️ Could not fetch tests: ${e.message}`);
    const testsFile = path.join(OUTPUT_DIR, 'tests.json');
    fs.writeFileSync(testsFile, JSON.stringify([], null, 0));
    console.log(`   ✓ tests.json (empty - table may not exist yet)`);
  }

  // Fetch coding challenges from database
  console.log('\n📥 Fetching coding challenges...');
  try {
    const challengesResult = await client.execute(`
      SELECT id, title, description, difficulty, category, tags, companies,
             starter_code_js, starter_code_py, test_cases, hints,
             solution_js, solution_py, complexity_time, complexity_space, complexity_explanation,
             time_limit, created_at
      FROM coding_challenges
      ORDER BY category, difficulty, id
    `);

    const challenges = challengesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      companies: row.companies ? JSON.parse(row.companies) : [],
      starterCode: {
        javascript: row.starter_code_js,
        python: row.starter_code_py
      },
      testCases: row.test_cases ? JSON.parse(row.test_cases) : [],
      hints: row.hints ? JSON.parse(row.hints) : [],
      solution: {
        javascript: row.solution_js,
        python: row.solution_py
      },
      complexity: {
        time: row.complexity_time,
        space: row.complexity_space,
        explanation: row.complexity_explanation
      },
      timeLimit: row.time_limit || 15,
      createdAt: row.created_at
    }));

    const challengesFile = path.join(OUTPUT_DIR, 'coding-challenges.json');
    fs.writeFileSync(challengesFile, JSON.stringify(challenges, null, 0));
    console.log(`   ✓ coding-challenges.json (${challenges.length} challenges)`);
  } catch (e) {
    console.log(`   ⚠️ Could not fetch coding challenges: ${e.message}`);
    const challengesFile = path.join(OUTPUT_DIR, 'coding-challenges.json');
    fs.writeFileSync(challengesFile, JSON.stringify([], null, 0));
    console.log(`   ✓ coding-challenges.json (empty - table may not exist yet)`);
  }

  // Generate changelog from bot activity
  console.log('\n📥 Generating changelog from bot activity...');
  try {
    // Get recent bot activity grouped by date
    const changelogResult = await client.execute(`
      SELECT 
        DATE(completed_at) as date,
        bot_type,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT q.channel) as channels
      FROM work_queue w
      LEFT JOIN questions q ON w.question_id = q.id
      WHERE w.status = 'completed'
        AND w.completed_at >= DATE('now', '-30 days')
      GROUP BY DATE(completed_at), bot_type
      ORDER BY date DESC, count DESC
    `);

    // Group by date
    const entriesByDate = {};
    for (const row of changelogResult.rows) {
      const date = row.date;
      if (!entriesByDate[date]) {
        entriesByDate[date] = {
          date,
          questionsAdded: 0,
          questionsImproved: 0,
          channels: new Set(),
          activities: []
        };
      }
      
      const entry = entriesByDate[date];
      const channels = row.channels ? row.channels.split(',').filter(Boolean) : [];
      channels.forEach(c => entry.channels.add(c));
      
      if (row.bot_type === 'generate' || row.bot_type === 'coding-challenge') {
        entry.questionsAdded += Number(row.count) || 0;
        entry.activities.push({ type: row.bot_type, action: 'added', count: Number(row.count) || 0 });
      } else if (['improve', 'mermaid', 'eli5', 'tldr', 'video', 'company'].includes(row.bot_type)) {
        entry.questionsImproved += Number(row.count) || 0;
        entry.activities.push({ type: row.bot_type, action: 'improved', count: Number(row.count) || 0 });
      }
    }

    // Convert to changelog entries
    const changelogEntries = Object.values(entriesByDate)
      .filter(e => e.questionsAdded > 0 || e.questionsImproved > 0)
      .map(e => ({
        date: e.date,
        type: e.questionsAdded > 0 ? 'added' : 'improved',
        title: e.questionsAdded > 0 
          ? `${e.questionsAdded} new question${e.questionsAdded > 1 ? 's' : ''} added`
          : `${e.questionsImproved} question${e.questionsImproved > 1 ? 's' : ''} improved`,
        description: `Bot activity on ${e.date}`,
        details: {
          questionsAdded: e.questionsAdded,
          questionsImproved: e.questionsImproved,
          channels: Array.from(e.channels),
          activities: e.activities
        }
      }))
      .slice(0, 30); // Keep last 30 days

    // Calculate totals
    const totals = await client.execute(`
      SELECT 
        SUM(CASE WHEN bot_type IN ('generate', 'coding-challenge') THEN 1 ELSE 0 END) as added,
        SUM(CASE WHEN bot_type NOT IN ('generate', 'coding-challenge') THEN 1 ELSE 0 END) as improved
      FROM work_queue
      WHERE status = 'completed'
    `);

    const changelog = {
      entries: changelogEntries.length > 0 ? changelogEntries : [{
        date: new Date().toISOString().split('T')[0],
        type: 'feature',
        title: 'Platform Active',
        description: 'Questions served from Turso database with real-time bot updates.',
        details: { features: ['Real-time updates', 'AI-powered improvements'] }
      }],
      stats: {
        totalQuestionsAdded: Number(totals.rows[0]?.added) || questions.length,
        totalQuestionsImproved: Number(totals.rows[0]?.improved) || 0,
        lastUpdated: new Date().toISOString()
      }
    };

    const changelogFile = path.join(OUTPUT_DIR, 'changelog.json');
    fs.writeFileSync(changelogFile, JSON.stringify(changelog, null, 0));
    console.log(`   ✓ changelog.json (${changelogEntries.length} entries)`);
  } catch (e) {
    console.log(`   ⚠️ Could not generate changelog: ${e.message}`);
    // Write default changelog
    const changelogFile = path.join(OUTPUT_DIR, 'changelog.json');
    fs.writeFileSync(changelogFile, JSON.stringify({
      entries: [{
        date: new Date().toISOString().split('T')[0],
        type: 'feature',
        title: 'Platform Active',
        description: 'Questions served from database.',
        details: {}
      }],
      stats: {
        totalQuestionsAdded: questions.length,
        totalQuestionsImproved: 0,
        lastUpdated: new Date().toISOString()
      }
    }, null, 0));
    console.log(`   ✓ changelog.json (default)`);
  }

  // Fetch blog posts mapping
  console.log('\n📥 Fetching blog posts...');
  try {
    const blogResult = await client.execute(`
      SELECT question_id, title, slug
      FROM blog_posts
      ORDER BY created_at DESC
    `);

    const blogPosts = {};
    for (const row of blogResult.rows) {
      blogPosts[row.question_id] = {
        title: row.title,
        slug: row.slug,
        url: `/posts/${row.question_id}/${row.slug}/`
      };
    }

    const blogPostsFile = path.join(OUTPUT_DIR, 'blog-posts.json');
    fs.writeFileSync(blogPostsFile, JSON.stringify(blogPosts, null, 0));
    console.log(`   ✓ blog-posts.json (${Object.keys(blogPosts).length} posts)`);
  } catch (e) {
    console.log(`   ⚠️ Could not fetch blog posts: ${e.message}`);
    const blogPostsFile = path.join(OUTPUT_DIR, 'blog-posts.json');
    fs.writeFileSync(blogPostsFile, JSON.stringify({}, null, 0));
    console.log(`   ✓ blog-posts.json (empty - table may not exist yet)`);
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
