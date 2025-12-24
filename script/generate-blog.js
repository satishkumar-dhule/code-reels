/**
 * Blog Generator Script
 * Generates 1 new blog post per run from interview questions dataset
 * Maintains a blog_posts table to track converted questions
 * Uses AI to transform Q&A content into engaging blog articles
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import ai from './ai/index.js';

const OUTPUT_DIR = 'blog-output';
const MIN_SOURCES = 8;

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
    { name: 'social_snippet', type: 'TEXT' }
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

// Get next question to convert
async function getNextQuestionForBlog() {
  // First, find channels that have the least blog posts to ensure variety
  const result = await client.execute(`
    SELECT q.id, q.question, q.answer, q.explanation, q.diagram, 
           q.difficulty, q.tags, q.channel, q.sub_channel, q.companies
    FROM questions q
    LEFT JOIN blog_posts bp ON q.id = bp.question_id
    WHERE bp.id IS NULL
      AND q.explanation IS NOT NULL 
      AND LENGTH(q.explanation) > 100
    ORDER BY 
      (SELECT COUNT(*) FROM blog_posts WHERE channel = q.channel) ASC,
      RANDOM()
    LIMIT 1
  `);
  
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
    quickReference: row.quick_reference ? JSON.parse(row.quick_reference) : [],
    glossary: row.glossary ? JSON.parse(row.glossary) : [],
    realWorldExample: row.real_world_example ? JSON.parse(row.real_world_example) : null,
    funFact: row.fun_fact,
    sources: row.sources ? JSON.parse(row.sources) : [],
    socialSnippet: row.social_snippet ? JSON.parse(row.social_snippet) : null,
    createdAt: row.created_at
  }));
}

// Save blog post to database
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
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function markdownToHtml(md, glossary = []) {
  if (!md) return '';
  let html = md;
  
  // Preserve code blocks first - replace with placeholders
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ lang: lang || '', code: escapeHtml(code.trim()) });
    return `__CODE_BLOCK_${index}__`;
  });
  
  // Inline code - preserve with placeholder
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const index = inlineCodes.length;
    inlineCodes.push(escapeHtml(code));
    return `__INLINE_CODE_${index}__`;
  });
  
  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Callout boxes
  html = html.replace(/^>\s*(💡|⚠️|✅|🔥|🎯|❌|ℹ️)\s*([^:]+):\s*(.*)$/gm, 
    '<div class="callout"><span class="callout-icon">$1</span><div><strong>$2</strong><p>$3</p></div></div>');
  html = html.replace(/^>\s*(.*)$/gm, '<blockquote>$1</blockquote>');
  
  // Tables
  html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g, (match, header, body) => {
    const headers = header.split('|').filter(h => h.trim()).map(h => '<th>' + h.trim() + '</th>').join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => '<td>' + c.trim() + '</td>').join('');
      return '<tr>' + cells + '</tr>';
    }).join('');
    return '<table><thead><tr>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table>';
  });
  
  // Lists - improved handling
  html = html.replace(/^(\s*)[-*]\s+(.*)$/gm, '$1<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => '<ul>' + match.trim() + '</ul>');
  
  // Numbered lists
  html = html.replace(/^(\d+)\.\s+(.*)$/gm, '<li>$2</li>');
  
  // Paragraphs - only add for actual paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p>');
  
  // Single line breaks within paragraphs
  html = html.replace(/([^>])\n([^<])/g, '$1<br>$2');
  
  // Add glossary tooltips
  for (const item of glossary) {
    if (item && item.term) {
      const escapedTerm = item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');
      html = html.replace(regex, `<span class="glossary-term" data-tooltip="${escapeHtml(item.definition || '')}">$1</span>`);
    }
  }
  
  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    const langClass = block.lang ? ` class="language-${block.lang}"` : '';
    html = html.replace(`__CODE_BLOCK_${index}__`, `<pre><code${langClass}>${block.code}</code></pre>`);
  });
  
  // Restore inline code
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, `<code>${code}</code>`);
  });
  
  return html;
}


// Transform Q&A to blog using AI
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
    console.log(`⚠️ AI failed: ${error.message}, using fallback`);
    const cleanQuestion = question.question.replace(/\?$/, '');
    return {
      title: `The ${cleanQuestion.substring(0, 50)} Guide You Actually Need`,
      introduction: `Let's be real - ${cleanQuestion.toLowerCase()} is one of those topics that sounds simple until you're debugging it at 2am. Here's what you actually need to know.`,
      sections: [
        { heading: 'The TL;DR', content: question.answer || '' },
        { heading: 'The Deep Dive', content: question.explanation || '' }
      ],
      realWorldExample: { company: 'Netflix', scenario: 'Uses similar patterns at scale', lesson: 'Start simple, optimize when needed' },
      glossary: [],
      sources: [
        { title: 'Official Documentation', url: 'https://developer.mozilla.org', type: 'documentation' }
      ],
      quickReference: ['Key concept to remember', 'Common gotcha to avoid', 'Best practice to follow'],
      funFact: 'This concept has been around since the early days of computing!',
      conclusion: `Now you know the essentials. Go build something cool with it!`,
      metaDescription: (question.answer || '').substring(0, 155)
    };
  }
}

// CSS Generation - Premium UI/UX inspired by Linear, Stripe, Vercel
function generateCSS(theme = themes[DEFAULT_THEME]) {
  return `
:root {
  --bg: #050505; --bg-secondary: #0a0a0a; --bg-card: #111111; --bg-elevated: #161616;
  --text: #fafafa; --text-secondary: #888888; --text-muted: #555555;
  --accent: #00d4ff; --accent-secondary: #7c3aed; --accent-glow: rgba(0,212,255,0.15);
  --border: rgba(255,255,255,0.08); --border-hover: rgba(255,255,255,0.15);
  --gradient: linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #f472b6 100%);
  --gradient-subtle: linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(124,58,237,0.1) 100%);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
  --shadow-md: 0 8px 30px rgba(0,0,0,0.4);
  --shadow-lg: 0 20px 60px rgba(0,0,0,0.5);
  --shadow-glow: 0 0 60px rgba(0,212,255,0.15);
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 20px; --radius-xl: 28px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 15px; -webkit-font-smoothing: antialiased; }
.container { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }

/* Header - Glassmorphism */
header { background: rgba(5,5,5,0.8); backdrop-filter: blur(20px) saturate(180%); border-bottom: 1px solid var(--border); padding: 0.875rem 0; position: fixed; top: 0; left: 0; right: 0; z-index: 1000; }
.header-content { display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 1.25rem; font-weight: 700; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-decoration: none; letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.5rem; }
.logo::before { content: '◆'; font-size: 1rem; }
nav { display: flex; gap: 0.5rem; align-items: center; }
nav a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; font-weight: 500; padding: 0.5rem 1rem; border-radius: var(--radius-sm); transition: all 0.2s ease; }
nav a:hover { color: var(--text); background: var(--bg-card); }
nav a.nav-cta { background: var(--bg-card); border: 1px solid var(--border); color: var(--text); }
nav a.nav-cta:hover { border-color: var(--accent); box-shadow: var(--shadow-glow); }

