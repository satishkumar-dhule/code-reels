/**
 * Blog Generator Script
 * Generates 1 new blog post per run from interview questions dataset
 * Maintains a blog_posts table to track converted questions
 * Uses LangGraph pipeline to find real-world cases and generate engaging articles
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { generateBlogPost } from './ai/graphs/blog-graph.js';
import { generateIllustration, generatePixelIllustration } from './ai/utils/blog-illustration-generator.js';

// Author info for credits
const AUTHOR = {
  name: 'Satishkumar Dhule',
  role: 'Software Engineer',
  github: 'https://github.com/satishkumar-dhule',
  linkedin: 'https://linkedin.com/in/satishkumar-dhule',
  website: 'https://satishkumar-dhule.github.io',
  avatar: 'https://github.com/satishkumar-dhule.png'
};

const OUTPUT_DIR = 'blog-output';
const MIN_SOURCES = 8;
const MAX_SKIP_ATTEMPTS = 5; // Max questions to try before giving up
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-47MSM57H95'; // Same as main app

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

/**
 * Validate a URL by checking if it returns a valid response (not 404)
 */
async function validateUrl(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 403 || response.status === 405; // Some sites block HEAD but page exists
  } catch (error) {
    // Try GET as fallback for sites that don't support HEAD
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)'
        }
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

// Theme configurations
const themes = {
  midnight: {
    name: 'Midnight',
    bg: '#0a0a0a', bgSecondary: '#111', bgCard: '#1a1a1a',
    text: '#fff', textSecondary: '#a0a0a0',
    accent: '#22c55e', accentHover: '#16a34a',
    border: '#2a2a2a', gradient: 'linear-gradient(135deg, #22c55e, #4ade80)'
  },
  ocean: {
    name: 'Ocean',
    bg: '#0c1222', bgSecondary: '#131d33', bgCard: '#1a2744',
    text: '#e2e8f0', textSecondary: '#94a3b8',
    accent: '#38bdf8', accentHover: '#0ea5e9',
    border: '#1e3a5f', gradient: 'linear-gradient(135deg, #38bdf8, #818cf8)'
  },
  sunset: {
    name: 'Sunset',
    bg: '#18181b', bgSecondary: '#1f1f23', bgCard: '#27272a',
    text: '#fafafa', textSecondary: '#a1a1aa',
    accent: '#f97316', accentHover: '#ea580c',
    border: '#3f3f46', gradient: 'linear-gradient(135deg, #f97316, #fb923c)'
  },
  forest: {
    name: 'Forest',
    bg: '#0f1a0f', bgSecondary: '#142014', bgCard: '#1a2a1a',
    text: '#ecfdf5', textSecondary: '#86efac',
    accent: '#4ade80', accentHover: '#22c55e',
    border: '#2d4a2d', gradient: 'linear-gradient(135deg, #4ade80, #a3e635)'
  },
  lavender: {
    name: 'Lavender',
    bg: '#13111c', bgSecondary: '#1a1625', bgCard: '#221d2e',
    text: '#f5f3ff', textSecondary: '#c4b5fd',
    accent: '#a78bfa', accentHover: '#8b5cf6',
    border: '#3b2d5c', gradient: 'linear-gradient(135deg, #a78bfa, #f472b6)'
  }
};

const DEFAULT_THEME = 'midnight';

// Channel category mapping
const categoryMap = {
  'System Design': ['system-design'],
  'Algorithms & Data Structures': ['algorithms'],
  'Frontend Development': ['frontend', 'react-native'],
  'Backend Development': ['backend', 'python'],
  'Database & Storage': ['database'],
  'DevOps & Infrastructure': ['devops', 'terraform', 'kubernetes', 'aws'],
  'Site Reliability': ['sre'],
  'AI & Machine Learning': ['generative-ai', 'machine-learning', 'llm-ops', 'prompt-engineering', 'nlp', 'computer-vision'],
  'Security': ['security'],
  'Testing & QA': ['testing', 'e2e-testing', 'api-testing', 'performance-testing'],
  'Mobile Development': ['ios', 'android'],
  'Networking & Systems': ['networking', 'linux', 'unix', 'operating-systems'],
  'Leadership & Soft Skills': ['behavioral', 'engineering-management'],
  'Data Engineering': ['data-engineering'],
};


// Initialize blog_posts table
async function initBlogPostsTable() {
  console.log('📦 Ensuring blog_posts table exists...');
  await writeClient.execute(`
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
      published_at TEXT
    )
  `);
  await writeClient.execute(`CREATE INDEX IF NOT EXISTS idx_blog_question ON blog_posts(question_id)`);
  
  // Add new columns if they don't exist (migration)
  const newColumns = [
    { name: 'quick_reference', type: 'TEXT' },
    { name: 'glossary', type: 'TEXT' },
    { name: 'real_world_example', type: 'TEXT' },
    { name: 'fun_fact', type: 'TEXT' },
    { name: 'sources', type: 'TEXT' },
    { name: 'social_snippet', type: 'TEXT' },
    { name: 'diagram_type', type: 'TEXT' },
    { name: 'diagram_label', type: 'TEXT' },
    { name: 'images', type: 'TEXT' },
    { name: 'svg_content', type: 'TEXT' }  // Store SVG content to avoid regeneration
  ];
  
  for (const col of newColumns) {
    try {
      await writeClient.execute(`ALTER TABLE blog_posts ADD COLUMN ${col.name} ${col.type}`);
      console.log(`   Added column: ${col.name}`);
    } catch (e) {
      // Column already exists, ignore
    }
  }
  
  console.log('✅ Table ready\n');
}

// Allowed channels for blog generation
const ALLOWED_BLOG_CHANNELS = [
  'sre',
  'devops',
  'kubernetes',
  'aws',
  'terraform',
  'docker',
  'linux',
  'unix',
  'generative-ai',
  'llm-ops',
  'machine-learning',
  'prompt-engineering'
];

// Get next question to convert
async function getNextQuestionForBlog(limit = 1) {
  // First, find channels that have the least blog posts to ensure variety
  // Only select from allowed channels: SRE, DevOps, AI, LLM, GenAI
  const channelFilter = ALLOWED_BLOG_CHANNELS.map(() => '?').join(',');
  
  const result = await client.execute({
    sql: `
    SELECT q.id, q.question, q.answer, q.explanation, q.diagram, 
           q.difficulty, q.tags, q.channel, q.sub_channel, q.companies
    FROM questions q
    LEFT JOIN blog_posts bp ON q.id = bp.question_id
    WHERE bp.id IS NULL
      AND q.explanation IS NOT NULL 
      AND LENGTH(q.explanation) > 100
      AND q.channel IN (${channelFilter})
    ORDER BY 
      (SELECT COUNT(*) FROM blog_posts WHERE channel = q.channel) ASC,
      RANDOM()
    LIMIT ?
  `,
    args: [...ALLOWED_BLOG_CHANNELS, limit]
  });
  
  if (result.rows.length === 0) return [];
  
  return result.rows.map(row => ({
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
  }));
}

// Get all existing blog posts
async function getAllBlogPosts() {
  const result = await client.execute(`SELECT * FROM blog_posts ORDER BY created_at DESC`);
  return result.rows.map(row => ({
    id: row.question_id,
    blogTitle: row.title,
    blogSlug: row.slug,
    blogIntro: row.introduction,
    blogSections: row.sections ? JSON.parse(row.sections) : [],
    blogConclusion: row.conclusion,
    blogMeta: row.meta_description,
    channel: row.channel,
    difficulty: row.difficulty,
    tags: row.tags ? JSON.parse(row.tags) : [],
    diagram: row.diagram,
    diagramType: row.diagram_type,
    diagramLabel: row.diagram_label,
    quickReference: row.quick_reference ? JSON.parse(row.quick_reference) : [],
    glossary: row.glossary ? JSON.parse(row.glossary) : [],
    realWorldExample: row.real_world_example ? JSON.parse(row.real_world_example) : null,
    funFact: row.fun_fact,
    sources: row.sources ? JSON.parse(row.sources) : [],
    images: row.images ? JSON.parse(row.images) : [],
    svgContent: row.svg_content ? JSON.parse(row.svg_content) : {},  // Map of filename -> SVG content
    socialSnippet: row.social_snippet ? JSON.parse(row.social_snippet) : null,
    createdAt: row.created_at
  }));
}

