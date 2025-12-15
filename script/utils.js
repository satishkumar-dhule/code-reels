import fs from 'fs';
import { spawn } from 'child_process';
import https from 'https';

// Constants
export const QUESTIONS_DIR = 'client/src/lib/questions';
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 10000;
export const TIMEOUT_MS = 120000;

// ============================================
// YOUTUBE VIDEO VALIDATION
// ============================================

// Extract YouTube video ID from various URL formats
export function extractYouTubeVideoId(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // Just the ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Validate if a YouTube video exists using oEmbed API (no API key needed)
export async function validateYouTubeVideo(url) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return { valid: false, reason: 'Invalid YouTube URL format' };
  
  return new Promise((resolve) => {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    const req = https.get(oembedUrl, { timeout: 5000 }, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            resolve({ 
              valid: true, 
              videoId,
              title: info.title,
              author: info.author_name
            });
          } catch {
            resolve({ valid: true, videoId });
          }
        });
      } else if (res.statusCode === 404 || res.statusCode === 401) {
        resolve({ valid: false, reason: 'Video not found or private' });
      } else {
        resolve({ valid: false, reason: `HTTP ${res.statusCode}` });
      }
    });
    
    req.on('error', () => resolve({ valid: false, reason: 'Network error' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ valid: false, reason: 'Timeout' });
    });
  });
}

// Validate multiple YouTube URLs and return only valid ones
export async function validateYouTubeVideos(videos) {
  if (!videos) return { shortVideo: null, longVideo: null };
  
  const result = { shortVideo: null, longVideo: null };
  
  if (videos.shortVideo) {
    const validation = await validateYouTubeVideo(videos.shortVideo);
    if (validation.valid) {
      result.shortVideo = videos.shortVideo;
      console.log(`  ✓ Short video valid: ${validation.title || videos.shortVideo}`);
    } else {
      console.log(`  ✗ Short video invalid: ${validation.reason}`);
    }
  }
  
  if (videos.longVideo) {
    const validation = await validateYouTubeVideo(videos.longVideo);
    if (validation.valid) {
      result.longVideo = videos.longVideo;
      console.log(`  ✓ Long video valid: ${validation.title || videos.longVideo}`);
    } else {
      console.log(`  ✗ Long video invalid: ${validation.reason}`);
    }
  }
  
  return result;
}

// ============================================
// COMPANY VALIDATION & NORMALIZATION
// ============================================

// Known tech companies for validation
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

// Company name aliases for normalization
const COMPANY_ALIASES = {
  'facebook': 'Meta',
  'fb': 'Meta',
  'aws': 'Amazon',
  'msft': 'Microsoft',
  'goog': 'Google',
  'alphabet': 'Google',
  'x': 'Twitter',
  'x.com': 'Twitter',
  'openai': 'OpenAI',
  'github': 'GitHub',
};

// Normalize and validate company names
export function normalizeCompanies(companies) {
  if (!companies || !Array.isArray(companies)) return [];
  
  const normalized = new Set();
  
  companies.forEach(company => {
    if (!company || typeof company !== 'string') return;
    
    const trimmed = company.trim();
    const lower = trimmed.toLowerCase();
    
    // Check aliases first
    if (COMPANY_ALIASES[lower]) {
      normalized.add(COMPANY_ALIASES[lower]);
      return;
    }
    
    // Check if it's a known company (case-insensitive)
    for (const known of KNOWN_COMPANIES) {
      if (known.toLowerCase() === lower) {
        normalized.add(known);
        return;
      }
    }
    
    // If not known, capitalize first letter of each word
    const capitalized = trimmed
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Only add if it looks like a company name (2+ chars, no weird characters)
    if (capitalized.length >= 2 && /^[A-Za-z0-9\s&.-]+$/.test(capitalized)) {
      normalized.add(capitalized);
    }
  });
  
  return Array.from(normalized).sort();
}

// File operations
export const getQuestionsFile = (ch) => `${QUESTIONS_DIR}/${ch}.json`;

export function loadAllQuestions() {
  const all = [];
  try {
    fs.readdirSync(QUESTIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .forEach(f => {
        try {
          all.push(...JSON.parse(fs.readFileSync(`${QUESTIONS_DIR}/${f}`, 'utf8')));
        } catch(e) {}
      });
  } catch(e) {}
  return all;
}

export function loadChannelQuestions(channel) {
  const file = getQuestionsFile(channel);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch(e) {
    return [];
  }
}

export function saveChannelQuestions(channel, questions) {
  const file = getQuestionsFile(channel);
  fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(questions, null, 2));
}

export function getChannelQuestionCounts() {
  const counts = {};
  try {
    fs.readdirSync(QUESTIONS_DIR)
      .filter(f => f.endsWith('.json') && f !== 'index.ts')
      .forEach(f => {
        const channel = f.replace('.json', '');
        try {
          const qs = JSON.parse(fs.readFileSync(`${QUESTIONS_DIR}/${f}`, 'utf8'));
          counts[channel] = qs.length;
        } catch(e) {
          counts[channel] = 0;
        }
      });
  } catch(e) {}
  return counts;
}