/* Hero - Dramatic */
.hero { padding: 12rem 0 6rem; text-align: center; position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 1000px; height: 1000px; background: radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 60%); pointer-events: none; opacity: 0.8; }
.hero::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); opacity: 0.03; pointer-events: none; }
.hero-badge { display: inline-flex; align-items: center; gap: 0.625rem; background: var(--bg-card); border: 1px solid var(--border); padding: 0.5rem 1rem 0.5rem 0.625rem; border-radius: 100px; font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 2rem; position: relative; }
.hero-badge .pulse { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s ease-in-out infinite; box-shadow: 0 0 12px #10b981; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.hero h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 700; margin-bottom: 1.5rem; letter-spacing: -0.03em; line-height: 1.1; background: linear-gradient(180deg, #fff 0%, #888 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero p { color: var(--text-secondary); max-width: 540px; margin: 0 auto 2.5rem; font-size: 1.125rem; line-height: 1.7; }
.hero-cta { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--text); color: var(--bg); padding: 0.875rem 1.75rem; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 0.9375rem; transition: all 0.3s ease; box-shadow: var(--shadow-md); }
.hero-cta:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg), 0 0 40px rgba(255,255,255,0.1); }
.hero-cta svg { width: 16px; height: 16px; }
.hero-stats { display: flex; justify-content: center; gap: 4rem; margin-top: 5rem; padding-top: 3rem; border-top: 1px solid var(--border); }
.hero-stat { text-align: center; }
.hero-stat-value { font-size: 2.5rem; font-weight: 700; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.02em; }
.hero-stat-label { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.375rem; text-transform: uppercase; letter-spacing: 0.1em; }

