#!/usr/bin/env node
/**
 * Test Bot - Generates quiz tests for each channel
 * Creates 25-50 multiple choice questions per channel based on existing questions
 * Outputs to client/public/data/tests.json
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const CHANNEL_ID = process.env.CHANNEL_ID || null; // Optional: specific channel
const QUESTIONS_PER_TEST = parseInt(process.env.QUESTIONS_PER_TEST || '30');
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
    args: [channelId, QUESTIONS_PER_TEST * 2] // Get more to have variety
  });
  return result.rows;
}

async function generateTestQuestion(question, allQuestions) {
  // Use opencode CLI to generate MCQ
  const prompt = `Generate a multiple choice question based on this interview question and answer.

ORIGINAL QUESTION: ${question.question}

CORRECT ANSWER: ${question.answer}

Generate a test question with 4 options. The question should test understanding of the concept.
Randomly decide if this should be:
- "single" choice (1 correct answer)
- "multiple" choice (2-3 correct answers)

Return ONLY valid JSON in this exact format:
{
  "question": "The test question text",
  "type": "single" or "multiple",
  "options": [
    { "text": "Option A text", "isCorrect": true/false },
    { "text": "Option B text", "isCorrect": true/false },
    { "text": "Option C text", "isCorrect": true/false },
    { "text": "Option D text", "isCorrect": true/false }
  ],
  "explanation": "Brief explanation of the correct answer"
}

Rules:
- For "single" type: exactly 1 option should have isCorrect: true
- For "multiple" type: 2-3 options should have isCorrect: true
- Options should be plausible and test real understanding
- Mix up the order of correct/incorrect options
- Keep options concise but clear`;

  try {
    const result = execSync(`echo '${prompt.replace(/'/g, "\\'")}' | opencode -p -`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000,
    });

    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('  ⚠️ No JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!parsed.question || !parsed.options || parsed.options.length !== 4) {
      console.log('  ⚠️ Invalid structure');
      return null;
    }

    // Add IDs to options
    const options = parsed.options.map((opt, i) => ({
      id: `opt-${i}`,
      text: opt.text,
      isCorrect: opt.isCorrect
    }));

    return {
      id: `tq-${question.id}`,
      questionId: question.id,
      question: parsed.question,
      type: parsed.type === 'multiple' ? 'multiple' : 'single',
      options,
      explanation: parsed.explanation,
      difficulty: question.difficulty || 'intermediate'
    };
  } catch (error) {
    console.log(`  ⚠️ Error generating: ${error.message}`);
    return null;
  }
}

async function generateTestForChannel(channelId) {
  console.log(`\n📝 Generating test for: ${channelId}`);
  
  const questions = await getChannelQuestions(channelId);
  console.log(`  Found ${questions.length} questions`);
  
  if (questions.length < 10) {
    console.log(`  ⚠️ Not enough questions (need at least 10)`);
    return null;
  }

  const testQuestions = [];
  const targetCount = Math.min(QUESTIONS_PER_TEST, questions.length);
  
  for (let i = 0; i < questions.length && testQuestions.length < targetCount; i++) {
    const q = questions[i];
    console.log(`  [${testQuestions.length + 1}/${targetCount}] Processing: ${q.question.substring(0, 50)}...`);
    
    const testQ = await generateTestQuestion(q, questions);
    if (testQ) {
      testQuestions.push(testQ);
      console.log(`    ✓ Generated (${testQ.type})`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  if (testQuestions.length < 10) {
    console.log(`  ⚠️ Could only generate ${testQuestions.length} questions`);
    return null;
  }

  return {
    id: `test-${channelId}`,
    channelId,
    channelName: CHANNEL_NAMES[channelId] || channelId,
    title: `${CHANNEL_NAMES[channelId] || channelId} Knowledge Test`,
    description: `Test your ${CHANNEL_NAMES[channelId] || channelId} interview preparation knowledge with this quiz.`,
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
  } else {
    const result = await db.execute('SELECT DISTINCT channel FROM questions');
    channelIds = result.rows.map(r => r.channel);
  }

  console.log(`Processing ${channelIds.length} channel(s)`);

  // Load existing tests
  let existingTests = [];
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      existingTests = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }
  } catch {
    existingTests = [];
  }

  // Generate tests
  const tests = [...existingTests];
  
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
    console.log(`  - ${t.channelName}: ${t.questions.length} questions`);
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