// Save blog post to database
async function saveBlogPost(questionId, blogContent, question, svgContent = {}) {
  const now = new Date().toISOString();
  const diagram = blogContent.diagram || question.diagram;
  await writeClient.execute({
    sql: `INSERT INTO blog_posts 
          (question_id, title, slug, introduction, sections, conclusion, 
           meta_description, channel, difficulty, tags, diagram, quick_reference,
           glossary, real_world_example, fun_fact, sources, social_snippet, 
           diagram_type, diagram_label, images, svg_content, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      blogContent.diagramType || null,
      blogContent.diagramLabel || null,
      JSON.stringify(blogContent.images || []),
      JSON.stringify(svgContent),
      now
    ]
  });
}

// Update SVG content for existing blog post
async function updateSvgContent(questionId, svgContent) {
  await writeClient.execute({
    sql: `UPDATE blog_posts SET svg_content = ? WHERE question_id = ?`,
    args: [JSON.stringify(svgContent), questionId]
  });
}

// Get blog stats
async function getBlogStats() {
  const total = await client.execute('SELECT COUNT(*) as count FROM blog_posts');
  const byChannel = await client.execute(`
    SELECT channel, COUNT(*) as count FROM blog_posts GROUP BY channel ORDER BY count DESC
  `);
  return { total: total.rows[0]?.count || 0, byChannel: byChannel.rows };
}

// Helper functions
function getCategoryForChannel(channel) {
  for (const [category, channels] of Object.entries(categoryMap)) {
    if (channels.includes(channel)) return category;
  }
  return 'Other';
}

function formatChannelName(channel) {
  return channel.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 80);
}

function escapeHtml(text) {
  if (!text) return '';
  if (typeof text !== 'string') text = String(text);
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Escape HTML and convert citation references [1], [2] to clickable links
function escapeHtmlWithCitations(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  // Convert [1], [2], etc. to citation links
  html = html.replace(/\[(\d+)\]/g, '<a href="#source-$1" class="citation" title="View source">$1</a>');
  return html;
}


function markdownToHtml(md, glossary = []) {
  if (!md) return '';
  let html = md;
  
  // Preserve code blocks first - replace with placeholders
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ lang: lang || '', code: escapeHtml(code.trim()) });
    return `\n__CODE_BLOCK_${index}__\n`;
  });
  
  // Inline code - preserve with placeholder
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const index = inlineCodes.length;
    inlineCodes.push(escapeHtml(code));
    return `__INLINE_CODE_${index}__`;
  });
  
  // Headers - close paragraph before, open after
  html = html.replace(/^### (.*$)/gm, '</p>\n<h3>$1</h3>\n<p>');
  html = html.replace(/^## (.*$)/gm, '</p>\n<h2>$1</h2>\n<p>');
  html = html.replace(/^# (.*$)/gm, '</p>\n<h1>$1</h1>\n<p>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Callout boxes - close paragraph before, open after
  html = html.replace(/^>\s*(💡|⚠️|✅|🔥|🎯|❌|ℹ️)\s*([^:]+):\s*(.*)$/gm, 
    '</p>\n<div class="callout"><span class="callout-icon">$1</span><div><strong>$2</strong><p>$3</p></div></div>\n<p>');
  html = html.replace(/^>\s*(.*)$/gm, '</p>\n<blockquote>$1</blockquote>\n<p>');
  
  // Tables - close paragraph before, open after
  html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g, (match, header, body) => {
    const headers = header.split('|').filter(h => h.trim()).map(h => '<th>' + h.trim() + '</th>').join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => '<td>' + c.trim() + '</td>').join('');
      return '<tr>' + cells + '</tr>';
    }).join('');
    return '</p>\n<table><thead><tr>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table>\n<p>';
  });
  
  // Process lists line by line for proper grouping
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;
  let listType = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const unorderedMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    
    if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push('</p>\n<ul>');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li>${unorderedMatch[2]}</li>`);
    } else if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push('</p>\n<ol>');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${orderedMatch[3]}</li>`);
    } else {
      if (inList) {
        processedLines.push(`</${listType}>\n<p>`);
        inList = false;
        listType = null;
      }
      processedLines.push(line);
    }
  }
  
  // Close any remaining list
  if (inList) {
    processedLines.push(`</${listType}>\n<p>`);
  }
  
  html = processedLines.join('\n');
  
  // Paragraphs - double newlines become paragraph breaks
  html = html.replace(/\n\n+/g, '</p>\n<p>');
  
  // Single line breaks within paragraphs become spaces (not <br>)
  html = html.replace(/([^>])\n([^<\n])/g, '$1 $2');
  
  // Clean up empty paragraphs and fix nesting issues
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<\/p>\s*<\/p>/g, '</p>');
  html = html.replace(/<p>\s*<p>/g, '<p>');
  html = html.replace(/<p>\s*<(ul|ol|table|div|blockquote|pre|h[1-6])/g, '<$1');
  html = html.replace(/<\/(ul|ol|table|div|blockquote|pre|h[1-6])>\s*<\/p>/g, '</$1>');
  html = html.replace(/<\/p>\s*<(ul|ol|table|div|blockquote|pre|h[1-6])/g, '<$1');
  html = html.replace(/<\/(ul|ol|table|div|blockquote|pre|h[1-6])>\s*<p>/g, '</$1>');

  // Convert inline citations [1], [2], etc. to clickable links
  html = html.replace(/\[(\d+)\]/g, '<a href="#source-$1" class="citation" title="View source">$1</a>');
  
  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    const langClass = block.lang ? ` class="language-${block.lang}"` : '';
    html = html.replace(`__CODE_BLOCK_${index}__`, `<pre><code${langClass}>${block.code}</code></pre>`);
  });
  
  // Restore inline code
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, `<code>${code}</code>`);
  });
  
  // Final cleanup - remove leading/trailing empty paragraphs
  html = html.replace(/^<\/p>\s*/, '').replace(/\s*<p>$/, '');
  html = html.replace(/^<p>\s*<\/p>/, '').replace(/<p>\s*<\/p>$/, '');
  
  return html;
}



// Transform Q&A to blog using LangGraph pipeline
async function transformToBlogArticle(question) {
  console.log('🤖 Running LangGraph blog pipeline...');
  
  const result = await generateBlogPost(question);
  
  if (!result.success) {
    if (result.skipped) {
      console.log(`⏭️ Skipped: ${result.skipReason}`);
      return { skipped: true, skipReason: result.skipReason };
    }
    throw new Error(result.error || 'Blog generation failed');
  }
  
  console.log('✅ LangGraph pipeline complete');
  return result.blogContent;
}

// CSS Generation - GitHub-inspired dark design with aurora effects
function generateCSS(theme = themes[DEFAULT_THEME]) {
  return `
:root {
  /* GitHub-inspired dark mode */
  --bg: #0d1117; --bg-secondary: #161b22; --bg-card: #161b22; --bg-elevated: #21262d;
  --text: #f0f6fc; --text-secondary: #8b949e; --text-muted: #6e7681;
  --accent: #58a6ff; --accent-secondary: #1f6feb; --accent-glow: rgba(88,166,255,0.15);
  --border: #30363d; --border-hover: #58a6ff;
  --gradient: linear-gradient(135deg, #58a6ff 0%, #a371f7 50%, #f778ba 100%);
  --gradient-subtle: linear-gradient(135deg, rgba(88,166,255,0.1) 0%, rgba(163,113,247,0.05) 100%);
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 3px 6px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.4);
  --shadow-glow: 0 0 20px rgba(88,166,255,0.3);
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px;
  --success: #3fb950; --warning: #d29922; --error: #f85149;
  --purple: #a371f7; --pink: #f778ba; --cyan: #79c0ff;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height: 1.75; font-size: 16px; -webkit-font-smoothing: antialiased; min-height: 100vh; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

/* Global icon alignment */
[data-lucide] { display: inline-block; vertical-align: -0.125em; }
svg.lucide { display: inline-block; vertical-align: -0.125em; }

/* Header - GitHub glass style */
header { background: rgba(13,17,23,0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 12px 0; position: fixed; top: 0; left: 0; right: 0; z-index: 1000; }
.header-content { display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 1.375rem; font-weight: 500; color: var(--text); text-decoration: none; letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px; }
.logo::before { content: '◆'; color: var(--accent); font-size: 1.125rem; }
nav { display: flex; gap: 4px; align-items: center; }
nav a { display: inline-flex; align-items: center; gap: 0.375rem; color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; font-weight: 500; padding: 8px 16px; border-radius: var(--radius-sm); transition: all 0.2s ease; }
nav a svg { width: 1rem; height: 1rem; }
nav a:hover { color: var(--text); background: var(--bg-elevated); }
nav a.nav-cta { background: var(--accent); color: white; }
nav a.nav-cta:hover { background: var(--accent-secondary); }

/* Hero - GitHub style with aurora */
.hero { padding: 140px 0 80px; text-align: center; background: var(--bg); position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(ellipse at 20% 50%, rgba(88,166,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(163,113,247,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(247,120,186,0.1) 0%, transparent 50%); animation: aurora 15s ease-in-out infinite; pointer-events: none; }
@keyframes aurora { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 33% { transform: translate(2%, -2%) rotate(1deg); } 66% { transform: translate(-2%, 2%) rotate(-1deg); } }
.hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.3); padding: 6px 16px; border-radius: 100px; font-size: 0.8125rem; color: var(--accent); margin-bottom: 24px; position: relative; z-index: 1; }
.hero-badge .pulse { width: 8px; height: 8px; background: var(--success); border-radius: 50%; animation: pulse 2s ease-in-out infinite; box-shadow: 0 0 8px var(--success); }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
.hero h1 { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 600; margin-bottom: 20px; letter-spacing: -0.03em; line-height: 1.15; background: linear-gradient(135deg, var(--text) 0%, var(--text-secondary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; position: relative; z-index: 1; }
.hero p { color: var(--text-secondary); max-width: 560px; margin: 0 auto 32px; font-size: 1.25rem; line-height: 1.7; position: relative; z-index: 1; }
.hero-cta { display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: var(--bg); padding: 14px 28px; border-radius: var(--radius-sm); text-decoration: none; font-weight: 600; font-size: 0.9375rem; transition: all 0.3s ease; box-shadow: 0 0 20px rgba(88,166,255,0.3); position: relative; z-index: 1; }
.hero-cta:hover { background: var(--cyan); box-shadow: 0 0 30px rgba(88,166,255,0.5); transform: translateY(-2px); }
.hero-cta svg { width: 16px; height: 16px; }
.hero-stats { display: flex; justify-content: center; gap: 48px; margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--border); position: relative; z-index: 1; }
.hero-stat { text-align: center; }
.hero-stat-value { font-size: 2rem; font-weight: 600; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.02em; }
.hero-stat-label { font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px; }

/* Featured Article - GitHub Bento Style */
.featured { padding: 3rem 0 5rem; }
.featured-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 2.5rem; display: grid; grid-template-columns: 1fr 200px; gap: 2rem; align-items: center; position: relative; overflow: hidden; transition: all 0.4s ease; }
.featured-card:hover { border-color: var(--accent); box-shadow: var(--shadow-glow); }
.featured-card::before { content: ''; position: absolute; top: 0; right: 0; width: 60%; height: 100%; background: radial-gradient(ellipse at 100% 50%, rgba(88,166,255,0.08) 0%, transparent 70%); pointer-events: none; }
.featured-label { display: inline-flex; align-items: center; gap: 0.375rem; background: linear-gradient(135deg, var(--accent), var(--purple)); color: white; padding: 0.375rem 0.875rem; border-radius: 100px; font-size: 0.6875rem; font-weight: 600; margin-bottom: 1.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
.featured-label svg { width: 0.875rem; height: 0.875rem; }
.featured-title { font-size: 1.625rem; font-weight: 600; line-height: 1.35; margin-bottom: 1rem; letter-spacing: -0.02em; }
.featured-title a { color: var(--text); text-decoration: none; transition: color 0.2s; }
.featured-title a:hover { color: var(--accent); }
.featured-excerpt { color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.7; margin-bottom: 1.5rem; }
.featured-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.featured-visual { font-size: 5rem; opacity: 0.9; position: relative; z-index: 1; filter: grayscale(20%); }

/* Category Pills - GitHub style */
.category-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.category-pill { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-elevated); border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 100px; text-decoration: none; color: var(--text-secondary); font-size: 0.8125rem; font-weight: 500; transition: all 0.2s ease; }
.category-pill:hover { border-color: var(--accent); color: var(--accent); background: rgba(88,166,255,0.1); box-shadow: 0 0 12px rgba(88,166,255,0.2); }
.category-pill .count { background: var(--bg-secondary); padding: 0.125rem 0.5rem; border-radius: 100px; font-size: 0.6875rem; color: var(--text-muted); }

/* Section Headers */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.section-title { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.5rem; }
.section-title::before { content: ''; width: 4px; height: 20px; background: var(--gradient); border-radius: 2px; }
.section-title svg { width: 1.25rem; height: 1.25rem; color: var(--accent); }
.section-link { color: var(--text-muted); text-decoration: none; font-size: 0.8125rem; font-weight: 500; transition: color 0.2s; }
.section-link:hover { color: var(--accent); }

/* Article Grid - Bento */
.articles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.5rem; }

/* Newsletter CTA - GitHub gradient */
.newsletter { padding: 5rem 0; }
.newsletter-card { background: var(--bg-card); border-radius: var(--radius-xl); padding: 4rem 2rem; text-align: center; position: relative; overflow: hidden; }
.newsletter-card::before { content: ''; position: absolute; inset: 0; border-radius: var(--radius-xl); padding: 1px; background: var(--gradient); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.newsletter-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at 50% 0%, rgba(88,166,255,0.1) 0%, transparent 60%); pointer-events: none; }
.newsletter-card h2 { font-size: 1.75rem; font-weight: 600; margin-bottom: 0.75rem; letter-spacing: -0.02em; position: relative; z-index: 1; }
.newsletter-card p { color: var(--text-secondary); font-size: 1rem; margin-bottom: 2rem; position: relative; z-index: 1; }
.newsletter-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--text); color: var(--bg); padding: 0.875rem 2rem; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 0.9375rem; transition: all 0.3s ease; position: relative; z-index: 1; }
.newsletter-btn:hover { transform: scale(1.02); box-shadow: 0 0 30px rgba(240,246,252,0.2); }

