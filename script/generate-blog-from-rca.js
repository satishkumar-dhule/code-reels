#!/usr/bin/env node
/**
 * Blog Generator from Real Company RCAs/Postmortems
 * 
 * Searches for real incident reports and postmortems from top tech companies
 * and creates engaging blog posts from them.
 * 
 * Approach:
 * 1. Pick a random company from top 50 tech companies (non-repeating)
 * 2. Search for their public postmortems/RCAs/incident reports
 * 3. Generate an engaging blog post from the incident
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import ai from './ai/index.js';

const OUTPUT_DIR = 'blog-output';

// Top 50 tech companies known for publishing postmortems
const TOP_COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Netflix', 'Uber', 'Airbnb', 'Stripe', 'Slack',
  'GitHub', 'GitLab', 'Cloudflare', 'Fastly', 'Datadog', 'PagerDuty', 'Atlassian',
  'Shopify', 'Twilio', 'Square', 'Coinbase', 'Robinhood', 'Discord', 'Zoom',
  'Dropbox', 'Pinterest', 'Twitter', 'LinkedIn', 'Spotify', 'Lyft', 'DoorDash',
  'Instacart', 'Figma', 'Notion', 'Vercel', 'Supabase', 'MongoDB', 'Elastic',
  'HashiCorp', 'Confluent', 'Snowflake', 'Databricks', 'Palantir', 'Okta',
  'CrowdStrike', 'Splunk', 'New Relic', 'Honeycomb', 'LaunchDarkly', 'CircleCI',
  'Travis CI', 'Heroku'
];

// Database connection
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ Missing TURSO_DATABASE_URL');
  process.exit(1);
}

const client = createClient({ url, authToken });

// Initialize tables
async function initTables() {
  console.log('📦 Ensuring tables exist...');
  
  // Track which companies we've used
  await client.execute(`
    CREATE TABLE IF NOT EXISTS rca_blog_companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT UNIQUE NOT NULL,
      used_at TEXT NOT NULL
    )
  `);
  
  // Blog posts table (same as before)
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
      diagram_label TEXT,
      images TEXT,
      company TEXT,
      incident_type TEXT
    )
  `);
  
  // Add new columns if they don't exist
  const newCols = ['company', 'incident_type', 'images'];
  for (const col of newCols) {
    try {
      await client.execute(`ALTER TABLE blog_posts ADD COLUMN ${col} TEXT`);
    } catch (e) { /* exists */ }
  }
  
  console.log('✅ Tables ready\n');
}


// Get a random unused company
async function getRandomUnusedCompany() {
  const result = await client.execute('SELECT company FROM rca_blog_companies');
  const usedCompanies = new Set(result.rows.map(r => r.company));
  
  const availableCompanies = TOP_COMPANIES.filter(c => !usedCompanies.has(c));
  
  if (availableCompanies.length === 0) {
    console.log('⚠️ All companies used, resetting...');
    await client.execute('DELETE FROM rca_blog_companies');
    return TOP_COMPANIES[Math.floor(Math.random() * TOP_COMPANIES.length)];
  }
  
  return availableCompanies[Math.floor(Math.random() * availableCompanies.length)];
}

// Mark company as used
async function markCompanyUsed(company) {
  await client.execute({
    sql: 'INSERT OR REPLACE INTO rca_blog_companies (company, used_at) VALUES (?, ?)',
    args: [company, new Date().toISOString()]
  });
}

// Search for RCA/postmortem using web search
async function searchForRCA(company) {
  console.log(`🔍 Searching for ${company} postmortems/RCAs...`);
  
  const searchQueries = [
    `${company} engineering blog postmortem incident`,
    `${company} outage root cause analysis`,
    `${company} system failure post-incident review`,
    `${company} production incident lessons learned`
  ];
  
  // Use AI to search and find real incidents
  try {
    const result = await ai.run('rcaSearch', {
      company,
      searchQueries
    });
    
    if (result && result.incidents && result.incidents.length > 0) {
      console.log(`   ✅ Found ${result.incidents.length} incidents`);
      return result.incidents;
    }
  } catch (error) {
    console.log(`   ⚠️ AI search failed: ${error.message}`);
  }
  
  return null;
}

// Generate blog post from RCA
async function generateBlogFromRCA(company, incident) {
  console.log(`\n📝 Generating blog from ${company} incident...`);
  console.log(`   Incident: ${incident.title || 'Unknown'}`);
  
  try {
    const result = await ai.run('rcaBlog', {
      company,
      incident
    });
    
    if (result && result.title) {
      console.log(`   ✅ Generated: ${result.title}`);
      return result;
    }
  } catch (error) {
    console.log(`   ❌ Generation failed: ${error.message}`);
  }
  
  return null;
}

// Helper functions
function generateSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function generateId(company) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `rca-${company.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${random}`;
}