/* Featured Article - Bento Style */
.featured { padding: 3rem 0 5rem; }
.featured-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 2.5rem; display: grid; grid-template-columns: 1fr 200px; gap: 2rem; align-items: center; position: relative; overflow: hidden; transition: all 0.4s ease; }
.featured-card:hover { border-color: var(--border-hover); box-shadow: var(--shadow-lg); }
.featured-card::before { content: ''; position: absolute; top: 0; right: 0; width: 50%; height: 100%; background: var(--gradient-subtle); opacity: 0.5; }
.featured-label { display: inline-flex; align-items: center; gap: 0.375rem; background: var(--gradient); color: #000; padding: 0.375rem 0.875rem; border-radius: 100px; font-size: 0.6875rem; font-weight: 700; margin-bottom: 1.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
.featured-title { font-size: 1.625rem; font-weight: 600; line-height: 1.35; margin-bottom: 1rem; letter-spacing: -0.02em; }
.featured-title a { color: var(--text); text-decoration: none; transition: color 0.2s; }
.featured-title a:hover { color: var(--accent); }
.featured-excerpt { color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.7; margin-bottom: 1.5rem; }
.featured-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.featured-visual { font-size: 5rem; opacity: 0.9; position: relative; z-index: 1; filter: grayscale(20%); }

/* Category Pills - Minimal */
.category-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.category-pill { display: flex; align-items: center; gap: 0.5rem; background: transparent; border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 100px; text-decoration: none; color: var(--text-secondary); font-size: 0.8125rem; font-weight: 500; transition: all 0.2s ease; }
.category-pill:hover { border-color: var(--accent); color: var(--text); background: rgba(0,212,255,0.05); }
.category-pill .count { background: var(--bg-elevated); padding: 0.125rem 0.5rem; border-radius: 100px; font-size: 0.6875rem; color: var(--text-muted); }

/* Section Headers */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.section-title { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.5rem; }
.section-title::before { content: ''; width: 4px; height: 20px; background: var(--gradient); border-radius: 2px; }
.section-link { color: var(--text-muted); text-decoration: none; font-size: 0.8125rem; font-weight: 500; transition: color 0.2s; }
.section-link:hover { color: var(--accent); }

/* Article Grid - Bento */
.articles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem; }

/* Newsletter CTA - Gradient Border */
.newsletter { padding: 5rem 0; }
.newsletter-card { background: var(--bg-card); border-radius: var(--radius-xl); padding: 4rem 2rem; text-align: center; position: relative; overflow: hidden; }
.newsletter-card::before { content: ''; position: absolute; inset: 0; border-radius: var(--radius-xl); padding: 1px; background: var(--gradient); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.newsletter-card h2 { font-size: 1.75rem; font-weight: 600; margin-bottom: 0.75rem; letter-spacing: -0.02em; }
.newsletter-card p { color: var(--text-secondary); font-size: 1rem; margin-bottom: 2rem; }
.newsletter-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--text); color: var(--bg); padding: 0.875rem 2rem; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 0.9375rem; transition: all 0.3s ease; }
.newsletter-btn:hover { transform: scale(1.02); box-shadow: var(--shadow-lg); }

/* Article cards - Glass Cards */
.article-list { padding: 4rem 0; }
.article-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; transition: all 0.3s ease; display: flex; flex-direction: column; position: relative; overflow: hidden; }
.article-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--gradient); opacity: 0; transition: opacity 0.3s; }
.article-card:hover { border-color: var(--border-hover); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.article-card:hover::before { opacity: 1; }
.article-card h2 { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; line-height: 1.5; flex-grow: 1; letter-spacing: -0.01em; }
.article-card h2 a { color: var(--text); text-decoration: none; transition: color 0.2s; }
.article-card h2 a:hover { color: var(--accent); }
.article-meta { display: flex; flex-wrap: wrap; gap: 0.375rem; font-size: 0.75rem; margin-bottom: 0.875rem; }
.tag { background: var(--bg-elevated); color: var(--text-secondary); padding: 0.25rem 0.625rem; border-radius: 100px; font-weight: 500; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.03em; }
.difficulty { padding: 0.25rem 0.625rem; border-radius: 100px; font-weight: 600; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.03em; }
.difficulty.beginner { background: rgba(16,185,129,0.15); color: #10b981; }
.difficulty.intermediate { background: rgba(245,158,11,0.15); color: #f59e0b; }
.difficulty.advanced { background: rgba(239,68,68,0.15); color: #ef4444; }
.excerpt { color: var(--text-muted); font-size: 0.8125rem; line-height: 1.6; }

/* Category Grid */
.category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.category-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; transition: all 0.3s ease; }
.category-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.category-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.375rem; letter-spacing: -0.01em; }
.category-card p { color: var(--text-muted); font-size: 0.8125rem; }
.category-card a { color: var(--accent); text-decoration: none; font-size: 0.8125rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 1rem; transition: gap 0.2s; }
.category-card a:hover { gap: 0.5rem; }
.category-card a::after { content: '→'; }

/* Article Page */
.article { padding: 8rem 0 4rem; max-width: 720px; margin: 0 auto; }
.article-header { margin-bottom: 3rem; }
.article-header h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700; margin-bottom: 1.5rem; line-height: 1.25; letter-spacing: -0.03em; }
.article-intro { font-size: 1.125rem; color: var(--text-secondary); line-height: 1.8; margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border); }

