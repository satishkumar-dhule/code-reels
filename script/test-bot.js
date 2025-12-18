#!/usr/bin/env node
/**
 * Test Bot - Generates quiz tests for each channel
 * Creates 25-50 multiple choice questions per channel based on existing questions
 * Outputs to client/public/data/tests.json
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const CHANNEL_ID = process.env.CHANNEL_ID || null; // Optional: specific channel
const MAX_QUESTIONS = parseInt(process.env.MAX_QUESTIONS || '50');
const OUTPUT_FILE = 'client/public/data/tests.json';

// Channel display names
const CHANNEL_NAMES = {
  'system-design': 'System Design',
  'algorithms': 'Algorithms',
  'frontend': 'Frontend',
  'backend': 'Backend',
  'database': 'Database',
  'devops': 'DevOps',
  'sre': 'SRE',
  'security': 'Security',
  'mobile': 'Mobile',
  'ai-ml': 'AI/ML',
  'cloud': 'Cloud',
  'networking': 'Networking',
  'behavioral': 'Behavioral',
};

async function getChannelQuestions(channelId) {
  const result = await db.execute({
    sql: `SELECT id, question, answer, explanation, difficulty 
          FROM questions 
          WHERE channel = ? 
          ORDER BY RANDOM()
          LIMIT ?`,
    args: [channelId, MAX_QUESTIONS]
  });
  return result.rows;
}

// Run opencode with spawn for better control
function runOpenCode(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('opencode', ['-p', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000, // 2 minute timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Exit code ${code}: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Write prompt to stdin and close
    child.stdin.write(prompt);
    child.stdin.end();

    // Timeout handler
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Timeout after 120s'));
    }, 120000);
  });
}

async function generateTestQuestion(question) {
  const prompt = `Generate a multiple choice question based on this interview Q&A.

QUESTION: ${question.question.substring(0, 500)}

ANSWER: ${question.answer.substring(0, 800)}

Create a quiz question with 4 options. Decide randomly:
- "single" (1 correct) or "multiple" (2-3 correct)

Return ONLY this JSON:
{
  "question": "Quiz question text",
  "type": "single",
  "options": [
    { "text": "Option A", "isCorrect": false },
    { "text": "Option B", "isCorrect": true },
    { "text": "Option C", "isCorrect": false },
    { "text": "Option D", "isCorrect": false }
  ],
  "explanation": "Why the answer is correct"
}`;

  try {
    const result = await runOpenCode(prompt);

    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('    ⚠️ No JSON in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate
    if (!parsed.question || !parsed.options || parsed.options.length !== 4) {
      console.log('    ⚠️ Invalid structure');
      return null;
    }

    // Ensure at least one correct answer
    const hasCorrect = parsed.options.some(o => o.isCorrect);
    if (!hasCorrect) {
      parsed.options[0].isCorrect = true;
    }

    const options = parsed.options.map((opt, i) => ({
      id: `opt-${i}`,
      text: opt.text,
      isCorrect: !!opt.isCorrect
    }));

    return {
      id: `tq-${question.id}`,
      questionId: question.id,
      question: parsed.question,
      type: parsed.type === 'multiple' ? 'multiple' : 'single',
      options,
      explanation: parsed.explanation || '',
      difficulty: question.difficulty || 'intermediate'
    };
  } catch (error) {
    console.log(`    ⚠️ Error: ${error.message.substring(0, 50)}`);
    return null;
  }
}

async function generateTestForChannel(channelId) {
  console.log(`\n📝 Generating test for: ${channelId}`);
  
  const questions = await getChannelQuestions(channelId);
  console.log(`   Found ${questions.length} questions`);
  
  if (questions.length < 10) {
    console.log(`   ⚠️ Not enough questions (need at least 10)`);
    return null;
  }

  const testQuestions = [];
  const targetCount = Math.min(MAX_QUESTIONS, questions.length);
  let failures = 0;
  const maxFailures = 5; // Stop after 5 consecutive failures
  
  for (let i = 0; i < questions.length && testQuestions.length < targetCount; i++) {
    if (failures >= maxFailures) {
      console.log(`   ⚠️ Too many failures, stopping`);
      break;
    }

    const q = questions[i];
    console.log(`   [${testQuestions.length + 1}/${targetCount}] ${q.question.substring(0, 40)}...`);
    
    const testQ = await generateTestQuestion(q);
    if (testQ) {
      testQuestions.push(testQ);
      failures = 0; // Reset on success
      console.log(`    ✓ Generated (${testQ.type})`);
    } else {
      failures++;
    }
    
    // Delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  if (testQuestions.length < 10) {
    console.log(`   ⚠️ Only generated ${testQuestions.length} questions (need 10+)`);
    return null;
  }

  return {
    id: `test-${channelId}`,
    channelId,
    channelName: CHANNEL_NAMES[channelId] || channelId,
    title: `${CHANNEL_NAMES[channelId] || channelId} Knowledge Test`,
    description: `Test your ${CHANNEL_NAMES[channelId] || channelId} interview prep knowledge.`,
    questions: testQuestions,
    passingScore: 70,
    createdAt: new Date().toISOString(),
    version: 1
  };
}

async function main() {
  console.log('🧪 Test Bot Starting...\n');

  // Get channels to process
  let channelIds = [];
  
  if (CHANNEL_ID) {
    channelIds = [CHANNEL_ID];
    console.log(`Processing single channel: ${CHANNEL_ID}`);
  } else {
    const result = await db.execute('SELECT DISTINCT channel FROM questions ORDER BY channel');
    channelIds = result.rows.map(r => r.channel);
    console.log(`Found ${channelIds.length} channels`);
  }

  // Load existing tests
  let existingTests = [];
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      existingTests = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`Loaded ${existingTests.length} existing tests`);
    }
  } catch {
    existingTests = [];
  }

  const tests = [...existingTests];
  let generated = 0;
  
  for (const channelId of channelIds) {
    // Skip if test already exists (unless regenerating specific channel)
    if (!CHANNEL_ID && tests.find(t => t.channelId === channelId)) {
      console.log(`\n⏭️ Skipping ${channelId} (test exists)`);
      continue;
    }

    const test = await generateTestForChannel(channelId);
    if (test) {
      // Remove old test for this channel if exists
      const idx = tests.findIndex(t => t.channelId === channelId);
      if (idx >= 0) {
        tests[idx] = test;
      } else {
        tests.push(test);
      }
      generated++;
    }

    // Stop after generating a few to avoid long runs
    if (!CHANNEL_ID && generated >= 3) {
      console.log(`\n⏸️ Generated ${generated} tests, stopping to avoid timeout`);
      break;
    }
  }

  // Ensure output directory exists
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save tests
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tests, null, 2));
  console.log(`\n✅ Saved ${tests.length} tests to ${OUTPUT_FILE}`);

  // Summary
  console.log('\n📊 Summary:');
  tests.forEach(t => {
    console.log(`   - ${t.channelName}: ${t.questions.length} questions`);
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