// Text processing
export function normalizeText(t) {
  return t.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

// ID generation
export function generateUniqueId(questions, channel) {
  const prefix = channel.substring(0, 2);
  const ids = new Set(questions.map(q => q.id));
  let c = questions.length + 1, id;
  do {
    id = `${prefix}-${c++}`;
  } while (ids.has(id));
  return id;
}

// OpenCode integration
export function runOpenCode(prompt) {
  return new Promise((resolve) => {
    let output = '';
    let resolved = false;
    
    const proc = spawn('opencode', ['run', '--format', 'json', prompt], {
      timeout: TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill('SIGTERM');
        resolve(null);
      }
    }, TIMEOUT_MS);
    
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });
    
    proc.on('close', () => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        resolve(output || null);
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
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

// JSON parsing
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
    } catch(e) {}
  }
  
  return fullText || output;
}

export function parseJson(response) {
  if (!response) return null;
  
  const text = extractTextFromJsonEvents(response);
  
  try {
    return JSON.parse(text.trim());
  } catch(e) {}
  
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /(\{[\s\S]*\})/
  ];
  
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      try {
        return JSON.parse(m[1].trim());
      } catch(e) {}
    }
  }
  
  return null;
}

// Validation
export function validateQuestion(data) {
  return data &&
    data.question?.length > 10 &&
    data.answer?.length > 5 &&
    data.explanation?.length > 20;
}

// Index file management
export function updateIndexFile() {
  const files = fs.readdirSync(QUESTIONS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.ts');
  
  const channels = files.map(f => f.replace('.json', ''));
  const imports = channels
    .map(c => `import ${c.replace(/-/g,'_')} from "./${c}.json";`)
    .join('\n');
  
  const exports = channels
    .map(c => `  "${c}": ${c.replace(/-/g,'_')}`)
    .join(',\n');
  
  const content = `${imports}\n\nexport const questionsByChannel: Record<string, any[]> = {\n${exports}\n};\n\nexport const allQuestions = Object.values(questionsByChannel).flat();\n`;
  
  fs.writeFileSync(`${QUESTIONS_DIR}/index.ts`, content);
}

// GitHub output
export function writeGitHubOutput(data) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    Object.entries(data).forEach(([key, value]) => {
      fs.appendFileSync(out, `${key}=${value}\n`);
    });
  }
}

// ============================================
// UNIFIED QUESTION STORAGE (New Architecture)
// ============================================
// Questions are stored in a single file (all-questions.json)
// Channel mappings are stored separately (channel-mappings.json)
// This allows the same question to belong to multiple channels

export const ALL_QUESTIONS_FILE = `${QUESTIONS_DIR}/all-questions.json`;
export const CHANNEL_MAPPINGS_FILE = `${QUESTIONS_DIR}/channel-mappings.json`;
export const CHANGELOG_FILE = `${QUESTIONS_DIR}/changelog.json`;

// Load all questions from unified storage
export function loadUnifiedQuestions() {
  try {
    const data = JSON.parse(fs.readFileSync(ALL_QUESTIONS_FILE, 'utf8'));
    return data.questions || {};
  } catch (e) {
    return {};
  }
}