/* Article content - Clean Typography */
.article-content { font-size: 1rem; line-height: 1.85; color: var(--text-secondary); }
.article-content h2 { font-size: 1.375rem; font-weight: 600; margin: 3rem 0 1.25rem; color: var(--text); letter-spacing: -0.02em; }
.article-content h3 { font-size: 1.125rem; font-weight: 600; margin: 2rem 0 1rem; color: var(--text); }
.article-content p { margin-bottom: 1.5rem; }
.article-content strong { color: var(--text); font-weight: 600; }
.article-content a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.article-content pre { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; overflow-x: auto; margin: 1.5rem 0; font-size: 0.8125rem; }
.article-content code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.875em; }
.article-content p code, .article-content li code { background: var(--bg-elevated); padding: 0.2rem 0.4rem; border-radius: 4px; color: var(--accent); border: 1px solid var(--border); }
.article-content ul, .article-content ol { margin: 1.5rem 0; padding: 0 0 0 1.25rem; list-style: none; }
.article-content li { margin-bottom: 0.625rem; padding-left: 1rem; position: relative; }
.article-content ul > li::before { content: ''; position: absolute; left: -1rem; top: 0.6rem; width: 5px; height: 5px; background: var(--accent); border-radius: 50%; }
.article-content ol { counter-reset: item; }
.article-content ol > li { counter-increment: item; }
.article-content ol > li::before { content: counter(item); position: absolute; left: -1.5rem; top: 0; color: var(--accent); font-weight: 600; font-size: 0.875rem; }
.article-content .mermaid { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; margin: 2rem 0; }
.article-content table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.875rem; }
.article-content th { background: var(--bg-elevated); padding: 0.875rem 1rem; text-align: left; font-weight: 600; color: var(--text); border-bottom: 1px solid var(--border); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.article-content td { padding: 0.875rem 1rem; border-bottom: 1px solid var(--border); }
.article-content blockquote { padding: 1.25rem 1.5rem; margin: 2rem 0; background: var(--bg-card); border-radius: var(--radius-md); border-left: 3px solid var(--accent); color: var(--text-secondary); }

/* Callouts - Modern */
.callout { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; margin: 1.5rem 0; display: flex; gap: 1rem; align-items: flex-start; }
.callout-icon { font-size: 1.25rem; line-height: 1; }
.callout strong { color: var(--text); display: block; margin-bottom: 0.25rem; font-size: 0.875rem; }
.callout p { margin: 0; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; }

/* Glossary tooltips */
.glossary-term { border-bottom: 1px dashed var(--accent); cursor: help; position: relative; color: var(--text); }
.glossary-term:hover::after { content: attr(data-tooltip); position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: var(--bg-elevated); border: 1px solid var(--border); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.8125rem; max-width: 280px; white-space: normal; z-index: 100; box-shadow: var(--shadow-lg); color: var(--text-secondary); line-height: 1.5; }

/* Special sections - Bento Cards */
.real-world-example { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem; margin: 2rem 0; position: relative; overflow: hidden; }
.real-world-example::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--gradient); }
.real-world-example h3 { color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 0.5rem; }
.real-world-example .company { font-size: 1.25rem; font-weight: 600; color: var(--text); margin-bottom: 0.75rem; }
.real-world-example .scenario { color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.7; margin-bottom: 1rem; }
.real-world-example .lesson { background: var(--bg-elevated); padding: 1rem; border-radius: var(--radius-sm); font-size: 0.875rem; color: var(--text-secondary); border-left: 2px solid var(--accent); }