/* Article cards - GitHub Card Design */
.article-list { padding: 48px 0; }
.article-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; transition: all 0.3s ease; display: flex; flex-direction: column; position: relative; overflow: hidden; }
.article-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--gradient); opacity: 0; transition: opacity 0.3s ease; }
.article-card:hover { border-color: var(--accent); box-shadow: 0 0 20px rgba(88,166,255,0.15); transform: translateY(-4px); }
.article-card:hover::before { opacity: 1; }
.card-header { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.card-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 12px; line-height: 1.4; flex-grow: 1; }
.card-title a { color: var(--text); text-decoration: none; transition: color 0.2s; }
.card-title a:hover { color: var(--accent); }
.card-excerpt { color: var(--text-muted); font-size: 0.875rem; line-height: 1.7; margin-bottom: 16px; flex-grow: 1; }
.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); }
.card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.card-link { color: var(--accent); text-decoration: none; font-size: 0.8125rem; font-weight: 600; transition: gap 0.2s; display: flex; align-items: center; gap: 4px; }
.card-link:hover { gap: 8px; }

/* Badge System - GitHub style */
.badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border-radius: 100px; font-weight: 600; font-size: 0.75rem; text-transform: capitalize; letter-spacing: 0.02em; transition: all 0.2s ease; }
.badge svg { width: 0.875rem; height: 0.875rem; flex-shrink: 0; }
.badge-channel { background: linear-gradient(135deg, rgba(88,166,255,0.2), rgba(163,113,247,0.2)); color: var(--accent); border: 1px solid rgba(88,166,255,0.3); }
.badge-difficulty { border: 1.5px solid; background: transparent; }
.badge-beginner { color: var(--success); border-color: var(--success); background: rgba(63,185,80,0.1); }
.badge-intermediate { color: var(--warning); border-color: var(--warning); background: rgba(210,153,34,0.1); }
.badge-advanced { color: var(--error); border-color: var(--error); background: rgba(248,81,73,0.1); }
.badge-tag { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); font-size: 0.6875rem; padding: 4px 10px; }
.badge-tag:hover { border-color: var(--accent); color: var(--accent); background: rgba(88,166,255,0.1); }

/* Legacy support */
.article-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.75rem; margin-bottom: 12px; }
.tag { background: var(--bg-elevated); color: var(--text-secondary); padding: 4px 10px; border-radius: 100px; font-weight: 500; font-size: 0.75rem; border: 1px solid var(--border); }
.difficulty { padding: 4px 10px; border-radius: 100px; font-weight: 500; font-size: 0.75rem; }
.difficulty.beginner { background: rgba(63,185,80,0.15); color: var(--success); }
.difficulty.intermediate { background: rgba(210,153,34,0.15); color: var(--warning); }
.difficulty.advanced { background: rgba(248,81,73,0.15); color: var(--error); }
.excerpt { color: var(--text-muted); font-size: 0.875rem; line-height: 1.6; }

/* Category Grid */
.category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.category-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; transition: all 0.3s ease; }
.category-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 0 20px rgba(88,166,255,0.15); }
.category-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.375rem; letter-spacing: -0.01em; }
.category-card p { color: var(--text-muted); font-size: 0.8125rem; }
.category-card a { color: var(--accent); text-decoration: none; font-size: 0.8125rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 1rem; transition: gap 0.2s; }
.category-card a:hover { gap: 0.5rem; }
.category-card a::after { content: '→'; }

/* Article Page - Enhanced */
.article { padding: 8rem 0 4rem; max-width: 760px; margin: 0 auto; }
.article-header { margin-bottom: 2.5rem; }
.article-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 500; margin-bottom: 1.75rem; line-height: 1.2; letter-spacing: -0.02em; color: var(--text); }
.article-header .article-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-top: 1.25rem; }
.article-header .tag { background: var(--bg-elevated); color: var(--text-secondary); padding: 0.375rem 0.875rem; border-radius: 100px; font-weight: 500; font-size: 0.75rem; text-transform: capitalize; letter-spacing: 0.02em; border: 1px solid var(--border); transition: all 0.2s; }
.article-header .tag:hover { border-color: var(--accent); color: var(--text); }
.article-header .difficulty { padding: 0.375rem 0.875rem; border-radius: 100px; font-weight: 600; font-size: 0.75rem; text-transform: capitalize; letter-spacing: 0.02em; }
.article-intro { font-size: 1.125rem; color: var(--text-secondary); line-height: 1.8; margin-bottom: 2rem; padding: 1.5rem; background: var(--bg-secondary); border-radius: var(--radius-md); border-left: 4px solid var(--accent); border: 1px solid var(--border); border-left: 4px solid var(--accent); }

/* Author Card - Credits Section */
.author-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--bg-secondary); border-radius: var(--radius-md); margin: 2rem 0; border: 1px solid var(--border); }
.author-avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
.author-info { flex: 1; }
.author-name { font-weight: 600; color: var(--text); font-size: 1rem; margin-bottom: 2px; }
.author-role { color: var(--text-muted); font-size: 0.875rem; }
.author-links { display: flex; gap: 12px; margin-top: 8px; }
.author-links a { color: var(--text-secondary); text-decoration: none; font-size: 0.8125rem; display: flex; align-items: center; gap: 4px; transition: color 0.2s; }
.author-links a:hover { color: var(--accent); }
.author-links svg { width: 16px; height: 16px; }

/* Article content - GitHub Typography */
.article-content { font-size: 1rem; line-height: 1.85; color: var(--text-secondary); }
.article-content h2 { font-size: 1.375rem; font-weight: 600; margin: 3rem 0 1.25rem; color: var(--text); letter-spacing: -0.02em; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
.article-content h3 { font-size: 1.125rem; font-weight: 600; margin: 2rem 0 1rem; color: var(--text); }
.article-content p { margin-bottom: 1.5rem; }
.article-content strong { color: var(--text); font-weight: 600; }
.article-content a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.article-content a:hover { color: var(--cyan); }
.article-content pre { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; overflow-x: auto; margin: 1.5rem 0; font-size: 0.8125rem; }
.article-content code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.875em; }
.article-content p code, .article-content li code { background: rgba(88,166,255,0.1); padding: 0.2rem 0.4rem; border-radius: 4px; color: var(--accent); border: 1px solid rgba(88,166,255,0.2); }
.article-content ul, .article-content ol { margin: 1.5rem 0; padding: 0 0 0 1.25rem; list-style: none; }
.article-content li { margin-bottom: 0.625rem; padding-left: 1rem; position: relative; }
.article-content ul > li::before { content: ''; position: absolute; left: -1rem; top: 0.6rem; width: 5px; height: 5px; background: var(--accent); border-radius: 50%; }
.article-content ol { counter-reset: item; }
.article-content ol > li { counter-increment: item; }
.article-content ol > li::before { content: counter(item); position: absolute; left: -1.5rem; top: 0; color: var(--accent); font-weight: 600; font-size: 0.875rem; }
.article-content .mermaid { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; margin: 2rem 0; position: relative; overflow-x: auto; }
.article-content .mermaid::before { content: '📊'; position: absolute; top: -14px; left: 20px; background: var(--bg-secondary); padding: 0 8px; font-size: 1.25rem; }
.article-content .mermaid svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
.article-content .mermaid text { fill: var(--text) !important; font-size: 14px !important; }

