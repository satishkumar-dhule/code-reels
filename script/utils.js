import fs from 'fs';
import { spawn } from 'child_process';

// Constants
export const QUESTIONS_DIR = 'client/src/lib/questions';
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 10000;
export const TIMEOUT_MS = 120000;

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
      
      // Handle different event formats from OpenCode CLI
      if (event.type === 'text' && event.part?.text) {
        fullText += event.part.text;
      } else if (event.type === 'content' && event.content) {
        fullText += event.content;
      } else if (event.text) {
        fullText += event.text;
      } else if (event.message) {
        fullText += event.message;
      }
    } catch(e) {
      // If line is not JSON, it might be plain text output
      if (line.startsWith('{') || line.startsWith('[')) {
        // Skip malformed JSON
        continue;
      }
    }
  }
  
  return fullText || output;
}

export function parseJson(response) {
  if (!response) return null;
  
  const text = extractTextFromJsonEvents(response);
  if (!text) return null;
  
  // Try parsing the full text first
  try {
    return JSON.parse(text.trim());
  } catch(e) {}
  
  // Try extracting JSON from markdown code blocks or mixed content
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /(\{[\s\S]*\})/
  ];
  
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      try {
        const cleaned = m[1].trim();
        return JSON.parse(cleaned);
      } catch(e) {}
    }
  }
  
  // Last resort: try to find the first complete JSON object
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    } catch(e) {}
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