.fun-fact { background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(0,212,255,0.05)); border: 1px solid rgba(124,58,237,0.2); border-radius: var(--radius-lg); padding: 1.25rem 1.5rem; margin: 2rem 0; display: flex; gap: 1rem; align-items: center; }
.fun-fact-icon { font-size: 1.75rem; }
.fun-fact p { margin: 0; color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.6; }
.fun-fact strong { color: var(--text); }

.quick-ref { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem; margin: 2rem 0; }
.quick-ref h3 { color: var(--text); margin-bottom: 1rem; font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
.quick-ref ul { margin: 0; padding: 0; list-style: none; }
.quick-ref li { margin-bottom: 0.5rem; padding-left: 1.5rem; position: relative; color: var(--text-secondary); font-size: 0.9375rem; }
.quick-ref li::before { content: '✓'; position: absolute; left: 0; color: #10b981; font-weight: 700; }

/* Sources - Minimal */
.sources { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem 1.5rem; margin: 2rem 0; }
.sources h3 { margin-bottom: 0.875rem; font-size: 0.875rem; color: var(--text); font-weight: 600; }
.sources ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.sources li { padding-left: 1.25rem; position: relative; font-size: 0.875rem; }
.sources li::before { content: '→'; position: absolute; left: 0; color: var(--text-muted); }
.sources a { color: var(--accent); text-decoration: none; }
.sources a:hover { text-decoration: underline; }
.sources .source-type { font-size: 0.6875rem; color: var(--text-muted); margin-left: 0.5rem; text-transform: uppercase; letter-spacing: 0.03em; }

/* Share Snippet - Social Ready */
.share-snippet { background: linear-gradient(135deg, var(--bg-card), var(--bg-elevated)); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; margin: 2.5rem 0; position: relative; overflow: hidden; }
.share-snippet::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--gradient); }
.share-snippet-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.share-snippet-header .share-icon { font-size: 1.25rem; }
.share-snippet-header h3 { flex: 1; font-size: 0.9375rem; font-weight: 600; color: var(--text); margin: 0; }
.share-buttons { display: flex; gap: 0.5rem; }
.share-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.share-btn svg { width: 16px; height: 16px; }
.share-btn:hover { transform: scale(1.1); }
.share-btn.linkedin:hover { background: #0077b5; color: white; border-color: #0077b5; }
.share-btn.twitter:hover { background: #000; color: white; border-color: #000; }
.share-btn.copy:hover { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.share-snippet-content { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1.25rem; font-size: 0.9375rem; line-height: 1.7; }
.snippet-hook { font-weight: 600; color: var(--text); margin-bottom: 0.75rem; font-size: 1rem; }
.snippet-body { color: var(--text-secondary); margin-bottom: 0.75rem; white-space: pre-line; }
.snippet-cta { color: var(--accent); font-weight: 500; margin-bottom: 0.5rem; }
.snippet-link { font-size: 0.8125rem; color: var(--text-muted); word-break: break-all; }

/* CTA - Gradient */
.cta-box { margin-top: 3rem; padding: 2rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); text-align: center; position: relative; overflow: hidden; }
.cta-box::before { content: ''; position: absolute; inset: 0; background: var(--gradient-subtle); opacity: 0.5; }
.cta-box p { margin-bottom: 1rem; font-size: 1.125rem; font-weight: 600; color: var(--text); position: relative; }
.cta-button { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--text); color: var(--bg); padding: 0.75rem 1.5rem; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 0.875rem; transition: all 0.3s ease; position: relative; }
.cta-button:hover { transform: scale(1.02); box-shadow: var(--shadow-md); }

/* Footer - Minimal */
footer { background: var(--bg); border-top: 1px solid var(--border); padding: 3rem 0; margin-top: 5rem; }
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
  .article-header h1 { font-size: 1.5rem; } 
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
::selection { background: rgba(0,212,255,0.3); color: var(--text); }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* Search */
.search-container { position: relative; }
.search-btn { background: var(--bg-card); border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 100px; color: var(--text-muted); font-size: 0.8125rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
.search-btn:hover { border-color: var(--border-hover); color: var(--text); }
.search-btn kbd { background: var(--bg-elevated); padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.6875rem; font-family: inherit; }
.search-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 2000; align-items: flex-start; justify-content: center; padding-top: 15vh; }
.search-modal.active { display: flex; }
.search-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 100%; max-width: 600px; max-height: 70vh; overflow: hidden; box-shadow: var(--shadow-lg); }
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
.search-highlight { background: rgba(0,212,255,0.2); color: var(--accent); padding: 0 2px; border-radius: 2px; }