/* Premium Table Styling - GitHub dark */
.article-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 2rem 0; font-size: 0.875rem; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border); }
.article-content thead { background: linear-gradient(135deg, rgba(88,166,255,0.1), rgba(163,113,247,0.1)); }
.article-content th { padding: 1rem 1.25rem; text-align: left; font-weight: 600; color: var(--text); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); white-space: nowrap; }
.article-content th:first-child { border-top-left-radius: var(--radius-lg); }
.article-content th:last-child { border-top-right-radius: var(--radius-lg); }
.article-content tbody tr { transition: background 0.2s ease; }
.article-content tbody tr:hover { background: rgba(88,166,255,0.05); }
.article-content tbody tr:nth-child(even) { background: rgba(255,255,255,0.02); }
.article-content tbody tr:nth-child(even):hover { background: rgba(88,166,255,0.08); }
.article-content td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); color: var(--text-secondary); vertical-align: top; line-height: 1.6; }
.article-content tbody tr:last-child td { border-bottom: none; }
.article-content tbody tr:last-child td:first-child { border-bottom-left-radius: var(--radius-lg); }
.article-content tbody tr:last-child td:last-child { border-bottom-right-radius: var(--radius-lg); }
/* Table cell color coding for comparisons */
.article-content td:first-child { color: var(--text); font-weight: 500; background: rgba(255,255,255,0.02); }
.article-content td code { background: rgba(88,166,255,0.15); color: var(--accent); padding: 0.2em 0.5em; border-radius: 4px; font-size: 0.8125rem; }
/* Table responsive wrapper */
@media (max-width: 768px) {
  .article-content table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .article-content th, .article-content td { padding: 0.75rem 1rem; min-width: 120px; }
}

.article-content blockquote { padding: 1.25rem 1.5rem; margin: 2rem 0; background: var(--bg-card); border-radius: var(--radius-md); border-left: 3px solid var(--accent); color: var(--text-secondary); }

/* Callouts - Modern */
.callout { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; margin: 1.5rem 0; display: flex; gap: 1rem; align-items: flex-start; }
.callout-icon { font-size: 1.25rem; line-height: 1; }
.callout strong { color: var(--text); display: block; margin-bottom: 0.25rem; font-size: 0.875rem; }
.callout p { margin: 0; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; }

/* Glossary tooltips - GitHub style */
.glossary-term { border-bottom: 1px dashed rgba(88,166,255,0.5); cursor: help; position: relative; color: var(--text); }
.glossary-term:hover { color: var(--accent); }
.glossary-term::after { content: attr(data-tooltip); position: absolute; top: calc(100% + 8px); left: 0; background: var(--bg-elevated); border: 1px solid var(--border); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.8125rem; max-width: 300px; min-width: 200px; white-space: normal; z-index: 1000; box-shadow: 0 8px 32px rgba(0,0,0,0.5); color: var(--text-secondary); line-height: 1.5; opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s; pointer-events: none; }
.glossary-term:hover::after { opacity: 1; visibility: visible; }
.glossary-term::before { content: ''; position: absolute; top: 100%; left: 1rem; border: 6px solid transparent; border-bottom-color: var(--border); opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s; z-index: 1001; }
.glossary-term:hover::before { opacity: 1; visibility: visible; }

/* Special sections - GitHub Bento Cards */
.real-world-example { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem; margin: 2rem 0; position: relative; overflow: hidden; }
.real-world-example::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--gradient); }
.real-world-example h3 { color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 0.5rem; }
.real-world-example .company { font-size: 1.25rem; font-weight: 600; color: var(--text); margin-bottom: 0.75rem; }
.real-world-example .scenario { color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.7; margin-bottom: 1rem; }
.real-world-example .lesson { background: var(--bg-elevated); padding: 1rem; border-radius: var(--radius-sm); font-size: 0.875rem; color: var(--text-secondary); border-left: 2px solid var(--accent); }

.fun-fact { background: linear-gradient(135deg, rgba(163,113,247,0.1), rgba(88,166,255,0.05)); border: 1px solid rgba(163,113,247,0.3); border-radius: var(--radius-lg); padding: 1.25rem 1.5rem; margin: 2rem 0; display: flex; gap: 1rem; align-items: center; }
.fun-fact-icon { font-size: 1.75rem; }
.fun-fact p { margin: 0; color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.6; }
.fun-fact strong { color: var(--text); }

