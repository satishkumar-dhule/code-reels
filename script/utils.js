import 'dotenv/config';
import { createClient } from '@libsql/client';
import { spawn } from 'child_process';
import https from 'https';
import fs from 'fs';

// ============================================
// DATABASE CONNECTION
// ============================================

const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL_RO;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN_RO;

// Create database client lazily - only fail when actually used if URL is missing
let _dbClient = null;
export const dbClient = {
  get execute() {
    if (!_dbClient) {
      if (!url) {
        throw new Error('Missing TURSO_DATABASE_URL environment variable');
      }
      _dbClient = createClient({ url, authToken });
    }
    return _dbClient.execute.bind(_dbClient);
  },
  get batch() {
    if (!_dbClient) {
      if (!url) {
        throw new Error('Missing TURSO_DATABASE_URL environment variable');
      }
      _dbClient = createClient({ url, authToken });
    }
    return _dbClient.batch.bind(_dbClient);
  }
};

// Constants
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 10000;
export const TIMEOUT_MS = 300000; // 5 minutes

// ============================================
// DATABASE OPERATIONS
// ============================================

// Cache for questions within a single bot run
let _questionsCache = null;
let _questionsCacheTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

// Cache for work queue initialization
let _workQueueInitialized = false;

// Clear caches (useful for testing or long-running processes)
export function clearCaches() {
  _questionsCache = null;
  _questionsCacheTime = 0;
  _workQueueInitialized = false;
}

// Parse a database row into a question object
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
    tldr: row.tldr,
    lastUpdated: row.last_updated,
    lastRemapped: row.last_remapped,
    createdAt: row.created_at
  };
}

// Load all questions from database
export async function loadUnifiedQuestions() {
  const result = await dbClient.execute('SELECT * FROM questions');
  const questions = {};
  for (const row of result.rows) {
    questions[row.id] = parseQuestionRow(row);
  }
  return questions;
}

// Get all questions as array (with caching for single bot run)
export async function getAllUnifiedQuestions(useCache = true) {
  const now = Date.now();
  
  // Return cached data if valid
  if (useCache && _questionsCache && (now - _questionsCacheTime) < CACHE_TTL_MS) {
    return _questionsCache;
  }
  
  const result = await dbClient.execute('SELECT * FROM questions');
  const questions = result.rows.map(parseQuestionRow);
  
  // Update cache
  _questionsCache = questions;
  _questionsCacheTime = now;
  
  return questions;
}

// Get question count without fetching all data
export async function getQuestionCount(channel = null) {
  if (channel) {
    const result = await dbClient.execute({
      sql: 'SELECT COUNT(*) as count FROM questions WHERE channel = ?',
      args: [channel]
    });
    return result.rows[0]?.count || 0;
  }
  
  const result = await dbClient.execute('SELECT COUNT(*) as count FROM questions');
  return result.rows[0]?.count || 0;
}

// Get channel question counts efficiently (single query)
export async function getChannelQuestionCounts() {
  const result = await dbClient.execute(`
    SELECT channel, COUNT(*) as count 
    FROM questions 
    GROUP BY channel
  `);
  
  const counts = {};
  for (const row of result.rows) {
    counts[row.channel] = row.count;
  }
  return counts;
}

// Save/update a question in the database
export async function saveQuestion(question) {
  await dbClient.execute({
    sql: `INSERT OR REPLACE INTO questions 
          (id, question, answer, explanation, diagram, difficulty, tags, channel, sub_channel, source_url, videos, companies, eli5, tldr, last_updated, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM questions WHERE id = ?), ?))`,
    args: [
      question.id,
      question.question,
      question.answer,
      question.explanation,
      question.diagram || null,
      question.difficulty || 'intermediate',
      question.tags ? JSON.stringify(question.tags) : null,
      question.channel,
      question.subChannel,
      question.sourceUrl || null,
      question.videos ? JSON.stringify(question.videos) : null,
      question.companies ? JSON.stringify(question.companies) : null,
      question.eli5 || null,
      question.tldr || null,
      question.lastUpdated || new Date().toISOString(),
      question.id,
      new Date().toISOString()
    ]
  });
}

