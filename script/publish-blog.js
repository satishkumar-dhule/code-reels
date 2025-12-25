/**
 * Blog Publisher Bot
 * Publishes blog posts from a specific question ID
 * Can be triggered manually or via workflow
 * 
 * Usage:
 *   node script/publish-blog.js <question-id>
 *   node script/publish-blog.js q-212
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import ai from './ai/index.js';

const OUTPUT_DIR = 'blog-output';
const MIN_SOURCES = 6; // Lower threshold for manual publishing

// Database connection
const url = process.env.TURSO_DATABASE_URL_RO || process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN_RO || process.env.TURSO_AUTH_TOKEN;
const writeUrl = process.env.TURSO_DATABASE_URL;
const writeToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ Missing TURSO_DATABASE_URL environment variable');
  process.exit(1);
}

const client = createClient({ url, authToken });
const writeClient = writeUrl ? createClient({ url: writeUrl, authToken: writeToken }) : client;

// Get question ID from command line
const questionId = process.argv[2];

if (!questionId) {
  console.error('❌ Usage: node script/publish-blog.js <question-id>');
  console.error('   Example: node script/publish-blog.js q-212');
  process.exit(1);
}

/**
 * Validate a URL by checking if it returns a valid response
 */
async function validateUrl(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)' }
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 403 || response.status === 405;
  } catch {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)' }
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Validate all sources and remove invalid ones
 */
async function validateSources(sources) {
  if (!sources || !Array.isArray(sources)) return [];
  
  console.log(`   🔍 Validating ${sources.length} sources...`);
  const validatedSources = [];
  
  for (const source of sources) {
    if (!source.url || !source.title) continue;
    
    const isValid = await validateUrl(source.url);
    if (isValid) {
      validatedSources.push(source);
      console.log(`   ✅ ${source.title.substring(0, 40)}...`);
    } else {
      console.log(`   ❌ Removed (404): ${source.url}`);
    }
  }
  
  console.log(`   📊 Valid sources: ${validatedSources.length}/${sources.length}`);
  return validatedSources;
}

/**
 * Get question by ID
 */
async function getQuestionById(id) {
  const result = await client.execute({
    sql: `SELECT id, question, answer, explanation, diagram, difficulty, tags, channel, sub_channel, companies
          FROM questions WHERE id = ?`,
    args: [id]
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
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
    companies: row.companies ? JSON.parse(row.companies) : [],
  };
}

/**
 * Check if blog post already exists
 */
async function blogPostExists(questionId) {
  const result = await client.execute({
    sql: 'SELECT id FROM blog_posts WHERE question_id = ?',
    args: [questionId]
  });
  return result.rows.length > 0;
}

/**
 * Generate slug from title
 */
function generateSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

/**
 * Save blog post to database
 */
async function saveBlogPost(questionId, blogContent, question) {
  const now = new Date().toISOString();
  const diagram = blogContent.diagram || question.diagram;
  
  await writeClient.execute({
    sql: `INSERT INTO blog_posts 
          (question_id, title, slug, introduction, sections, conclusion, 
           meta_description, channel, difficulty, tags, diagram, quick_reference,
           glossary, real_world_example, fun_fact, sources, social_snippet, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      questionId,
      blogContent.title,
      generateSlug(blogContent.title),
      blogContent.introduction,
      JSON.stringify(blogContent.sections),
      blogContent.conclusion,
      blogContent.metaDescription,
      question.channel,
      question.difficulty,
      JSON.stringify(question.tags),
      diagram,
      JSON.stringify(blogContent.quickReference || []),
      JSON.stringify(blogContent.glossary || []),
      JSON.stringify(blogContent.realWorldExample || null),
      blogContent.funFact || null,
      JSON.stringify(blogContent.sources || []),
      JSON.stringify(blogContent.socialSnippet || null),
      now
    ]
  });
}

/**
 * Transform Q&A to blog using AI
 */
async function transformToBlogArticle(question) {
  console.log('🤖 Transforming with AI...');
  
  try {
    const result = await ai.run('blog', {
      question: question.question,
      answer: question.answer,
      explanation: question.explanation,
      channel: question.channel,
      difficulty: question.difficulty,
      tags: question.tags
    });
    console.log('✅ AI transformation complete');
    return result;
  } catch (error) {
    console.log(`⚠️ AI failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== 📝 Blog Publisher Bot ===\n');
  console.log(`📌 Publishing blog for question: ${questionId}\n`);
  
  // Check if already published
  const exists = await blogPostExists(questionId);
  if (exists) {
    console.log('⚠️ Blog post already exists for this question.');
    console.log('   To regenerate, delete the existing post first.');
    process.exit(0);
  }
  
  // Get the question
  console.log('📥 Fetching question...');
  const question = await getQuestionById(questionId);
  
  if (!question) {
    console.error(`❌ Question not found: ${questionId}`);
    process.exit(1);
  }
  
  console.log(`   Found: ${question.question.substring(0, 60)}...`);
  console.log(`   Channel: ${question.channel}`);
  console.log(`   Difficulty: ${question.difficulty}`);
  
  // Transform to blog
  const blogContent = await transformToBlogArticle(question);
  console.log(`   Title: ${blogContent.title}`);
  
  // Validate sources
  const validatedSources = await validateSources(blogContent.sources || []);
  blogContent.sources = validatedSources;
  
  if (validatedSources.length < MIN_SOURCES) {
    console.log(`   ⚠️ Only ${validatedSources.length} valid sources (need ${MIN_SOURCES})`);
    console.log(`   🔄 Proceeding anyway for manual publish...`);
  }
  
  // Save to database
  console.log('\n💾 Saving to database...');
  await saveBlogPost(questionId, blogContent, question);
  console.log('✅ Blog post saved!\n');
  
  // Print social snippet for easy copy-paste
  if (blogContent.socialSnippet) {
    console.log('📣 LinkedIn Post (copy-paste ready):');
    console.log('─'.repeat(50));
    console.log(blogContent.socialSnippet.hook);
    console.log('');
    console.log(blogContent.socialSnippet.body);
    console.log('');
    console.log(blogContent.socialSnippet.cta);
    console.log('');
    console.log(`🔗 https://open-interview.github.io/posts/${questionId}/${generateSlug(blogContent.title)}/`);
    console.log('─'.repeat(50));
  }
  
  console.log('\n✅ Blog published successfully!');
  console.log(`   Run 'node script/generate-blog.js' to regenerate the static site.`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