.quick-ref { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem; margin: 2rem 0; }
.quick-ref h3 { color: var(--text); margin-bottom: 1rem; font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
.quick-ref ul { margin: 0; padding: 0; list-style: none; }
.quick-ref li { margin-bottom: 0.5rem; padding-left: 1.5rem; position: relative; color: var(--text-secondary); font-size: 0.9375rem; }
.quick-ref li::before { content: '✓'; position: absolute; left: 0; color: var(--success); font-weight: 700; }

/* Sources - Minimal */
.sources { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem 1.5rem; margin: 2rem 0; }
.sources h3 { margin-bottom: 0.875rem; font-size: 0.875rem; color: var(--text); font-weight: 600; }
.sources ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
.sources li { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.875rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
.sources li:last-child { border-bottom: none; }
.sources a { color: var(--accent); text-decoration: none; }
.sources a:hover { text-decoration: underline; }
.sources .source-type { font-size: 0.6875rem; color: var(--text-muted); margin-left: 0.5rem; text-transform: uppercase; letter-spacing: 0.03em; }
.sources .source-num { display: inline-flex; align-items: center; justify-content: center; min-width: 1.5rem; height: 1.5rem; background: var(--accent); color: #ffffff; font-size: 0.75rem; font-weight: 700; border-radius: 50%; margin-right: 0.75rem; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Inline Citations */
.citation { display: inline-flex; align-items: center; justify-content: center; min-width: 1.125rem; height: 1.125rem; padding: 0 0.25rem; background: var(--accent); color: #ffffff; font-size: 0.625rem; font-weight: 700; border-radius: 50%; margin: 0 0.125rem; vertical-align: super; cursor: pointer; text-decoration: none; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.citation:hover { transform: scale(1.15); background: var(--accent-secondary); box-shadow: 0 2px 4px rgba(0,0,0,0.15); }

/* Article Images */
.article-image { margin: 2rem 0; border-radius: var(--radius-lg); overflow: hidden; background: var(--bg-card); border: 1px solid var(--border); }
.article-image img { width: 100%; height: auto; display: block; object-fit: cover; max-height: 400px; }
.article-image figcaption { padding: 0.75rem 1rem; font-size: 0.8125rem; color: var(--text-muted); text-align: center; border-top: 1px solid var(--border); background: var(--bg-secondary); }

/* Share Snippet - GitHub style */
.share-snippet { background: linear-gradient(135deg, var(--bg-card), var(--bg-elevated)); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; margin: 2.5rem 0; position: relative; overflow: hidden; }
.share-snippet::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--gradient); }
.share-snippet-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.share-snippet-header .share-icon { font-size: 1.25rem; }
.share-snippet-header h3 { flex: 1; font-size: 0.9375rem; font-weight: 600; color: var(--text); margin: 0; }
.share-buttons { display: flex; gap: 0.5rem; }
.share-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.share-btn svg { width: 16px; height: 16px; }
.share-btn:hover { transform: scale(1.1); }
.share-btn.linkedin:hover { background: #0077b5; color: white; border-color: #0077b5; box-shadow: 0 0 15px rgba(0,119,181,0.4); }
.share-btn.twitter:hover { background: #000; color: white; border-color: #000; }
.share-btn.copy:hover { background: var(--accent); color: var(--bg); border-color: var(--accent); box-shadow: 0 0 15px rgba(88,166,255,0.4); }
.share-snippet-content { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1.25rem; font-size: 0.9375rem; line-height: 1.7; }
.snippet-hook { font-weight: 600; color: var(--text); margin-bottom: 0.75rem; font-size: 1rem; }
.snippet-body { color: var(--text-secondary); margin-bottom: 0.75rem; white-space: pre-line; }
.snippet-cta { color: var(--accent); font-weight: 500; margin-bottom: 0.5rem; }
.snippet-hashtags { color: var(--purple); font-size: 0.875rem; margin-bottom: 0.5rem; word-wrap: break-word; }
.snippet-link { font-size: 0.8125rem; color: var(--text-muted); word-break: break-all; }

/* CTA - GitHub gradient */
.cta-box { margin-top: 3rem; padding: 2rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); text-align: center; position: relative; overflow: hidden; }
.cta-box::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(88,166,255,0.1) 0%, transparent 60%); pointer-events: none; }
.cta-box p { margin-bottom: 1rem; font-size: 1.125rem; font-weight: 600; color: var(--text); position: relative; }
.cta-button { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: var(--bg); padding: 0.75rem 1.5rem; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 0.875rem; transition: all 0.3s ease; position: relative; }
.cta-button:hover { transform: scale(1.02); box-shadow: 0 0 25px rgba(88,166,255,0.4); background: var(--cyan); }

/* Footer - GitHub style */
footer { background: var(--bg-secondary); border-top: 1px solid var(--border); padding: 3rem 0; margin-top: 5rem; }
.footer-content { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.footer-brand { font-size: 1.125rem; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 0.5rem; }
.footer-brand::before { content: '◆'; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.footer-links { display: flex; gap: 1.5rem; }
.footer-links a { color: var(--text-muted); text-decoration: none; font-size: 0.8125rem; transition: color 0.2s; }
.footer-links a:hover { color: var(--text); }
.footer-copy { text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
.footer-copy a { color: var(--accent); text-decoration: none; }

/* Responsive */
@media (max-width: 768px) { 
  .container { padding: 0 1.25rem; }
  .hero { padding: 8rem 0 4rem; }
  .hero h1 { font-size: 2rem; } 
  .hero-stats { gap: 2rem; flex-wrap: wrap; }
  .hero-stat-value { font-size: 1.75rem; }
  .featured-card { grid-template-columns: 1fr; padding: 1.5rem; }
  .featured-visual { display: none; }
  .featured-title { font-size: 1.25rem; }
  .article-header h1 { font-size: 1.625rem; color: var(--text); } 
  .article-intro { padding: 2rem 1.5rem 1.5rem 1.5rem; font-size: 1rem; }
  nav { gap: 0.25rem; } 
  nav a { padding: 0.5rem 0.75rem; font-size: 0.8125rem; }
  .category-grid, .articles-grid { grid-template-columns: 1fr; }
  .glossary-term:hover::after { left: 0; transform: none; max-width: 200px; }
  .footer-content { flex-direction: column; gap: 1.5rem; text-align: center; }
  .category-pills { gap: 0.375rem; }
  .category-pill { font-size: 0.75rem; padding: 0.375rem 0.75rem; }
  .hero-stats { flex-direction: column; gap: 1.5rem; border: none; padding-top: 2rem; }
}

/* Animations */
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.article-card, .category-card, .featured-card { animation: fadeIn 0.4s ease-out; }

/* Selection */
::selection { background: rgba(88,166,255,0.3); color: var(--text); }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg-secondary); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* Search */
.search-container { position: relative; }
.search-btn { background: var(--bg-card); border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 100px; color: var(--text-muted); font-size: 0.8125rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
.search-btn:hover { border-color: var(--accent); color: var(--text); }
.search-btn kbd { background: var(--bg-elevated); padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.6875rem; font-family: inherit; }
.search-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); z-index: 2000; align-items: flex-start; justify-content: center; padding-top: 15vh; }
.search-modal.active { display: flex; }
.search-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 100%; max-width: 600px; max-height: 70vh; overflow: hidden; box-shadow: 0 16px 70px rgba(0,0,0,0.5); }
.search-input-wrap { display: flex; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); gap: 0.75rem; }
.search-input-wrap svg { width: 20px; height: 20px; color: var(--text-muted); flex-shrink: 0; }
.search-input { flex: 1; background: none; border: none; color: var(--text); font-size: 1rem; outline: none; }
.search-input::placeholder { color: var(--text-muted); }
.search-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; }
.search-close:hover { color: var(--text); }
.search-results { max-height: calc(70vh - 60px); overflow-y: auto; padding: 0.5rem; }
.search-results:empty::before { content: 'Start typing to search...'; display: block; padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
.search-result { display: block; padding: 1rem; border-radius: var(--radius-sm); text-decoration: none; transition: background 0.15s; }
.search-result:hover { background: var(--bg-elevated); }
.search-result-title { color: var(--text); font-weight: 500; margin-bottom: 0.25rem; }
.search-result-meta { display: flex; gap: 0.5rem; align-items: center; }
.search-result-meta .tag { font-size: 0.625rem; }
.search-result-excerpt { color: var(--text-muted); font-size: 0.8125rem; margin-top: 0.375rem; line-height: 1.5; }
.search-empty { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
.search-highlight { background: rgba(88,166,255,0.25); color: var(--accent); padding: 0 2px; border-radius: 2px; }

/* Filter tabs */
.filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-tab { background: transparent; border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 100px; color: var(--text-secondary); font-size: 0.8125rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.filter-tab:hover { border-color: var(--accent); color: var(--text); }
.filter-tab.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }

/* Difficulty filter badges */
.diff-filters { display: flex; gap: 0.375rem; }
.diff-filter { padding: 0.375rem 0.75rem; border-radius: 100px; font-size: 0.75rem; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; background: var(--bg-elevated); color: var(--text-secondary); }
.diff-filter.beginner { background: rgba(63,185,80,0.15); color: var(--success); }
.diff-filter.intermediate { background: rgba(210,153,34,0.15); color: var(--warning); }
.diff-filter.advanced { background: rgba(248,81,73,0.15); color: var(--error); }
.diff-filter:hover, .diff-filter.active { border-color: currentColor; box-shadow: 0 0 10px currentColor; }

/* Stats Bar */
.stats-bar { padding: 0; margin-top: -3rem; position: relative; z-index: 10; }
.stats-grid { display: flex; justify-content: center; align-items: center; gap: 2.5rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 1.5rem 3rem; max-width: 700px; margin: 0 auto; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.stat-item { text-align: center; }
.stat-value { font-size: 1.75rem; font-weight: 700; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: flex; align-items: center; justify-content: center; gap: 0.5rem; letter-spacing: -0.02em; }
.stat-value svg { width: 1.25rem; height: 1.25rem; stroke-width: 2.5; color: var(--accent); -webkit-text-fill-color: initial; }
.stat-label { font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.25rem; display: block; }
.stat-divider { width: 1px; height: 40px; background: var(--border); }

/* Featured Grid */
.featured-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.25rem; }
.featured-main { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 2rem; position: relative; overflow: hidden; transition: all 0.3s ease; }
.featured-main:hover { border-color: var(--accent); box-shadow: 0 0 30px rgba(88,166,255,0.15); }
.featured-main::before { content: ''; position: absolute; top: 0; right: 0; width: 60%; height: 100%; background: radial-gradient(ellipse at 100% 50%, rgba(88,166,255,0.08) 0%, transparent 70%); pointer-events: none; }
.featured-side { display: flex; flex-direction: column; gap: 1.25rem; }
.featured-side-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; text-decoration: none; transition: all 0.3s ease; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
.featured-side-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 0 20px rgba(88,166,255,0.15); }
.featured-side-card .tag { width: fit-content; }
.featured-side-card h3 { font-size: 0.9375rem; font-weight: 600; color: var(--text); line-height: 1.4; margin: 0; letter-spacing: -0.01em; }

/* Topics Section */
.topics-section { padding: 4rem 0 2rem; }
.topics-title { font-size: 1.125rem; font-weight: 600; text-align: center; margin-bottom: 1.5rem; color: var(--text); letter-spacing: -0.02em; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.topics-title svg { width: 1.25rem; height: 1.25rem; color: var(--accent); }

/* Hero Actions */
.hero-actions { display: flex; gap: 1rem; justify-content: center; align-items: center; position: relative; z-index: 1; }
.hero-cta-secondary { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); text-decoration: none; font-size: 0.9375rem; font-weight: 500; padding: 0.875rem 1.5rem; border: 1px solid var(--border); border-radius: 100px; transition: all 0.2s ease; }
.hero-cta-secondary svg { width: 1rem; height: 1rem; }
.hero-cta-secondary:hover { border-color: var(--accent); color: var(--accent); background: rgba(88,166,255,0.1); }

/* Responsive - Stats & Featured */
@media (max-width: 768px) {
  .stats-grid { flex-wrap: wrap; gap: 1.5rem 2rem; padding: 1.25rem 1.5rem; }
  .stat-divider { display: none; }
  .stat-value { font-size: 1.5rem; }
  .featured-grid { grid-template-columns: 1fr; }
  .featured-side { flex-direction: row; }
  .featured-side-card { flex: 1; }
  .featured-side-card h3 { font-size: 0.8125rem; }
  .hero-actions { flex-direction: column; gap: 0.75rem; }
  .hero-cta, .hero-cta-secondary { width: 100%; max-width: 280px; justify-content: center; }
  .hero::before { opacity: 0.5; }
}
@media (max-width: 480px) {
  .featured-side { flex-direction: column; }
  .stats-grid { gap: 1rem; }
}
`;
}


// HTML Generation
function generateHead(title, description, includeMermaid = false) {
  const mermaidScript = includeMermaid ? `
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>mermaid.initialize({startOnLoad:true,theme:'base',look:'handDrawn',themeVariables:{primaryColor:'#e8f4f8',primaryTextColor:'#1a1a1a',primaryBorderColor:'#2c3e50',lineColor:'#2c3e50',secondaryColor:'#ffeaa7',tertiaryColor:'#dfe6e9',background:'#ffffff',mainBkg:'#e8f4f8',nodeBorder:'#2c3e50',clusterBkg:'#f5f5f5',titleColor:'#1a1a1a',edgeLabelBackground:'#ffffff',nodeTextColor:'#1a1a1a',fontSize:'16px'},flowchart:{curve:'basis',padding:20,nodeSpacing:60,rankSpacing:60,htmlLabels:true,useMaxWidth:true}});</script>` : '';
  
  const gaScript = GA_MEASUREMENT_ID ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>` : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | DevInsights</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#0d1117">${gaScript}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">${mermaidScript}
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <link rel="stylesheet" href="/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◆</text></svg>">
</head>
<body>`;
}

function generateHeader() {
  return `<header><div class="container header-content">
    <a href="/" class="logo"><i data-lucide="code-2"></i> DevInsights</a>
    <nav>
      <a href="/"><i data-lucide="home"></i> Home</a>
      <a href="/categories/"><i data-lucide="layers"></i> Topics</a>
      <button class="search-btn" onclick="openSearch()"><i data-lucide="search"></i> Search<kbd>⌘K</kbd></button>
      <a href="https://open-interview.github.io" target="_blank" class="nav-cta"><i data-lucide="play"></i> Practice</a>
    </nav>
  </div></header>`;
}

function generateFooter(articles = []) {
  // Generate search data
  const searchData = articles.map(a => ({
    id: a.id,
    slug: a.blogSlug,
    title: a.blogTitle,
    intro: (a.blogIntro || '').substring(0, 150),
    channel: a.channel,
    difficulty: a.difficulty,
    tags: a.tags || []
  }));

  return `
<!-- Search Modal -->
<div class="search-modal" id="searchModal" onclick="if(event.target===this)closeSearch()">
  <div class="search-box">
    <div class="search-input-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="text" class="search-input" id="searchInput" placeholder="Search articles..." autocomplete="off">
      <button class="search-close" onclick="closeSearch()">✕</button>
    </div>
    <div class="search-results" id="searchResults"></div>
  </div>
</div>

<footer><div class="container">
  <div class="footer-content">
    <div class="footer-brand">DevInsights</div>
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/categories/">Topics</a>
      <a href="https://open-interview.github.io" target="_blank">Practice</a>
      <a href="${AUTHOR.github}" target="_blank">GitHub</a>
    </div>
  </div>
  <div class="footer-copy">
    <p>© ${new Date().getFullYear()} DevInsights · Created by <a href="${AUTHOR.github}" target="_blank">${AUTHOR.name}</a> · <a href="https://open-interview.github.io">Code Reels</a></p>
  </div>
</div></footer>

<script>
const searchData = ${JSON.stringify(searchData)};

function openSearch() {
  document.getElementById('searchModal').classList.add('active');
  document.getElementById('searchInput').focus();
  document.body.style.overflow = 'hidden';
}

function closeSearch() {
  document.getElementById('searchModal').classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
}

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') closeSearch();
});