/* Filter tabs */
.filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-tab { background: transparent; border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 100px; color: var(--text-secondary); font-size: 0.8125rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.filter-tab:hover { border-color: var(--border-hover); color: var(--text); }
.filter-tab.active { background: var(--text); color: var(--bg); border-color: var(--text); }

/* Difficulty filter badges */
.diff-filters { display: flex; gap: 0.375rem; }
.diff-filter { padding: 0.375rem 0.75rem; border-radius: 100px; font-size: 0.75rem; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
.diff-filter.beginner { background: rgba(16,185,129,0.1); color: #10b981; }
.diff-filter.intermediate { background: rgba(245,158,11,0.1); color: #f59e0b; }
.diff-filter.advanced { background: rgba(239,68,68,0.1); color: #ef4444; }
.diff-filter:hover, .diff-filter.active { border-color: currentColor; }

/* Stats Bar */
.stats-bar { padding: 0; margin-top: -3rem; position: relative; z-index: 10; }
.stats-grid { display: flex; justify-content: center; align-items: center; gap: 2.5rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 1.5rem 3rem; max-width: 700px; margin: 0 auto; }
.stat-item { text-align: center; }
.stat-value { font-size: 1.75rem; font-weight: 700; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: block; letter-spacing: -0.02em; }
.stat-label { font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.25rem; display: block; }
.stat-divider { width: 1px; height: 40px; background: var(--border); }

/* Featured Grid */
.featured-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.25rem; }
.featured-main { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 2rem; position: relative; overflow: hidden; transition: all 0.3s ease; }
.featured-main:hover { border-color: var(--border-hover); box-shadow: var(--shadow-lg); }
.featured-main::before { content: ''; position: absolute; top: 0; right: 0; width: 60%; height: 100%; background: var(--gradient-subtle); opacity: 0.5; pointer-events: none; }
.featured-side { display: flex; flex-direction: column; gap: 1.25rem; }
.featured-side-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; text-decoration: none; transition: all 0.3s ease; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
.featured-side-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.featured-side-card .tag { width: fit-content; }
.featured-side-card h3 { font-size: 0.9375rem; font-weight: 600; color: var(--text); line-height: 1.4; margin: 0; letter-spacing: -0.01em; }

/* Topics Section */
.topics-section { padding: 4rem 0 2rem; }
.topics-title { font-size: 1.125rem; font-weight: 600; text-align: center; margin-bottom: 1.5rem; color: var(--text); letter-spacing: -0.02em; }

/* Hero Actions */
.hero-actions { display: flex; gap: 1rem; justify-content: center; align-items: center; }
.hero-cta-secondary { color: var(--text-secondary); text-decoration: none; font-size: 0.9375rem; font-weight: 500; padding: 0.875rem 1.5rem; border: 1px solid var(--border); border-radius: 100px; transition: all 0.2s ease; }
.hero-cta-secondary:hover { border-color: var(--border-hover); color: var(--text); background: var(--bg-card); }

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
  <script>mermaid.initialize({startOnLoad:true,theme:'dark',themeVariables:{primaryColor:'#7c3aed',primaryTextColor:'#fafafa',primaryBorderColor:'rgba(255,255,255,0.1)',lineColor:'#00d4ff',secondaryColor:'#111',tertiaryColor:'#161616'}});</script>` : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | DevInsights</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#050505">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">${mermaidScript}
  <link rel="stylesheet" href="/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◆</text></svg>">
</head>
<body>`;
}

function generateHeader() {
  return `<header><div class="container header-content">
    <a href="/" class="logo">DevInsights</a>
    <nav>
      <a href="/">Home</a>
      <a href="/categories/">Topics</a>
      <button class="search-btn" onclick="openSearch()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Search<kbd>⌘K</kbd></button>
      <a href="https://open-interview.github.io" target="_blank" class="nav-cta">Practice →</a>
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
    </div>
  </div>
  <div class="footer-copy">
    <p>© ${new Date().getFullYear()} DevInsights · Built for developers who ship · <a href="https://open-interview.github.io">Reel Interview</a></p>
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
  
  // Article cards (skip first if featured)
  let articleCards = recentArticles.slice(1).map(a => `
    <div class="article-card" data-difficulty="${a.difficulty}" data-channel="${a.channel}">
      <div class="article-meta">
        <span class="tag">${formatChannelName(a.channel)}</span>
        <span class="difficulty ${a.difficulty}">${a.difficulty}</span>
      </div>
      <h2><a href="/posts/${a.id}/${a.blogSlug}/">${escapeHtml(a.blogTitle)}</a></h2>
      <p class="excerpt">${escapeHtml((a.blogIntro || '').substring(0, 100))}...</p>
    </div>`).join('');
  
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
          <span class="featured-label">✦ Latest</span>
          <h2 class="featured-title"><a href="/posts/${mainFeatured.id}/${mainFeatured.blogSlug}/">${escapeHtml(mainFeatured.blogTitle)}</a></h2>
          <p class="featured-excerpt">${escapeHtml((mainFeatured.blogIntro || '').substring(0, 200))}...</p>
          <div class="featured-meta">
            <span class="tag">${formatChannelName(mainFeatured.channel)}</span>
            <span class="difficulty ${mainFeatured.difficulty}">${mainFeatured.difficulty}</span>
          </div>
        </div>
        <div class="featured-side">
          ${sideFeatured.map(a => `
            <a href="/posts/${a.id}/${a.blogSlug}/" class="featured-side-card">
              <span class="tag">${formatChannelName(a.channel)}</span>
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
    <div class="hero-badge"><span class="pulse"></span> New articles weekly</div>
    <h1>Deep dives into<br>real engineering</h1>
    <p>Battle-tested insights from production systems. Learn what actually works at scale.</p>
    <div class="hero-actions">
      <a href="#articles" class="hero-cta">Browse Articles <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
      <a href="/categories/" class="hero-cta-secondary">All Topics</a>
    </div>
  </div></section>
  
  <section class="stats-bar"><div class="container">
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-value">${totalArticles}</span>
        <span class="stat-label">Deep Dives</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">${totalCategories}</span>
        <span class="stat-label">Topics</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">${readingHours}h+</span>
        <span class="stat-label">Of Content</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">Free</span>
        <span class="stat-label">Forever</span>
      </div>
    </div>
  </div></section>
  
  ${featuredHtml}
  
  <section class="topics-section"><div class="container">
    <h2 class="topics-title">Explore by Topic</h2>
    <div class="category-pills">${categoryPills}</div>
  </div></section>
  
  <section class="article-list" id="articles"><div class="container">
    <div class="section-header">
      <h2 class="section-title">All Articles</h2>
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
  
  let articleCards = categoryArticles.map(a => `
    <div class="article-card">
      <div class="article-meta"><span class="tag">${formatChannelName(a.channel)}</span><span class="difficulty ${a.difficulty}">${a.difficulty}</span></div>
      <h2><a href="/posts/${a.id}/${a.blogSlug}/">${escapeHtml(a.blogTitle)}</a></h2>
      <p class="excerpt">${escapeHtml((a.blogIntro || '').substring(0, 120))}...</p>
    </div>`).join('');
  
  return `${generateHead(category, `${categoryArticles.length} articles about ${category}`)}
${generateHeader()}
<main><section class="article-list" style="padding-top:7rem"><div class="container">
  <a href="/" style="color:var(--text-muted);text-decoration:none;font-size:0.8125rem;display:inline-flex;align-items:center;gap:0.25rem">← Back</a>
  <h1 style="margin:1.5rem 0 0.5rem;font-size:2rem;font-weight:700;letter-spacing:-0.03em">${category}</h1>
  <p style="color:var(--text-muted);margin-bottom:2.5rem;font-size:0.9375rem">${categoryArticles.length} deep dives</p>
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
  
  let sectionsHtml = (article.blogSections || []).map(s => 
    `<h2>${escapeHtml(s.heading)}</h2>${markdownToHtml(s.content, glossary)}`
  ).join('');
  
  // Real-world example section
  if (article.realWorldExample) {
    const ex = article.realWorldExample;
    sectionsHtml += `
    <div class="real-world-example">
      <h3>🏢 Real-World Case Study</h3>
      <div class="company">${escapeHtml(ex.company)}</div>
      <p class="scenario">${escapeHtml(ex.scenario)}</p>
      <div class="lesson"><strong>Key Takeaway:</strong> ${escapeHtml(ex.lesson)}</div>
    </div>`;
  }
  
  // Diagram section
  if (article.diagram) {
    sectionsHtml += `<h2>Architecture Overview</h2><div class="mermaid">${article.diagram}</div>`;
  }
  
  // Fun fact
  if (article.funFact) {
    sectionsHtml += `<div class="fun-fact"><span class="fun-fact-icon">💡</span><p><strong>Did you know?</strong> ${escapeHtml(article.funFact)}</p></div>`;
  }
  
  // Quick reference
  const quickRef = article.quickReference || [];
  if (quickRef.length > 0) {
    sectionsHtml += `<div class="quick-ref"><h3>📌 Key Takeaways</h3><ul>${quickRef.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></div>`;
  }
  
  // Sources
  const sources = article.sources || [];
  if (sources.length > 0) {
    const sourceItems = sources.map(s => 
      `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a><span class="source-type">${s.type || 'article'}</span></li>`
    ).join('');
    sectionsHtml += `<div class="sources"><h3>Further Reading</h3><ul>${sourceItems}</ul></div>`;
  }
  
  // Social snippet - shareable section
  const socialSnippet = article.socialSnippet;
  if (socialSnippet) {
    const snippetText = `${socialSnippet.hook}\n\n${socialSnippet.body}\n\n${socialSnippet.cta}`;
    const encodedText = encodeURIComponent(snippetText + `\n\n🔗 `);
    const articleUrl = `https://open-interview.github.io/posts/${article.id}/${article.blogSlug}/`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodeURIComponent(articleUrl)}`;
    
    sectionsHtml += `
    <div class="share-snippet">
      <div class="share-snippet-header">
        <span class="share-icon">📣</span>
        <h3>Share This</h3>
        <div class="share-buttons">
          <a href="${linkedInUrl}" target="_blank" rel="noopener" class="share-btn linkedin" title="Share on LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
          <a href="${twitterUrl}" target="_blank" rel="noopener" class="share-btn twitter" title="Share on X/Twitter">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <button class="share-btn copy" onclick="copySnippet(this)" title="Copy to clipboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
      </div>
      <div class="share-snippet-content" id="shareSnippet">
        <p class="snippet-hook">${escapeHtml(socialSnippet.hook)}</p>
        <p class="snippet-body">${escapeHtml(socialSnippet.body).replace(/\n/g, '<br>')}</p>
        <p class="snippet-cta">${escapeHtml(socialSnippet.cta)}</p>
        <p class="snippet-link">🔗 ${articleUrl}</p>
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
  <p class="article-intro">${escapeHtml(article.blogIntro)}</p>
  <div class="article-content">
    ${sectionsHtml}
    <h2>Wrapping Up</h2>
    <p>${escapeHtml(article.blogConclusion)}</p>
  </div>
  ${relatedHtml}
  <div class="cta-box">
    <p>Ready to put this into practice?</p>
    <a href="https://open-interview.github.io/channel/${article.channel}" class="cta-button">Practice Questions →</a>
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
  console.log('=== 🚀 Blog Generator ===\n');
  
  await initBlogPostsTable();
  
  const stats = await getBlogStats();
  console.log(`📊 Current blog posts: ${stats.total}`);
  if (stats.byChannel.length > 0) {
    console.log('   By channel:');
    stats.byChannel.slice(0, 5).forEach(c => console.log(`     ${c.channel}: ${c.count}`));
    if (stats.byChannel.length > 5) console.log(`     ... and ${stats.byChannel.length - 5} more`);
  }
  
  console.log('\n🔍 Finding next question to convert...');
  const question = await getNextQuestionForBlog();
  
  if (!question) {
    console.log('✅ All questions have been converted!');
  } else {
    console.log(`   Found: ${question.id} (${question.channel})`);
    console.log(`   Q: ${question.question.substring(0, 60)}...`);
    
    const blogContent = await transformToBlogArticle(question);
    console.log(`   Title: ${blogContent.title}`);
    
    // Validate sources - remove 404s
    const validatedSources = await validateSources(blogContent.sources || []);
    blogContent.sources = validatedSources;
    
    // Check minimum sources requirement
    if (validatedSources.length < MIN_SOURCES) {
      console.log(`   ⚠️ Only ${validatedSources.length} valid sources (need ${MIN_SOURCES})`);
      console.log(`   🔄 Skipping this article - insufficient sources`);
      // Don't save, will try different question next run
    } else {
      console.log(`   ✅ ${validatedSources.length} valid sources`);
      console.log('💾 Saving to database...');
      await saveBlogPost(question.id, blogContent, question);
      console.log('✅ Blog post saved!\n');
    }
  }
  
  console.log('📄 Regenerating static site...');
  
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  const articles = await getAllBlogPosts();
  console.log(`   Total articles: ${articles.length}`);
  
  if (articles.length === 0) {
    console.log('   No articles yet, skipping site generation');
    return;
  }
  
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