// Save all questions (batch update)
export async function saveUnifiedQuestions(questions) {
  const batch = [];
  for (const [id, q] of Object.entries(questions)) {
    batch.push({
      sql: `INSERT OR REPLACE INTO questions 
            (id, question, answer, explanation, diagram, difficulty, tags, channel, sub_channel, source_url, videos, companies, eli5, tldr, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        q.question,
        q.answer,
        q.explanation,
        q.diagram || null,
        q.difficulty || 'intermediate',
        q.tags ? JSON.stringify(q.tags) : null,
        q.channel,
        q.subChannel,
        q.sourceUrl || null,
        q.videos ? JSON.stringify(q.videos) : null,
        q.companies ? JSON.stringify(q.companies) : null,
        q.eli5 || null,
        q.tldr || null,
        q.lastUpdated || new Date().toISOString()
      ]
    });
  }
  
  // Execute in batches of 50
  for (let i = 0; i < batch.length; i += 50) {
    await dbClient.batch(batch.slice(i, i + 50));
  }
}

// Load channel mappings from database
export async function loadChannelMappings() {
  const result = await dbClient.execute('SELECT * FROM channel_mappings ORDER BY channel_id, sub_channel');
  const mappings = {};
  
  for (const row of result.rows) {
    const channelId = row.channel_id;
    const subChannel = row.sub_channel;
    const questionId = row.question_id;
    
    if (!mappings[channelId]) {
      mappings[channelId] = { subChannels: {} };
    }
    if (!mappings[channelId].subChannels[subChannel]) {
      mappings[channelId].subChannels[subChannel] = [];
    }
    if (!mappings[channelId].subChannels[subChannel].includes(questionId)) {
      mappings[channelId].subChannels[subChannel].push(questionId);
    }
  }
  
  return mappings;
}

// Save channel mappings to database
export async function saveChannelMappings(mappings) {
  // Clear existing mappings
  await dbClient.execute('DELETE FROM channel_mappings');
  
  // Insert new mappings
  const batch = [];
  for (const [channelId, data] of Object.entries(mappings)) {
    for (const [subChannel, questionIds] of Object.entries(data.subChannels || {})) {
      for (const questionId of questionIds) {
        batch.push({
          sql: 'INSERT INTO channel_mappings (channel_id, sub_channel, question_id) VALUES (?, ?, ?)',
          args: [channelId, subChannel, questionId]
        });
      }
    }
  }
  
  // Execute in batches
  for (let i = 0; i < batch.length; i += 100) {
    await dbClient.batch(batch.slice(i, i + 100));
  }
}

// Add a question to database and map to channels (optimized with batch insert)
export async function addUnifiedQuestion(question, channels) {
  // Set channel/subChannel from first mapping
  question.channel = channels[0].channel;
  question.subChannel = channels[0].subChannel;
  
  // Save question
  await saveQuestion(question);
  
  // Batch insert channel mappings (single transaction instead of multiple calls)
  if (channels.length > 0) {
    const batch = channels.map(({ channel, subChannel }) => ({
      sql: 'INSERT OR IGNORE INTO channel_mappings (channel_id, sub_channel, question_id) VALUES (?, ?, ?)',
      args: [channel, subChannel, question.id]
    }));
    await dbClient.batch(batch);
  }
  
  // Invalidate cache since we added a new question
  _questionsCache = null;
}

// Get questions for a specific channel
export async function getQuestionsForChannel(channel) {
  const result = await dbClient.execute({
    sql: 'SELECT * FROM questions WHERE channel = ?',
    args: [channel]
  });
  return result.rows.map(parseQuestionRow);
}

// ============================================
// PRIORITIZATION QUERIES
// ============================================

// Get questions that need improvement, sorted by priority
export async function getQuestionsNeedingImprovement(limit = 10) {
  // Query questions with issues, prioritizing:
  // 1. Missing or short answers
  // 2. Missing explanations
  // 3. Missing diagrams
  // 4. Oldest lastUpdated
  const result = await dbClient.execute({
    sql: `
      SELECT *,
        CASE 
          WHEN answer IS NULL OR LENGTH(answer) < 20 THEN 5
          WHEN LENGTH(answer) > 300 THEN 3
          ELSE 0
        END +
        CASE 
          WHEN explanation IS NULL OR LENGTH(explanation) < 50 THEN 4
          WHEN explanation LIKE '%[truncated%' THEN 3
          ELSE 0
        END +
        CASE 
          WHEN diagram IS NULL OR LENGTH(diagram) < 20 THEN 3
          ELSE 0
        END +
        CASE 
          WHEN source_url IS NULL THEN 1
          ELSE 0
        END +
        CASE 
          WHEN videos IS NULL OR videos = '{}' OR videos = 'null' THEN 2
          ELSE 0
        END +
        CASE 
          WHEN companies IS NULL OR companies = '[]' OR companies = 'null' THEN 1
          ELSE 0
        END AS priority_score
      FROM questions
      WHERE 
        (answer IS NULL OR LENGTH(answer) < 20 OR LENGTH(answer) > 300) OR
        (explanation IS NULL OR LENGTH(explanation) < 50 OR explanation LIKE '%[truncated%') OR
        (diagram IS NULL OR LENGTH(diagram) < 20) OR
        (source_url IS NULL) OR
        (videos IS NULL OR videos = '{}' OR videos = 'null') OR
        (companies IS NULL OR companies = '[]' OR companies = 'null') OR
        (question NOT LIKE '%?')
      ORDER BY priority_score DESC, last_updated ASC
      LIMIT ?
    `,
    args: [limit]
  });
  return result.rows.map(parseQuestionRow);
}

// Get questions needing diagrams, sorted by priority
export async function getQuestionsNeedingDiagrams(limit = 10) {
  const result = await dbClient.execute({
    sql: `
      SELECT *,
        CASE 
          WHEN diagram IS NULL OR LENGTH(diagram) < 20 THEN 3
          WHEN diagram LIKE '%Concept%' AND diagram LIKE '%Implementation%' AND LENGTH(diagram) < 100 THEN 2
          WHEN LENGTH(diagram) < 50 THEN 1
          ELSE 0
        END AS diagram_priority
      FROM questions
      WHERE 
        diagram IS NULL OR 
        LENGTH(diagram) < 20 OR
        (diagram LIKE '%Concept%' AND diagram LIKE '%Implementation%' AND LENGTH(diagram) < 100)
      ORDER BY diagram_priority DESC, last_updated ASC
      LIMIT ?
    `,
    args: [limit]
  });
  return result.rows.map(parseQuestionRow);
}

// Get channel statistics for balancing question distribution
export async function getChannelStats() {
  const result = await dbClient.execute(`
    SELECT 
      channel,
      COUNT(*) as question_count,
      SUM(CASE WHEN diagram IS NULL OR LENGTH(diagram) < 20 THEN 1 ELSE 0 END) as missing_diagrams,
      SUM(CASE WHEN explanation IS NULL OR LENGTH(explanation) < 50 THEN 1 ELSE 0 END) as missing_explanations,
      SUM(CASE WHEN companies IS NULL OR companies = '[]' THEN 1 ELSE 0 END) as missing_companies,
      MIN(last_updated) as oldest_update
    FROM questions
    GROUP BY channel
    ORDER BY question_count ASC
  `);
  return result.rows;
}

// Get channels with fewest questions (for balancing new question additions)
export async function getUnderservedChannels(minQuestions = 10) {
  const result = await dbClient.execute({
    sql: `
      SELECT channel, COUNT(*) as count
      FROM questions
      GROUP BY channel
      HAVING COUNT(*) < ?
      ORDER BY count ASC
    `,
    args: [minQuestions]
  });
  return result.rows;
}

// Generate unique ID - optimized to only fetch max ID
export async function generateUnifiedId(prefix = 'q') {
  // Get the max numeric ID to avoid fetching all IDs
  const result = await dbClient.execute(`
    SELECT MAX(CAST(SUBSTR(id, 3) AS INTEGER)) as max_num 
    FROM questions 
    WHERE id LIKE '${prefix}-%'
  `);
  
  const maxNum = result.rows[0]?.max_num || 0;
  return `${prefix}-${maxNum + 1}`;
}

// Check if question is duplicate - optimized to use SQL LIKE for initial filter
export async function isDuplicateUnified(questionText, threshold = 0.6) {
  // Extract key words for SQL pre-filtering (reduces data transfer)
  const words = normalizeText(questionText).split(' ').filter(w => w.length > 3).slice(0, 5);
  
  if (words.length === 0) {
    // Fallback to full scan if no meaningful words
    const questions = await getAllUnifiedQuestions();
    return questions.some(q => calculateSimilarity(questionText, q.question) >= threshold);
  }
  
  // Pre-filter with SQL LIKE to reduce candidates
  const likeConditions = words.map(() => 'LOWER(question) LIKE ?').join(' OR ');
  const likeArgs = words.map(w => `%${w}%`);
  
  const result = await dbClient.execute({
    sql: `SELECT question FROM questions WHERE ${likeConditions}`,
    args: likeArgs
  });
  
  // Check similarity only on pre-filtered candidates
  return result.rows.some(row => calculateSimilarity(questionText, row.question) >= threshold);
}

// ============================================
// YOUTUBE VIDEO VALIDATION
// ============================================

export function extractYouTubeVideoId(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const BLOCKED_VIDEO_IDS = [
  'dQw4w9WgXcQ', 'oHg5SJYRHA0', 'xvFZjo5PgG0', 'DLzxrzFCyOs',
  'kJQP7kiw5Fk', '9bZkp7q19f0', 'jNQXAC9IVRw',
  'AAAAAAAAAA', 'BBBBBBBBBBB', 'CCCCCCCCCCC',
  'xxxxxxxxxxx', 'yyyyyyyyyyy', 'zzzzzzzzzzz',
  '12345678901', 'abcdefghijk',
];

export async function validateYouTubeVideo(url) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return { valid: false, reason: 'Invalid YouTube URL format' };
  
  if (BLOCKED_VIDEO_IDS.includes(videoId)) {
    return { valid: false, reason: 'Blocked: Known placeholder/meme video' };
  }
  
  return new Promise((resolve) => {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    const req = https.get(oembedUrl, { timeout: 5000 }, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            resolve({ valid: true, videoId, title: info.title, author: info.author_name });
          } catch {
            resolve({ valid: true, videoId });
          }
        });
      } else {
        resolve({ valid: false, reason: `HTTP ${res.statusCode}` });
      }
    });
    
    req.on('error', () => resolve({ valid: false, reason: 'Network error' }));
    req.on('timeout', () => { req.destroy(); resolve({ valid: false, reason: 'Timeout' }); });
  });
}

function isVideoTitleRelevant(title) {
  if (!title) return true;
  const blockedPatterns = [
    /official\s*(music\s*)?video/i, /\(official\)/i, /music\s*video/i,
    /lyric\s*video/i, /lyrics/i, /ft\.|feat\./i, /rick\s*astley/i,
    /never\s*gonna\s*give/i, /despacito/i, /gangnam/i, /baby\s*shark/i, /vevo$/i,
  ];
  return !blockedPatterns.some(p => p.test(title));
}

export async function validateYouTubeVideos(videos) {
  if (!videos) return { shortVideo: null, longVideo: null };
  
  const result = { shortVideo: null, longVideo: null };
  
  if (videos.shortVideo) {
    const validation = await validateYouTubeVideo(videos.shortVideo);
    if (validation.valid && isVideoTitleRelevant(validation.title)) {
      result.shortVideo = videos.shortVideo;
      console.log(`  ✓ Short video valid: ${validation.title || videos.shortVideo}`);
    } else {
      console.log(`  ✗ Short video invalid: ${validation.reason || 'Non-educational'}`);
    }
  }
  
  if (videos.longVideo) {
    const validation = await validateYouTubeVideo(videos.longVideo);
    if (validation.valid && isVideoTitleRelevant(validation.title)) {
      result.longVideo = videos.longVideo;
      console.log(`  ✓ Long video valid: ${validation.title || videos.longVideo}`);
    } else {
      console.log(`  ✗ Long video invalid: ${validation.reason || 'Non-educational'}`);
    }
  }
  
  return result;
}

// ============================================
// COMPANY VALIDATION
// ============================================

const KNOWN_COMPANIES = new Set([
  'Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Netflix', 'Uber', 'Airbnb',
  'LinkedIn', 'Twitter', 'Stripe', 'Salesforce', 'Adobe', 'Oracle', 'IBM',
  'Spotify', 'Snap', 'Pinterest', 'Dropbox', 'Slack', 'Zoom', 'Shopify',
  'Square', 'PayPal', 'Intuit', 'VMware', 'Cisco', 'Intel', 'AMD', 'NVIDIA',
  'Tesla', 'SpaceX', 'Palantir', 'Databricks', 'Snowflake', 'MongoDB',
  'Coinbase', 'Robinhood', 'DoorDash', 'Instacart', 'Lyft', 'Reddit',
  'TikTok', 'ByteDance', 'Alibaba', 'Tencent', 'Baidu', 'Samsung',
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bloomberg', 'Citadel',
  'Two Sigma', 'Jane Street', 'DE Shaw', 'Bridgewater', 'Visa', 'Mastercard'
]);

const COMPANY_ALIASES = {
  'facebook': 'Meta', 'fb': 'Meta', 'aws': 'Amazon',
  'msft': 'Microsoft', 'goog': 'Google', 'alphabet': 'Google',
  'x': 'Twitter', 'x.com': 'Twitter', 'openai': 'OpenAI', 'github': 'GitHub',
};

export function normalizeCompanies(companies) {
  if (!companies || !Array.isArray(companies)) return [];
  
  const normalized = new Set();
  companies.forEach(company => {
    if (!company || typeof company !== 'string') return;
    const trimmed = company.trim();
    const lower = trimmed.toLowerCase();
    
    if (COMPANY_ALIASES[lower]) {
      normalized.add(COMPANY_ALIASES[lower]);
      return;
    }
    
    for (const known of KNOWN_COMPANIES) {
      if (known.toLowerCase() === lower) {
        normalized.add(known);
        return;
      }
    }
    
    const capitalized = trimmed.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    if (capitalized.length >= 2 && /^[A-Za-z0-9\s&.-]+$/.test(capitalized)) {
      normalized.add(capitalized);
    }
  });
  
  return Array.from(normalized).sort();
}

// ============================================
// TEXT PROCESSING
// ============================================

export function normalizeText(t) {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function calculateSimilarity(text1, text2) {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

export function isDuplicate(question, existing, threshold = 0.6) {
  return existing.some(e => calculateSimilarity(question, e.question) >= threshold);
}

// ============================================
// OPENCODE INTEGRATION
// ============================================

export function runOpenCode(prompt) {
  return new Promise((resolve) => {
    let output = '';
    let resolved = false;
    
    const proc = spawn('opencode', ['run', '--format', 'json', prompt], {
      timeout: TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; proc.kill('SIGTERM'); resolve(null); }
    }, TIMEOUT_MS);
    
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });
    
    proc.on('close', () => {
      clearTimeout(timeout);
      if (!resolved) { resolved = true; resolve(output || null); }
    });
    
    proc.on('error', () => {
      clearTimeout(timeout);
      if (!resolved) { resolved = true; resolve(null); }
    });
  });
}

export async function runWithRetries(prompt) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[Attempt ${attempt}/${MAX_RETRIES}] Calling OpenCode CLI...`);
    const result = await runOpenCode(prompt);
    if (result) return result;
    
    if (attempt < MAX_RETRIES) {
      console.log(`Failed. Waiting ${RETRY_DELAY_MS/1000}s before retry...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  return null;
}

// ============================================
// JSON PARSING
// ============================================

export function extractTextFromJsonEvents(output) {
  if (!output) return null;
  
  const lines = output.split('\n').filter(l => l.trim());
  let fullText = '';
  
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'text' && event.part?.text) {
        fullText += event.part.text;
      }
    } catch {}
  }
  
  return fullText || output;
}

export function parseJson(response) {
  if (!response) return null;
  
  const text = extractTextFromJsonEvents(response);
  
  console.log('📥 RESPONSE (first 500 chars):');
  console.log(text.substring(0, 500));
  console.log('─'.repeat(30));
  
  try { return JSON.parse(text.trim()); } catch {}
  
  const codeBlockPatterns = [/```json\s*([\s\S]*?)\s*```/, /```\s*([\s\S]*?)\s*```/];
  for (const p of codeBlockPatterns) {
    const m = text.match(p);
    if (m) { try { return JSON.parse(m[1].trim()); } catch {} }
  }
  
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch {}
  }
  
  return null;
}

// ============================================
// VALIDATION
// ============================================

export function validateQuestion(data) {
  return data &&
    data.question?.length > 10 &&
    data.answer?.length > 5 &&
    data.explanation?.length > 20;
}

// ============================================
// GITHUB OUTPUT
// ============================================

export function writeGitHubOutput(data) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    Object.entries(data).forEach(([key, value]) => {
      fs.appendFileSync(out, `${key}=${value}\n`);
    });
  }
}

// ============================================
// INDEX FILE (for backward compatibility)
// ============================================

export function updateUnifiedIndexFile() {
  // No-op - we no longer use local files
  console.log('📝 Index file update skipped (using database)');
}

// ============================================
// CHANGELOG (stored in database or memory)
// ============================================

let changelogCache = null;

export function loadChangelog() {
  if (changelogCache) return changelogCache;
  return {
    entries: [],
    stats: { totalQuestionsAdded: 0, totalQuestionsImproved: 0, lastUpdated: new Date().toISOString() }
  };
}

export function saveChangelog(data) {
  changelogCache = data;
  changelogCache.stats.lastUpdated = new Date().toISOString();
}

export function addChangelogEntry(type, title, description, details = {}) {
  const changelog = loadChangelog();
  const entry = { date: new Date().toISOString().split('T')[0], type, title, description, details };
  changelog.entries.unshift(entry);
  if (details.questionsAdded) changelog.stats.totalQuestionsAdded += details.questionsAdded;
  if (details.questionsImproved) changelog.stats.totalQuestionsImproved += details.questionsImproved;
  if (changelog.entries.length > 100) changelog.entries = changelog.entries.slice(0, 100);
  saveChangelog(changelog);
  return entry;
}

export function logQuestionsAdded(count, channels, questionIds = []) {
  if (count === 0) return;
  return addChangelogEntry('added', `${count} New Questions Added`,
    `Daily AI-powered question generation added ${count} new questions across ${[...new Set(channels)].length} channels.`,
    { questionsAdded: count, channels: [...new Set(channels)], questionIds: questionIds.slice(0, 10) });
}

export function logQuestionsImproved(count, channels, questionIds = []) {
  if (count === 0) return;
  return addChangelogEntry('improved', `${count} Questions Improved`,
    `AI-powered improvement bot enhanced ${count} questions with better explanations and diagrams.`,
    { questionsImproved: count, channels: [...new Set(channels)], questionIds: questionIds.slice(0, 10) });
}

// ============================================
// WORK QUEUE OPERATIONS
// ============================================

// Initialize work queue table (cached to avoid repeated CREATE TABLE calls)
export async function initWorkQueue() {
  // Skip if already initialized in this run
  if (_workQueueInitialized) return;
  
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS work_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL,
      bot_type TEXT NOT NULL,
      priority INTEGER DEFAULT 5,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      created_by TEXT,
      created_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      result TEXT,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);
  // Create index for efficient queries
  await dbClient.execute(`
    CREATE INDEX IF NOT EXISTS idx_work_queue_status_bot ON work_queue(status, bot_type, priority)
  `);
  
  _workQueueInitialized = true;
}

// Add work item to queue (avoids duplicates for same question+bot)
export async function addWorkItem(questionId, botType, reason, createdBy, priority = 5) {
  await initWorkQueue();
  
  // Check if pending work already exists for this question+bot
  const existing = await dbClient.execute({
    sql: `SELECT id FROM work_queue WHERE question_id = ? AND bot_type = ? AND status = 'pending'`,
    args: [questionId, botType]
  });
  
  if (existing.rows.length > 0) {
    console.log(`  ℹ️ Work item already exists for ${questionId} -> ${botType}`);
    return existing.rows[0].id;
  }
  
  const result = await dbClient.execute({
    sql: `INSERT INTO work_queue (question_id, bot_type, priority, status, reason, created_by, created_at)
          VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
    args: [questionId, botType, priority, reason, createdBy, new Date().toISOString()]
  });
  
  console.log(`  📋 Created work item: ${questionId} -> ${botType} (${reason})`);
  return result.lastInsertRowid;
}

// Get pending work items for a specific bot type
export async function getPendingWork(botType, limit = 10) {
  await initWorkQueue();
  
  const result = await dbClient.execute({
    sql: `SELECT w.*, q.question, q.answer, q.explanation, q.channel, q.sub_channel, q.tags, q.videos, q.companies, q.diagram, q.eli5, q.difficulty, q.source_url, q.last_updated, q.created_at as q_created_at
          FROM work_queue w
          JOIN questions q ON w.question_id = q.id
          WHERE w.bot_type = ? AND w.status = 'pending'
          ORDER BY w.priority ASC, w.created_at ASC
          LIMIT ?`,
    args: [botType, limit]
  });
  
  return result.rows.map(row => ({
    workId: row.id,
    questionId: row.question_id,
    reason: row.reason,
    priority: row.priority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    question: {
      id: row.question_id,
      question: row.question,
      answer: row.answer,
      explanation: row.explanation,
      channel: row.channel,
      subChannel: row.sub_channel,
      tags: row.tags ? JSON.parse(row.tags) : [],
      videos: row.videos ? JSON.parse(row.videos) : null,
      companies: row.companies ? JSON.parse(row.companies) : null,
      diagram: row.diagram,
      eli5: row.eli5,
      difficulty: row.difficulty,
      sourceUrl: row.source_url,
      lastUpdated: row.last_updated,
      createdAt: row.q_created_at
    }
  }));
}

// Mark work item as started
export async function startWorkItem(workId) {
  await dbClient.execute({
    sql: `UPDATE work_queue SET status = 'processing', started_at = ? WHERE id = ?`,
    args: [new Date().toISOString(), workId]
  });
}

// Mark work item as completed
export async function completeWorkItem(workId, result = null) {
  await dbClient.execute({
    sql: `UPDATE work_queue SET status = 'completed', completed_at = ?, result = ? WHERE id = ?`,
    args: [new Date().toISOString(), result ? JSON.stringify(result) : null, workId]
  });
}

// Mark work item as failed
export async function failWorkItem(workId, error) {
  await dbClient.execute({
    sql: `UPDATE work_queue SET status = 'failed', completed_at = ?, result = ? WHERE id = ?`,
    args: [new Date().toISOString(), JSON.stringify({ error }), workId]
  });
}

// Get work queue stats
export async function getWorkQueueStats() {
  await initWorkQueue();
  
  const result = await dbClient.execute(`
    SELECT bot_type, status, COUNT(*) as count
    FROM work_queue
    GROUP BY bot_type, status
    ORDER BY bot_type, status
  `);
  
  const stats = {};
  for (const row of result.rows) {
    if (!stats[row.bot_type]) stats[row.bot_type] = {};
    stats[row.bot_type][row.status] = row.count;
  }
  return stats;
}

// Clean up old completed/failed work items (older than 7 days)
export async function cleanupWorkQueue(daysOld = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  
  const result = await dbClient.execute({
    sql: `DELETE FROM work_queue WHERE status IN ('completed', 'failed') AND completed_at < ?`,
    args: [cutoff.toISOString()]
  });
  
  return result.rowsAffected;
}

// ============================================
// BOT ACTIVITY LOGGING
// ============================================

// Log a bot activity (creates a work queue entry for tracking)
export async function logBotActivity(questionId, botType, action, status = 'completed', result = null) {
  await initWorkQueue();
  
  const now = new Date().toISOString();
  
  await dbClient.execute({
    sql: `INSERT INTO work_queue (question_id, bot_type, priority, status, reason, created_by, created_at, started_at, completed_at, result)
          VALUES (?, ?, 5, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      questionId,
      botType,
      status,
      action,
      botType,
      now,
      now,
      now,
      result ? JSON.stringify(result) : null
    ]
  });
  
  console.log(`  📊 Logged activity: ${botType} -> ${questionId} (${action})`);
}

// Get recent bot activity
export async function getRecentBotActivity(limit = 50, botType = null) {
  await initWorkQueue();
  
  let sql = `
    SELECT w.*, q.question, q.channel
    FROM work_queue w
    LEFT JOIN questions q ON w.question_id = q.id
    WHERE w.status IN ('completed', 'failed')
  `;
  const args = [];
  
  if (botType) {
    sql += ' AND w.bot_type = ?';
    args.push(botType);
  }
  
  sql += ' ORDER BY w.completed_at DESC LIMIT ?';
  args.push(limit);
  
  const result = await dbClient.execute({ sql, args });
  
  return result.rows.map(row => ({
    id: row.id,
    questionId: row.question_id,
    botType: row.bot_type,
    action: row.reason,
    status: row.status,
    result: row.result ? JSON.parse(row.result) : null,
    completedAt: row.completed_at,
    questionText: row.question,
    channel: row.channel
  }));
}