// Detect channel from incident type
function detectChannel(incident, blogContent) {
  const text = `${incident.title || ''} ${incident.description || ''} ${blogContent.title || ''}`.toLowerCase();
  
  if (text.includes('database') || text.includes('sql') || text.includes('postgres') || text.includes('mysql')) return 'database';
  if (text.includes('kubernetes') || text.includes('k8s') || text.includes('container')) return 'kubernetes';
  if (text.includes('aws') || text.includes('cloud') || text.includes('s3') || text.includes('ec2')) return 'aws';
  if (text.includes('network') || text.includes('dns') || text.includes('cdn') || text.includes('load balancer')) return 'networking';
  if (text.includes('security') || text.includes('breach') || text.includes('vulnerability')) return 'security';
  if (text.includes('api') || text.includes('microservice') || text.includes('backend')) return 'backend';
  if (text.includes('frontend') || text.includes('ui') || text.includes('react')) return 'frontend';
  if (text.includes('deploy') || text.includes('ci/cd') || text.includes('pipeline')) return 'devops';
  if (text.includes('ml') || text.includes('machine learning') || text.includes('model')) return 'machine-learning';
  
  return 'system-design';
}

// Save blog post
async function saveBlogPost(blogContent, company, incident) {
  const now = new Date().toISOString();
  const questionId = generateId(company);
  const slug = generateSlug(blogContent.title);
  const channel = detectChannel(incident, blogContent);
  
  await client.execute({
    sql: `INSERT INTO blog_posts 
          (question_id, title, slug, introduction, sections, conclusion, 
           meta_description, channel, difficulty, tags, diagram, quick_reference,
           glossary, real_world_example, fun_fact, sources, social_snippet, 
           diagram_type, diagram_label, images, company, incident_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      questionId,
      blogContent.title,
      slug,
      blogContent.introduction,
      JSON.stringify(blogContent.sections || []),
      blogContent.conclusion,
      blogContent.metaDescription,
      channel,
      blogContent.difficulty || 'intermediate',
      JSON.stringify(blogContent.tags || []),
      blogContent.diagram || null,
      JSON.stringify(blogContent.quickReference || []),
      JSON.stringify(blogContent.glossary || []),
      JSON.stringify({ company, scenario: incident.description, lesson: incident.lesson } || null),
      blogContent.funFact || null,
      JSON.stringify(blogContent.sources || []),
      JSON.stringify(blogContent.socialSnippet || null),
      blogContent.diagramType || null,
      blogContent.diagramLabel || null,
      JSON.stringify(blogContent.images || []),
      company,
      incident.type || 'outage',
      now
    ]
  });
  
  return { questionId, slug };
}


// Main function
async function main() {
  console.log('=== 🔥 RCA Blog Generator ===\n');
  console.log('Generating blog posts from real company incidents/postmortems\n');
  
  await initTables();
  
  // Get random unused company
  const company = await getRandomUnusedCompany();
  console.log(`🎯 Selected company: ${company}\n`);
  
  // Search for RCAs/postmortems
  const incidents = await searchForRCA(company);
  
  if (!incidents || incidents.length === 0) {
    console.log(`❌ No incidents found for ${company}`);
    console.log('   Trying another company...\n');
    
    // Mark as used anyway to avoid infinite loop
    await markCompanyUsed(company);
    
    // Try one more company
    const company2 = await getRandomUnusedCompany();
    console.log(`🎯 Trying: ${company2}\n`);
    
    const incidents2 = await searchForRCA(company2);
    if (!incidents2 || incidents2.length === 0) {
      console.log(`❌ No incidents found for ${company2} either`);
      process.exit(1);
    }
    
    await markCompanyUsed(company2);
    await processIncident(company2, incidents2[0]);
    return;
  }
  
  await markCompanyUsed(company);
  
  // Pick the most interesting incident
  const incident = incidents[0];
  await processIncident(company, incident);
}

async function processIncident(company, incident) {
  // Generate blog post
  const blogContent = await generateBlogFromRCA(company, incident);
  
  if (!blogContent) {
    console.log('❌ Failed to generate blog content');
    process.exit(1);
  }
  
  // Save to database
  console.log('\n💾 Saving to database...');
  const { questionId, slug } = await saveBlogPost(blogContent, company, incident);
  
  console.log(`\n✅ Blog post created!`);
  console.log(`   ID: ${questionId}`);
  console.log(`   Title: ${blogContent.title}`);
  console.log(`   Company: ${company}`);
  console.log(`   Slug: ${slug}`);
  
  // Get stats
  const stats = await client.execute('SELECT COUNT(*) as count FROM blog_posts');
  console.log(`\n📊 Total blog posts: ${stats.rows[0]?.count || 0}`);
  
  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `blog_id=${questionId}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `title=${blogContent.title}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `company=${company}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\n`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
