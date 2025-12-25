/**
 * Generate Blog from Input
 * Takes a question or sentence and generates a blog post from it using OpenCode CLI
 * Same pattern as other bots - no APIs, no registration, free model
 * 
 * Usage: INPUT_TOPIC="your question or topic" node script/generate-blog-from-input.js
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { runWithRetries, parseJson, writeGitHubOutput } from './utils.js';
import blogInputTemplate from './ai/prompts/templates/blog-input.js';

// Database connection
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ Missing TURSO_DATABASE_URL environment variable');
  process.exit(1);
}

const client = createClient({ url, authToken });

// Initialize blog_posts table
async function initBlogPostsTable() {
  console.log('📦 Ensuring blog_posts table exists...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      introduction TEXT,
      sections TEXT,
      conclusion TEXT,
      meta_description TEXT,
      channel TEXT,
      difficulty TEXT,
      tags TEXT,
      diagram TEXT,
      created_at TEXT,
      published_at TEXT,
      quick_reference TEXT,
      glossary TEXT,
      real_world_example TEXT,
      fun_fact TEXT,
      sources TEXT,
      social_snippet TEXT,
      diagram_type TEXT,
      diagram_label TEXT
    )
  `);
  
  // Add missing columns if table already exists (migration)
  const columns = ['diagram_type', 'diagram_label', 'social_snippet', 'sources'];
  for (const col of columns) {
    try {
      await client.execute(`ALTER TABLE blog_posts ADD COLUMN ${col} TEXT`);
    } catch (e) {
      // Column already exists, ignore
    }
  }
  
  console.log('✅ Table ready\n');
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function generateId() {
  return `blog-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// Transform input to blog using OpenCode CLI (same pattern as other bots)
async function transformToBlogArticle(topic, channel, difficulty) {
  console.log('🤖 Generating blog with OpenCode CLI...\n');
  
  // Use centralized template
  const prompt = blogInputTemplate.build({ topic, channel, difficulty });

  console.log('📝 PROMPT:');
  console.log('─'.repeat(50));
  console.log(prompt.substring(0, 500) + '...');
  console.log('─'.repeat(50));
  
  const response = await runWithRetries(prompt);
  
  if (!response) {
    console.log('❌ OpenCode failed after all retries.');
    return null;
  }
  
  const data = parseJson(response);
  
  if (!data) {
    console.log('❌ Failed to parse JSON response.');
    return null;
  }
  
  console.log('✅ AI transformation complete');
  return data;
}

// Save blog post to database
async function saveBlogPost(blogContent, channel, difficulty) {
  const now = new Date().toISOString();
  const questionId = generateId();
  const slug = generateSlug(blogContent.title);
  
  await client.execute({
    sql: `INSERT INTO blog_posts 
          (question_id, title, slug, introduction, sections, conclusion, 
           meta_description, channel, difficulty, tags, diagram, quick_reference,
           glossary, real_world_example, fun_fact, sources, social_snippet, 
           diagram_type, diagram_label, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      questionId,
      blogContent.title,
      slug,
      blogContent.introduction,
      JSON.stringify(blogContent.sections || []),
      blogContent.conclusion,
      blogContent.metaDescription,
      channel || 'general',
      difficulty || 'intermediate',
      JSON.stringify(blogContent.tags || []),
      blogContent.diagram || null,
      JSON.stringify(blogContent.quickReference || []),
      JSON.stringify(blogContent.glossary || []),
      JSON.stringify(blogContent.realWorldExample || null),
      blogContent.funFact || null,
      JSON.stringify(blogContent.sources || []),
      JSON.stringify(blogContent.socialSnippet || null),
      blogContent.diagramType || null,
      blogContent.diagramLabel || null,
      now
    ]
  });
  
  return { questionId, slug };
}

async function main() {
  console.log('=== 📝 Blog Generator - From Input (OpenCode) ===\n');
  
  const inputTopic = process.env.INPUT_TOPIC;
  const inputChannel = process.env.INPUT_CHANNEL || 'general';
  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'intermediate';
  
  if (!inputTopic || inputTopic.trim().length < 10) {
    console.error('❌ Error: INPUT_TOPIC environment variable is required (min 10 chars)');
    console.error('Usage: INPUT_TOPIC="your question or topic" node script/generate-blog-from-input.js');
    writeGitHubOutput({ success: 'false', reason: 'missing_input' });
    process.exit(1);
  }
  
  console.log('📥 Input Topic:');
  console.log(`"${inputTopic}"\n`);
  console.log(`📂 Channel: ${inputChannel}`);
  console.log(`📊 Difficulty: ${inputDifficulty}\n`);
  
  await initBlogPostsTable();
  
  console.log('🔄 Generating blog content...\n');
  
  const blogContent = await transformToBlogArticle(inputTopic, inputChannel, inputDifficulty);
  
  if (!blogContent || !blogContent.title) {
    console.error('❌ Failed to generate blog content');
    writeGitHubOutput({ success: 'false', reason: 'generation_failed' });
    process.exit(1);
  }
  
  console.log('\n✅ Blog content generated!');
  console.log(`   Title: ${blogContent.title}`);
  console.log(`   Sections: ${blogContent.sections?.length || 0}`);
  
  console.log('\n💾 Saving to database...');
  const { questionId, slug } = await saveBlogPost(blogContent, inputChannel, inputDifficulty);
  
  console.log(`\n✅ Blog post saved!`);
  console.log(`   ID: ${questionId}`);
  console.log(`   Slug: ${slug}`);
  
  // Get total count
  const result = await client.execute('SELECT COUNT(*) as count FROM blog_posts');
  const totalPosts = result.rows[0]?.count || 0;
  
  console.log('\n=== SUMMARY ===');
  console.log(`Input:    "${inputTopic.substring(0, 50)}..."`);
  console.log(`Title:    "${blogContent.title}"`);
  console.log(`Channel:  ${inputChannel}`);
  console.log(`ID:       ${questionId}`);
  console.log(`Slug:     ${slug}`);
  console.log(`Total Blog Posts: ${totalPosts}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    success: 'true',
    blog_id: questionId,
    title: blogContent.title,
    slug: slug,
    channel: inputChannel,
    total_posts: totalPosts
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ success: 'false', reason: 'fatal_error', error: e.message });
  process.exit(1);
});