document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const results = document.getElementById('searchResults');
  
  if (!query) {
    results.innerHTML = '';
    return;
  }
  
  const matches = searchData.filter(a => 
    a.title.toLowerCase().includes(query) ||
    a.intro.toLowerCase().includes(query) ||
    a.channel.toLowerCase().includes(query) ||
    a.tags.some(t => t.toLowerCase().includes(query))
  ).slice(0, 8);
  
  if (matches.length === 0) {
    results.innerHTML = '<div class="search-empty">No articles found</div>';
    return;
  }
  
  results.innerHTML = matches.map(a => {
    const highlight = (text) => text.replace(new RegExp('(' + query + ')', 'gi'), '<span class="search-highlight">$1</span>');
    return \`<a href="/posts/\${a.id}/\${a.slug}/" class="search-result">
      <div class="search-result-title">\${highlight(a.title)}</div>
      <div class="search-result-meta">
        <span class="tag">\${a.channel.replace(/-/g, ' ')}</span>
        <span class="difficulty \${a.difficulty}">\${a.difficulty}</span>
      </div>
      <div class="search-result-excerpt">\${highlight(a.intro)}...</div>
    </a>\`;
  }).join('');
});

// Enhanced table styling with color coding
document.querySelectorAll('.article-content table').forEach(table => {
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    cells.forEach((cell, idx) => {
      const text = cell.textContent.trim().toLowerCase();
      // Positive indicators - green
      if (['✓', '✔', 'yes', 'true', 'high', 'fast', 'good', 'better', 'best', 'low latency', 'recommended'].some(p => text.includes(p))) {
        cell.style.color = '#10b981';
        cell.style.fontWeight = '500';
      }
      // Negative indicators - red/orange
      else if (['✗', '✘', 'no', 'false', 'slow', 'bad', 'worse', 'worst', 'high latency', 'not recommended', 'deprecated'].some(n => text.includes(n))) {
        cell.style.color = '#f87171';
        cell.style.fontWeight = '500';
      }
      // Neutral/medium indicators - yellow
      else if (['medium', 'moderate', 'partial', 'sometimes', 'depends', 'varies'].some(m => text.includes(m))) {
        cell.style.color = '#fbbf24';
      }
      // Numbers and metrics - cyan accent
      else if (/^[\\d.,]+[%xms]*$/.test(text) || /^\\d+[kmgb]?$/i.test(text)) {
        cell.style.color = '#00d4ff';
        cell.style.fontFamily = 'JetBrains Mono, monospace';
      }
    });
  });
});

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}
</script>
</body></html>`;
}

function generateIndexPage(articles) {
  const recentArticles = articles.slice(0, 12);
  const featuredArticle = articles[0];
  
  // Group articles by difficulty
  const byDifficulty = {
    beginner: articles.filter(a => a.difficulty === 'beginner'),
    intermediate: articles.filter(a => a.difficulty === 'intermediate'),
    advanced: articles.filter(a => a.difficulty === 'advanced')
  };
  
  // Category pills
  let categoryPills = '';
  for (const [category, channels] of Object.entries(categoryMap)) {
    const count = articles.filter(a => channels.includes(a.channel)).length;
    if (count === 0) continue;
    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    categoryPills += `<a href="/categories/${slug}/" class="category-pill">${category}<span class="count">${count}</span></a>`;
  }
  
  // Stats
  const totalArticles = articles.length;
  const totalCategories = Object.keys(categoryMap).filter(cat => 
    articles.some(a => categoryMap[cat].includes(a.channel))
  ).length;
  
  // Article cards (skip first if featured) - Heavy card design with prominent badges
  let articleCards = recentArticles.slice(1).map(a => {
    const tags = a.tags || [];
    const displayTags = tags.slice(0, 3);
    return `
    <div class="article-card" data-difficulty="${a.difficulty}" data-channel="${a.channel}">
      <div class="card-header">
        <span class="badge badge-channel"><i data-lucide="folder"></i> ${formatChannelName(a.channel)}</span>
        <span class="badge badge-difficulty badge-${a.difficulty}"><i data-lucide="${a.difficulty === 'beginner' ? 'zap' : a.difficulty === 'intermediate' ? 'flame' : 'rocket'}"></i> ${a.difficulty}</span>
      </div>
      <h2 class="card-title"><a href="/posts/${a.id}/${a.blogSlug}/">${escapeHtml(a.blogTitle)}</a></h2>
      <p class="card-excerpt">${escapeHtml((a.blogIntro || '').substring(0, 120))}...</p>
      <div class="card-footer">
        <div class="card-tags">
          ${displayTags.map(tag => `<span class="badge badge-tag"><i data-lucide="tag"></i> ${tag}</span>`).join('')}
        </div>
        <a href="/posts/${a.id}/${a.blogSlug}/" class="card-link"><i data-lucide="arrow-right"></i> Read more</a>
      </div>
    </div>`;
  }).join('');
  
  // Calculate reading time estimate (avg 5 min per article)
  const totalReadingMins = totalArticles * 5;
  const readingHours = Math.floor(totalReadingMins / 60);
  
  // Featured articles (top 3)
  const featuredArticles = articles.slice(0, 3);
  let featuredHtml = '';
  if (featuredArticles.length > 0) {
    const mainFeatured = featuredArticles[0];
    const sideFeatured = featuredArticles.slice(1, 3);
    
    featuredHtml = `
    <section class="featured"><div class="container">
      <div class="featured-grid">
        <div class="featured-main">
          <span class="featured-label"><i data-lucide="sparkles"></i> Latest</span>
          <h2 class="featured-title"><a href="/posts/${mainFeatured.id}/${mainFeatured.blogSlug}/">${escapeHtml(mainFeatured.blogTitle)}</a></h2>
          <p class="featured-excerpt">${escapeHtml((mainFeatured.blogIntro || '').substring(0, 200))}...</p>
          <div class="featured-meta">
            <span class="badge badge-channel"><i data-lucide="folder"></i> ${formatChannelName(mainFeatured.channel)}</span>
            <span class="badge badge-difficulty badge-${mainFeatured.difficulty}"><i data-lucide="${mainFeatured.difficulty === 'beginner' ? 'zap' : mainFeatured.difficulty === 'intermediate' ? 'flame' : 'rocket'}"></i> ${mainFeatured.difficulty}</span>
          </div>
        </div>
        <div class="featured-side">
          ${sideFeatured.map(a => `
            <a href="/posts/${a.id}/${a.blogSlug}/" class="featured-side-card">
              <span class="badge badge-channel"><i data-lucide="folder"></i> ${formatChannelName(a.channel)}</span>
              <h3>${escapeHtml(a.blogTitle)}</h3>
            </a>
          `).join('')}
        </div>
      </div>
    </div></section>`;
  }
  
  return `${generateHead('DevInsights - Engineering Knowledge That Ships', 'Real-world engineering insights for developers building at scale')}
${generateHeader()}
<main>
  <section class="hero"><div class="container">
    <div class="hero-badge"><span class="pulse"></span> New articles daily</div>
    <h1>Deep dives into<br>real engineering</h1>
    <p>Battle-tested insights from production systems. Learn what actually works at scale.</p>
    <div class="hero-actions">
      <a href="#articles" class="hero-cta"><i data-lucide="book-open"></i> Browse Articles</a>
      <a href="/categories/" class="hero-cta-secondary"><i data-lucide="grid-3x3"></i> All Topics</a>
    </div>
  </div></section>
  
  <section class="stats-bar"><div class="container">
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-value"><i data-lucide="file-text"></i> ${totalArticles}</span>
        <span class="stat-label">Deep Dives</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value"><i data-lucide="layers"></i> ${totalCategories}</span>
        <span class="stat-label">Topics</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value"><i data-lucide="clock"></i> ${readingHours}h+</span>
        <span class="stat-label">Of Content</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value"><i data-lucide="heart"></i> Free</span>
        <span class="stat-label">Forever</span>
      </div>
    </div>
  </div></section>
  
  ${featuredHtml}
  
  <section class="topics-section"><div class="container">
    <h2 class="topics-title"><i data-lucide="compass"></i> Explore by Topic</h2>
    <div class="category-pills">${categoryPills}</div>
  </div></section>
  
  <section class="article-list" id="articles"><div class="container">
    <div class="section-header">
      <h2 class="section-title"><i data-lucide="newspaper"></i> All Articles</h2>
      <div class="diff-filters">
        <button class="diff-filter active" onclick="filterArticles('all')">All</button>
        <button class="diff-filter beginner" onclick="filterArticles('beginner')">Beginner (${byDifficulty.beginner.length})</button>
        <button class="diff-filter intermediate" onclick="filterArticles('intermediate')">Intermediate (${byDifficulty.intermediate.length})</button>
        <button class="diff-filter advanced" onclick="filterArticles('advanced')">Advanced (${byDifficulty.advanced.length})</button>
      </div>
    </div>
    <div class="articles-grid" id="articlesGrid">${articleCards}</div>
  </div></section>
  
  <section class="newsletter"><div class="container">
    <div class="newsletter-card">
      <h2>Ready to ace your interviews?</h2>
      <p>Practice with 1000+ real interview questions from FAANG companies</p>
      <a href="https://open-interview.github.io" target="_blank" class="newsletter-btn">Start Practicing Free →</a>
    </div>
  </div></section>
</main>

<script>
function filterArticles(difficulty) {
  const cards = document.querySelectorAll('.article-card');
  const buttons = document.querySelectorAll('.diff-filter');
  
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  cards.forEach(card => {
    if (difficulty === 'all' || card.dataset.difficulty === difficulty) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}
</script>
${generateFooter(articles)}`;
}

function getCategoryEmoji(category) {
  const emojis = {
    'System Design': '🏗️', 'Algorithms & Data Structures': '🧮', 'Frontend Development': '🎨',
    'Backend Development': '⚙️', 'Database & Storage': '🗄️', 'DevOps & Infrastructure': '🔧',
    'Site Reliability': '🛡️', 'AI & Machine Learning': '🤖', 'Security': '🔐',
    'Testing & QA': '🧪', 'Mobile Development': '📱', 'Networking & Systems': '🌐',
    'Leadership & Soft Skills': '👥', 'Data Engineering': '📊'
  };
  return emojis[category] || '📚';
}

function generateCategoryPage(category, articles, allArticles) {
  const channels = categoryMap[category] || [];
  const categoryArticles = articles.filter(a => channels.includes(a.channel));
  
  let articleCards = categoryArticles.map(a => {
    const tags = a.tags || [];
    const displayTags = tags.slice(0, 3);
    return `
    <div class="article-card">
      <div class="card-header">
        <span class="badge badge-channel"><i data-lucide="folder"></i> ${formatChannelName(a.channel)}</span>
        <span class="badge badge-difficulty badge-${a.difficulty}"><i data-lucide="${a.difficulty === 'beginner' ? 'zap' : a.difficulty === 'intermediate' ? 'flame' : 'rocket'}"></i> ${a.difficulty}</span>
      </div>
      <h2 class="card-title"><a href="/posts/${a.id}/${a.blogSlug}/">${escapeHtml(a.blogTitle)}</a></h2>
      <p class="card-excerpt">${escapeHtml((a.blogIntro || '').substring(0, 120))}...</p>
      <div class="card-footer">
        <div class="card-tags">
          ${displayTags.map(tag => `<span class="badge badge-tag"><i data-lucide="tag"></i> ${tag}</span>`).join('')}
        </div>
        <a href="/posts/${a.id}/${a.blogSlug}/" class="card-link"><i data-lucide="arrow-right"></i> Read more</a>
      </div>
    </div>`;
  }).join('');
  
  return `${generateHead(category, `${categoryArticles.length} articles about ${category}`)}
${generateHeader()}
<main><section class="article-list" style="padding-top:7rem"><div class="container">
  <a href="/" style="color:var(--text-muted);text-decoration:none;font-size:0.8125rem;display:inline-flex;align-items:center;gap:0.25rem"><i data-lucide="arrow-left"></i> Back</a>
  <h1 style="margin:1.5rem 0 0.5rem;font-size:2rem;font-weight:700;letter-spacing:-0.03em">${category}</h1>
  <p style="color:var(--text-muted);margin-bottom:2.5rem;font-size:0.9375rem"><i data-lucide="file-text"></i> ${categoryArticles.length} deep dives</p>
  <div class="articles-grid">${articleCards}</div>
</div></section></main>
${generateFooter(allArticles)}`;
}


function generateArticlePage(article, allArticles) {
  const category = getCategoryForChannel(article.channel);
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const hasDiagram = !!article.diagram;
  const glossary = article.glossary || [];
  
  // Related articles (same channel, different article)
  const related = allArticles
    .filter(a => a.channel === article.channel && a.id !== article.id)
    .slice(0, 3);
  
  // Images by placement
  const images = article.images || [];
  const imagesByPlacement = {};
  images.forEach(img => {
    if (img && img.url && img.placement) {
      imagesByPlacement[img.placement] = img;
    }
  });
  
  // Helper to generate image HTML
  const generateImageHtml = (img) => {
    if (!img) return '';
    return `<figure class="article-image">
      <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt || '')}" loading="lazy">
      ${img.caption ? `<figcaption>${escapeHtml(img.caption)}</figcaption>` : ''}
    </figure>`;
  };
  
  // Build sections with images
  let sectionsHtml = '';
  
  // Add image after intro if specified
  if (imagesByPlacement['after-intro']) {
    sectionsHtml += generateImageHtml(imagesByPlacement['after-intro']);
  }
  
  // Add sections with images
  (article.blogSections || []).forEach((s, idx) => {
    sectionsHtml += `<h2>${escapeHtml(s.heading)}</h2>${markdownToHtml(s.content, glossary)}`;
    
    // Check for image after this section
    const placement = `after-section-${idx + 1}`;
    if (imagesByPlacement[placement]) {
      sectionsHtml += generateImageHtml(imagesByPlacement[placement]);
    }
  });
  
  // Real-world example section
  if (article.realWorldExample) {
    const ex = article.realWorldExample;
    sectionsHtml += `
    <div class="real-world-example">
      <h3><i data-lucide="building-2"></i> Real-World Case Study</h3>
      <div class="company"><i data-lucide="briefcase"></i> ${escapeHtml(ex.company)}</div>
      <p class="scenario">${escapeHtml(ex.scenario)}</p>
      <div class="lesson"><i data-lucide="lightbulb"></i> <strong>Key Takeaway:</strong> ${escapeHtml(ex.lesson)}</div>
    </div>`;
  }
  
  // Diagram section
  if (article.diagram) {
    // Convert literal \n (stored as backslash + n in database) to actual newlines for mermaid
    let diagramCode = article.diagram.replace(/\\n/g, '\n');
    
    // Determine diagram label - use AI-generated label or detect from mermaid syntax
    let diagramLabel = article.diagramLabel || 'Architecture Overview';
    if (!article.diagramLabel && diagramCode) {
      const diagramLower = diagramCode.toLowerCase().trim();
      if (diagramLower.startsWith('sequencediagram')) {
        diagramLabel = 'Event Sequence';
      } else if (diagramLower.startsWith('statediagram')) {
        diagramLabel = 'State Transitions';
      } else if (diagramLower.startsWith('classdiagram')) {
        diagramLabel = 'Class Structure';
      } else if (diagramLower.startsWith('erdiagram')) {
        diagramLabel = 'Data Model';
      } else if (diagramLower.startsWith('gantt')) {
        diagramLabel = 'Project Timeline';
      } else if (diagramLower.startsWith('pie')) {
        diagramLabel = 'Distribution Chart';
      } else if (diagramLower.startsWith('mindmap')) {
        diagramLabel = 'Concept Map';
      } else if (diagramLower.startsWith('timeline')) {
        diagramLabel = 'Timeline';
      } else if (diagramLower.startsWith('flowchart') || diagramLower.startsWith('graph')) {
        diagramLabel = 'System Flow';
      }
    }
    sectionsHtml += `<h2>${escapeHtml(diagramLabel)}</h2><div class="mermaid">${diagramCode}</div>`;
  }
  
  // Fun fact
  if (article.funFact) {
    sectionsHtml += `<div class="fun-fact"><span class="fun-fact-icon"><i data-lucide="sparkles"></i></span><p><strong>Did you know?</strong> ${escapeHtmlWithCitations(article.funFact)}</p></div>`;
  }
  
  // Quick reference
  const quickRef = article.quickReference || [];
  if (quickRef.length > 0) {
    sectionsHtml += `<div class="quick-ref"><h3><i data-lucide="bookmark"></i> Key Takeaways</h3><ul>${quickRef.map(r => `<li>${escapeHtmlWithCitations(r)}</li>`).join('')}</ul></div>`;
  }
  
  // Sources with numbered references
  const sources = article.sources || [];
  if (sources.length > 0) {
    const sourceItems = sources.map((s, idx) => 
      `<li id="source-${idx + 1}"><span class="source-num">${idx + 1}</span><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a><span class="source-type">${s.type || 'article'}</span></li>`
    ).join('');
    sectionsHtml += `<div class="sources"><h3><i data-lucide="book-open"></i> References</h3><ul>${sourceItems}</ul></div>`;
  }
  
  // Social snippet - shareable section
  const socialSnippet = article.socialSnippet;
  if (socialSnippet) {
    // Include hashtags in the snippet text for LinkedIn
    const hashtags = socialSnippet.hashtags || '';
    const snippetText = `${socialSnippet.hook}\n\n${socialSnippet.body}\n\n${socialSnippet.cta}${hashtags ? '\n\n' + hashtags : ''}`;
    const encodedText = encodeURIComponent(snippetText + `\n\n🔗 `);
    const articleUrl = `https://openstackdaily.github.io/posts/${article.id}/${article.blogSlug}/`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodeURIComponent(articleUrl)}`;
    
    sectionsHtml += `
    <div class="share-snippet">
      <div class="share-snippet-header">
        <span class="share-icon"><i data-lucide="share-2"></i></span>
        <h3>Share This</h3>
        <div class="share-buttons">
          <a href="${linkedInUrl}" target="_blank" rel="noopener" class="share-btn linkedin" title="Share on LinkedIn">
            <i data-lucide="linkedin"></i>
          </a>
          <a href="${twitterUrl}" target="_blank" rel="noopener" class="share-btn twitter" title="Share on X/Twitter">
            <i data-lucide="twitter"></i>
          </a>
          <button class="share-btn copy" onclick="copySnippet(this)" title="Copy to clipboard">
            <i data-lucide="copy"></i>
          </button>
        </div>
      </div>
      <div class="share-snippet-content" id="shareSnippet">
        <p class="snippet-hook">${escapeHtml(socialSnippet.hook)}</p>
        <p class="snippet-body">${escapeHtml(socialSnippet.body).replace(/\n/g, '<br>')}</p>
        <p class="snippet-cta">${escapeHtml(socialSnippet.cta)}</p>
        ${hashtags ? `<p class="snippet-hashtags">${escapeHtml(hashtags)}</p>` : ''}
        <p class="snippet-link"><i data-lucide="link"></i> ${articleUrl}</p>
      </div>
    </div>
    <script>
    function copySnippet(btn) {
      const snippet = document.getElementById('shareSnippet').innerText;
      navigator.clipboard.writeText(snippet).then(() => {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        setTimeout(() => {
          btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        }, 2000);
      });
    }
    </script>`;
  }
  
  // Related articles section
  let relatedHtml = '';
  if (related.length > 0) {
    relatedHtml = `
    <div class="related-articles">
      <h3>Continue Reading</h3>
      <div class="related-grid">
        ${related.map(r => `
          <a href="/posts/${r.id}/${r.blogSlug}/" class="related-card">
            <span class="related-title">${escapeHtml(r.blogTitle)}</span>
            <span class="related-meta">${r.difficulty}</span>
          </a>
        `).join('')}
      </div>
    </div>`;
  }
  
  // Author card HTML
  const authorHtml = `
  <div class="author-card">
    <img src="${AUTHOR.avatar}" alt="${AUTHOR.name}" class="author-avatar" loading="lazy">
    <div class="author-info">
      <div class="author-name">${AUTHOR.name}</div>
      <div class="author-role">${AUTHOR.role}</div>
      <div class="author-links">
        <a href="${AUTHOR.website}" target="_blank" rel="noopener">
          <i data-lucide="globe"></i>
          Website
        </a>
        <a href="${AUTHOR.github}" target="_blank" rel="noopener">
          <i data-lucide="github"></i>
          GitHub
        </a>
        <a href="${AUTHOR.linkedin}" target="_blank" rel="noopener">
          <i data-lucide="linkedin"></i>
          LinkedIn
        </a>
      </div>
    </div>
  </div>`;
  
  const tags = (article.tags || []).slice(0, 3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
  
  return `${generateHead(article.blogTitle, article.blogMeta || '', hasDiagram)}
<style>
.related-articles { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
.related-articles h3 { font-size: 1rem; margin-bottom: 1rem; color: var(--text); }
.related-grid { display: grid; gap: 0.75rem; }
.related-card { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); text-decoration: none; transition: all 0.2s; }
.related-card:hover { border-color: var(--border-hover); transform: translateX(4px); }
.related-title { color: var(--text); font-size: 0.875rem; font-weight: 500; }
.related-meta { color: var(--text-muted); font-size: 0.75rem; text-transform: capitalize; }
</style>
${generateHeader()}
<main><article class="article"><div class="container">
  <a href="/categories/${categorySlug}/" style="color:var(--text-muted);text-decoration:none;font-size:0.8125rem;display:inline-flex;align-items:center;gap:0.25rem;margin-bottom:2rem">← ${category}</a>
  <div class="article-header">
    <h1>${escapeHtml(article.blogTitle)}</h1>
    <div class="article-meta" style="justify-content:flex-start;margin-top:1rem"><span class="tag">${formatChannelName(article.channel)}</span><span class="difficulty ${article.difficulty}">${article.difficulty}</span>${tags}</div>
  </div>
  <p class="article-intro">${escapeHtmlWithCitations(article.blogIntro)}</p>
  <div class="article-content">
    ${sectionsHtml}
    ${imagesByPlacement['before-conclusion'] ? generateImageHtml(imagesByPlacement['before-conclusion']) : ''}
    <h2>Wrapping Up</h2>
    <p>${escapeHtmlWithCitations(article.blogConclusion)}</p>
  </div>
  ${authorHtml}
  ${relatedHtml}
  <div class="cta-box">
    <p>Ready to put this into practice?</p>
    <a href="https://open-interview.github.io/#/channel/${article.channel}" class="cta-button">Practice Questions →</a>
  </div>
</div></article></main>
${generateFooter(allArticles)}`;
}

function generateCategoriesIndexPage(articles) {
  let cards = Object.entries(categoryMap).map(([category, channels]) => {
    const count = articles.filter(a => channels.includes(a.channel)).length;
    if (count === 0) return '';
    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `<div class="category-card"><h3>${category}</h3><p>${count} articles</p><a href="/categories/${slug}/">Explore</a></div>`;
  }).join('');
  
  return `${generateHead('All Topics', 'Browse all engineering topics')}
${generateHeader()}
<main><section class="categories" style="padding-top:7rem"><div class="container">
  <h1 style="margin-bottom:0.5rem;font-size:2rem;font-weight:700;letter-spacing:-0.03em">All Topics</h1>
  <p style="color:var(--text-muted);margin-bottom:2.5rem;font-size:0.9375rem">Deep dives across the engineering stack</p>
  <div class="category-grid">${cards}</div>
</div></section></main>
${generateFooter(articles)}`;
}

// Main function
async function main() {
  const htmlOnly = process.argv.includes('--html-only');
  
  console.log('=== 🚀 Blog Generator (LangGraph) ===\n');
  
  await initBlogPostsTable();
  
  const stats = await getBlogStats();
  console.log(`📊 Current blog posts: ${stats.total}`);
  if (stats.byChannel.length > 0) {
    console.log('   By channel:');
    stats.byChannel.slice(0, 5).forEach(c => console.log(`     ${c.channel}: ${c.count}`));
    if (stats.byChannel.length > 5) console.log(`     ... and ${stats.byChannel.length - 5} more`);
  }
  
  if (!htmlOnly) {
    console.log('\n🔍 Finding questions with interesting real-world cases...');
    
    // Get multiple candidates to try
    const candidates = await getNextQuestionForBlog(MAX_SKIP_ATTEMPTS);
    
    if (candidates.length === 0) {
      console.log('✅ All questions have been converted!');
    } else {
      let blogGenerated = false;
      let skippedCount = 0;
      
      for (const question of candidates) {
        console.log(`\n📝 Trying: ${question.id} (${question.channel})`);
        console.log(`   Q: ${question.question.substring(0, 60)}...`);
        
        try {
          const blogContent = await transformToBlogArticle(question);
          
          // Check if skipped due to no interesting real-world case
          if (blogContent.skipped) {
            skippedCount++;
          console.log(`   ⏭️ Skipped (${skippedCount}/${MAX_SKIP_ATTEMPTS}): ${blogContent.skipReason}`);
          continue;
        }
        
        console.log(`   Title: ${blogContent.title}`);
        
        // Validate sources - remove 404s
        const validatedSources = await validateSources(blogContent.sources || []);
        blogContent.sources = validatedSources;
        
        // Check minimum sources requirement
        if (validatedSources.length < MIN_SOURCES) {
          console.log(`   ⚠️ Only ${validatedSources.length} valid sources (need ${MIN_SOURCES})`);
          console.log(`   🔄 Skipping - insufficient sources`);
          skippedCount++;
          continue;
        }
        
        console.log(`   ✅ ${validatedSources.length} valid sources`);
        
        // Images are now generated as SVGs in the blog-graph pipeline
        // Read SVG content from generated files to cache in database
        const svgContent = {};
        if (blogContent.images && blogContent.images.length > 0) {
          console.log(`🖼️ ${blogContent.images.length} cartoon illustrations generated`);
          for (const img of blogContent.images) {
            if (img && img.url && img.url.startsWith('/images/') && img.url.endsWith('.svg')) {
              const filename = img.url.replace('/images/', '');
              const svgPath = path.join(OUTPUT_DIR, 'images', filename);
              try {
                if (fs.existsSync(svgPath)) {
                  svgContent[filename] = fs.readFileSync(svgPath, 'utf-8');
                }
              } catch (err) {
                console.log(`   ⚠️ Could not read SVG ${filename}: ${err.message}`);
              }
            }
          }
        }
        
        console.log('💾 Saving to database...');
        await saveBlogPost(question.id, blogContent, question, svgContent);
        console.log('✅ Blog post saved!\n');
        blogGenerated = true;
        break;
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        skippedCount++;
        continue;
      }
    }
    
    if (!blogGenerated) {
      console.log(`\n⚠️ Could not generate blog after trying ${skippedCount} questions`);
      console.log('   All candidates either lacked interesting real-world cases or had insufficient sources');
    }
  }
  } else {
    console.log('\n⏭️ Skipping content generation (--html-only mode)');
  }
  
  console.log('\n📄 Regenerating static site...');
  
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'images'), { recursive: true });
  
  const articles = await getAllBlogPosts();
  console.log(`   Total articles: ${articles.length}`);
  
  if (articles.length === 0) {
    console.log('   No articles yet, skipping site generation');
    return;
  }
  
  // Write SVG images - use cached from DB or generate new ones
  console.log('\n🎨 Processing cartoon illustrations...');
  let cachedCount = 0;
  let generatedCount = 0;
  
  for (const article of articles) {
    if (article.images && article.images.length > 0) {
      const svgContent = article.svgContent || {};
      let needsUpdate = false;
      
      for (const img of article.images) {
        if (img && img.url && img.url.startsWith('/images/') && img.url.endsWith('.svg')) {
          const filename = img.url.replace('/images/', '');
          const filenameNoExt = filename.replace('.svg', '');
          const outputPath = path.join(OUTPUT_DIR, 'images', filename);
          
          // Check if SVG is cached in database
          if (svgContent[filename]) {
            // Write cached SVG to file
            fs.writeFileSync(outputPath, svgContent[filename]);
            cachedCount++;
          } else {
            // Generate new SVG - use pixel art style for social/hero images
            try {
              // Use pixel art for hero/social images, default for others
              const usePixelArt = img.placement === 'hero' || img.placement === 'social' || img.placement === 'after-intro';
              
              const result = usePixelArt 
                ? await generatePixelIllustration(
                    article.blogTitle,
                    img.alt || article.blogIntro || article.blogTitle,
                    filenameNoExt,
                    { channel: article.channel }
                  )
                : await generateIllustration(
                    article.blogTitle,
                    img.alt || article.blogIntro || article.blogTitle,
                    filenameNoExt,
                    { placement: img.placement || 'after-intro', channel: article.channel }
                  );
              
              // Read the generated SVG and cache it
              const svgData = fs.readFileSync(result.path, 'utf-8');
              svgContent[filename] = svgData;
              needsUpdate = true;
              generatedCount++;
            } catch (err) {
              console.log(`   ⚠️ Failed to generate ${img.url}: ${err.message}`);
            }
          }
        }
      }
      
      // Update database with new SVG content if any were generated
      if (needsUpdate) {
        try {
          await updateSvgContent(article.id, svgContent);
        } catch (err) {
          console.log(`   ⚠️ Failed to cache SVGs for ${article.id}: ${err.message}`);
        }
      }
    }
  }
  console.log(`   ✅ ${cachedCount} from cache, ${generatedCount} newly generated`);
  
  // Generate CSS with default theme
  fs.writeFileSync(path.join(OUTPUT_DIR, 'style.css'), generateCSS());
  
  // Generate index
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), generateIndexPage(articles));
  
  // Generate categories
  fs.mkdirSync(path.join(OUTPUT_DIR, 'categories'), { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'categories', 'index.html'), generateCategoriesIndexPage(articles));
  
  for (const category of Object.keys(categoryMap)) {
    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const dir = path.join(OUTPUT_DIR, 'categories', slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), generateCategoryPage(category, articles, articles));
  }
  
  // Generate article pages
  const postsDir = path.join(OUTPUT_DIR, 'posts');
  fs.mkdirSync(postsDir, { recursive: true });
  
  for (const article of articles) {
    const dir = path.join(postsDir, article.id, article.blogSlug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), generateArticlePage(article, articles));
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, '.nojekyll'), '');
  
  const newStats = await getBlogStats();
  console.log(`\n✅ Blog generated!`);
  console.log(`   Total posts: ${newStats.total}`);
  console.log(`   Output: ${OUTPUT_DIR}/`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