// Save all questions to unified storage
export function saveUnifiedQuestions(questions) {
  fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
  const data = {
    questions,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(ALL_QUESTIONS_FILE, JSON.stringify(data, null, 2));
}

// Load channel mappings
export function loadChannelMappings() {
  try {
    const data = JSON.parse(fs.readFileSync(CHANNEL_MAPPINGS_FILE, 'utf8'));
    return data.channels || {};
  } catch (e) {
    return {};
  }
}

// Save channel mappings
export function saveChannelMappings(mappings) {
  fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
  const data = {
    channels: mappings,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(CHANNEL_MAPPINGS_FILE, JSON.stringify(data, null, 2));
}

// Add a question to unified storage and map to channels
export function addUnifiedQuestion(question, channels) {
  const questions = loadUnifiedQuestions();
  const mappings = loadChannelMappings();
  
  // Add question to unified storage
  questions[question.id] = question;
  saveUnifiedQuestions(questions);
  
  // Map question to each channel/subchannel
  channels.forEach(({ channel, subChannel }) => {
    if (!mappings[channel]) {
      mappings[channel] = { subChannels: {} };
    }
    if (!mappings[channel].subChannels[subChannel]) {
      mappings[channel].subChannels[subChannel] = [];
    }
    if (!mappings[channel].subChannels[subChannel].includes(question.id)) {
      mappings[channel].subChannels[subChannel].push(question.id);
    }
  });
  
  saveChannelMappings(mappings);
}

// Get questions for a specific channel (resolves IDs to full questions)
export function getQuestionsForChannel(channel) {
  const questions = loadUnifiedQuestions();
  const mappings = loadChannelMappings();
  
  const channelMapping = mappings[channel];
  if (!channelMapping) return [];
  
  const questionIds = new Set();
  Object.values(channelMapping.subChannels || {}).forEach(ids => {
    ids.forEach(id => questionIds.add(id));
  });
  
  return Array.from(questionIds)
    .map(id => questions[id])
    .filter(q => q != null);
}

// Get questions for a specific subchannel
export function getQuestionsForSubChannel(channel, subChannel) {
  const questions = loadUnifiedQuestions();
  const mappings = loadChannelMappings();
  
  const ids = mappings[channel]?.subChannels?.[subChannel] || [];
  return ids.map(id => questions[id]).filter(q => q != null);
}

// Get all questions as array (for compatibility)
export function getAllUnifiedQuestions() {
  const questions = loadUnifiedQuestions();
  return Object.values(questions);
}

// Generate unique ID for unified storage
export function generateUnifiedId() {
  const questions = loadUnifiedQuestions();
  const existingIds = new Set(Object.keys(questions));
  let counter = Object.keys(questions).length + 1;
  let id;
  do {
    id = `q-${counter++}`;
  } while (existingIds.has(id));
  return id;
}

// Check if question is duplicate in unified storage
export function isDuplicateUnified(questionText, threshold = 0.6) {
  const questions = getAllUnifiedQuestions();
  return questions.some(q => calculateSimilarity(questionText, q.question) >= threshold);
}

// Update unified index file for TypeScript imports
export function updateUnifiedIndexFile() {
  const content = `// Auto-generated index file for unified question storage
import allQuestionsData from "./all-questions.json";
import channelMappingsData from "./channel-mappings.json";

export const questionsById: Record<string, any> = allQuestionsData.questions || {};
export const channelMappings: Record<string, any> = channelMappingsData.channels || {};

// Get all questions as array
export const allQuestions = Object.values(questionsById);

// Get questions for a channel
export function getQuestionsForChannel(channel: string): any[] {
  const mapping = channelMappings[channel];
  if (!mapping) return [];
  
  const ids = new Set<string>();
  Object.values(mapping.subChannels || {}).forEach((subIds: any) => {
    (subIds as string[]).forEach(id => ids.add(id));
  });
  
  return Array.from(ids).map(id => questionsById[id]).filter(q => q != null);
}

// Get questions for a subchannel
export function getQuestionsForSubChannel(channel: string, subChannel: string): any[] {
  const ids = channelMappings[channel]?.subChannels?.[subChannel] || [];
  return ids.map((id: string) => questionsById[id]).filter((q: any) => q != null);
}

// Legacy compatibility - questions by channel
export const questionsByChannel: Record<string, any[]> = {};
Object.keys(channelMappings).forEach(channel => {
  questionsByChannel[channel] = getQuestionsForChannel(channel);
});
`;
  
  fs.writeFileSync(`${QUESTIONS_DIR}/index.ts`, content);
}


// ============================================
// CHANGELOG MANAGEMENT
// ============================================
// Track what's new - questions added, improved, features

// Load changelog data
export function loadChangelog() {
  try {
    return JSON.parse(fs.readFileSync(CHANGELOG_FILE, 'utf8'));
  } catch (e) {
    return {
      entries: [],
      stats: {
        totalQuestionsAdded: 0,
        totalQuestionsImproved: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

// Save changelog data
export function saveChangelog(data) {
  fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
  data.stats.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CHANGELOG_FILE, JSON.stringify(data, null, 2));
}

// Add a changelog entry for new questions
export function addChangelogEntry(type, title, description, details = {}) {
  const changelog = loadChangelog();
  
  const entry = {
    date: new Date().toISOString().split('T')[0],
    type,
    title,
    description,
    details
  };
  
  // Add to beginning of entries
  changelog.entries.unshift(entry);
  
  // Update stats
  if (details.questionsAdded) {
    changelog.stats.totalQuestionsAdded += details.questionsAdded;
  }
  if (details.questionsImproved) {
    changelog.stats.totalQuestionsImproved += details.questionsImproved;
  }
  
  // Keep only last 100 entries
  if (changelog.entries.length > 100) {
    changelog.entries = changelog.entries.slice(0, 100);
  }
  
  saveChangelog(changelog);
  return entry;
}

// Add entry for daily question generation
export function logQuestionsAdded(count, channels, questionIds = []) {
  if (count === 0) return;
  
  const uniqueChannels = [...new Set(channels)];
  
  return addChangelogEntry(
    'added',
    `${count} New Questions Added`,
    `Daily AI-powered question generation added ${count} new questions across ${uniqueChannels.length} channels.`,
    {
      questionsAdded: count,
      channels: uniqueChannels,
      questionIds: questionIds.slice(0, 10) // Keep first 10 IDs
    }
  );
}

// Add entry for question improvements
export function logQuestionsImproved(count, channels, questionIds = []) {
  if (count === 0) return;
  
  const uniqueChannels = [...new Set(channels)];
  
  return addChangelogEntry(
    'improved',
    `${count} Questions Improved`,
    `AI-powered improvement bot enhanced ${count} questions with better explanations and diagrams.`,
    {
      questionsImproved: count,
      channels: uniqueChannels,
      questionIds: questionIds.slice(0, 10)
    }
  );
}
